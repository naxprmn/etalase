'use server'

import { revalidatePath } from 'next/cache'
import { getMeAction, canApproveJurnal } from '@/entities/lawet-user'
import { approveJurnalAction, requestRevisionAction } from '@/entities/jurnal/api/approve-jurnal.action'

export async function setujuJurnalAction(id: string): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const user = await getMeAction()
    if (!user || !canApproveJurnal(user)) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki wewenang.' }
    }
    const res = await approveJurnalAction(id)
    if (!res.success) {
      return res
    }
    revalidatePath('/panel')
    revalidatePath('/approval')
    revalidatePath('/jurnal-saya')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function tolakJurnalAction(id: string, reason?: string): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const user = await getMeAction()
    if (!user || !canApproveJurnal(user)) {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki wewenang.' }
    }
    const res = await requestRevisionAction(id, reason || '')
    if (!res.success) {
      return res
    }
    revalidatePath('/panel')
    revalidatePath('/approval')
    revalidatePath('/jurnal-saya')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
