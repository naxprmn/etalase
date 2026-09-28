import { NextResponse } from 'next/server'

// Mock endpoint for Lawet Hub Jurnal ALAS category configuration
export async function GET() {
  return NextResponse.json({
    kategori: ['mou', 'koordinasi', 'sosialisasi', 'pembinaan', 'pengawasan', 'rapat', 'lainnya']
  })
}
