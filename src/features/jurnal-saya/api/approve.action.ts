'use server'

import { db } from '@/shared/lib/db'
import { eq } from 'drizzle-orm'
import { jurnal } from '../../../../drizzle/schema'
import { revalidatePath } from 'next/cache'

export async function setujuJurnalAction(id: string) {
  try {
    await db.update(jurnal).set({ 
      workflow_status: 'published',
      is_published: true 
    }).where(eq(jurnal.id, id));
    revalidatePath('/panel');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function tolakJurnalAction(id: string, reason?: string) {
  try {
    await db.update(jurnal).set({ 
      workflow_status: 'rejected',
      is_published: false,
      workflow_notes: reason || null
    }).where(eq(jurnal.id, id));
    revalidatePath('/panel');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

