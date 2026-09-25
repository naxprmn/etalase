'use server'

import { cookies } from 'next/headers'

const LAWET_API_URL = process.env.LAWET_API_URL as string

export async function loginAction(username: string, pin: string) {
  try {
    // --- BLUEPRINT: MULTIPLE DUMMY ACCOUNTS FOR UI TESTING ---
    // Tambahkan kredensial untuk user dummy di bawah ini.
    const DUMMY_ACCOUNTS: Record<string, { pin: string, token: string, name: string }> = {
      'staff': { pin: '1234', token: 'dummy-staff-token', name: 'Agus' },
      'staff_budi': { pin: '1234', token: 'dummy-staff-2-token', name: 'Budi' },
      'kasubag': { pin: '1234', token: 'dummy-kasubag-token', name: 'Candra' },
    };

    if (DUMMY_ACCOUNTS[username] && DUMMY_ACCOUNTS[username].pin === pin) {
      cookies().set({ name: 'lawet_token', value: DUMMY_ACCOUNTS[username].token, httpOnly: true, path: '/' })
      return { success: true, user: { name: DUMMY_ACCOUNTS[username].name } }
    }
    // -------------------------------------

    const res = await fetch(`${LAWET_API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, pin }),
    })

    const data = await res.json()

    if (!res.ok) {
      let msg = 'Username atau PIN salah'
      if (data?.detail) {
        if (typeof data.detail === 'string') msg = data.detail
        else if (Array.isArray(data.detail)) msg = data.detail.map((d: any) => d.msg).join(', ')
      }
      return { success: false, error: msg }
    }

    // Save token in HttpOnly cookie
    if (data.access_token) {
      cookies().set({
        name: 'lawet_token',
        value: data.access_token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week
      })
      
      return { success: true, user: data.user }
    }

    return { success: false, error: 'Token tidak diterima' }
  } catch (error: any) {
    return { success: false, error: error.message || 'Koneksi ke server gagal' }
  }
}

export async function logoutAction() {
  cookies().delete('lawet_token')
  return { success: true }
}

