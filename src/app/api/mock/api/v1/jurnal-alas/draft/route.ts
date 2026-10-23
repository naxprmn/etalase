import { NextResponse } from 'next/server'
import { getMockJurnals } from '@/shared/lib/mock-store'

// Mock endpoint for Lawet Hub draft journals of user
export async function GET() {
  const drafts = getMockJurnals().filter(j => j.status === 'draft' || j.status === 'rejected')
  return NextResponse.json({
    data: drafts,
  })
}
