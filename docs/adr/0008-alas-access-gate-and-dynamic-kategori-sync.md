# ADR-0008: Penegakan Hak Akses ALAS pada Autentikasi dan Sinkronisasi Kategori Dinamis dari Lawet Hub

Status: Accepted  
Tanggal: 2026-09-28  

## Konteks

Sebelumnya, integrasi autentikasi ALAS dengan Lawet Hub (`POST /api/v1/auth/login`) menerima semua kredensial pengguna Lawet Hub yang valid tanpa memeriksa apakah pengguna tersebut memiliki wewenang atau hak akses khusus ke subsistem ALAS. Hal ini berpotensi membuka akses panel ALAS bagi staf atau akun Lawet Hub yang tidak ditugaskan mengelola Jurnal ALAS.

Selain itu, daftar kategori kegiatan jurnal pada ALAS sebelumnya bersifat statis:
1. Endpoint publik `/api/jurnal/kategori` hanya membaca distinct kategori dari database lokal yang sudah pernah diterbitkan (`is_published = true`). Jika belum ada jurnal untuk kategori tertentu yang terbit, kategori tersebut tidak muncul pada filter.
2. Form pengajuan dan panel admin ALAS (`JurnalSubmitForm` dan `PanelLayoutClient`) masih menggunakan daftar pilihan statis hardcoded (`Penanganan Pelanggaran` dan `Penyelesaian Sengketa`), terpisah dari taksonomi kategori resmi yang dikonfigurasi pada Lawet Hub (`alas_kategori_jurnal`).

## Keputusan

1. **Penegakan Hak Akses ALAS pada Login (`loginAction`)**:
   - ALAS memeriksa hak akses pengguna dari response Lawet Hub (`data.user.has_alas_access`, `data.user.feature_access.jurnal_alas`, atau `is_superadmin`).
   - Jika pengguna tidak memiliki hak akses ALAS, proses login ditolak dengan pesan `"Akun Anda tidak memiliki hak akses ke sistem ALAS."`, dan cookie sesi `lawet_token` tidak diterbitkan.

2. **Validasi Sesi Aktif (`getMeAction`)**:
   - `getMeAction` memverifikasi ulang atribut `has_alas_access` dari endpoint `/api/v1/auth/me`.
   - Apabila hak akses pengguna dicabut di Lawet Hub setelah sesi login dibuat, `getMeAction` mengembalikan `null`, sehingga pengguna otomatis dialihkan ke halaman utama saat mencoba mengakses `/panel` atau rute authoring.

3. **Sinkronisasi Kategori Dinamis dari API Lawet Hub**:
   - Dibuat fungsi server action `getCategoriesAction` yang mengambil daftar kategori resmi dari endpoint Lawet Hub:
     `GET /api/v1/jurnal-alas/config/kategori` dengan menyertakan bearer token pengguna jika tersedia.
   - Endpoint publik `/api/jurnal/kategori` mendelegasikan query ke `getCategoriesAction`.

4. **Resiliency & Fallback Graceful**:
   - Untuk menjaga isolasi keterbacaan publik (Read Isolation), apabila Lawet Hub sedang tidak dapat dijangkau (offline/network timeout), sistem secara otomatis melakukan fallback membaca kategori distinct dari database lokal ALAS (`jurnal.kategori`).
   - Apabila kedua sumber kosong, sistem menyediakan fallback default standar Bawaslu (`mou`, `koordinasi`, `sosialisasi`, `pembinaan`, `pengawasan`, `rapat`, `lainnya`).

5. **Integrasi Form Submission & Panel**:
   - Komponen `JurnalSubmitForm` dan `PanelLayoutClient` mengambil daftar kategori secara dinamis dari API ALAS/Lawet Hub dan merender opsi menggunakan translasi label ramah pengguna (`getCategoryLabel`).

## Konsekuensi

- **Keamanan & Otorisasi Ketat:** Hanya aparatur dan staf yang berhak di Lawet Hub yang dapat mengakses panel kerja dan mengajukan/mengelola jurnal di ALAS.
- **Konsistensi Taksonomi:** Kategori jurnal di ALAS selalu selaras dengan konfigurasi `alas_kategori_jurnal` yang dikelola administrator di Lawet Hub tanpa perlu deploy ulang kode aplikasi.
- **Ketahanan Sistem:** Portal publik ALAS tetap berfungsi normal membaca arsip meskipun koneksi ke Lawet Hub terputus sementara.
