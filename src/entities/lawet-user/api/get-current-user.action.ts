'use server'

import { cookies } from 'next/headers'
import type { LawetUser } from '../model/lawet-user'

const LAWET_API_URL = process.env.LAWET_API_URL as string

export async function getMeAction(): Promise<LawetUser | null> {
  try {
    const token = cookies().get('lawet_token')?.value
    if (!token) return null

    // --- BLUEPRINT: MULTIPLE DUMMY PROFILES FOR UI TESTING ---
    // Untuk menambahkan user staff/kasubag lain tanpa merusak arsitektur API Lawet Hub asli,
    // cukup tambahkan data user di objek DUMMY_USERS ini dengan format kunci token yang unik.
    const DUMMY_USERS: Record<string, any> = {
      'dummy-staff-token': {
        id: 'dummy-staff-1',
        name: 'Agus',
        username: 'Agus',
        division: { id: 'div-1', name: 'Divisi Pengawasan' },
        role: { id: 'r1', name: 'Agus', level: 1, can_approve: false, is_superadmin: false }
      },
      'dummy-staff-2-token': {
        id: 'dummy-staff-2',
        name: 'Budi',
        username: 'staff_budi',
        division: { id: 'div-1', name: 'Divisi Pengawasan' },
        role: { id: 'r1', name: 'Agus', level: 1, can_approve: false, is_superadmin: false }
      },
      'dummy-kasubag-token': {
        id: 'dummy-kasubag-1',
        name: 'Candra',
        username: 'kasubag',
        division: { id: 'div-2', name: 'Kasubag PPPS' },
        role: { id: 'r2', name: 'Kasubag', level: 2, can_approve: true, is_superadmin: false }
      }
    };

    if (DUMMY_USERS[token]) {
      return DUMMY_USERS[token];
    }
    // -------------------------------------

    const res = await fetch(`${LAWET_API_URL}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      next: { revalidate: 0 } // no cache
    })

    if (!res.ok) {
      // If token is invalid/expired, we could also remove it, but let's just return null
      return null
    }

    const data = await res.json()
    // Depending on whether it returns auth_user_dict or user_dict:
    // If it's auth_user_dict: data.role is a string. If user_dict, it's an object.
    // Let's normalize it.
    
    const rawRole = typeof data.role === 'string'
      ? { id: '', name: data.role, level: data.level }
      : (data.role || {})
    const roleLevel = Number(rawRole.level ?? data.level ?? 0)

    return {
      id: data.id,
      name: data.name,
      username: data.username,
      division_id: data.division_id || data.division?.id || null,
      division: data.division?.name
        ? { id: data.division.id, name: String(data.division.name) }
        : null,
      role: {
        id: String(rawRole.id || ''),
        name: String(rawRole.name || data.role_name || ''),
        level: Number.isFinite(roleLevel) ? roleLevel : 0,
        can_approve: Boolean(rawRole.can_approve ?? data.can_approve),
        is_superadmin: Boolean(rawRole.is_superadmin ?? data.is_superadmin),
      },
    }
  } catch (error) {
    console.error('getMeAction error:', error)
    return null
  }
}
