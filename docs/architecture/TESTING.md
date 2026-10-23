# Arsitektur Pengujian

ALAS menggunakan Vitest dan React Testing Library. Konfigurasi berada di `vitest.config.ts` dengan environment `jsdom` dan alias `@` yang sama seperti aplikasi.

## Penempatan

| Area | Lokasi | Contoh cakupan |
| --- | --- | --- |
| Komponen UI | `tests/*Card.test.tsx`, `tests/SearchBar.test.tsx` | Render, konten, dan interaksi komponen. |
| Endpoint publik | `tests/public_api.test.ts` | Respons jurnal dan kontrak API publik. |
| Service API | `tests/service_*.test.ts` | Bearer/HMAC, replay protection, idempotency, dan operasi jurnal/pimpinan. |
| Security boundary | `tests/lawet_dashboard_boundary.test.ts` | Scope dashboard read-only dan media proxy. |
| Integration data | `tests/*integration*.test.ts`, `tests/*delivery*.test.ts` | Transaksi dan migrasi dengan PostgreSQL Testcontainers. |
| Architecture fitness | `scripts/check-repository-isolation*.mjs`, `.dependency-cruiser.cjs` | Isolasi repository dan arah dependency FSD. |
| Feature test coverage (TDD) | `scripts/check-feature-test-coverage*.mjs` | Gate CI TDD untuk memastikan feature baru memiliki file test. |

Test baru diletakkan di `tests/` atau co-located dalam direktori feature dan dinamai `*.test.ts` atau `*.test.tsx`. Perubahan pada route atau kontrak integrasi harus menambah atau memperbarui test pemiliknya; perubahan tampilan minimal memverifikasi state yang terlihat pengguna.

## Menjalankan

```bash
npm run boundary:test
npm run coverage:test
npm run coverage:gate
npm run arch:check
npm run test:unit
npm run test:integration
npm run test:watch
npx playwright test
```

`boundary:test` menguji positive/negative fixture checker isolasi repository, `coverage:test` menguji unit test coverage gate, sedangkan `arch:check` memindai repository aktual lalu menjalankan dependency-cruiser. `coverage:gate` memvalidasi bahwa setiap feature baru memiliki test (TDD gate di CI). `npm test` menjalankan semua test satu kali; `test:unit` tidak memerlukan database, sedangkan `test:integration` memerlukan PostgreSQL lokal pada koneksi test default atau `TEST_DATABASE_URL`. Test berbasis Testcontainers juga memerlukan Docker aktif.

Pengujian end-to-end (E2E) dijalankan via Playwright (`tests/e2e/`), dengan konfigurasi channel browser default `process.env.PW_CHANNEL || 'chrome'` untuk kompatibilitas Windows dan Linux, serta mock auth dan mock server (`src/app/api/mock/` & `@/shared/lib/mock-store`) untuk simulasi penuh seluruh siklus operasional jurnal tanpa ketergantungan instans Lawet Hub eksternal:
1. **User (Staf) Form Submission**: Validasi field wajib form pengajuan, pengisian data lengkap, submit jurnal baru, dan verifikasi muncul di panel Jurnal Saya berstatus `Menunggu Review`.
2. **Kasubag Review & Reject**: Kasubag membuka antrean persetujuan, validasi catatan pengembalian, dan penolakan jurnal berstatus `Dikembalikan`.
3. **Staf Revisi & Resubmit**: Staf meninjau catatan revisi pengembalian, memperbarui jurnal melalui formulir perbaikan, dan mengajukan ulang ke antrean review.
4. **Kasubag Approve & Sync**: Kasubag menyetujui jurnal hasil revisi dan memicu sinkronisasi otomatis ke basis data read model publik ALAS (`jurnal`).
5. **Publik (Tampilan Luar)**: Pengunjung publik (tanpa autentikasi) memverifikasi jurnal terbit di feed/arsip beranda, menjalankan pencarian kata kunci, serta membuka dialog rincian jurnal sembari memastikan draft/jurnal ditolak terisolasi secara aman.

Untuk validasi produksi, jalankan juga:

```bash
npm run build
```

## Eskalasi Verifikasi

| Perubahan | Verifikasi minimum |
| --- | --- |
| Komponen terisolasi | Test komponen terkait. |
| Route/API | Test endpoint pemilik dan test auth bila boundary token berubah. |
| Skema atau migrasi | Test API yang memakai entitas tersebut, migrasi pada database kosong, lalu build. |
| Dependency, FSD, atau struktur repository | `npm run boundary:test` dan `npm run arch:check`. |
| Docker, environment, atau integrasi Lawet Hub | Focused integration test, build, dan smoke test health check setelah container berjalan. |
