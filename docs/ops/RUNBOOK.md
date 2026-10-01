# Runbook Operasional

## Prasyarat

- Node.js 20+
- Docker dan Docker Compose untuk PostgreSQL lokal atau deployment container
- Nilai rahasia yang diisi dari pengelola konfigurasi; jangan commit `.env`

## Menjalankan Lokal

```bash
npm ci
Copy-Item .env.example .env
docker compose -f docker-compose.alas.yml up alas-db -d
npx drizzle-kit migrate
npm run dev
```

Server pengembangan tersedia di `http://localhost:3000`. Database lokal diekspos ke port host `5433`.

Lengkapi minimal nilai berikut di `.env`:

| Variabel | Kegunaan |
| --- | --- |
| `DATABASE_URL` | Koneksi PostgreSQL aplikasi. |
| `ALAS_SERVICE_TOKEN` | Token bearer untuk Service API; harus cocok dengan Lawet Hub. |
| `ALAS_WEBHOOK_SECRET` | Secret HMAC untuk write Direct Service; harus cocok dengan Lawet Hub dan berbeda dari bearer token. |
| `ALAS_REPLAY_WINDOW_SECONDS` | Usia maksimum signature write; default deployment `300`. |
| `LAWET_API_URL` | URL internal API Lawet Hub untuk login dan pembacaan panel. |
| `LAWET_PUBLIC_URL` | Origin Lawet Hub yang dapat dibuka browser untuk workflow tulis. |
| `LAWET_REQUEST_TIMEOUT_MS` | Timeout request proxy media ke Lawet Hub; default deployment `5000`. |
| `ALAS_ADMIN_ROLE_LEVEL` | Level role minimum yang dianggap admin dan boleh meninjau approval (default `3`). |

## Migrasi Database

Sebelum menjalankan aplikasi dengan perubahan skema:

```bash
npx drizzle-kit migrate
```

Jalankan dari root repositori setelah `DATABASE_URL` menunjuk ke database target. Backup database terlebih dahulu untuk lingkungan produksi. Jangan mengedit migrasi yang sudah diterapkan.

### Produksi: `scripts/migrate-prod.sh`

Image produksi (Next.js standalone) tidak membawa `drizzle-kit` dan **tidak** menjalankan migrasi saat start; deploy image saja tidak mengubah skema. Di server, dari root repo produksi (`/opt/docker-compose/etalase`):

```bash
bash scripts/migrate-prod.sh --dry-run            # tampilkan migrasi tertunda + SQL destruktif
bash scripts/migrate-prod.sh                      # backup lalu migrate (konfirmasi "YA")
bash scripts/migrate-prod.sh --allow-destructive  # wajib bila ada DROP/TRUNCATE/DELETE
```

Skrip menentukan migrasi tertunda dengan aturan yang sama seperti `drizzle-kit` (entri journal dengan `when` lebih baru dari migrasi terakhir di `drizzle.__drizzle_migrations`), menolak SQL destruktif tanpa `--allow-destructive`, membuat backup `pg_dump` ke `/root/pre-deploy/alas-<waktu>-pre-migrate.sql.gz`, lalu menjalankan `drizzle-kit migrate` di container `node` sementara dari **salinan** repo pada network `alas-db` (folder produksi tidak terisi `node_modules`), dan memverifikasi jumlah migrasi tercatat. Opsi lingkungan: `DB_CONTAINER`, `BACKUP_DIR`, `NODE_IMAGE`.

Catatan: `when` migrasi `0002` di journal berbeda dari yang tercatat di database produksi; karena itu jangan mencocokkan migrasi per entri.

## Deployment Docker

1. Buat `.env` produksi dari `.env.example` dan isi semua rahasia.
2. Tarik image dan jalankan stack:

   ```bash
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d
   ```

3. Jalankan migrasi dengan akses jaringan ke `alas-db`: `bash scripts/migrate-prod.sh` (lihat [Migrasi Database](#produksi-scriptsmigrate-prodsh)).
4. Arahkan reverse proxy/tunnel HTTPS ke Nginx pada port host `2006`. Terminasi TLS harus berada di proxy publik; koneksi HTTP pada compose hanya untuk jaringan internal.
5. Verifikasi health check:

   ```bash
   curl http://localhost:2006/api/health
   ```

Stack produksi terdiri dari `alas-db` (PostgreSQL hanya pada jaringan internal), `alas-app` (Next.js pada port internal 3000/host 3001), dan `alas-nginx` (port host 2006). `ALAS_DB_PASSWORD` wajib diisi; Compose berhenti sebelum start jika nilainya tidak tersedia. Konfigurasi Nginx (`nginx/alas.conf`) secara ketat memblokir rute mock pengujian (`/api/mock/`) dengan HTTP 404 di lingkungan produksi. Workflow GitHub Actions membangun serta mendorong image GHCR ketika ada push ke `main`.

### Migrasi pembersihan 0010

Migrasi `0010_drop_legacy_admin_and_outbox` menghapus tabel `site_settings` (pengaturan hero `/admin` yang tidak lagi dipakai beranda) dan `alas_outbox` (antrean ADR-0004 yang digantikan ADR-0005). Di produksi sudah diterapkan 1 Okt 2026 (`alas_outbox` hanya berisi 1 baris uji; backup `/root/pre-deploy/alas-20261001-1812.sql.gz`). Untuk lingkungan lain jalankan `bash scripts/migrate-prod.sh --allow-destructive`. Volume `alas_public_uploads` tetap dipakai untuk cache kategori.

## Pemeriksaan Insiden Singkat

| Gejala | Pemeriksaan awal |
| --- | --- |
| Situs atau API publik gagal | `GET /api/health`, lalu periksa log `alas-nginx` dan `alas-app`. |
| Health check gagal database | Periksa status `alas-db`, `DATABASE_URL`, dan kredensial PostgreSQL. |
| Service API 401 | Periksa bearer, HMAC secret, timestamp host, path/body yang ditandatangani, dan replay window. |
| Panel login/visibilitas gagal | Pastikan `LAWET_API_URL` dapat dijangkau dari container `alas-app`. |
| Tautan pengajuan/approval gagal | Pastikan `LAWET_PUBLIC_URL` adalah origin HTTPS yang dapat dijangkau browser pengguna. |
| Media terlindungi gagal | Periksa masa berlaku `lawet_token`, prefix objek jurnal, keterjangkauan Lawet Hub, dan `LAWET_REQUEST_TIMEOUT_MS`. |
| Jurnal tidak muncul publik | Periksa `alas_sync_outbox` di Lawet Hub (`status`, `attempts`, `available_at`, `last_error`), lalu `service_events` dan `is_published` di ALAS. |
