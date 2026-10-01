#!/usr/bin/env bash
# migrate-prod.sh — terapkan migrasi Drizzle ke database ALAS produksi.
#
# Image produksi (Next.js standalone) tidak membawa drizzle-kit dan tidak menjalankan
# migrasi saat start. Skrip ini menjalankan `drizzle-kit migrate` di container Node
# sementara, dari SALINAN repo (folder produksi tidak terisi node_modules), lewat
# network Docker yang sama dengan alas-db.
#
# Jalankan di server, dari root repo etalase:
#   bash scripts/migrate-prod.sh --dry-run            # hanya tampilkan migrasi tertunda
#   bash scripts/migrate-prod.sh                      # backup + migrate (tanya konfirmasi)
#   bash scripts/migrate-prod.sh --yes                # tanpa prompt (non-destruktif saja)
#   bash scripts/migrate-prod.sh --allow-destructive  # izinkan DROP/TRUNCATE/DELETE
#
# Variabel opsional: DB_CONTAINER (alas-db), BACKUP_DIR (/root/pre-deploy),
# NODE_IMAGE (default: base image Dockerfile).
set -euo pipefail

DRY_RUN=0
ASSUME_YES=0
ALLOW_DESTRUCTIVE=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --yes) ASSUME_YES=1 ;;
    --allow-destructive) ALLOW_DESTRUCTIVE=1 ;;
    -h|--help) sed -n '2,17p' "$0"; exit 0 ;;
    *) echo "Argumen tidak dikenal: $arg" >&2; exit 2 ;;
  esac
done

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"
DB_CONTAINER="${DB_CONTAINER:-alas-db}"
BACKUP_DIR="${BACKUP_DIR:-/root/pre-deploy}"
NODE_IMAGE="${NODE_IMAGE:-$(awk '/^FROM node:/ {print $2; exit}' Dockerfile)}"
JOURNAL=drizzle/migrations/meta/_journal.json

log() { echo "[migrate-prod] $*"; }
die() { echo "[migrate-prod] GAGAL: $*" >&2; exit 1; }

command -v docker >/dev/null || die "docker tidak ditemukan"
command -v python3 >/dev/null || die "python3 tidak ditemukan"
[ -f "$JOURNAL" ] || die "$JOURNAL tidak ada — jalankan dari repo etalase"
[ -f .env ] || die ".env tidak ada"
DATABASE_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2-)"
[ -n "$DATABASE_URL" ] || die "DATABASE_URL kosong di .env"
[ -n "$NODE_IMAGE" ] || die "tidak bisa menentukan NODE_IMAGE dari Dockerfile"

[ "$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null)" = true ] \
  || die "container $DB_CONTAINER tidak jalan"
NETWORK="$(docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$DB_CONTAINER" | awk '{print $1}')"
[ -n "$NETWORK" ] || die "network $DB_CONTAINER tidak ditemukan"

psql_db() {
  docker exec -i "$DB_CONTAINER" sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -tA'
}

# ── Migrasi tertunda ──
# Sama dengan drizzle-kit: yang diterapkan hanya entri journal dengan `when` lebih baru
# dari created_at migrasi terakhir yang tercatat (bukan pencocokan per entri — `when`
# entri lama di journal bisa berbeda dari yang tercatat, mis. 0002 di produksi).
last_applied="$(echo "select coalesce(max(created_at), 0) from drizzle.__drizzle_migrations;" | psql_db 2>/dev/null || echo 0)"
applied_count="$(echo "select count(*) from drizzle.__drizzle_migrations;" | psql_db 2>/dev/null || echo 0)"
pending="$(python3 - "$JOURNAL" "$last_applied" <<'PY'
import json, sys
last = int(sys.argv[2] or 0)
for e in json.load(open(sys.argv[1]))["entries"]:
    if int(e["when"]) > last:
        print(e["tag"])
PY
)"

if [ -z "$pending" ]; then
  log "Tidak ada migrasi tertunda ($applied_count sudah diterapkan)."
  exit 0
fi

log "Migrasi tertunda:"
echo "$pending" | sed 's/^/    - /'

destructive=""
for tag in $pending; do
  hits="$(grep -inE '\b(DROP|TRUNCATE|DELETE[[:space:]]+FROM)\b' "drizzle/migrations/$tag.sql" || true)"
  [ -n "$hits" ] && destructive+="$tag:"$'\n'"$(echo "$hits" | sed 's/^/      /')"$'\n'
done
if [ -n "$destructive" ]; then
  log "PERINGATAN — SQL destruktif ditemukan:"
  printf '%s' "$destructive"
fi

[ "$DRY_RUN" = 1 ] && { log "--dry-run: tidak ada yang diubah."; exit 0; }

if [ -n "$destructive" ] && [ "$ALLOW_DESTRUCTIVE" != 1 ]; then
  die "migrasi destruktif butuh --allow-destructive (cek dulu isi tabel yang terdampak)"
fi
if [ "$ASSUME_YES" != 1 ]; then
  read -r -p "[migrate-prod] Terapkan $(echo "$pending" | wc -l) migrasi ke database produksi? Ketik YA: " ans </dev/tty
  [ "$ans" = "YA" ] || die "dibatalkan"
fi

# ── Backup ──
mkdir -p "$BACKUP_DIR"
backup="$BACKUP_DIR/alas-$(date +%Y%m%d-%H%M%S)-pre-migrate.sql.gz"
docker exec "$DB_CONTAINER" sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$backup"
gzip -t "$backup" || die "backup rusak: $backup"
log "Backup: $backup ($(du -h "$backup" | cut -f1))"

# ── Migrate dari salinan repo ──
workdir="$(mktemp -d /tmp/alas-migrate.XXXXXX)"
trap 'rm -rf "$workdir"' EXIT
tar cf - --exclude=.git --exclude=node_modules --exclude=.next . | tar xf - -C "$workdir"
log "Menjalankan drizzle-kit migrate ($NODE_IMAGE, network $NETWORK)…"
docker run --rm --network "$NETWORK" -v "$workdir:/app" -w /app \
  -e DATABASE_URL="$DATABASE_URL" "$NODE_IMAGE" \
  sh -c 'npm ci --ignore-scripts --no-audit --no-fund --loglevel=error >/dev/null && npx drizzle-kit migrate' \
  || die "drizzle-kit migrate gagal — restore dari $backup bila perlu"

# ── Verifikasi ──
expected=$((applied_count + $(echo "$pending" | wc -l)))
actual="$(echo "select count(*) from drizzle.__drizzle_migrations;" | psql_db)"
[ "$actual" = "$expected" ] || die "tercatat $actual migrasi, diharapkan $expected — periksa manual"
log "Selesai: $(echo "$pending" | wc -l) migrasi diterapkan ($actual tercatat). Backup sebelum migrasi: $backup"
