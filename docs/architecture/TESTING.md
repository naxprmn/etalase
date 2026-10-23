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

Pengujian end-to-end (E2E) dijalankan via Playwright (`tests/e2e/`), dengan konfigurasi channel browser default `process.env.PW_CHANNEL || 'chrome'` untuk kompatibilitas Windows dan Linux, serta mock auth server untuk simulasi flow input panel staf tanpa ketergantungan instans Lawet Hub eksternal.

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
