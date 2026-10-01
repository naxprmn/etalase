'use server'

import { cookies } from 'next/headers'

const LAWET_API_URL = process.env.LAWET_API_URL as string

/**
 * Ambil pesan error yang terbaca dari respons Lawet Hub.
 * `detail` bisa berupa string (AppException), array (FastAPI 422),
 * atau body bukan JSON sama sekali (mis. 413 HTML dari nginx).
 */
function extractError(status: number, data: any, fallback: string): string {
  if (status === 413) return 'Ukuran file melebihi batas server'
  if (status === 401) return 'Sesi login berakhir, silakan login ulang'
  if (status === 403) return data?.detail || 'Anda tidak memiliki akses untuk mengunggah'
  const detail = data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d: any) => `${(d.loc || []).slice(-1)[0] ?? 'field'}: ${d.msg}`).join('; ')
  }
  return `${fallback} (HTTP ${status})`
}

async function uploadToLawet(path: string, formData: FormData, fallback: string) {
  try {
    const token = cookies().get('lawet_token')?.value
    if (!token) throw new Error('Tidak ada akses (token hilang)')

    const res = await fetch(`${LAWET_API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) throw new Error(extractError(res.status, data, fallback))
    if (!data?.url) throw new Error(`${fallback}: respons server tidak berisi URL`)

    return { success: true, data }
  } catch (error: any) {
    console.error(`[upload] ${path} gagal:`, error?.message)
    return { success: false, error: error.message }
  }
}

export async function uploadFotoAction(formData: FormData) {
  return uploadToLawet('/api/v1/jurnal-alas/upload/foto', formData, 'Gagal mengunggah foto')
}

export async function uploadDokumenAction(formData: FormData) {
  if (!formData.get('nama')) {
    const file = formData.get('file') as File | null
    formData.append('nama', file?.name || 'Dokumen Pendukung')
  }
  return uploadToLawet('/api/v1/jurnal-alas/upload/dokumen', formData, 'Gagal mengunggah dokumen')
}
