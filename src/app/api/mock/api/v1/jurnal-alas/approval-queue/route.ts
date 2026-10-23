import { NextResponse } from 'next/server'
import { getMockJurnals } from '@/shared/lib/mock-store'

// Mock endpoint for Lawet Hub approval queue in standalone mode
export async function GET() {
  const queue = getMockJurnals().filter(j => j.status === 'draft')
  return NextResponse.json(queue)
}
