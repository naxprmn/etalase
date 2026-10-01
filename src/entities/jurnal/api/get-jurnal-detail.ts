import { db } from '@/shared/lib/db'
import { jurnal } from '../../../../drizzle/schema'
import { eq, and, or } from 'drizzle-orm'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Cari jurnal berdasarkan id lokal ALAS atau source_id (id Lawet Hub),
 * karena panel memakai id Lawet Hub sedangkan etalase memakai id lokal.
 */
export async function getJurnalDetail(id: string, isPublicOnly = true) {
  if (!UUID_RE.test(id)) return null

  const conditions = [or(eq(jurnal.id, id), eq(jurnal.source_id, id))!]
  if (isPublicOnly) {
    conditions.push(eq(jurnal.is_published, true), eq(jurnal.workflow_status, 'published'))
  }
  const results = await db.select().from(jurnal).where(and(...conditions)).limit(1)
  return results[0] || null
}
