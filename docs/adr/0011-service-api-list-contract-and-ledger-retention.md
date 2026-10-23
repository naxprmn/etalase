# ADR-0011: Kontrak Daftar Service API, Panel Tanpa Penulisan Ganda, dan Retensi Ledger Event

Status: Accepted  
Tanggal: 2026-10-23  

Melengkapi [ADR-0001](0001-direct-service-delivery-guarantees.md) (jaminan pengiriman Direct Service) dan menegaskan [ADR-0005](0005-centralized-lawet-hub-approval-workflow.md) (DB lokal ALAS murni read model). Sisi Lawet Hub dicatat di ADR-0099 repositori Lawet Hub.

## Konteks

Audit 23 Okt 2026 menemukan:

1. `GET /api/service/jurnal` tanpa `page`/`limit` mengembalikan seluruh baris (termasuk yang belum terbit), tidak melaporkan total, dan memperlakukan `%` serta `_` pada `search` sebagai wildcard. Lawet Hub memaginasi di ALAS lalu membuang baris yang belum terbit, sehingga halaman bisa pendek atau kosong dan jumlah tidak diketahui.
2. `PATCH /api/service/jurnal/:sourceId` menerima `ringkasan` pada skema tetapi tidak menyimpannya.
3. `submitJurnalAction` menulis langsung ke tabel `jurnal` ALAS (termasuk `is_published` dari klien) segera setelah Lawet Hub menerima perubahan, melewati Service API dan outbox, padahal ADR-0005 menetapkan DB lokal hanya diisi Lawet Hub setelah persetujuan.
4. Tabel `service_events` tumbuh tanpa batas.

## Keputusan

1. **Daftar selalu dipaginasi**: tanpa `page`/`limit` dipakai halaman 1 dengan `limit` 50; `limit` dibatasi 100. Respons memuat `data`, `total` (jumlah baris yang cocok dengan filter yang sama), `page`, dan `limit`.
2. **Filter `published=true`** hanya mengembalikan baris dengan `is_published = true` dan `workflow_status = 'published'`; total dihitung setelah filter. Klien yang tidak mengirimnya tetap menerima semua baris (kompatibel mundur).
3. **`search`** adalah teks literal: `\`, `%`, dan `_` di-escape sebelum dipakai di `ILIKE` pada judul dan tags.
4. **PATCH menyimpan `ringkasan`.**
5. **Panel tidak menulis ke tabel `jurnal`.** Setelah Lawet Hub menerima pengajuan/edit, ALAS hanya me-revalidate halaman; etalase publik berubah setelah Lawet Hub mengirim proyeksi lewat outbox (hitungan detik).
6. **Retensi ledger**: baris `service_events` yang lebih tua dari 90 hari dihapus (`purgeServiceEvents`), dijalankan paling sering sekali per jam per proses setelah sebuah event diproses. Retensi cukup panjang karena event yang lebih tua dari `ALAS_REPLAY_WINDOW_SECONDS` sudah ditolak verifikasi HMAC. Nilai di bawah 1 hari ditolak.

## Konsekuensi

- Pemanggil lama yang bergantung pada daftar tanpa batas kini hanya menerima 50 baris pertama; satu-satunya pemanggil yang diketahui (Lawet Hub) selalu mengirim `page` dan `limit`.
- Setelah approver mengedit jurnal terbit, perubahan di etalase publik tertunda sampai event outbox terkirim, bukan seketika.
- Tidak ada migrasi: tabel `service_events` tidak berubah dan pembersihan memakai pindai tabel (volume kecil).
- Tes: `tests/service_jurnal_api.test.ts`, `tests/alas_local_workflow.test.ts`.
