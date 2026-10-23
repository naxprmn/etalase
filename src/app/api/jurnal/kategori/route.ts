import { NextResponse } from 'next/server'
import { getCategoriesAction } from '@/entities/jurnal/api/get-categories.action'
import { internalErrorResponse } from '@/shared/lib/api-error'

export async function GET() {
  try {
    const categories = await getCategoriesAction()
    return NextResponse.json({
      status: 'ok',
      data: categories,
    })
  } catch (error) {
    return internalErrorResponse('GET /api/jurnal/kategori', error)
  }
}
export const dynamic = 'force-dynamic'
