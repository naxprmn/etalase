import { NextResponse, NextRequest } from 'next/server'
import { getPimpinanList } from '@/entities/pimpinan/api/get-pimpinan-list'
import { internalErrorResponse } from '@/shared/lib/api-error'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { status: "error", message: "invalid date format, expected YYYY-MM-DD" },
        { status: 400 }
      )
    }

    const items = await getPimpinanList(date)
    return NextResponse.json({
      status: "ok",
      data: items
    })
  } catch (error) {
    return internalErrorResponse('GET /api/pimpinan', error)
  }
}
export const dynamic = 'force-dynamic'
