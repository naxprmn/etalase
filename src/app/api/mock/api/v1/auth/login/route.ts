import { NextResponse } from 'next/server'
import { isMockAllowed, mockForbiddenResponse } from '../../../guard'

// Mock endpoint for authentication when running ALAS standalone without Lawet Hub
export async function POST(request: Request) {
  if (!isMockAllowed()) {
    return mockForbiddenResponse()
  }
  const body = await request.json().catch(() => ({}))
  const username = body.username || 'admin_kebumen'

  return NextResponse.json({
    access_token: 'mock-lawet-token-standalone',
    token_type: 'bearer',
    user: {
      id: 'mock-user-1',
      name: 'Kasubag Humas (Mock)',
      username: username,
      has_alas_access: username !== 'unauthorized_user',
      division_id: 'div-1',
      division: { id: 'div-1', name: 'Divisi Pengawasan & Humas' },
      role: {
        id: 'role-kasubag',
        name: 'kasubag',
        level: 2,
        can_approve: true,
        is_superadmin: false,
      },
    },
  })
}
