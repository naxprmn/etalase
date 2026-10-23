import { NextResponse } from 'next/server'
import { updateMockJurnal } from '@/shared/lib/mock-store'

// Mock endpoint for Lawet Hub reject/revision action
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json().catch(() => ({}))
  const notes = body.notes || 'Perbaiki lampiran'
  const updated = updateMockJurnal(params.id, {
    status: 'rejected',
    workflow_notes: notes,
  })

  return NextResponse.json({
    status: 'success',
    message: `Jurnal ${params.id} dikembalikan untuk revisi (Mock Lawet Hub)`,
    data: updated || { id: params.id, status: 'rejected', notes },
  })
}
