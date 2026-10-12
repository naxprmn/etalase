import { NextRequest, NextResponse } from 'next/server'
import { authenticateService, authenticateServiceWrite, getServiceEventId } from '@/features/service-auth/lib/verify-token'
import { processServiceEvent } from '@/features/service-events/lib/process-service-event'
import { jurnalPatchSchema } from '@/features/jurnal-sync/model/service-payload'
import { determineJurnalVisibility } from '@/entities/jurnal/lib/visibility'
import { db } from '@/shared/lib/db'
import { jurnal } from '../../../../../../drizzle/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest, { params }: { params: { sourceId: string } }) {
  if (!authenticateService(request)) {
    return NextResponse.json({ status: "error", message: "unauthorized" }, { status: 401 })
  }

  try {
    const sourceId = params.sourceId
    const items = await db.select().from(jurnal).where(eq(jurnal.source_id, sourceId)).limit(1)
    const item = items[0]

    if (!item) {
      return NextResponse.json({ status: "error", message: "not found" }, { status: 404 })
    }

    return NextResponse.json({
      status: "ok",
      data: item
    })
  } catch {
    return NextResponse.json({ status: "error", message: "internal error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { sourceId: string } }) {
  const body = await request.text()
  if (!authenticateServiceWrite(request, body)) {
    return NextResponse.json({ status: "error", message: "unauthorized" }, { status: 401 })
  }

  try {
    const sourceId = params.sourceId
    const eventId = getServiceEventId(request)
    if (!eventId) {
      return NextResponse.json({ status: "error", message: "invalid event id" }, { status: 422 })
    }
    const parsed = jurnalPatchSchema.safeParse(JSON.parse(body))
    if (!parsed.success) {
      return NextResponse.json({ status: "error", message: "validation error" }, { status: 422 })
    }
    const payload = parsed.data
    const payloadFields: Record<string, unknown> = payload

    let updateFields: any = {
      synced_at: new Date(),
      updated_at: new Date()
    }

    const fields = [
      'judul', 'tanggal_kegiatan', 'kategori', 'link_publikasi',
      'dokumentasi', 'pihak_terkait', 'custom_fields', 'is_published',
      'tags', 'redaksi', 'divisi'
    ]

    fields.forEach(field => {
      if (payloadFields[field] !== undefined) {
        updateFields[field] = payloadFields[field]
      }
    })

    const result = await processServiceEvent({
      eventId,
      resourceType: 'jurnal',
      sourceId,
      operation: 'patch',
    }, async (transaction) => {
      const [existing] = await transaction
        .select({
          id: jurnal.id,
          is_published: jurnal.is_published,
          dokumen_pendukung: jurnal.dokumen_pendukung,
          custom_fields: jurnal.custom_fields,
        })
        .from(jurnal)
        .where(eq(jurnal.source_id, sourceId))
        .limit(1)
      if (!existing) return null

      if (payload.dokumen_pendukung !== undefined) {
        const incomingDocs = payload.dokumen_pendukung || []
        const existingDocs = Array.isArray(existing.dokumen_pendukung) ? existing.dokumen_pendukung : []
        const existingIsPublicMap = new Map<string, boolean>()
        existingDocs.forEach((d: any) => {
          if (d && d.url) existingIsPublicMap.set(d.url, d.is_public !== false)
        })
        updateFields.dokumen_pendukung = incomingDocs.map((doc: any) => ({
          nama: doc.nama,
          url: doc.url,
          tipe: doc.tipe,
          is_public: existingIsPublicMap.has(doc.url) ? existingIsPublicMap.get(doc.url) : true,
        }))
      }

      if (updateFields.is_published === undefined) {
        updateFields.is_published = determineJurnalVisibility({
          is_published: undefined,
          custom_fields: updateFields.custom_fields || existing.custom_fields,
          dokumen_pendukung: updateFields.dokumen_pendukung || existing.dokumen_pendukung,
          existing_is_published: existing.is_published,
        })
      }

      const [updated] = await transaction.update(jurnal)
        .set(updateFields)
        .where(eq(jurnal.id, existing.id))
        .returning({ id: jurnal.id })
      return updated || null
    })

    if (result.duplicate) {
      return NextResponse.json({ status: "ok", source_id: sourceId, action: "duplicate" })
    }
    if (!result.value) {
      return NextResponse.json({ status: "error", message: "not found" }, { status: 404 })
    }

    return NextResponse.json({
      status: "ok",
      source_id: sourceId,
      action: "updated"
    })
  } catch {
    return NextResponse.json({ status: "error", message: "internal error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { sourceId: string } }) {
  const body = ''
  if (!authenticateServiceWrite(request, body)) {
    return NextResponse.json({ status: "error", message: "unauthorized" }, { status: 401 })
  }

  try {
    const sourceId = params.sourceId
    const eventId = getServiceEventId(request)
    if (!eventId) {
      return NextResponse.json({ status: "error", message: "invalid event id" }, { status: 422 })
    }
    const result = await processServiceEvent({
      eventId,
      resourceType: 'jurnal',
      sourceId,
      operation: 'delete',
    }, async (transaction) => {
      const [updated] = await transaction.update(jurnal)
        .set({ is_published: false, synced_at: new Date(), updated_at: new Date() })
        .where(eq(jurnal.source_id, sourceId))
        .returning({ id: jurnal.id })
      return updated || null
    })

    if (result.duplicate) {
      return NextResponse.json({ status: "ok", source_id: sourceId, action: "duplicate" })
    }
    if (!result.value) {
      return NextResponse.json({ status: "error", message: "not found" }, { status: 404 })
    }

    return NextResponse.json({
      status: "ok",
      source_id: sourceId
    })
  } catch {
    return NextResponse.json({ status: "error", message: "internal error" }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
