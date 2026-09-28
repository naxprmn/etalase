# ADR-0007: Batasan Akses Dokumen Pendukung Khusus Pengguna Terautentikasi (Authenticated Boundary)

Status: Accepted  
Tanggal: 2026-09-28  

## Konteks

ALAS (*Arsip Langkah Bawaslu Kebumen*) dirancang sebagai portal etalase publik yang menampilkan transparansi kegiatan kepemiluan dan pengawasan bagi masyarakat luas. Pada awalnya, spesifikasi produk (PRD Section 4.3) mengasumsikan bahwa lampiran berkas dokumen pendukung (`dokumen_pendukung`) yang memiliki flag `is_public = true` dapat diakses dan diunduh secara bebas oleh pengunjung publik tanpa perlu melakukan autentikasi/login.

Namun dalam evaluasi desain UI/UX dan audit tata kelola data Bawaslu Kebumen, lampiran dokumen pendukung (seperti Surat Tugas, Notula Rapat Internal, Naskah Kerjasama/MoU lengkap, Berita Acara, serta dokumen PDF lampiran kegiatan lainnya) kerap memuat informasi administratif internal, data personal aparatur/staf (seperti NIP, tanda tangan pejabat, nomor kontak), atau dokumen kedinasan yang tidak semestinya diindeks oleh mesin pencari publik (web crawlers) atau diunduh bebas oleh publik tanpa autentikasi terverifikasi.

Sebaliknya, kebutuhan transparansi masyarakat umum sudah dipenuhi secara optimal melalui ringkasan kegiatan (*overview/summary*), pihak terkait, metadata kegiatan, tautan publikasi eksternal, dan dokumentasi visual (foto/galeri kegiatan).

## Keputusan

1. **Pembatasan UI Modal Detail Jurnal (`JurnalDetailModal`)**:
   Daftar dan tautan berkas `Dokumen Pendukung` pada komponen `JurnalDetailModal` dibatasi secara ketat (*gated*) dan hanya ditampilkan apabila pengguna telah terautentikasi di aplikasi (`isLoggedIn === true`).

2. **Perlindungan Dokumen Administratif dari Akses Publik Bebas**:
   Pengunjung publik tanpa autentikasi (anonim di Landing Page) tidak akan disajikan elemen tampilan daftar dokumen maupun tautan unduhan `dokumen_pendukung`.

3. **Penyelarasan Kontrak Response API Publik (`/api/jurnal/[id]`)**:
   Endpoint publik menyelaraskan pengiriman array `dokumen_pendukung`: bagi request publik tanpa sesi pengguna terautentikasi, daftar dokumen pendukung tidak diekspos ke publik guna mencegah pengunduhan langsung via scraping API.

4. **Pemisahan Peran Transparansi Visual dan Administratif**:
   Dokumentasi visual foto dan ringkasan jurnal tetap terbuka secara penuh untuk publik, sedangkan berkas dokumen pendukung administratif diklasifikasikan sebagai dokumen kerja internal yang mewajibkan sesi login staf/kasubag.

## Konsekuensi

- **Keamanan Data Administratif:** Mencegah kebocoran berkas kedinasan internal dan melindungi data personal aparatur sipil/staf Bawaslu dari pengunduhan publik tanpa izin.
- **Konsistensi UI/UX:** Tampilan modal detail pada halaman utama menjadi lebih ringkas dan fokus pada dokumentasi publik, sementara staf yang membutuhkan dokumen administratif dapat mengaksesnya melalui panel atau setelah login.
- **Pencegahan Web Scraping Dokumen:** Menghentikan perayapan otomatis (*scraping*) dan pengindeksan file PDF internal oleh bot mesin pencari pihak ketiga.

## Alternatif yang Ditolak

- **Membuka Dokumen dengan `is_public = true` Tanpa Login:** Sangat berisiko terhadap kelalaian operasional staf (*human error*), di mana staf pengunggah dapat keliru menandai dokumen administratif internal sebagai publik saat proses unggah cepat.
- **Menyembunyikan Tautan Unduh Namun Tetap Menampilkan Nama Dokumen:** Judul atau nama berkas dokumen administratif sering kali sudah memuat nomor surat kedinasan, perihal khusus, atau identitas pihak tertentu sehingga tetap tidak boleh diekspos kepada pengunjung anonim.
