import { NextResponse } from 'next/server'

export function isMockAllowed(): boolean {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_MOCK_AUTH !== 'true') {
    return false
  }
  return true
}

export function mockForbiddenResponse(): NextResponse {
  return new NextResponse('Not Found', { status: 404 })
}
