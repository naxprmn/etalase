import { NextResponse } from 'next/server'
import crypto from 'crypto'

// Mock endpoint for Lawet Hub published journals of user
export async function GET() {
  return NextResponse.json({
    data: [],
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const newId = crypto.randomUUID()
  return NextResponse.json({
    status: 'success',
    id: newId,
    ...body,
    created_at: new Date().toISOString(),
    status_label: 'Menunggu Review',
  })
}
