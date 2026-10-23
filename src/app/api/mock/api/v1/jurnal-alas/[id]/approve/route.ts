import { NextResponse } from 'next/server'
import { updateMockJurnal } from '@/shared/lib/mock-store'
import { upsertJurnal } from '@/features/jurnal-sync/lib/upsert-jurnal'

// Mock endpoint for Lawet Hub approve action
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const updated = updateMockJurnal(params.id, {
    status: 'published',
    is_published: true,
  })

  if (updated) {
    try {
      await upsertJurnal({
        source_id: updated.source_id || updated.id,
        judul: updated.judul,
        ringkasan: updated.ringkasan,
        tanggal_kegiatan: updated.tanggal_kegiatan,
        kategori: updated.kategori,
        link_publikasi: updated.link_publikasi,
        dokumentasi: updated.dokumentasi,
        dokumen_pendukung: updated.dokumen_pendukung,
        pihak_terkait: updated.pihak_terkait,
        custom_fields: updated.custom_fields,
        tags: updated.tags,
        redaksi: updated.owner_name,
        divisi: updated.divisi,
        is_published: true,
      })
    } catch (error) {
      console.error('Failed to sync approved journal to local database:', error)
    }
  }

  return NextResponse.json({
    status: 'success',
    message: `Jurnal ${params.id} berhasil disetujui (Mock Lawet Hub)`,
    data: updated || { id: params.id, status: 'approved' },
  })
}
