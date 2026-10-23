import { db, type DatabaseExecutor } from '@/shared/lib/db'
import { serviceEvents } from '../../../../drizzle/schema'
import { purgeServiceEvents } from './purge-service-events'

interface ServiceEventInput {
  eventId: string
  resourceType: 'jurnal' | 'pimpinan'
  sourceId: string
  operation: string
}

export interface ServiceEventResult<T> {
  duplicate: boolean
  value?: T
}

const PURGE_INTERVAL_MS = 60 * 60 * 1000
let lastPurgeAt = 0

/** Pembersihan ledger berjalan paling sering sekali per jam per proses, di luar transaksi event. */
async function purgeLedgerIfDue(): Promise<void> {
  if (Date.now() - lastPurgeAt < PURGE_INTERVAL_MS) return
  lastPurgeAt = Date.now()
  try {
    await purgeServiceEvents()
  } catch (error) {
    console.error('[service-events] pembersihan ledger gagal:', error)
  }
}

export async function processServiceEvent<T>(
  input: ServiceEventInput,
  handler: (transaction: DatabaseExecutor) => Promise<T>,
): Promise<ServiceEventResult<T>> {
  const result = await db.transaction(async (transaction) => {
    const [claimed] = await transaction.insert(serviceEvents)
      .values({
        event_id: input.eventId,
        resource_type: input.resourceType,
        source_id: input.sourceId,
        operation: input.operation,
      })
      .onConflictDoNothing({ target: serviceEvents.event_id })
      .returning({ eventId: serviceEvents.event_id })

    if (!claimed) {
      return { duplicate: true } as ServiceEventResult<T>
    }

    const value = await handler(transaction)
    return { duplicate: false, value } as ServiceEventResult<T>
  })

  void purgeLedgerIfDue()
  return result
}
