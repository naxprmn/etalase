import { NextRequest, NextResponse } from 'next/server'
import { authenticateService, authenticateServiceWrite, getServiceEventId } from '@/features/service-auth/lib/verify-token'
import { upsertJurnal } from '@/features/jurnal-sync/lib/upsert-jurnal'
import { processServiceEvent } from '@/features/service-events/lib/process-service-event'
import { jurnalPayloadSchema } from '@/features/jurnal-sync/model/service-payload'
import { db } from '@/shared/lib/db'
import { escapeLike } from '@/shared/lib/escape-like'
import { jurnal } from '../../../../../drizzle/schema'
import { eq, ilike, or, and, sql, gte, lte } from 'drizzle-orm'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

export async function POST(request: NextRequest) {
  const body = await request.text()
  if (!authenticateServiceWrite(request, body)) {
    return NextResponse.json({ status: "error", message: "unauthorized" }, { status: 401 })
  }

  try {
    const eventId = getServiceEventId(request)
    if (!eventId) {
      return NextResponse.json({ status: "error", message: "invalid event id" }, { status: 422 })
    }
    const parsed = jurnalPayloadSchema.safeParse(JSON.parse(body))
    if (!parsed.success) {
      return NextResponse.json({ status: "error", message: "validation error" }, { status: 422 })
    }
    const payload = parsed.data

    const result = await processServiceEvent({
      eventId,
      resourceType: 'jurnal',
      sourceId: payload.source_id,
      operation: 'upsert',
    }, (transaction) => upsertJurnal(payload, transaction))

    if (result.duplicate) {
      return NextResponse.json({ status: "ok", source_id: payload.source_id, action: "duplicate" })
    }
    const { id, action } = result.value!
    return NextResponse.json(
      { status: "ok", id, source_id: payload.source_id, action },
      { status: action === "created" ? 201 : 200 }
    )
  } catch {
    return NextResponse.json({ status: "error", message: "internal error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  if (!authenticateService(request)) {
    return NextResponse.json({ status: "error", message: "unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const divisiParam = searchParams.get('divisi')
    const searchParam = searchParams.get('search')
    const startDateParam = searchParams.get('start_date')
    const endDateParam = searchParams.get('end_date')

    const filters = []
    if (searchParams.get('published') === 'true') {
      filters.push(eq(jurnal.is_published, true), eq(jurnal.workflow_status, 'published'))
    }
    if (divisiParam) {
      filters.push(eq(jurnal.divisi, divisiParam))
    }
    if (searchParam) {
      const pattern = `%${escapeLike(searchParam)}%`
      filters.push(
        or(
          ilike(jurnal.judul, pattern),
          sql`${jurnal.tags}::text ilike ${pattern}`
        )
      )
    }
    if (startDateParam) {
      filters.push(gte(jurnal.tanggal_kegiatan, startDateParam))
    }
    if (endDateParam) {
      filters.push(lte(jurnal.tanggal_kegiatan, endDateParam))
    }
    const where = filters.length > 0 ? and(...filters) : undefined

    const sortParam = searchParams.get('sort') || 'tanggal_desc'
    let orderExpression = [sql`${jurnal.tanggal_kegiatan} DESC`, sql`${jurnal.id} DESC`]
    if (sortParam === 'tanggal_asc') {
      orderExpression = [sql`${jurnal.tanggal_kegiatan} ASC`, sql`${jurnal.id} ASC`]
    } else if (sortParam === 'judul_asc') {
      orderExpression = [sql`${jurnal.judul} ASC`, sql`${jurnal.id} DESC`]
    } else if (sortParam === 'judul_desc') {
      orderExpression = [sql`${jurnal.judul} DESC`, sql`${jurnal.id} DESC`]
    }

    // Daftar selalu dipaginasi: tanpa page/limit dipakai halaman 1 dengan limit bawaan.
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.max(1, Math.min(MAX_LIMIT, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT)) || DEFAULT_LIMIT))

    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(jurnal).where(where)
    const items = await db.select().from(jurnal).where(where)
      .orderBy(...orderExpression)
      .limit(limit)
      .offset((page - 1) * limit)

    return NextResponse.json({ status: "ok", data: items, total, page, limit })
  } catch {
    return NextResponse.json({ status: "error", message: "internal error" }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
