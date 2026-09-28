import { NextResponse } from 'next/server';
import { isMockAllowed, mockForbiddenResponse } from '../../../../guard';

// Mock endpoint for Playwright E2E tests to bypass Lawet Hub auth
export async function GET() {
  if (!isMockAllowed()) {
    return mockForbiddenResponse();
  }
  return NextResponse.json({
    id: 'test-user-id',
    name: 'Test Staf ALAS',
    username: 'test_staf',
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
