import { NextResponse } from 'next/server'

// Mock endpoint for Lawet Hub single journal update/detail
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json().catch(() => ({}))
  return NextResponse.json({
    status: 'success',
    id: params.id,
    ...body,
    updated_at: new Date().toISOString(),
  })
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({
    id: params.id,
    judul: 'Mock Jurnal Detail',
    status: 'draft',
    tanggal_kegiatan: new Date().toISOString().split('T')[0],
    kategori: 'Pengawasan',
  })
}
