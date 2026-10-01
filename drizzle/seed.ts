import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { jurnal, pimpinan } from './schema'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://alas_user:change-this-strong-password@localhost:5433/alas",
})

const db = drizzle(pool)

async function main() {
  console.log("Seeding database...")

  // Clean old data
  await db.delete(jurnal)
  await db.delete(pimpinan)

  // Seed Pimpinan
  const pimpinanData = [
    // Periode 1: 1 Jan 2026 — 30 Jun 2026
    {
      source_id: "a1a1a1a1-1111-1111-1111-111111111111",
      nama: "H. Ahmad Fauzi, S.Ag.",
      jabatan: "Ketua (Periode I)",
      foto_url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&auto=format&fit=crop&q=60",
      bio: "Ketua Bawaslu Kebumen periode pertama 2026. Berpengalaman dalam pengawasan pemilu sejak 2018.",
      periode_mulai: "2026-01-01",
      periode_selesai: "2026-06-30",
      urutan: 1,
      is_active: true,
    },
    {
      source_id: "a2a2a2a2-1111-1111-1111-111111111111",
      nama: "Siti Rahma, S.H.",
      jabatan: "Anggota (Periode I)",
      foto_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=60",
      bio: "Koordinator Divisi Penanganan Pelanggaran. Lulusan Fakultas Hukum Universitas Diponegoro.",
      periode_mulai: "2026-01-01",
      periode_selesai: "2026-06-30",
      urutan: 2,
      is_active: true,
    },

    // Periode 2: 1 Jul 2026 — 31 Des 2026
    {
      source_id: "b1b1b1b1-2222-2222-2222-222222222222",
      nama: "Budi Santoso, M.Si.",
      jabatan: "Ketua (Periode II)",
      foto_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=60",
      bio: "Ketua Bawaslu Kebumen periode kedua 2026. Lulusan S2 Ilmu Politik Universitas Gadjah Mada.",
      periode_mulai: "2026-07-01",
      periode_selesai: "2026-12-31",
      urutan: 1,
      is_active: true,
    },
    {
      source_id: "b2b2b2b2-2222-2222-2222-222222222222",
      nama: "Dr. Laila Fitri, M.H.",
      jabatan: "Anggota (Periode II)",
      foto_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=60",
      bio: "Dosen Hukum Tata Negara yang aktif dalam pengawasan pemilu daerah.",
      periode_mulai: "2026-07-01",
      periode_selesai: "2026-12-31",
      urutan: 2,
      is_active: true,
    },
  ]

  for (const p of pimpinanData) {
    await db.insert(pimpinan).values(p)
  }
  console.log("Seeded 4 pimpinan entries successfully.")

  // Seed Jurnal
  const jurnalData = [
    {
      source_id: "c1c1c1c1-3333-3333-3333-333333333333",
      judul: "Bawaslu Kebumen Teken MoU Dengan UPB terkait Pengawasan Partisipatif",
      tanggal_kegiatan: "2026-05-10",
      kategori: "Penyelesaian Sengketa",
      link_publikasi: "https://kebumen.bawaslu.go.id/berita/mou-upb",
      dokumentasi: [
        { url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&auto=format&fit=crop&q=60", caption: "Penandatanganan Dokumen MoU oleh Bawaslu dan UPB", type: "image" }
      ],
      dokumen_pendukung: [
        { nama: "Naskah Perjanjian MoU UPB-Bawaslu.pdf", url: "https://media.domain.com/alas-public-assets/upb-mou.pdf", tipe: "pdf", is_public: true },
        { nama: "Notulen Rapat Internal UPB.pdf", url: "https://media.domain.com/alas-public-assets/upb-internal.pdf", tipe: "pdf", is_public: false }
      ],
      pihak_terkait: [
        { nama: "Universitas Putra Bangsa", instansi: "UPB Kebumen" },
        { nama: "H. Ahmad Fauzi, S.Ag.", instansi: "Bawaslu Kebumen" }
      ],
      custom_fields: [
        { label: "Nomor MoU", value: "05/MOU/BAWASLU-UPB/V/2026" }
      ],
      redaksi: "Budi Santoso",
        ringkasan: "Kegiatan diawali pembukaan oleh ketua panitia, dilanjutkan pemaparan materi mengenai peran masyarakat dalam pengawasan tahapan pemilu. Sesi tanya jawab berlangsung selama 40 menit dengan 12 penanya. Peserta yang hadir sebanyak 85 orang dari 6 perguruan tinggi. Kegiatan ditutup dengan penandatanganan komitmen pengawasan partisipatif.",
      is_published: true,
        workflow_status: 'published',
    },
    {
      source_id: "c2c2c2c2-3333-3333-3333-333333333333",
      judul: "Audiensi Bawaslu Terkait Kesiapan Anggaran Pilkada Serentak 2026",
      tanggal_kegiatan: "2026-06-15",
      kategori: "Penanganan Pelanggaran",
      link_publikasi: "https://kebumen.bawaslu.go.id/berita/audiensi-pilkada",
      dokumentasi: [
        { url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=60", caption: "Pertemuan Audiensi dengan Bupati Kebumen", type: "image" }
      ],
      dokumen_pendukung: [
        { nama: "Ringkasan Pengajuan Anggaran Pilkada 2026.pdf", url: "https://media.domain.com/alas-public-assets/anggaran.pdf", tipe: "pdf", is_public: true }
      ],
      pihak_terkait: [
        { nama: "Bupati Kebumen", instansi: "Pemerintah Daerah Kebumen" }
      ],
      custom_fields: [
        { label: "Tempat Kegiatan", value: "Pendopo Kabupaten Kebumen" }
      ],
      redaksi: "Siti Rahma",
      is_published: true,
        workflow_status: 'published',
    },
    {
      source_id: "c3c3c3c3-3333-3333-3333-333333333333",
      judul: "Bawaslu Gelar Sidang Sengketa Pendaftaran Calon Independen",
      tanggal_kegiatan: "2026-07-05",
      kategori: "Penyelesaian Sengketa",
      link_publikasi: "https://kebumen.bawaslu.go.id/berita/sidang-sengketa-independen",
      dokumentasi: [
        { url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=60", caption: "Suasana Ruang Sidang Utama Bawaslu Kebumen", type: "image" }
      ],
      dokumen_pendukung: [
        { nama: "Putusan Sengketa Pilkada No 02-PS-2026.pdf", url: "https://media.domain.com/alas-public-assets/putusan-02.pdf", tipe: "pdf", is_public: true }
      ],
      pihak_terkait: [
        { nama: "KPU Kebumen", instansi: "Termohon" },
        { nama: "Drs. M. Sobirin", instansi: "Pemohon / Calon Independen" }
      ],
      custom_fields: [
        { label: "Majelis Hakim", value: "Budi Santoso, M.Si." }
      ],
      redaksi: "Admin Bawaslu",
      is_published: true,
        workflow_status: 'published',
    },
    {
      source_id: "c4c4c4c4-3333-3333-3333-333333333333",
      judul: "Pelaporan Temuan Dugaan Pelanggaran Netralitas ASN",
      tanggal_kegiatan: "2026-08-12",
      kategori: "Penanganan Pelanggaran",
      link_publikasi: null,
      dokumentasi: [
        { url: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=60", caption: "Penerhan berkas temuan pelanggaran", type: "image" }
      ],
      dokumen_pendukung: [
        { nama: "Berkas Rekomendasi KASN Netralitas.pdf", url: "https://media.domain.com/alas-public-assets/rekomendasi-kasn.pdf", tipe: "pdf", is_public: true }
      ],
      pihak_terkait: [
        { nama: "Badan Kepegawaian Daerah Kebumen", instansi: "Instansi Terlapor" }
      ],
      custom_fields: [
        { label: "Status Laporan", value: "Diteruskan ke KASN" }
      ],
      is_published: true,
        workflow_status: 'published',
    },
    {
      source_id: "e1e1e1e1-1111-1111-1111-111111111111",
      judul: "Sosialisasi Pengawasan Pemilu Partisipatif dengan Tokoh Masyarakat",
      tanggal_kegiatan: "2026-05-15",
      kategori: "Penanganan Pelanggaran",
      link_publikasi: "https://kebumen.bawaslu.go.id/berita/sosialisasi-partisipatif",
      dokumentasi: [
        { url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=60", caption: "Foto bersama peserta sosialisasi", type: "image" }
      ],
      dokumen_pendukung: [
        { nama: "Materi Sosialisasi Pengawasan.pdf", url: "https://media.domain.com/alas-public-assets/materi-sosialisasi.pdf", tipe: "pdf", is_public: true }
      ],
      pihak_terkait: [
        { nama: "Forum Kerukunan Umat Beragama", instansi: "Tokoh Masyarakat" },
        { nama: "Siti Rahma, S.H.", instansi: "Bawaslu Kebumen" }
      ],
      custom_fields: [
        { label: "Lokasi", value: "Hotel Grand Kolopaking Kebumen" }
      ],
      is_published: true,
        workflow_status: 'published',
    },
    {
      source_id: "e2e2e2e2-2222-2222-2222-222222222222",
      judul: "Penandatanganan Perjanjian Kerja Sama Pengawasan dengan Kwartir Cabang Pramuka",
      tanggal_kegiatan: "2026-05-20",
      kategori: "Penyelesaian Sengketa",
      link_publikasi: "https://kebumen.bawaslu.go.id/berita/mou-pramuka",
      dokumentasi: [
        { url: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=600&auto=format&fit=crop&q=60", caption: "Penandatanganan bersama Kwarcab Pramuka", type: "image" }
      ],
      dokumen_pendukung: [
        { nama: "MoU Pramuka Kebumen.pdf", url: "https://media.domain.com/alas-public-assets/mou-pramuka.pdf", tipe: "pdf", is_public: true }
      ],
      pihak_terkait: [
        { nama: "Kwarcab Pramuka Kebumen", instansi: "Gerakan Pramuka" }
      ],
      custom_fields: [
        { label: "Nomor PKS", value: "12/PKS/BAWASLU-KWARCAB/V/2026" }
      ],
      is_published: true,
        workflow_status: 'published',
    },
    {
      source_id: "e3e3e3e3-3333-3333-3333-333333333333",
      judul: "Bawaslu Kebumen Lakukan Patroli Pengawasan Hak Pilih di Wilayah Pesisir",
      tanggal_kegiatan: "2026-06-02",
      kategori: "Penanganan Pelanggaran",
      link_publikasi: "https://kebumen.bawaslu.go.id/berita/patroli-hak-pilih",
      dokumentasi: [
        { url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=60", caption: "Patroli Bawaslu di Pantai Kebumen", type: "image" }
      ],
      dokumen_pendukung: [],
      pihak_terkait: [
        { nama: "Panwaslu Kecamatan Ayah", instansi: "Kecamatan Ayah" }
      ],
      custom_fields: [
        { label: "Fokus Pengawasan", value: "Daftar Pemilih Sementara" }
      ],
      is_published: true,
        workflow_status: 'published',
    },
    {
      source_id: "e4e4e4e4-4444-4444-4444-444444444444",
      judul: "Mediasi Penyelesaian Sengketa Cepat di Tingkat Kecamatan Karanganyar",
      tanggal_kegiatan: "2026-06-25",
      kategori: "Penyelesaian Sengketa",
      link_publikasi: "https://kebumen.bawaslu.go.id/berita/mediasi-karanganyar",
      dokumentasi: [
        { url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&auto=format&fit=crop&q=60", caption: "Proses mediasi termohon dan pemohon", type: "image" }
      ],
      dokumen_pendukung: [
        { nama: "Berita Acara Kesepakatan Sengketa Cepat.pdf", url: "https://media.domain.com/alas-public-assets/sengketa-cepat.pdf", tipe: "pdf", is_public: true }
      ],
      pihak_terkait: [
        { nama: "PPS Karanganyar", instansi: "Termohon" },
        { nama: "Tim Kampanye Pasangan Calon A", instansi: "Pemohon" }
      ],
      custom_fields: [
        { label: "Status Mediasi", value: "Sepakat Damai" }
      ],
      is_published: true,
        workflow_status: 'published',
    },
    {
      source_id: "e5e5e5e5-5555-5555-5555-555555555555",
      judul: "Laporan Dugaan Politik Uang Selama Masa Kampanye",
      tanggal_kegiatan: "2026-07-12",
      kategori: "Penanganan Pelanggaran",
      link_publikasi: null,
      dokumentasi: [],
      dokumen_pendukung: [
        { nama: "Laporan Pelanggaran No 01.pdf", url: "https://media.domain.com/alas-public-assets/laporan-01.pdf", tipe: "pdf", is_public: false }
      ],
      pihak_terkait: [
        { nama: "Masyarakat Kebumen", instansi: "Pelapor" }
      ],
      custom_fields: [
        { label: "Hasil Kajian", value: "Tidak Memenuhi Syarat Materil" }
      ],
      is_published: true,
        workflow_status: 'published',
    },
    {
      source_id: "e6e6e6e6-6666-6666-6666-666666666666",
      judul: "Pelantikan dan Pembekalan Panwaslu Kelurahan/Desa se-Kabupaten Kebumen",
      tanggal_kegiatan: "2026-07-18",
      kategori: "Penanganan Pelanggaran",
      link_publikasi: "https://kebumen.bawaslu.go.id/berita/pelantikan-pkd",
      dokumentasi: [
        { url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&auto=format&fit=crop&q=60", caption: "Budi Santoso mengambil sumpah janji PKD", type: "image" }
      ],
      dokumen_pendukung: [
        { nama: "SK Penetapan PKD Kebumen.pdf", url: "https://media.domain.com/alas-public-assets/sk-pkd.pdf", tipe: "pdf", is_public: true }
      ],
      pihak_terkait: [
        { nama: "Budi Santoso, M.Si.", instansi: "Ketua Bawaslu Kebumen" }
      ],
      custom_fields: [
        { label: "Jumlah PKD Dilantik", value: "460 Orang" }
      ],
      is_published: true,
        workflow_status: 'published',
    },
    {
      source_id: "e7e7e7e7-7777-7777-7777-777777777777",
      judul: "MoU Sinergi Pengawasan Pemilu dengan PWI Kebumen",
      tanggal_kegiatan: "2026-07-28",
      kategori: "Penyelesaian Sengketa",
      link_publikasi: "https://kebumen.bawaslu.go.id/berita/mou-pwi",
      dokumentasi: [
        { url: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=60", caption: "Penandatanganan kerjasama pers", type: "image" }
      ],
      dokumen_pendukung: [
        { nama: "PKS Bawaslu dan PWI Kebumen.pdf", url: "https://media.domain.com/alas-public-assets/mou-pwi.pdf", tipe: "pdf", is_public: true }
      ],
      pihak_terkait: [
        { nama: "Persatuan Wartawan Indonesia Kebumen", instansi: "PWI Daerah" }
      ],
      custom_fields: [
        { label: "Nomor Dokumen", value: "22/MOU-PWI/VII/2026" }
      ],
      is_published: true,
        workflow_status: 'published',
    },
    {
      source_id: "e8e8e8e8-8888-8888-8888-888888888888",
      judul: "Rapat Koordinasi Evaluasi Pengawasan Logistik Tahap Pertama",
      tanggal_kegiatan: "2026-08-05",
      kategori: "Penanganan Pelanggaran",
      link_publikasi: "https://kebumen.bawaslu.go.id/berita/rakor-logistik",
      dokumentasi: [
        { url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&auto=format&fit=crop&q=60", caption: "Suasana rakor evaluasi logistik", type: "image" }
      ],
      dokumen_pendukung: [
        { nama: "Laporan Logistik Tahap 1.pdf", url: "https://media.domain.com/alas-public-assets/logistik-1.pdf", tipe: "pdf", is_public: true }
      ],
      pihak_terkait: [
        { nama: "KPU Kebumen", instansi: "Penyelenggara Teknis" },
        { nama: "Dr. Laila Fitri, M.H.", instansi: "Anggota Bawaslu" }
      ],
      custom_fields: [
        { label: "Fokus Logistik", value: "Bilik Suara & Kotak Suara" }
      ],
      is_published: true,
        workflow_status: 'published',
    },
    {
      source_id: "e9e9e9e9-9999-9999-9999-999933333333",
      judul: "Temuan Pelanggaran Administrasi Pendaftaran Pemilih di Kecamatan Alian",
      tanggal_kegiatan: "2026-08-20",
      kategori: "Penanganan Pelanggaran",
      link_publikasi: "https://kebumen.bawaslu.go.id/berita/temuan-pantarlih-alian",
      dokumentasi: [],
      dokumen_pendukung: [
        { nama: "Rekomendasi Perbaikan DPS Alian.pdf", url: "https://media.domain.com/alas-public-assets/rekomendasi-alian.pdf", tipe: "pdf", is_public: true }
      ],
      pihak_terkait: [
        { nama: "PPK Alian", instansi: "Penyelenggara Ad-hoc" }
      ],
      custom_fields: [
        { label: "Jenis Temuan", value: "Pantarlih melewatkan pencocokan data 3 dusun" }
      ],
      is_published: true,
        workflow_status: 'published',
    },
    {
      source_id: "fa1fa1fa-1111-1111-1111-111111111111",
      judul: "Sidang Pleno Rekomendasi Hasil Temuan Coklit Pemilih Disabilitas",
      tanggal_kegiatan: "2026-08-24",
      kategori: "Penyelesaian Sengketa",
      link_publikasi: "https://kebumen.bawaslu.go.id/berita/sidang-pleno-disabilitas",
      dokumentasi: [
        { url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=60", caption: "Sidang pleno pimpinan Bawaslu", type: "image" }
      ],
      dokumen_pendukung: [],
      pihak_terkait: [
        { nama: "Persatuan Penyandang Disabilitas Kebumen", instansi: "Koalisi Pemantau" }
      ],
      custom_fields: [
        { label: "Status Rekomendasi", value: "Diterima KPU" }
      ],
      is_published: true,
        workflow_status: 'published',
    }
  ]

  for (const j of jurnalData) {
    await db.insert(jurnal).values(j)
  }
  console.log(`Seeded ${jurnalData.length} jurnal entries successfully.`)

  console.log("Seeding complete!")
  pool.end()
}

main().catch((err) => {
  console.error("Error seeding database:", err)
  pool.end()
})
