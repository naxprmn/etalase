import { NextResponse } from 'next/server'
import { getCategoriesAction } from '@/entities/jurnal/api/get-categories.action'

export async function GET() {
  try {
    const categories = await getCategoriesAction()
    return NextResponse.json({
      status: 'ok',
      data: categories,
    })
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    )
  }
}
export const dynamic = 'force-dynamic'
