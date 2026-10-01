# Product

## Register

product

## Pengguna

- **Publik**: masyarakat yang mencari arsip kegiatan dan profil pimpinan Bawaslu Kebumen.
- **Staf Lawet Hub**: pengguna terautentikasi yang melihat jurnalnya di ALAS dan mengelola jurnal di Lawet Hub.
- **Approver Lawet Hub**: Kasubag/approver yang melihat jurnal staf dalam cakupan divisinya di ALAS dan mengambil keputusan di Lawet Hub.
- **Lawet Hub**: sistem induk yang mengautentikasi pengguna, mengelola workflow pengajuan, dan mengirim data terbit ke Service API ALAS.

## Tujuan Produk

ALAS adalah arsip publik kegiatan Bawaslu Kebumen yang menampilkan jurnal kegiatan, dokumentasi, statistik, kalender, dan profil pimpinan. Aplikasi menjaga tampilan publik tetap mudah dibaca, sementara pengajuan serta persetujuan konten mengikuti otorisasi dan workflow Lawet Hub.

## Permukaan Produk

| Permukaan | Rute | Akses | Fungsi |
| --- | --- | --- | --- |
| Arsip publik | `/` | Publik | Menelusuri jurnal, statistik, kalender, dokumentasi, dan pimpinan. |
| Login | Pop-up `/#login` (rute `/login` diarahkan ke sini) | Publik | Mengautentikasi akun melalui API Lawet Hub. |
| Tambah jurnal | `/panel?tab=tambah` | Login | Mengajukan jurnal (foto, dokumen PDF, privat/publik) langsung ke Lawet Hub; approver/superadmin langsung menerbitkan. |
| Jurnal saya | `/panel?tab=jurnal` | Staf | Melihat status jurnal sendiri (Menunggu Review, Dikembalikan + catatan, Sedang Diterbitkan, Terbit), memperbaiki & mengajukan ulang, serta menghapus. |
| Kelola jurnal | `/panel?tab=kelola` | Approver/superadmin | Ringkasan dan tabel jurnal dalam cakupan; edit/hapus hanya untuk pemilik atau superadmin. |
| Approval | `/panel?tab=approval` | `can_approve`, level >= 2, atau superadmin | Meninjau antrean Lawet Hub, menyetujui (memulai publish ke ALAS) atau mengembalikan dengan catatan. |

Rute lama `/jurnal-saya`, `/approval`, `/approval/:id`, `/pengajuan`, `/lawet`, dan `/admin` hanya mengarahkan ke tab panel yang sesuai.

## Batasan Produk

- ALAS tidak menjadi sumber otoritas akun, PIN, peran, atau status workflow pengajuan. Hal tersebut berada di Lawet Hub.
- JWT panel ALAS memiliki scope read-only dan tidak boleh diterima untuk method mutasi di Lawet Hub.
- Tombol CRUD dan keputusan approval di ALAS membuka permukaan Lawet Hub yang sesuai; ALAS tidak memproksi method tulis dengan JWT dashboard.
- ALAS menyimpan salinan jurnal dan pimpinan yang ditujukan untuk konsumsi publik. Identitas asal Lawet Hub dijaga dengan `source_id` yang unik.
- Service API ALAS hanya untuk integrasi antarsistem; ia bukan API untuk browser publik.
- Lampiran yang tidak diberi `is_public: true` tidak boleh muncul pada respons API publik.

## Posisi dan Prinsip Desain

ALAS merupakan jurnal institusional yang modern, otoritatif, dan bersih. Transparansi adalah prioritas: konten harus kronologis, mudah dipindai, dan tidak terasa seperti portal birokrasi lama atau umpan media sosial yang ramai.

Prinsip desain:

1. Arsip publik dibaca tanpa hambatan autentikasi.
2. Tindakan authoring berada di Lawet Hub dan terpisah dari permukaan visibilitas ALAS.
3. Informasi kegiatan, dokumentasi, dan lampiran dapat dilacak ke sumbernya.
4. Kontras dan keterbacaan memenuhi kebutuhan pengguna umum.
