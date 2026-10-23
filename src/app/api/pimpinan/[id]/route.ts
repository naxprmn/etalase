import { NextResponse, NextRequest } from 'next/server'
import { getPimpinanDetail } from '@/entities/pimpinan/api/get-pimpinan-detail'
import { internalErrorResponse } from '@/shared/lib/api-error'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const item = await getPimpinanDetail(id, true)
    
    if (!item) {
      return NextResponse.json(
        { status: "error", message: "not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      status: "ok",
      data: item
    })
  } catch (error) {
    return internalErrorResponse('GET /api/pimpinan/[id]', error)
  }
}
export const dynamic = 'force-dynamic'
