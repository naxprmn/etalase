import { NextResponse } from 'next/server'
import { resetMockJurnals } from '@/shared/lib/mock-store'
import { isMockAllowed, mockForbiddenResponse } from '../guard'

export async function POST() {
  if (!isMockAllowed()) {
    return mockForbiddenResponse()
  }

  resetMockJurnals()
  return NextResponse.json({ status: 'ok', message: 'Mock store reset' })
}
