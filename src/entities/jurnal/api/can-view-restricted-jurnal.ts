import { cookies } from 'next/headers'
import type { LawetUser } from '@/entities/lawet-user'

interface RestrictedJurnalRef {
  source_id?: string | null
  divisi?: string | null
}

const DEFAULT_TIMEOUT_MS = 5000

function requestTimeoutMs(): number {
  const configured = Number(process.env.LAWET_REQUEST_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS)
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TIMEOUT_MS
}

/**
 * Siapa yang boleh melihat jurnal yang belum publik atau dokumen privatnya.
 * Nama pengguna bukan bukti kepemilikan (redaksi hanya teks yang bisa disunting):
 *  - superadmin: selalu;
 *  - approver: hanya jurnal divisinya sendiri;
 *  - pemilik: dibuktikan Lawet Hub, yang hanya mengembalikan detail jurnal bagi pemilik atau superadmin.
 */
export async function canViewRestrictedJurnal(
  user: LawetUser | null | undefined,
  item: RestrictedJurnalRef,
): Promise<boolean> {
  if (!user) return false
  if (user.role?.is_superadmin === true) return true

  const divisionName = user.division?.name
  if (user.role?.can_approve === true && divisionName && item.divisi === divisionName) return true

  const token = cookies().get('lawet_token')?.value
  const apiUrl = process.env.LAWET_API_URL
  if (!token || !apiUrl || !item.source_id) return false

  try {
    const response = await fetch(`${apiUrl}/api/v1/jurnal-alas/${encodeURIComponent(item.source_id)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(requestTimeoutMs()),
    })
    return response.ok
  } catch {
    return false
  }
}
