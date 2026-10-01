'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getMeAction } from '@/entities/lawet-user'
import { JurnalSubmissionPayload, jurnalSubmissionSchema } from '../model/submission-schema'
import { toMediaObjectName } from '../lib/media-url'

/**
 * Pengajuan / edit jurnal langsung ke Lawet Hub (ADR-0005).
 * Lawet Hub adalah sumber data tunggal workflow: jurnal masuk sebagai `draft`
 * (antrean review), lalu approver menyetujui → Lawet Hub mem-push ke
 * `/api/service/jurnal` ALAS sebagai read model publik.
 */

function readErrorDetail(status: number, data: any): string {
  const detail = data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d: any) => `${(d.loc || []).slice(-1)[0] ?? 'field'}: ${d.msg}`).join('; ')
  }
  return `Lawet Hub merespons HTTP ${status}`
}

async function lawetFetch(path: string, token: string, init: RequestInit = {}) {
  const LAWET_API_URL = process.env.LAWET_API_URL
  if (!LAWET_API_URL) throw new Error('LAWET_API_URL belum dikonfigurasi')

  const res = await fetch(`${LAWET_API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...init.headers,
    },
    cache: 'no-store',
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(readErrorDetail(res.status, data))
  return data
}

export async function submitJurnalAction(payload: JurnalSubmissionPayload) {
  const token = cookies().get('lawet_token')?.value

  if (!token) {
    return { success: false, error: 'Unauthorized. Silakan login kembali.' }
  }

  const user = await getMeAction();
  if (!user) {
    return { success: false, error: 'User tidak ditemukan.' }
  }

  try {
    const validatedData = jurnalSubmissionSchema.parse(payload)
    const isUpdate = !!validatedData.id

    const body = {
      judul: validatedData.judul,
      ringkasan: validatedData.ringkasan || null,
      tanggal_kegiatan: validatedData.tanggal_kegiatan,
      kategori: validatedData.kategori,
      link_publikasi: validatedData.link_publikasi || null,
      dokumentasi: validatedData.dokumentasi.map(d => ({ ...d, url: toMediaObjectName(d.url) })),
      dokumen_pendukung: validatedData.dokumen_pendukung.map(d => ({ ...d, url: toMediaObjectName(d.url) })),
      pihak_terkait: validatedData.pihak_terkait,
      custom_fields: validatedData.custom_fields,
      tags: validatedData.tags,
    }

    const saved = isUpdate
      ? await lawetFetch(`/api/v1/jurnal-alas/${encodeURIComponent(validatedData.id!)}`, token, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      : await lawetFetch('/api/v1/jurnal-alas/', token, {
          method: 'POST',
          body: JSON.stringify(body),
        })

    const sourceId: string = saved?.id ?? validatedData.id
    let status: string = saved?.status ?? 'draft'
    let warning: string | undefined

    // Approver/superadmin yang mengajukan jurnal baru langsung menyetujuinya
    // (sama seperti perilaku sebelumnya); staf masuk antrean review.
    const canSelfApprove = !!(user.role?.can_approve || user.role?.is_superadmin)
    if (!isUpdate && canSelfApprove && status === 'draft') {
      try {
        await lawetFetch(`/api/v1/jurnal-alas/${encodeURIComponent(sourceId)}/approve`, token, { method: 'POST' })
        status = 'publish_pending'
      } catch (err: any) {
        warning = `Jurnal tersimpan, tetapi gagal dipublikasikan otomatis: ${err.message}`
      }
    }

    revalidatePath('/panel');

    return { success: true, data: { source_id: sourceId, status }, warning }
  } catch (error: any) {
    if (error.errors) { // Zod Error
      const msg = error.errors.map((e: any) => e.message).join(', ')
      return { success: false, error: msg }
    }
    return { success: false, error: error.message || 'Gagal mengirim jurnal ke Lawet Hub' }
  }
}
