import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { addMockJurnal, getMockJurnals } from '@/shared/lib/mock-store'

// Mock endpoint for Lawet Hub published journals of user
export async function GET() {
  const items = getMockJurnals().filter(j => j.status === 'published')
  return NextResponse.json({
    data: items,
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const newId = crypto.randomUUID()
  const created = addMockJurnal({
    id: newId,
    source_id: newId,
    judul: body.judul || 'Untitled',
    tanggal_kegiatan: body.tanggal_kegiatan || new Date().toISOString().split('T')[0],
    kategori: body.kategori || 'Penanganan Pelanggaran',
    status: body.status || 'draft',
    owner_id: 'dummy-staff-1',
    owner_name: 'Agus',
    submitter: { id: 'dummy-staff-1', name: 'Agus' },
    submitted_by: 'dummy-staff-1',
    created_by: 'Agus',
    redaksi: 'Agus',
    divisi: 'Divisi Pengawasan',
    ringkasan: body.ringkasan || null,
    link_publikasi: body.link_publikasi || null,
    dokumentasi: body.dokumentasi || [],
    dokumen_pendukung: body.dokumen_pendukung || [],
    pihak_terkait: body.pihak_terkait || [],
    custom_fields: body.custom_fields || [],
    tags: body.tags || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_published: body.is_published ?? true,
  })

  // `created` sudah memuat `id` dan `status` jurnal; kunci yang sama di depan spread dulu tertimpa tanpa efek.
  return NextResponse.json({
    ...created,
    status_label: 'Menunggu Review',
  })
}
