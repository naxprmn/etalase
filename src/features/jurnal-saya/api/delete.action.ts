'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getMeAction } from '@/entities/lawet-user'

/**
 * Hapus jurnal lewat Lawet Hub (ADR-0005). Lawet Hub melakukan soft delete,
 * memeriksa hak akses (pemilik atau superadmin), dan—bila jurnal sudah
 * terbit—mengantrekan penghapusan ke etalase ALAS lewat Service API.
 */
export async function deleteJurnalAction(id: string) {
  try {
    const user = await getMeAction()
    const token = cookies().get('lawet_token')?.value
    if (!user || !token) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' }
    }

    const LAWET_API_URL = process.env.LAWET_API_URL
    if (!LAWET_API_URL) {
      return { success: false, error: 'LAWET_API_URL belum dikonfigurasi' }
    }

    const res = await fetch(`${LAWET_API_URL}/api/v1/jurnal-alas/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      const detail = typeof data?.detail === 'string' ? data.detail : null
      if (res.status === 403) {
        return { success: false, error: detail || 'Akses ditolak: hanya pemilik atau superadmin yang dapat menghapus jurnal ini.' }
      }
      if (res.status === 404) {
        return { success: false, error: 'Jurnal tidak ditemukan.' }
      }
      return { success: false, error: detail || `Lawet Hub merespons HTTP ${res.status}` }
    }

    revalidatePath('/panel')
    revalidatePath('/jurnal-saya')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Terjadi kesalahan saat menghapus jurnal.' }
  }
}
