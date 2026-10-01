import { db } from '@/shared/lib/db'
import { jurnal } from '../../../../drizzle/schema'
import { and, eq, ilike, or, lt, sql } from 'drizzle-orm'

interface GetJurnalListParams {
  q?: string
  kategori?: string
  cursor?: string
  limit?: number
  date?: string
  tahun?: string
}

type CursorItem = Pick<typeof jurnal.$inferSelect, 'id' | 'tanggal_kegiatan'>

export function encodeJurnalCursor(item: CursorItem): string {
  return Buffer.from(`${item.tanggal_kegiatan}|${item.id}`).toString('base64url')
}


export async function getJurnalList({ q = '', kategori = '', cursor = '', limit = 20, date = '', tahun = '' }: GetJurnalListParams) {
  let conditions = [eq(jurnal.is_published, true), eq(jurnal.workflow_status, 'published')]

  if (date) {
    conditions.push(eq(jurnal.tanggal_kegiatan, date))
  }
  
  if (tahun) {
    conditions.push(sql`EXTRACT(YEAR FROM ${jurnal.tanggal_kegiatan}) = ${tahun}`)
  }

  if (kategori) {
    conditions.push(sql`LOWER(${jurnal.kategori}) = LOWER(${kategori})`)
  }

  if (q) {
    conditions.push(
      or(
        ilike(jurnal.judul, `%${q}%`),
        ilike(jurnal.ringkasan, `%${q}%`),
        ilike(jurnal.redaksi, `%${q}%`),
        sql`${jurnal.pihak_terkait}::text ILIKE ${`%${q}%`}`,
        sql`${jurnal.tags}::text ILIKE ${`%${q}%`}`
      )!
    )
  }

  // Count total items
  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(jurnal)
    .where(and(...conditions))
  const totalCount = Number(countResult[0]?.count || 0)

  // Offset pagination
  const page = Number(cursor) || 1; 
  const offset = (page - 1) * limit;

  // Daftar publik hanya mengambil kolom yang benar-benar dikirim ke kartu jurnal.
  const items = await db.select({
    id: jurnal.id,
    source_id: jurnal.source_id,
    judul: jurnal.judul,
      ringkasan: jurnal.ringkasan,
    tanggal_kegiatan: jurnal.tanggal_kegiatan,
    kategori: jurnal.kategori,
    link_publikasi: jurnal.link_publikasi,
    dokumentasi: jurnal.dokumentasi,
    dokumen_pendukung: jurnal.dokumen_pendukung,
    pihak_terkait: jurnal.pihak_terkait,
    custom_fields: jurnal.custom_fields,
    tags: jurnal.tags,
    redaksi: jurnal.redaksi,
    created_at: jurnal.created_at,
  })
    .from(jurnal)
    .where(and(...conditions))
    .orderBy(sql`${jurnal.tanggal_kegiatan} DESC`, sql`${jurnal.id} DESC`)
    .limit(limit)
    .offset(offset)

  return { items, totalCount }
}

