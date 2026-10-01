# Entity-Relationship Diagram ALAS

ALAS menyimpan dua entitas utama. Keduanya menerima `source_id` unik dari Lawet Hub agar operasi sinkronisasi dapat bersifat idempoten.

```mermaid
erDiagram
    JURNAL {
        UUID id PK
        UUID source_id UK
        TEXT judul
        DATE tanggal_kegiatan
        VARCHAR kategori
        BOOLEAN is_published
        TIMESTAMPTZ synced_at
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    PIMPINAN {
        UUID id PK
        UUID source_id UK
        TEXT nama
        TEXT jabatan
        DATE periode_mulai
        DATE periode_selesai
        INTEGER urutan
        BOOLEAN is_active
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    SERVICE_EVENTS {
        UUID event_id PK
        VARCHAR resource_type
        UUID source_id
        VARCHAR operation
        TIMESTAMPTZ processed_at
    }
```

## Jurnal

Selain kolom inti pada diagram, `jurnal` menyimpan `link_publikasi`, `redaksi`, dan `divisi`. Struktur berulang disimpan sebagai JSONB: `dokumentasi`, `dokumen_pendukung`, `pihak_terkait`, `custom_fields`, dan `tags`.

`is_published` adalah batas visibilitas jurnal. Operasi hapus dari Service API melakukan soft delete dengan menyetelnya menjadi `false`, sehingga record masih dapat diaudit dan disinkronkan ulang.

## Pimpinan

`pimpinan` juga menyimpan `foto_url` dan `bio`. Endpoint publik hanya mengembalikan data dengan `is_active = true` dan menggunakan rentang periode untuk memilih pimpinan pada tanggal yang diminta.

## Service event ledger

`service_events` adalah ledger idempotency untuk write Direct Service. Insert event dan mutasi proyeksi berada dalam satu transaksi; primary key `event_id` mencegah retry outbox menerapkan event yang sama dua kali. Indeks `(resource_type, source_id)` mendukung audit delivery per agregat.

## Migrasi

Skema kanonis berada di `drizzle/schema.ts`; perubahan struktur wajib melalui file baru di `drizzle/migrations/`. Jangan mengubah migrasi yang telah diterapkan. Prosedur eksekusi ada di [RUNBOOK.md](../ops/RUNBOOK.md).
