# PRD — ALAS (Arsip Langkah Bawaslu Kebumen)
**Versi:** 1.2 | **Tanggal:** Juli 2026 | **Status:** Final — Revised
**Author:** Adh | **Reviewer:** —
**Changelog dari v1.1:** Arsitektur diubah dari webhook-push ke API-first. ALAS tidak lagi punya admin dashboard — semua manajemen konten (publish, visibility toggle) pindah ke Lawet Hub dashboard. HMAC webhook, reconciliation job, dan admin session dihapus.

---

## 1. Background & Problem Statement

Bawaslu Kebumen tidak memiliki jurnal kegiatan / catatan perjalanan institusi yang terpusat. Dokumentasi kegiatan tersebar di berbagai channel (Instagram, WA, file lokal staff) tanpa indeks kronologis maupun pencarian terstruktur.

**Root cause:** tidak ada *single source of truth* untuk histori kegiatan institusi yang terstruktur secara kronologis dan dapat diakses publik sebagai bentuk transparansi.

---

## 2. Goals & Non-Goals

**Goals**
- Menyediakan arsip kronologis kegiatan institusi yang dapat diakses publik (transparansi).
- Memungkinkan browsing kegiatan berdasarkan rentang waktu via kalender interaktif.
- Memungkinkan pencarian jurnal berdasarkan kata kunci (judul, pihak terkait) dan filter kategori dari navbar.
- Zero duplikasi effort: konten kegiatan dikelola dari Lawet Hub dashboard, otomatis tersinkron ke ALAS.
- Read-side (landing page) terdekopling dari Lawet Hub — ALAS tetap bisa serve traffic publik walau Lawet Hub sedang tidak aktif (data sudah di ALAS DB).
- Admin dapat mengontrol visibilitas dokumen pendukung (public/private) per-dokumen dari **Lawet Hub dashboard**, tanpa membuka aplikasi terpisah.

**Non-Goals (v1.2)**
- ALAS tidak memiliki admin dashboard sendiri. Semua manajemen konten di Lawet Hub.
- ALAS tidak melakukan approval workflow — itu domain Lawet Hub.
- Tidak ada user-generated content (komentar publik, like, dll.).
- ALAS tidak mengelola autentikasi user — hanya service token untuk komunikasi M2M.

---

## 3. System Architecture

```
┌────────────────────────────┐    Service API (Bearer token)    ┌──────────────────────────────┐
│         LAWET HUB           │ ────────────────────────────────▶│             ALAS             │
│   (write-side / CMS)        │                                   │   (read-side, public)        │
│                              │ ◀──────────────────────────────  │                              │
│  - Modul Jurnal ALAS         │   JSON response                  │  Next.js 14 App Router       │
│  - Dashboard superadmin      │                                   │  ┌──────────────────────┐   │
│  - PostgreSQL (lawet)        │                                   │  │  Public Landing Page  │   │
│  - MinIO (lawet-media)       │                                   │  │  /                   │   │
│  - Celery + Redis            │                                   │  └──────────────────────┘   │
└──────────┬───────────────────┘                                   │  PostgreSQL (alas)           │
           │ on publish:                                            │  No MinIO credential         │
           │ 1. promote assets (lawet-media → alas-public-assets)  └──────────────────────────────┘
           │ 2. POST /api/service/jurnal (ALAS Service API)
           ▼
   ┌────────────────────┐   public-read
   │  MinIO (shared)    │ ─────────────────────────────────▶ ALAS landing page
   │  alas-public-assets│   public asset URL embedded in ALAS DB
   └────────────────────┘
```

### 3.1 Sync Mechanism — Direct Service API

Tidak ada lagi webhook push. Lawet Hub memanggil ALAS Service API secara **langsung dan sinkron**:

| Aksi di Lawet Hub | ALAS Service API yang dipanggil |
|---|---|
| Publish jurnal baru | `POST /api/service/jurnal` |
| Edit jurnal yang sudah published | `PATCH /api/service/jurnal/{source_id}` |
| Unpublish jurnal | `PATCH /api/service/jurnal/{source_id}` dengan `is_published: false` |
| Toggle is_public per dokumen | `PATCH /api/service/jurnal/{source_id}/dokumen` |
| Hapus jurnal (soft) | `DELETE /api/service/jurnal/{source_id}` |

Idempotency key: `source_id` (UUID di Lawet Hub). Upsert via `ON CONFLICT (source_id) DO UPDATE`.

**Merge strategy `dokumen_pendukung`:**
Saat upsert via service API, ALAS mencocokkan dokumen incoming by `url`. Dokumen yang sudah ada → preserve nilai `is_public` (ALAS-owned). Dokumen baru → default `is_public: true`. Dokumen hilang dari payload → dihapus.

`is_public` adalah field yang sepenuhnya di-own ALAS-side. Lawet Hub mengirim dan membaca nilainya melalui service API, tapi tidak punya opini soal default-nya.

### 3.2 Sequence Flows

**Flow Publish Jurnal:**
```
User (Lawet Hub) → Form Jurnal → Submit →
  1. Save JurnalAlas ke DB Lawet Hub (status: draft)
  2. Upload assets ke MinIO bucket lawet-media
  3. Klik "Publish" →
  4. Lawet Hub backend: promote_jurnal_assets()
     → Copy lawet-media → alas-public-assets
     → Update URL ke alas-public-assets endpoint
  5. Lawet Hub backend: POST /api/service/jurnal
     → Header: Authorization: Bearer ALAS_SERVICE_TOKEN
     → Body: payload dengan alas-public-assets URLs
  6. ALAS: validasi token → upsert ke DB → return 201/200
  7. Lawet Hub: update JurnalAlas.last_synced_at = now()
```

**Flow Toggle Visibilitas Dokumen (dari Lawet Hub Dashboard):**
```
Admin Lawet Hub → Menu "Jurnal ALAS" → Pilih jurnal → Tab "Dokumen" →
  1. GET /api/service/jurnal/{source_id} (full dengan seluruh dokumen, public+private)
  2. Toggle is_public per dokumen di UI Lawet Hub
  3. Klik "Simpan" → PATCH /api/service/jurnal/{source_id}/dokumen
  4. ALAS DB: UPDATE jurnal SET dokumen_pendukung = :merged_jsonb WHERE source_id = :id
  5. Public endpoint /api/jurnal/{id} otomatis hanya return dokumen is_public: true
```

**Flow Edit/Unpublish:**
```
Admin Lawet Hub → Edit jurnal → Save →
  PATCH /api/service/jurnal/{source_id}
  ALAS: merge upsert (preserve is_public per dokumen yang sudah ada)

Admin Lawet Hub → Unpublish →
  PATCH /api/service/jurnal/{source_id} { is_published: false }
  ALAS: set is_published = false (soft hide, data tetap ada)
```

### 3.3 Storage Strategy

- Reuse MinIO instance existing Lawet Hub.
- Bucket baru: `alas-public-assets`, **public-read bucket policy**, namespace `jurnal/{source_id}/{filename}`.
- Saat publish di Lawet Hub → Lawet Hub **copy** (bukan move) dari `lawet-media` → `alas-public-assets`.
- ALAS app **tidak pernah memegang MinIO credential**. URL aset diterima sebagai string dari service API call.

---

## 4. Data Model

### 4.1 ALAS — PostgreSQL (schema `alas`)

```sql
CREATE TABLE jurnal (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id           UUID NOT NULL UNIQUE,
    judul               TEXT NOT NULL,
    tanggal_kegiatan    DATE NOT NULL,
    kategori            VARCHAR(50) NOT NULL,             -- mou | sengketa | audiensi | pelaporan | lainnya
    link_publikasi      TEXT,
    dokumentasi         JSONB DEFAULT '[]',
    -- [{ "url": str, "caption": str, "type": "image"|"video" }]
    dokumen_pendukung   JSONB DEFAULT '[]',
    -- [{ "nama": str, "url": str, "tipe": "pdf", "is_public": bool }]  ← is_public: ALAS-owned
    pihak_terkait       JSONB DEFAULT '[]',
    -- [{ "nama": str, "instansi": str|null }]
    custom_fields       JSONB DEFAULT '[]',
    -- [{ "label": str, "value": str }]
    is_published        BOOLEAN NOT NULL DEFAULT true,
    synced_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jurnal_tanggal ON jurnal (tanggal_kegiatan DESC);
CREATE INDEX idx_jurnal_kategori ON jurnal (kategori);
CREATE UNIQUE INDEX idx_jurnal_source_id ON jurnal (source_id);
```

> Tabel `admin_session` **tidak ada** di v1.2 — tidak ada admin dashboard ALAS.

### 4.2 `pimpinan` Table

```sql
CREATE TABLE pimpinan (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id       UUID NOT NULL UNIQUE,          -- UUID dari Lawet Hub
    nama            TEXT NOT NULL,
    jabatan         TEXT NOT NULL,                 -- mis. "Ketua", "Anggota", "Kordiv PPL"
    foto_url        TEXT,                          -- URL MinIO alas-public-assets
    bio             TEXT,                          -- untuk modal profil
    periode_mulai   DATE NOT NULL,
    periode_selesai DATE,                          -- NULL = masih aktif
    urutan          INTEGER NOT NULL DEFAULT 0,    -- urutan tampil di panel
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pimpinan_periode ON pimpinan (periode_mulai, periode_selesai);
CREATE UNIQUE INDEX idx_pimpinan_source_id ON pimpinan (source_id);
CREATE INDEX idx_pimpinan_urutan ON pimpinan (urutan);
```

**Period query logic:** Saat `activeDate` (tanggal aktif dari jurnal yang sedang dilihat) diketahui:
```sql
WHERE is_active = true
  AND periode_mulai <= :active_date
  AND (periode_selesai IS NULL OR periode_selesai >= :active_date)
ORDER BY urutan ASC
```

### 4.3 `dokumen_pendukung` JSONB Item Schema

```json
{
  "nama": "Notulen Rapat",
  "url": "https://media.domain.com/alas-public-assets/jurnal/uuid/notulen.pdf",
  "tipe": "pdf",
  "is_public": true
}
```

`is_public` **tidak dikirim** dari Lawet Hub dalam payload create/update jurnal. Ditambahkan ALAS saat upsert (default `true` untuk dokumen baru). Hanya bisa diubah via endpoint khusus PATCH dokumen.

### 4.4 Index Strategy

| Index | Alasan |
|---|---|
| `idx_jurnal_tanggal DESC` | Sort utama listview & kalender |
| `idx_jurnal_kategori` | Filter by kategori |
| `idx_jurnal_source_id UNIQUE` | Idempotency key upsert |
| `idx_pimpinan_periode` | Period-based lookup saat activeDate berubah |
| `idx_pimpinan_source_id UNIQUE` | Idempotency key upsert pimpinan |

---

## 5. Integration Contract

### 5.1 Autentikasi Service API

Semua endpoint `/api/service/*` wajib header:
```
Authorization: Bearer <ALAS_SERVICE_TOKEN>
```

`ALAS_SERVICE_TOKEN`: static shared secret (env var di kedua sisi). Generate: `openssl rand -hex 32`.

ALAS memvalidasi token dengan simple string comparison terhadap env var. Jika mismatch → 401.

> Untuk v1.2, static token cukup (Lawet Hub adalah satu-satunya service client). Rotasi ke short-lived M2M JWT dapat dilakukan di v2.0 jika ada kebutuhan multi-client.

### 5.2 Public Read API

**Convention:** semua response `{ "status": "ok"|"error", "data": ... }` | ISO 8601 | rate limit 100 req/min per IP.

#### `GET /api/jurnal?cursor=&limit=20&kategori=&q=`

List jurnal, sort `tanggal_kegiatan DESC`. Hanya entry `is_published = true`. `dokumen_pendukung` dengan `is_public = false` **tidak muncul**.

**Query Parameters:**

| Param | Tipe | Keterangan |
|---|---|---|
| `cursor` | UUID (optional) | ID item terakhir untuk cursor pagination |
| `limit` | int (default 20, max 50) | Jumlah item per halaman |
| `kategori` | enum (optional) | Filter: `mou` \| `sengketa` \| `audiensi` \| `pelaporan` \| `lainnya` |
| `q` | string (optional) | Full-text search: `ILIKE '%q%'` pada `judul` dan `pihak_terkait` (nama) |

> Saat `q` aktif, `cursor` pagination di-reset. Sort tetap `tanggal_kegiatan DESC`.
> Saat `kategori` dan `q` keduanya aktif, keduanya diaplikasikan (AND condition).

**Response 200:**
```json
{
  "status": "ok",
  "data": [
    {
      "id": "uuid-alas",
      "source_id": "uuid-lawet",
      "judul": "Bawaslu Kebumen Teken MoU",
      "tanggal_kegiatan": "2026-06-15",
      "kategori": "mou",
      "thumbnail_url": "https://media.domain.com/alas-public-assets/jurnal/uuid/foto1.jpg",
      "pihak_terkait": [{ "nama": "Universitas Putra Bangsa", "instansi": null }],
      "created_at": "2026-07-01T08:00:00Z"
    }
  ],
  "pagination": { "next_cursor": "uuid-item-20", "has_more": true, "total": 142 }
}
```

#### `GET /api/jurnal/calendar?month=YYYY-MM`

Tanggal-tanggal di bulan tertentu yang memiliki entry published.

**Response 200:**
```json
{
  "status": "ok",
  "data": { "year": 2026, "month": 6, "dates": [1, 3, 5, 15, 22], "total_entries": 5 }
}
```

#### `GET /api/jurnal/{id}`

Detail satu entry. Pengunjung anonim tidak menerima `dokumen_pendukung`; pengguna login menerima yang `is_public` bukan `false`, sedangkan superadmin, approver divisinya, dan pemilik menerima semuanya. Field `is_public` tidak dikirim ke response. Jurnal non-publik menjawab `404` bagi yang tidak berwenang.

#### `GET /api/health`

```json
{ "status": "ok", "service": "alas", "db_connected": true }
```

#### `GET /api/pimpinan?date=YYYY-MM-DD`

Ambil daftar pimpinan yang aktif pada tanggal tertentu (period-based). Dipakai frontend saat `activeDate` berubah.

**Query Parameters:**

| Param | Tipe | Keterangan |
|---|---|---|
| `date` | `YYYY-MM-DD` (optional) | Tanggal referensi. Default: today. |

**Response 200:**
```json
{
  "status": "ok",
  "data": [
    {
      "id": "uuid",
      "nama": "Dr. Agus Widodo, S.H., M.H.",
      "jabatan": "Ketua",
      "foto_url": "https://media.domain.com/alas-public-assets/pimpinan/uuid/foto.jpg",
      "periode_mulai": "2023-02-01",
      "periode_selesai": "2028-01-31",
      "urutan": 1
    }
  ]
}
```

> `bio` tidak dikembalikan di list — hanya di detail. Fetch detail saat card diklik (lazy load modal).

#### `GET /api/pimpinan/{id}`

Detail lengkap satu pimpinan, termasuk `bio` untuk modal profil.

**Response 200:**
```json
{
  "status": "ok",
  "data": {
    "id": "uuid",
    "nama": "Dr. Agus Widodo, S.H., M.H.",
    "jabatan": "Ketua",
    "foto_url": "https://media.domain.com/alas-public-assets/pimpinan/uuid/foto.jpg",
    "bio": "Bergabung sebagai Komisioner Bawaslu Kebumen sejak 2023...",
    "periode_mulai": "2023-02-01",
    "periode_selesai": "2028-01-31",
    "urutan": 1
  }
}
```

### 5.3 Service API — Pimpinan (Lawet Hub → ALAS, Bearer token required)

> Sama dengan jurnal — semua `/api/service/pimpinan/*` wajib `Authorization: Bearer ALAS_SERVICE_TOKEN`.

| Endpoint | Method | Fungsi |
|---|---|---|
| `/api/service/pimpinan` | POST | Create / upsert pimpinan by `source_id` |
| `/api/service/pimpinan/{source_id}` | PATCH | Update data pimpinan |
| `/api/service/pimpinan/{source_id}` | DELETE | Soft delete (`is_active = false`) |
| `/api/service/pimpinan` | GET | List semua pimpinan (termasuk inactive) |

**Payload POST/PATCH:**
```json
{
  "source_id": "uuid-dari-lawet-hub",
  "nama": "Dr. Agus Widodo, S.H., M.H.",
  "jabatan": "Ketua",
  "foto_url": "https://media.domain.com/alas-public-assets/pimpinan/uuid/foto.jpg",
  "bio": "Bergabung sebagai Komisioner Bawaslu Kebumen sejak 2023...",
  "periode_mulai": "2023-02-01",
  "periode_selesai": "2028-01-31",
  "urutan": 1
}
```

> `urutan` menentukan urutan tampil di leadership panel. Lawet Hub admin dapat drag-reorder dan kirim urutan baru via PATCH.

### 5.4 Service API — Jurnal (Lawet Hub → ALAS, Bearer token required)
#### `POST /api/service/jurnal` — Create / Upsert

```json
// Request
{
  "source_id": "uuid-dari-lawet-hub",
  "judul": "Bawaslu Kebumen Teken MoU",
  "tanggal_kegiatan": "2026-06-15",
  "kategori": "mou",
  "link_publikasi": "https://bawaslu.go.id/artikel/123",
  "dokumentasi": [
    { "url": "https://media.domain.com/alas-public-assets/jurnal/uuid/foto1.jpg", "caption": "...", "type": "image" }
  ],
  "dokumen_pendukung": [
    { "nama": "Notulen Rapat", "url": "https://media.domain.com/alas-public-assets/jurnal/uuid/notulen.pdf", "tipe": "pdf" }
  ],
  "pihak_terkait": [{ "nama": "Universitas Putra Bangsa", "instansi": null }],
  "custom_fields": [{ "label": "Nomor Surat", "value": "001/SK/2026" }]
}

// Response 201 (created) atau 200 (updated)
{ "status": "ok", "id": "uuid-alas", "source_id": "uuid-lawet", "action": "created" }
```

> `dokumen_pendukung` tidak memiliki `is_public` dalam request — ALAS mengelola sendiri.

#### `PATCH /api/service/jurnal/{source_id}` — Update Jurnal

Sama dengan POST, plus bisa set `is_published`:
```json
{ "is_published": false }  // untuk unpublish
```

#### `PATCH /api/service/jurnal/{source_id}/dokumen` — Toggle Visibility

```json
// Request — kirim seluruh array dokumen_pendukung dengan is_public terbaru
{
  "dokumen_pendukung": [
    { "nama": "Notulen Rapat", "url": "https://...", "tipe": "pdf", "is_public": true },
    { "nama": "Produk Hukum", "url": "https://...", "tipe": "pdf", "is_public": false }
  ]
}

// Response 200
{ "status": "ok", "updated": 2 }
```

#### `DELETE /api/service/jurnal/{source_id}` — Soft Delete

```json
// Response 200
{ "status": "ok", "source_id": "uuid-lawet" }
// Sets is_published = false. Data tidak dihapus dari DB (audit trail).
```

#### `GET /api/service/jurnal` — List All (untuk Lawet Hub admin)

List semua jurnal termasuk yang unpublished. Mendukung `?source_id=` untuk lookup spesifik.

#### `GET /api/service/jurnal/{source_id}` — Detail Lengkap

Mengembalikan seluruh dokumen_pendukung termasuk yang `is_public = false`.

### 5.4 Response Error Codes

| Code | HTTP | Penyebab |
|---|---|---|
| `UNAUTHORIZED` | 401 | Service token tidak valid / missing |
| `NOT_FOUND` | 404 | source_id tidak ditemukan |
| `VALIDATION_ERROR` | 422 | Missing field / tipe salah |
| `INTERNAL_ERROR` | 500 | DB error / unhandled |

---

## 6. Frontend Specification

### 6.1 Design System

**Palette:**

| Token | Hex | Penggunaan |
|---|---|---|
| `--color-ink` | `#0C0C0C` | Background utama landing page |
| `--color-ember-deep` | `#481E14` | Navbar, card overlay gradient |
| `--color-ember-mid` | `#9B3922` | Hover states, border aktif, dot marker kalender |
| `--color-ember-bright` | `#F2613F` | CTA primary, badge kategori, tanggal aktif kalender |
| `--color-surface` | `#F9F4F1` | Background card/modal |
| `--color-text-muted` | `#C2A89A` | Timestamp, metadata sekunder |

**Typography:**

| Role | Font |
|---|---|
| Display / Logo | `Playfair Display` (Bold 700) |
| Body | `Inter` (Regular 400, Medium 500) |
| Mono / Tanggal | `IBM Plex Mono` (Regular) |

Semua font via Google Fonts CDN.

**Karakteristik visual:**
- Latar landing page `#0C0C0C` — membalikkan konvensi government website
- Card jurnal: `--color-surface` dengan left-border tebal `--color-ember-bright`
- Kalender: background `#481E14`, tanggal aktif dot `#F2613F`
- Tidak ada shadow / rounded besar — tajam, archival, sedikit Bauhaus

**Icon library:** `lucide-react` (konsisten dengan Lawet Hub)

### 6.2 Pages & Routes (ALAS Only)

| Route | Komponen | Auth |
|---|---|---|
| `/` | `LandingPage` | Public |

> Tidak ada `/admin/*` routes di ALAS v1.2. Manajemen konten sepenuhnya di Lawet Hub.

### 6.3 Landing Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  NAVBAR (sticky, bg: --color-ember-deep)                         │
│  [ALAS logo]      [🔍 Cari jurnal...]  [Semua ▼]  [Kelola →]   │
├────────────────────────┬────────────────────────────────────────┤
│  LEFT COLUMN (60%)     │  RIGHT COLUMN (40%) sticky top: 80px  │
│                        │                                        │
│  <JurnalCard />        │  ┌──────────────────────────────────┐  │
│  [──────futuristic─────┼──┤ LEADERSHIP PANEL                 │  │
│  ────line────────────► │  │                                  │  │
│  <JurnalCard />        │  │  [◇Foto1] [◇Foto2] [◇Foto3]     │  │
│  ──────────────────    │  │  nama muncul saat hover          │  │
│  <JurnalCard />        │  └──────────────────────────────────┘  │
│  (infinite scroll)     │                                        │
│                        │  ┌──────────────────────────────────┐  │
│                        │  │ CALENDAR WIDGET                  │  │
│                        │  │  ● 15  ● 22  ● 30               │  │
│                        │  │  [< Juni] [Juli >]               │  │
│                        │  └──────────────────────────────────┘  │
└────────────────────────┴────────────────────────────────────────┘
```

**Navbar anatomy (kiri → kanan):**
```
[ALAS logo]   ←── flex-1 ──→   [🔍 Cari judul / pihak terkait...]  [Semua ▼]  [Kelola →]
                                 SearchBar (200-280px)              Dropdown    Link
```

- **Logo ALAS** — `Playfair Display` bold, kiri
- **SearchBar** — input text, placeholder "Cari jurnal...", debounced 300ms, icon `lucide-react/Search`
- **Kategori Dropdown** — pill/select: `Semua | MoU | Sengketa | Audiensi | Pelaporan | Lainnya`
- **Link "Kelola →"** — link ke `LAWET_HUB_ADMIN_URL`, paling kanan, muted styling

> Saat search/filter aktif: kalender tetap menampilkan bulan aktif, tapi klik tanggal kalender **mereset** filter dan scroll ke tanggal tersebut.

> Navbar button "Kelola →" adalah link ke `LAWET_HUB_ADMIN_URL` (env var). Bukan login.

**Search/Filter behavior:**
- `q` param: debounce 300ms sebelum trigger fetch. Saat `q` aktif, cursor pagination di-reset.
- `kategori` param: dropdown select. Bisa dikombinasikan dengan `q`.
- State keduanya di URL query string (`?q=mou&kategori=sengketa`) untuk shareable link.
- Saat tidak ada hasil: empty state "Tidak ada jurnal ditemukan" dengan tombol reset filter.

**JurnalCard anatomy:**
```
┌─ border-left: 4px --color-ember-bright ─────────────────────┐
│ [kategori badge — --color-ember-mid]   15 Juni 2026          │
│ Judul Kegiatan Dalam Satu Atau Dua Baris                     │
│ Pihak terkait: Universitas Putra Bangsa                      │
│                              [Lihat Detail →]                │
│ ────────── futuristic line ──────────────────────────────►   │
└──────────────────────────────────────────────────────────────┘
```

**Futuristic Line (card → tanggal kalender):**
SVG overlay dirender di atas dua kolom. Saat `activeDate` berubah:
1. Line dari right-edge card aktif → left-edge kalender pada dot tanggal tersebut
2. Posisi dihitung via `getBoundingClientRect()` + scroll offset
3. Line digambar dengan `stroke-dasharray` + CSS animation `stroke-dashoffset: length → 0`
4. Line: warna `--color-ember-bright` opacity 0.6, thickness 1px, dengan dot di kedua ujung
5. Saat card bukan aktif atau tidak ada tanggal: line fade out

### 6.4 Leadership Panel

**Position:** Di atas `CalendarWidget` di right column. Jika urutan lebih dari tampilan, scroll horizontal (no scrollbar visible, touch/drag).

**Period Sync:** Panel menampilkan pimpinan yang aktif pada `activeDate`:
- `activeDate` = `tanggal_kegiatan` dari JurnalCard yang sedang di-intersect di left column
- Saat user scroll ke jurnal periode berbeda → fetch `GET /api/pimpinan?date=YYYY-MM-DD`
- Transisi: pimpinan lama fade out → pimpinan baru fade in + slide dari kanan
- Cache per `activeDate` dengan TanStack Query (stale 10 menit)

**LeaderCard — Spec Visual:**

```
┌────────────────────────────────┐
│  Shape: parallelogram 3:4 ratio │
│                                  │
│  ╱─────────────────╲            │
│ ╱   [foto wajah]    ╲           │  ← CSS clip-path: parallelogram
│ ╲    400×300px      ╱           │  ← atau transform: skewX(-8deg)
│  ╲─────────────────╱            │
│                                  │
│  outline: 1px solid             │
│    --color-leader-outline        │  ← CSS var, default: rgba(white, 0.15)
│    (tidak hardcode)              │
│                                  │
│  [ NAMA — di BELAKANG card ]     │  ← visible only on hover
└────────────────────────────────┘
```

**CSS custom property baru:**
```css
:root {
  --color-leader-outline: rgba(255, 255, 255, 0.15); /* thin white outline */
  --card-skew: -8deg;                                 /* miring parallelogram */
}
```

**Hover effect:**
```css
.leader-card {
  transform: skewX(var(--card-skew));
  transition: transform 250ms ease, box-shadow 250ms ease;
  position: relative;
}

.leader-card:hover {
  transform: skewX(var(--card-skew)) translateY(-8px); /* naik */
  box-shadow: 0 12px 32px rgba(242, 97, 63, 0.25);
}

/* Nama — di belakang/bawah card, muncul saat hover */
.leader-card .leader-name-reveal {
  position: absolute;
  bottom: -28px;
  left: 0; right: 0;
  text-align: center;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 200ms ease 50ms, transform 200ms ease 50ms;
  font: 500 12px/1.4 Inter, sans-serif;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.leader-card:hover .leader-name-reveal {
  opacity: 1;
  transform: translateY(0);
}
```

> Nama tampil **di bawah card** (bukan di overlay foto) saat hover, dengan efek naik halus. Card yang naik secara visual "membuka" nama yang tersembunyi di bawahnya.

**Click behavior:** Klik LeaderCard → fetch `GET /api/pimpinan/{id}` → buka `LeaderProfileModal`.

**LeaderProfileModal anatomy:**
1. Foto pimpinan — full width atas, dengan gradient overlay
2. Nama + jabatan — `Playfair Display`
3. Periode jabatan — `IBM Plex Mono`, format `01 Feb 2023 — 31 Jan 2028`
4. Bio — body text, max 5 baris dengan expand
5. Tombol tutup (X) kanan atas

### 6.5 Animation Specification

> **Semua animasi menggunakan CSS custom properties untuk duration/easing** sehingga mudah disesuaikan tema:
> ```css
> :root {
>   --anim-fast: 200ms;
>   --anim-normal: 350ms;
>   --anim-slow: 500ms;
>   --anim-ease: cubic-bezier(0.4, 0, 0.2, 1);
>   --anim-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
> }
> ```

#### Opening Animation (page load)

Diimplementasikan via CSS `@keyframes` + `animation-delay` (tidak pakai JS animation library).

**Urutan dan timing:**

| Elemen | Mulai | Duration | Effect |
|---|---|---|---|
| Navbar / Logo | 0ms | 400ms | `translateY(-20px) opacity:0` → normal, ease-out |
| JurnalCard #1 | 200ms | 400ms | `translateX(-60px) opacity:0` → normal, ease-out |
| JurnalCard #2 | 320ms | 400ms | same (delay +120ms — efek tangga) |
| JurnalCard #3 | 440ms | 400ms | same (delay +120ms lagi) |
| JurnalCard #N | 200 + (N×120)ms | 400ms | stagger terus sampai card ke-5, sisanya langsung visible |
| Futuristic line | 800ms | 600ms | `stroke-dashoffset: 100% → 0`, ease-in-out |
| CalendarWidget | 250ms | 450ms | `translateX(60px) opacity:0` → normal, ease-out |
| LeaderCard #1 | 300ms | 400ms | `translateX(60px) opacity:0` → normal, ease-out |
| LeaderCard #2 | 420ms | 400ms | same (delay +120ms) |
| LeaderCard #3 | 540ms | 400ms | same (delay +120ms) |
| LeaderCard #N | 300 + (N×120)ms | 400ms | stagger sampai card ke-4 |

**CSS implementation pattern:**
```css
/* Reusable animation keyframes */
@keyframes slide-from-left {
  from { transform: translateX(-60px); opacity: 0; }
  to   { transform: translateX(0);     opacity: 1; }
}
@keyframes slide-from-right {
  from { transform: translateX(60px);  opacity: 0; }
  to   { transform: translateX(0);     opacity: 1; }
}
@keyframes slide-from-top {
  from { transform: translateY(-20px); opacity: 0; }
  to   { transform: translateY(0);     opacity: 1; }
}
@keyframes line-draw {
  from { stroke-dashoffset: var(--line-length); }
  to   { stroke-dashoffset: 0; }
}

/* Stagger via CSS custom property */
.jurnal-card { animation: slide-from-left var(--anim-normal) var(--anim-ease) both; }
.jurnal-card:nth-child(1) { animation-delay: 200ms; }
.jurnal-card:nth-child(2) { animation-delay: 320ms; }
.jurnal-card:nth-child(3) { animation-delay: 440ms; }
.jurnal-card:nth-child(4) { animation-delay: 560ms; }
.jurnal-card:nth-child(5) { animation-delay: 680ms; }
/* Card 6+ tidak perlu delay — sudah di bawah fold */

.leader-card { animation: slide-from-right var(--anim-normal) var(--anim-ease) both; }
.leader-card:nth-child(1) { animation-delay: 300ms; }
.leader-card:nth-child(2) { animation-delay: 420ms; }
.leader-card:nth-child(3) { animation-delay: 540ms; }
.leader-card:nth-child(4) { animation-delay: 660ms; }

.calendar-widget { animation: slide-from-right 450ms var(--anim-ease) 250ms both; }
.navbar { animation: slide-from-top 400ms var(--anim-ease) 0ms both; }
```

#### Period Change Animation (pimpinan panel ganti)

Saat `activeDate` berubah ke periode berbeda (pimpinan berubah):
1. Pimpinan lama: `opacity: 1 → 0`, `translateX(0 → -20px)`, 200ms ease-in
2. Setelah fetch selesai: pimpinan baru masuk dari kanan (`translateX(40px) → 0`, `opacity: 0 → 1`, stagger 120ms per card)

```typescript
// Deteksi pergantian periode:
const prevPeriodeKey = usePrevious(pimpinanList.map(p => p.id).join(','))
const isChanging = prevPeriodeKey !== currentKey
// Trigger CSS class `leader-panel--changing` saat isChanging = true
// Remove class setelah 250ms (cukup untuk animasi out + in)
```

#### Interaction Animations

| Interaksi | Elemen | Effect |
|---|---|---|
| Hover JurnalCard | Card | `translateY(-3px)`, shadow ember 0.15, 200ms |
| Hover LeaderCard | Card | `translateY(-8px)` + nama muncul, 250ms spring |
| Click LeaderCard | Modal | scale-in `scale(0.9) → 1` + backdrop fade, 300ms |
| Click tanggal kalender | Scroll | `scrollIntoView({ behavior: 'smooth' })`, line redraws |
| Line redraw | SVG | `stroke-dashoffset` animate 400ms ease-in-out |
| Detail Modal open | Modal | backdrop opacity 0→0.7, modal `translateY(20px)→0`, 300ms |
| Detail Modal close | Modal | reverse, 200ms |
| Futuristic line on period change | SVG line | fade out 200ms, redraw 400ms setelah pimpinan panel settled |

#### `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const tanggal = entry.target.getAttribute('data-tanggal')
        if (tanggal) setActiveMonth(tanggal.slice(0, 7)) // YYYY-MM
      }
    })
  },
  { rootMargin: '-40% 0px -40% 0px', threshold: 0 }
)
```

Klik tanggal di kalender → `document.getElementById(source_id).scrollIntoView({ behavior: 'smooth' })`.

### 6.5 State Management

React hooks + TanStack Query. State search/filter di-sync ke URL query string (Next.js `useSearchParams`):

| Hook | Tanggung Jawab |
|---|---|
| `useJurnalList(params)` | Fetch pagination, infinite scroll, cursor tracking. Accept `{ q, kategori }` params |
| `useCalendar(month)` | Fetch `/api/jurnal/calendar?month=`, active date state |
| `useJurnalDetail(id)` | Fetch detail by ID, modal open/close |
| `useJurnalFilter()` | Baca/tulis `q` dan `kategori` dari URL search params, debounce q 300ms |

```typescript
// Contoh useJurnalFilter — sync ke URL
function useJurnalFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const q = searchParams.get('q') ?? ''
  const kategori = searchParams.get('kategori') ?? ''

  const setFilter = useDebouncedCallback((newQ: string, newKategori: string) => {
    const params = new URLSearchParams()
    if (newQ) params.set('q', newQ)
    if (newKategori) params.set('kategori', newKategori)
    router.replace(`/?${params.toString()}`, { scroll: false })
  }, 300)

  return { q, kategori, setFilter }
}
```

> State di URL → link hasil search bisa di-share dan di-bookmark.

Tidak ada Zustand, tidak ada global state library.

### 6.6 Detail Modal

1. **Judul** — `Playfair Display`, 24px
2. **Tanggal & Kategori** — badge + `IBM Plex Mono`
3. **Link Publikasi** — anchor, color `#F2613F`, ikon eksternal
4. **Dokumentasi** — image grid (lightbox untuk foto), video embed untuk mp4
5. **Dokumen Pendukung** — list PDF (icon 📄), hanya yang `is_public = true`. Download via URL langsung.
6. **Pihak Terkait** — chip list, bg `#481E14`
7. **Custom Fields** — key-value tabel tipis

### 6.7 Responsive

| Breakpoint | Layout |
|---|---|
| ≥1024px | Two-column: listview (60%) + kalender sticky (40%) |
| <1024px | Single column: kalender jadi accordion collapse di atas, listview di bawah |

### 6.8 Performance Budget

| Metrik | Target |
|---|---|
| TTFB | < 200ms |
| LCP | < 1.5s |
| CLS | < 0.1 |
| JS Bundle | < 150kB gzip |

---

## 7. Companion Module — Lawet Hub "Modul Jurnal ALAS"

### 7.1 Data Model (Lawet Hub — SQLAlchemy)

```python
class JurnalAlas(Base):
    __tablename__ = "jurnal_alas"
    __table_args__ = {"schema": "lawet"}

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    judul            = Column(Text, nullable=False)
    tanggal_kegiatan = Column(Date, nullable=False)
    kategori         = Column(String(50), nullable=False)
    link_publikasi   = Column(Text, nullable=True)
    dokumentasi      = Column(JSONB, default=list)
    dokumen_pendukung = Column(JSONB, default=list)
    pihak_terkait    = Column(JSONB, default=list)
    custom_fields    = Column(JSONB, default=list)

    division_id      = Column(UUID(as_uuid=True), ForeignKey("lawet.divisions.id"), nullable=True)
    created_by_id    = Column(UUID(as_uuid=True), ForeignKey("lawet.users.id"), nullable=False)
    status           = Column(String(20), default="draft")  # draft | published | unpublished
    last_synced_at   = Column(DateTime(timezone=True), nullable=True)

    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

### 7.2 ALAS Service Client (Lawet Hub)

File: `backend/app/features/jurnal_alas/alas_client.py`

```python
import httpx
from app.core.config import settings

class ALASServiceClient:
    """HTTP client untuk berkomunikasi dengan ALAS Service API."""

    BASE_URL = settings.ALAS_API_URL
    TOKEN = settings.ALAS_SERVICE_TOKEN

    @classmethod
    def _headers(cls) -> dict:
        return {
            "Authorization": f"Bearer {cls.TOKEN}",
            "Content-Type": "application/json"
        }

    @classmethod
    async def upsert_jurnal(cls, payload: dict) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{cls.BASE_URL}/api/service/jurnal",
                json=payload,
                headers=cls._headers()
            )
            resp.raise_for_status()
            return resp.json()

    @classmethod
    async def update_jurnal(cls, source_id: str, payload: dict) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.patch(
                f"{cls.BASE_URL}/api/service/jurnal/{source_id}",
                json=payload,
                headers=cls._headers()
            )
            resp.raise_for_status()
            return resp.json()

    @classmethod
    async def patch_dokumen(cls, source_id: str, dokumen: list) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.patch(
                f"{cls.BASE_URL}/api/service/jurnal/{source_id}/dokumen",
                json={"dokumen_pendukung": dokumen},
                headers=cls._headers()
            )
            resp.raise_for_status()
            return resp.json()

    @classmethod
    async def get_jurnal(cls, source_id: str) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{cls.BASE_URL}/api/service/jurnal/{source_id}",
                headers=cls._headers()
            )
            resp.raise_for_status()
            return resp.json()

    @classmethod
    async def delete_jurnal(cls, source_id: str) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.delete(
                f"{cls.BASE_URL}/api/service/jurnal/{source_id}",
                headers=cls._headers()
            )
            resp.raise_for_status()
            return resp.json()
```

### 7.3 Asset Promotion (Lawet Hub)

Tetap sama — sebelum call ALAS API, Lawet Hub mempromote asset dari `lawet-media` ke `alas-public-assets`:

```python
async def promote_jurnal_assets(jurnal_id: str) -> dict:
    """
    Copy file dari lawet-media → alas-public-assets.
    Return payload dengan URL yang sudah diupdate ke alas-public-assets.
    Dipanggil sebelum upsert_jurnal().
    """
    # minio_client.copy_object(dest_bucket, dest_key, CopySource(src_bucket, src_key))
    # Return updated payload dengan alas-public-assets URLs
    pass
```

### 7.4 Backend Routes (Lawet Hub)

File: `backend/app/features/jurnal_alas/router.py`

| Endpoint | Method | Fungsi |
|---|---|---|
| `/api/v1/jurnal-alas` | GET | List jurnal dengan filter status/division |
| `/api/v1/jurnal-alas` | POST | Buat jurnal baru (status: draft) |
| `/api/v1/jurnal-alas/{id}` | GET | Detail jurnal (dengan semua dokumen) |
| `/api/v1/jurnal-alas/{id}` | PUT | Edit jurnal |
| `/api/v1/jurnal-alas/{id}/publish` | POST | Publish → promote assets → call ALAS upsert |
| `/api/v1/jurnal-alas/{id}/unpublish` | POST | Unpublish → call ALAS PATCH `is_published: false` |
| `/api/v1/jurnal-alas/{id}/dokumen` | PATCH | Toggle is_public → call ALAS PATCH dokumen |

### 7.5 Frontend Routes (Lawet Hub Superadmin)

| Route | Fungsi |
|---|---|
| `/superadmin/jurnal-alas` | List jurnal, filter by status/division |
| `/superadmin/jurnal-alas/buat` | Form buat baru |
| `/superadmin/jurnal-alas/{id}` | Detail + tombol Edit/Publish |
| `/superadmin/jurnal-alas/{id}/edit` | Form edit |
| `/superadmin/jurnal-alas/{id}/dokumen` | Toggle visibilitas dokumen per item |

### 7.6 Permission Model

| Aksi | Role Required |
|---|---|
| Buat / edit draft jurnal | `can_submit` |
| Edit jurnal milik sendiri (masih draft) | Creator |
| Publish / unpublish | Superadmin |
| Hapus (soft, set status=draft) | Superadmin |
| Toggle is_public dokumen | Superadmin |

---

## 8. Security & Data Integrity

| Concern | Mitigasi |
|---|---|
| Unauthorized write ke ALAS DB | Service token validation di setiap request ke `/api/service/*` |
| Token compromise | Rotasi token via env var update + restart container |
| Draft content ter-eksposur di bucket publik | Bucket terpisah `alas-public-assets`, promosi eksplisit hanya saat publish |
| Data inconsistency (ALAS API gagal saat publish) | Lawet Hub status tetap `draft` jika ALAS return error. Admin diminta retry publish. |
| Overwrite `is_public` saat update jurnal | Merge strategy: match dokumen by URL, preserve `is_public` existing |
| Credential sprawl (ALAS ke MinIO) | ALAS zero MinIO credential — hanya terima URL string |
| SQL injection | Drizzle ORM parameterized query, no raw string interpolation |
| Rate limit abuse public API | 100 req/min per IP di Nginx level |

---

## 9. Error Handling

### 9.1 API Call Failure (Lawet Hub → ALAS)

| Skenario | Dampak | Mitigasi |
|---|---|---|
| ALAS down saat publish | ALAS API error (timeout/5xx) | Lawet Hub catch error, kembalikan error ke admin UI. Jurnal tetap tersimpan di Lawet Hub sebagai draft. Admin retry publish kapanpun. |
| Token tidak match | 401 | Log error di Lawet Hub. Cek shared secret kedua sisi. |
| Payload invalid | 422 | Log + tampilkan error detail ke admin. Manual review. |
| Partial success (beberapa jurnal gagal) | Subset data stale | Tampilkan status `last_synced_at` per jurnal di admin list. |

### 9.2 Error Response Codes (ALAS)

| Code | HTTP | Penyebab |
|---|---|---|
| `UNAUTHORIZED` | 401 | Service token tidak valid |
| `NOT_FOUND` | 404 | source_id tidak ditemukan |
| `VALIDATION_ERROR` | 422 | Missing field / tipe salah |
| `INTERNAL_ERROR` | 500 | DB error / unhandled |

---

## 10. Infrastructure & Deployment

### 10.1 Docker Compose (ALAS Stack)

```yaml
# docker-compose.alas.yml
services:
  alas-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${ALAS_DB_NAME}
      POSTGRES_USER: ${ALAS_DB_USER}
      POSTGRES_PASSWORD: ${ALAS_DB_PASSWORD}
    volumes:
      - alas_db_data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - alas-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${ALAS_DB_USER} -d ${ALAS_DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5

  alas-app:
    build: .
    ports:
      - "3001:3000"
    environment:
      DATABASE_URL: postgresql://${ALAS_DB_USER}:${ALAS_DB_PASSWORD}@alas-db:5432/${ALAS_DB_NAME}
      ALAS_SERVICE_TOKEN: ${ALAS_SERVICE_TOKEN}
      LAWET_HUB_ADMIN_URL: ${LAWET_HUB_ADMIN_URL}
      NEXT_PUBLIC_MINIO_PUBLIC_ENDPOINT: ${MINIO_PUBLIC_ENDPOINT}
      NEXT_PUBLIC_ALAS_API_URL: https://alas.bawaslu-kebumen.go.id/api
      SENTRY_DSN: ${SENTRY_DSN}
      NEXT_PUBLIC_SENTRY_DSN: ${NEXT_PUBLIC_SENTRY_DSN}
    depends_on:
      alas-db:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - alas-net

  alas-nginx:
    image: nginx:1.25-alpine
    ports:
      - "2006:80"
    volumes:
      - ./nginx/alas.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - alas-app
    restart: unless-stopped
    networks:
      - alas-net

networks:
  alas-net:
    driver: bridge

volumes:
  alas_db_data:
```

> Tidak ada `lawethub_internal` join. ALAS berdiri di `alas-net` sendiri. Komunikasi Lawet Hub → ALAS via public HTTPS (Cloudflare Tunnel).

### 10.2 Nginx Config

```nginx
server {
    listen 80;
    server_name alas.bawaslu-kebumen.go.id;

    limit_req_zone $binary_remote_addr zone=alas_public:10m rate=100r/m;

    # Public API — rate limited
    location /api/ {
        limit_req zone=alas_public burst=20 nodelay;
        proxy_pass http://alas-app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, OPTIONS";
    }

    # Service API — no public rate limit (token protected)
    # Note: /api/service/* juga tercover oleh block /api/ di atas
    # Tapi tambahkan IP allowlist jika perlu extra protection:
    # allow <lawet-hub-server-ip>;
    # deny all;

    # Frontend
    location / {
        proxy_pass http://alas-app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 10.3 Environment Variables

| Variable | Scope | Required | Keterangan |
|---|---|---|---|
| `ALAS_DB_NAME` / `_USER` / `_PASSWORD` | ALAS | Yes | Credentials Postgres |
| `ALAS_SERVICE_TOKEN` | **kedua sisi** | Yes | Shared static token. Generate: `openssl rand -hex 32` |
| `ALAS_API_URL` | Lawet Hub | Yes | URL ALAS untuk Lawet Hub client |
| `LAWET_HUB_ADMIN_URL` | ALAS | Yes | URL Lawet Hub superadmin untuk navbar link |
| `MINIO_PUBLIC_ENDPOINT` | ALAS | Yes | Base URL untuk render aset dari `alas-public-assets` |
| `NEXT_PUBLIC_ALAS_API_URL` | ALAS | Yes | Public API URL untuk fetch di frontend |
| `SENTRY_DSN` | ALAS | No | Error monitoring (opsional) |
| `NEXT_PUBLIC_SENTRY_DSN` | ALAS | No | Sentry DSN untuk client bundle |

### 10.4 Deployment Topology

```
Cloudflare Tunnel (alas-tunnel, subdomain: alas.bawaslu-kebumen.go.id)
  │
  ▼
Nginx (port 2006, container alas-nginx)
  │
  ▼
Next.js App Router (port 3000, container alas-app)
  │
  ▼
PostgreSQL 16 (port 5432, container alas-db)

MinIO: reuse instance Lawet Hub (tidak di stack ini)
```

---

## 11. Testing Strategy

### 11.1 ALAS — Service & Public API

| Test Case | File |
|---|---|
| Valid token → 200; invalid token → 401 | `tests/test_service_auth.ts` |
| POST jurnal: create baru → 201; same source_id → 200 (upsert) | `tests/test_service_jurnal.ts` |
| Merge `is_public`: dokumen existing preserve nilai, dokumen baru default true | `tests/test_service_jurnal.ts` |
| PATCH dokumen: toggle is_public, persist benar | `tests/test_service_jurnal.ts` |
| DELETE jurnal: is_published = false | `tests/test_service_jurnal.ts` |
| List public: hanya published, dokumen private tidak muncul | `tests/test_public_api.ts` |
| Calendar endpoint: month boundary, empty month | `tests/test_public_api.ts` |
| Detail endpoint: dokumen private tidak muncul di public response | `tests/test_public_api.ts` |

### 11.2 Frontend Tests

| Test Case | File |
|---|---|
| IntersectionObserver: scroll → `activeMonth` update | `tests/LandingPage.test.tsx` |
| Calendar click → scrollIntoView terpanggil | `tests/LandingPage.test.tsx` |
| Modal: open on card click, close on backdrop, field render | `tests/JurnalDetail.test.tsx` |
| Responsive: two-column → single-column di bawah 1024px | `tests/LandingPage.test.tsx` |
| SearchBar: debounce 300ms → URL param `q` terupdate | `tests/SearchFilter.test.tsx` |
| KategoriDropdown: pilih kategori → URL param `kategori` terupdate | `tests/SearchFilter.test.tsx` |
| Filter aktif → jurnal list refetch dengan params baru | `tests/SearchFilter.test.tsx` |
| Reset filter: tombol reset → q dan kategori dikosongkan | `tests/SearchFilter.test.tsx` |
| Kombinasi q + kategori: keduanya dikirim ke API | `tests/SearchFilter.test.tsx` |

Framework: **Vitest** + React Testing Library.

---

## 12. Roadmap

| Fase | Scope | Target |
|---|---|---|
| **v1.2** | ALAS public landing page + service API + Lawet Hub companion module + **search/filter (navbar)** | Q3 2026 |
| **v1.3** | OpenGraph meta tags per jurnal, RSS/export feed publik | Q4 2026 |
| **v1.4** | Statistik tahunan (chart kegiatan per kategori/bulan) | Q1 2027 |
| **v2.0** | Short-lived M2M JWT (ganti static token), import legacy data (batch dari spreadsheet), multi-producer support | TBD |

---

## 13. Glossary

| Istilah | Definisi |
|---|---|
| **ALAS** | Arsip Langkah Bawaslu Kebumen — sistem rekam jejak kegiatan institusi, public-facing |
| **Lawet Hub** | CMS internal Bawaslu Kebumen (write-side), sumber data jurnal |
| **source_id** | UUID record Jurnal di Lawet Hub, idempotency key di ALAS |
| **ALAS_SERVICE_TOKEN** | Static bearer token untuk auth Lawet Hub → ALAS service API |
| **is_public** | Flag visibilitas per-item `dokumen_pendukung`, dikontrol dari Lawet Hub dashboard, tidak di-overwrite saat update jurnal |
| **Merge strategy** | Strategi upsert ALAS yang preserve `is_public` existing saat menerima update jurnal dari Lawet Hub |
| **alas-public-assets** | MinIO bucket public-read untuk aset jurnal yang sudah dipublish |
| **promote_jurnal_assets** | Fungsi Lawet Hub: copy file dari `lawet-media` → `alas-public-assets` saat publish |
| **Service API** | Endpoint ALAS yang hanya bisa diakses dengan `ALAS_SERVICE_TOKEN` — untuk Lawet Hub |
