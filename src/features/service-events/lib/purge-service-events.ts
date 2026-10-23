import { lt, sql } from 'drizzle-orm'
import { db, type DB } from '@/shared/lib/db'
import { serviceEvents } from '../../../../drizzle/schema'

/**
 * Ledger idempotency hanya perlu bertahan lebih lama dari jendela replay tanda tangan
 * (`ALAS_REPLAY_WINDOW_SECONDS`, menit): event yang lebih tua ditolak verifikasi HMAC sebelum sempat diproses ulang.
 */
export const SERVICE_EVENT_RETENTION_DAYS = 90

export async function purgeServiceEvents(
  retentionDays = SERVICE_EVENT_RETENTION_DAYS,
  database: Pick<DB, 'delete'> = db,
): Promise<number> {
  if (!Number.isInteger(retentionDays) || retentionDays < 1) {
    throw new Error('retensi service_events minimal 1 hari')
  }
  const removed = await database
    .delete(serviceEvents)
    .where(lt(serviceEvents.processed_at, sql`now() - make_interval(days => ${retentionDays})`))
    .returning({ eventId: serviceEvents.event_id })
  return removed.length
}
