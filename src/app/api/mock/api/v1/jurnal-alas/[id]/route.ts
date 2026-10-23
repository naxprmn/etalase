import { NextResponse } from 'next/server'
import { getMockJurnalById, updateMockJurnal } from '@/shared/lib/mock-store'

// Mock endpoint for Lawet Hub single journal update/detail
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json().catch(() => ({}))
  const updated = updateMockJurnal(params.id, {
    ...body,
    status: 'draft', // Resubmitted back to draft
    workflow_notes: undefined,
  })

  return NextResponse.json({
    status: 'success',
    id: params.id,
    ...(updated || body),
    updated_at: new Date().toISOString(),
  })
}

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
    judul: 'Mock Jurnal Detail',
    status: 'draft',
    tanggal_kegiatan: new Date().toISOString().split('T')[0],
    kategori: 'Pengawasan',
  })
}
