'use server'

import { db } from '@/shared/lib/db'
import { eq } from 'drizzle-orm'
import { jurnal } from '../../../../drizzle/schema'
import { revalidatePath } from 'next/cache'
import { getMeAction } from '@/entities/lawet-user'

export async function deleteJurnalAction(id: string) {
  try {
    const user = await getMeAction()
    if (!user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu.' }
    }

    const existing = await db.select().from(jurnal).where(eq(jurnal.id, id)).limit(1)
    if (!existing.length) {
      return { success: false, error: 'Jurnal tidak ditemukan.' }
    }

    const item = existing[0]
    const isPrivileged = Boolean(
      user.role?.is_superadmin ||
      user.role?.can_approve ||
      user.role?.name?.toLowerCase().includes('kasubag') ||
      user.role?.name?.toLowerCase().includes('admin')
    )
    const isOwner = Boolean(user.name && item.redaksi && user.name.toLowerCase() === item.redaksi.toLowerCase())

    if (!isPrivileged && !isOwner) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki wewenang untuk menghapus jurnal ini.' }
    }

    await db.delete(jurnal).where(eq(jurnal.id, id))
    revalidatePath('/panel')
    revalidatePath('/jurnal-saya')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Terjadi kesalahan saat menghapus jurnal.' }
  }
}

