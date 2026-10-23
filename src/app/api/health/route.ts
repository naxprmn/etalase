import { NextResponse } from 'next/server'
import { db } from '@/shared/lib/db'
import { sql } from 'drizzle-orm'

// Publik: hanya status dan konektivitas database. Versi, uptime, dan pesan galat tidak dibuka.
export async function GET() {
  try {
    await db.execute(sql`SELECT 1`)
    return NextResponse.json({ status: "ok", service: "alas", db_connected: true })
  } catch (error) {
    console.error('[api] GET /api/health gagal:', error)
    return NextResponse.json(
      { status: "error", service: "alas", db_connected: false },
      { status: 500 }
    )
  }
}
export const dynamic = 'force-dynamic'
