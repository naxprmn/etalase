import { NextResponse } from 'next/server'
import { getMockJurnalById } from '@/shared/lib/mock-store'

// Mock endpoint for Lawet Hub approval item detail in standalone mode
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const item = getMockJurnalById(params.id)
  if (item) {
    return NextResponse.json(item)
  }

  return NextResponse.json({
    id: params.id,
    judul: 'Sosialisasi Pengawasan Pemilu Partisipatif dengan Tokoh Masyarakat',
    status: 'draft',
    kategori: 'sosialisasi',
    created_by: 'Agus',
    divisi: 'Divisi Pengawasan',
    tanggal_kegiatan: '2026-08-15',
    redaksi: 'Agus',
    dokumentasi: [],
    dokumen_pendukung: [],
    pihak_terkait: [],
    custom_fields: [],
  })
}
