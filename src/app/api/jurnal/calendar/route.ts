import { NextResponse, NextRequest } from 'next/server'
import { getJurnalCalendar } from '@/entities/jurnal/api/get-jurnal-calendar'
import { internalErrorResponse } from '@/shared/lib/api-error'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const month = searchParams.get('month') || '' // YYYY-MM
    
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { status: "error", message: "invalid month format, expected YYYY-MM" },
        { status: 400 }
      )
    }

    const calendarData = await getJurnalCalendar(month)
    return NextResponse.json({
      status: "ok",
      data: calendarData
    })
  } catch (error) {
    return internalErrorResponse('GET /api/jurnal/calendar', error)
  }
}
export const dynamic = 'force-dynamic'
