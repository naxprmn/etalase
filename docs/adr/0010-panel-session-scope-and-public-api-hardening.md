# ADR-0010: Sesi Panel Berscope `alas-panel`, Kewenangan Atas Jurnal Non-Publik, dan Pengerasan API Publik

Status: Accepted  
Tanggal: 2026-10-23  

Melengkapi [ADR-0002](0002-dashboard-jwt-read-boundary.md) (token dashboard read-only), [ADR-0005](0005-centralized-lawet-hub-approval-workflow.md) (panel menulis langsung ke Lawet Hub), dan [ADR-0007](0007-dokumen-pendukung-authenticated-access-boundary.md) (dokumen pendukung). Sisi Lawet Hub dicatat di ADR-0101 repositori Lawet Hub.

## Konteks

Audit integrasi ALAS ↔ Lawet Hub pada 23 Okt 2026 menemukan:

1. Setelah ADR-0005, `loginAction` berhenti mengirim `X-Lawet-Client`. Cookie `lawet_token` berisi token Lawet Hub berhak penuh (semua modul pengguna, termasuk keuangan dan Superadmin), padahal ALAS menghadap publik. Token berumur 15 menit sementara cookie diset 7 hari dan tidak ada refresh, sehingga sesi panel kemungkinan habis setelah 15 menit.
2. Rute `GET /api/jurnal/[id]` menganggap pengguna sebagai pemilik bila `user.name === item.redaksi`. `redaksi` adalah teks yang dapat disunting dan nama tidak unik; peran "kasubag" dikenali dari substring nama peran dan tidak dibatasi per divisi.
3. `GET /api/jurnal` (daftar) mengirim URL `dokumen_pendukung` publik ke pengunjung anonim, padahal ADR-0007 menyatakan anonim tidak menerima dokumen sama sekali; rute detail sudah mematuhinya.
4. Filter privat di kueri publik mencocokkan teks `custom_fields` dengan `ILIKE '%"value": "privat"%'` dan variannya tanpa memeriksa label: field apa pun bernilai "false" (mis. "Hadir daring") menyembunyikan jurnal publik, sedangkan variasi huruf/spasi pada label akses lolos.
5. Rute publik mengembalikan `error.message` mentah (pesan SQL dan path), dan `/api/health` publik membuka versi, uptime, serta pesan galat database.

## Keputusan

1. **Login memakai `X-Lawet-Client: alas-panel`.** Lawet Hub menerbitkan token berscope `alas:panel` (hanya `/api/v1/jurnal-alas/*` dan `GET /api/v1/auth/me`), stateless dan tanpa refresh token. Umur cookie `lawet_token` mengikuti klaim `exp` token (`sessionSecondsRemaining`), dengan batas aman 8 jam bila `exp` tidak terbaca; token yang sudah kedaluwarsa tidak disimpan sebagai sesi.
2. **Kewenangan atas jurnal non-publik dan dokumen privat** ditentukan `canViewRestrictedJurnal`: superadmin; approver untuk jurnal **divisinya sendiri**; atau pemilik, yang dibuktikan Lawet Hub (`GET /api/v1/jurnal-alas/{source_id}` dengan token pengguna hanya berhasil bagi pemilik atau superadmin). Nama pengguna bukan bukti kepemilikan. Pertanyaan ke Lawet Hub hanya diajukan bila jurnal non-publik atau memuat dokumen privat.
3. **Dokumen pendukung pada daftar publik** mengikuti ADR-0007: anonim tidak menerima apa pun, pengguna login hanya dokumen yang tidak ditandai privat, tanpa penanda `is_public`.
4. **Filter privat di SQL** memeriksa elemen `custom_fields` berlabel `is_published`/`akses`/`akses_publik` (huruf dan spasi diabaikan) bernilai `false`/`privat`/`private`; `custom_fields` yang bukan array dianggap kosong. Aturan ini sama dengan `isJurnalExplicitlyPrivate`.
5. **Rute publik mengembalikan `{"status":"error","message":"internal error"}`** untuk galat tak terduga; detailnya hanya masuk log server (`internalErrorResponse`). `/api/health` hanya memuat `status`, `service`, dan `db_connected`.

## Konsekuensi

- Kebocoran cookie panel tidak membuka modul Lawet Hub di luar Jurnal ALAS, dan cookie tidak lagi hidup lebih lama dari token. Sesi panel bertahan sesuai umur token dari Lawet Hub (default 8 jam) alih-alih 15 menit.
- Approver yang bertugas lintas divisi tidak lagi melihat jurnal non-publik divisi lain di rute publik; mereka memakai antrean approval di panel.
- Detail jurnal non-publik oleh pemilik memerlukan satu panggilan tambahan ke Lawet Hub (batas waktu `LAWET_REQUEST_TIMEOUT_MS`); bila Lawet Hub tidak terjangkau, akses ditolak (gagal tertutup).
- Klien yang membaca `dokumen_pendukung` dari `GET /api/jurnal` sebagai anonim kini menerima larik kosong.
- Pemantau yang membaca `version`/`uptime_seconds` dari `/api/health` harus memakai sumber lain; pemeriksaan kesehatan berbasis kode status tidak terpengaruh.
- Tes: `tests/lawet_panel_session.test.ts`, `tests/restricted_jurnal_access.test.ts`, `tests/jurnal_detail_route.test.ts`, `tests/public_api_hardening.test.ts`, `tests/public_visibility_sql.test.ts`.
