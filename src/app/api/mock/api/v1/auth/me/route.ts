import { NextResponse } from 'next/server';
import { isMockAllowed, mockForbiddenResponse } from '../../../../guard';

// Mock endpoint for Playwright E2E tests to bypass Lawet Hub auth
export async function GET(request: Request) {
  if (!isMockAllowed()) {
    return mockForbiddenResponse();
  }

  const auth = request.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();

  if (token.includes('kasubag')) {
    return NextResponse.json({
      id: 'dummy-kasubag-1',
      name: 'Candra',
      username: 'kasubag',
      has_alas_access: true,
      division_id: 'div-2',
      division: { id: 'div-2', name: 'Kasubag PPPS' },
      role: {
        id: 'r2',
        name: 'Kasubag',
        level: 2,
        can_approve: true,
        is_superadmin: false
      }
    });
  }

  return NextResponse.json({
    id: 'dummy-staff-1',
    name: 'Agus',
    username: 'Agus',
    has_alas_access: true,
    division_id: 'div-1',
    division: { id: 'div-1', name: 'Divisi Pengawasan' },
    role: {
      id: 'role-staff',
      name: 'staff',
      level: 1,
      can_approve: false,
      is_superadmin: false
    }
  });
}
