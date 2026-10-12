# ADR-0009: Wewenang Pengelolaan Approver, Sticky Review, Isolasi Visibilitas, dan Batasan Unduh Dokumen Eksternal

Status: Accepted  
Tanggal: 2026-10-12  

## Konteks

Dalam alur operasional tata kelola Jurnal ALAS, ditemukan beberapa kendala fungsional, ergonomi antarmuka, dan keamanan batas akses:
1. **Wewenang Approver Terbatas:** Pejabat peninjau (Kasubag / Approver) sebelumnya tidak memiliki akses aksi edit dan hapus langsung pada menu Kelola Jurnal, serta tidak dapat mengubah status workflow jurnal (`draft`, `published`, `rejected`) secara langsung dari form penyuntingan jurnal.
2. **Ergonomi Review:** Pada menu antrean review approval (`Approval.tsx`), panel kartu pratinjau di sisi kanan ikut tergulir hilang saat menelusuri daftar antrean panjang di sisi kiri, menyulitkan proses verifikasi detail jurnal.
3. **Internal Error Penolakan Jurnal:** Approver mengalami kegagalan (HTTP 500 Internal Server Error) saat melakukan penolakan jurnal (*reject*) akibat masalah async session expiry di SQLAlchemy (`MissingGreenlet`) saat serialisasi respon relasi submitter.
4. **Kebocoran Visibilitas Jurnal Privat:** Jurnal berstatus privat (`is_published: false`) tetap terbit ke publik karena proses `upsertJurnal` sebelumnya memaksakan nilai `is_published: true` tanpa memperhatikan konfigurasi visibilitas yang dipilih author/admin.
5. **Kebocoran Akses Unduh Dokumen Tambahan ke Pihak Luar:** Pada tampilan eksternal publik (modal detail jurnal di halaman landing), dokumen tambahan/pendukung dapat diunduh oleh pengunjung luar, padahal lampiran dokumen tersebut ditujukan khusus untuk kebutuhan internal aparatur.

## Keputusan

1. **Eskalasi Hak Aksi Approver pada Kelola Jurnal:**
   - Helper `canEditJurnal` dan `canDeleteJurnal` diperluas agar memperbolehkan pengguna dengan peran peninjau (`user.role?.can_approve` / `viewer.can_approve` / `canReview`) untuk mengedit dan menghapus jurnal.
   - Form penyuntingan (`PanelLayoutClient`) menambahkan kontrol opsi perubahan status workflow (`Menunggu Review (draft)`, `Terbit (published)`, `Dikembalikan (rejected)`).
   - Tombol "Edit Jurnal" diaktifkan pada kartu pratinjau di menu Approval untuk mempercepat koreksi oleh Kasubag.

2. **Sticky Layout pada Antarmuka Approval:**
   - Panel detail jurnal di sisi kanan `Approval.tsx` menerapkan CSS positioning sticky (`md:sticky md:top-6 self-start max-h-[calc(100vh-3rem)] overflow-y-auto`) dengan container flex `items-start`, memastikan kartu pratinjau tetap terpampang saat menelusuri daftar antrean.

3. **Remediasi Penolakan Jurnal (Rejection Flow Resiliency):**
   - Menghapus resiko *lazy loading outside greenlet* pada serialisasi jurnal di backend Lawet Hub dengan memastikan relasi `submitter` tetap valid atau dimuat secara eksplisit sebelum sesi ditutup, sehingga aksi penolakan jurnal berhasil tanpa error 500.

4. **Penegakan Flag Visibilitas `is_published`:**
   - Schema validasi `jurnalPayloadSchema` dan fungsi `upsertJurnal` diselaraskan agar menghormati boolean `is_published` dan metadata `custom_fields.is_published` / `custom_fields.akses`.
   - Form pengajuan dan edit jurnal menyediakan pemilih visibilitas ("Publik" vs "Privat / Internal"). Jurnal privat tidak akan terbit di portal publik etalase.

5. **Penegakan Batasan Unduh Dokumen Eksternal (External Download Boundary):**
   - Komponen `JurnalDetailModal` memperkenalkan properti `isInternal` (default `false`).
   - Pada tampilan eksternal (`src/views/landing/index.tsx`), modal diatur dengan `isInternal={false}`. Pada mode ini, dokumen tambahan tidak menyediakan elemen tautan unduhan `<a>` maupun ikon unduh. Tampilan hanya merender metadata nama dokumen dengan badge informatif `"Khusus Internal"`.
   - Pada tampilan internal panel (`src/views/panel/ui/KelolaJurnal.tsx`), modal diatur dengan `isInternal={true}` sehingga pengguna berwenang dapat mengunduh dokumen lampiran secara penuh.

## Konsekuensi

- **Keamanan Informasi:** Dokumen lampiran sensitif internal terlindungi dari unduhan pihak luar di portal publik.
- **Kelancaran Alur Kerja:** Kasubag/Approver dapat mengelola, mengedit, menolak, atau menyesuaikan status jurnal tanpa hambatan teknis.
- **Integritas Data:** Jurnal privat tetap terisolasi dari katalog publik sesuai preferensi author/admin.
