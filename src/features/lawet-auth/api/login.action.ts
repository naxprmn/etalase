'use server'

import { cookies } from 'next/headers'
import { hasAlasAccess } from '@/entities/lawet-user'

const LAWET_API_URL = process.env.LAWET_API_URL as string

export async function loginAction(username: string, pin: string) {
  try {
    // --- BLUEPRINT: MULTIPLE DUMMY ACCOUNTS FOR UI TESTING ---
    // Tambahkan kredensial untuk user dummy di bawah ini.
    if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_MOCK_AUTH === 'true') {
      const DUMMY_ACCOUNTS: Record<string, { pin: string, token: string, name: string, has_alas_access?: boolean }> = {
        'staff': { pin: '1234', token: 'dummy-staff-token', name: 'Agus', has_alas_access: true },
        'staff_budi': { pin: '1234', token: 'dummy-staff-2-token', name: 'Budi', has_alas_access: true },
        'kasubag': { pin: '1234', token: 'dummy-kasubag-token', name: 'Candra', has_alas_access: true },
        'no_access_user': { pin: '1234', token: 'dummy-no-access-token', name: 'User Tanpa Akses', has_alas_access: false },
      };

      if (DUMMY_ACCOUNTS[username] && DUMMY_ACCOUNTS[username].pin === pin) {
        if (DUMMY_ACCOUNTS[username].has_alas_access === false) {
          return { success: false, error: 'Akun Anda tidak memiliki hak akses ke sistem ALAS.' }
        }
        cookies().set({ name: 'lawet_token', value: DUMMY_ACCOUNTS[username].token, httpOnly: true, path: '/' })
        return { success: true, user: { name: DUMMY_ACCOUNTS[username].name, has_alas_access: true } }
      }
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

    // Validasi otorisasi: hanya user dengan hak akses ke ALAS yang boleh login
    if (!hasAlasAccess(data.user)) {
      return { success: false, error: 'Akun Anda tidak memiliki hak akses ke sistem ALAS.' }
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

