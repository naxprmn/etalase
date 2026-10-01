import { db } from '@/shared/lib/db'
import { jurnal } from '../../../../drizzle/schema'
import { eq } from 'drizzle-orm'
import type { DatabaseExecutor } from '@/shared/lib/db'

interface IncomingDokumen {
  nama: string
  url: string
  tipe: string
  /** Pilihan visibilitas dari pengaju (Lawet Hub). */
  is_public?: boolean
}

interface JurnalPayload {
  source_id: string
  judul: string
  ringkasan?: string | null
  tanggal_kegiatan: string
  kategori: string
  link_publikasi?: string | null
  dokumentasi?: any[]
  dokumen_pendukung?: IncomingDokumen[]
  pihak_terkait?: any[]
  custom_fields?: any[]
  tags?: any[] | null
  redaksi?: string | null
  divisi?: string | null
}

export async function upsertJurnal(payload: JurnalPayload, database: DatabaseExecutor = db) {
  // 1. Fetch existing item by source_id
  const existingItems = await database
    .select({ dokumen_pendukung: jurnal.dokumen_pendukung })
    .from(jurnal)
    .where(eq(jurnal.source_id, payload.source_id))
    .limit(1)
  const existing = existingItems[0] || null

  // 2. Apply merge strategy for dokumen_pendukung is_public
  const incomingDocs = payload.dokumen_pendukung || []
  let mergedDocs: any[] = []

  if (existing) {
    // Map existing docs by URL
    const existingDocs = Array.isArray(existing.dokumen_pendukung) ? existing.dokumen_pendukung : []
    const existingIsPublicMap = new Map<string, boolean>()
    
    existingDocs.forEach((d: any) => {
      if (d && d.url) {
        existingIsPublicMap.set(d.url, d.is_public !== false) // default to true
      }
    })

    mergedDocs = incomingDocs.map(doc => ({
      nama: doc.nama,
      url: doc.url,
      tipe: doc.tipe,
      // Toggle admin yang sudah ada menang; dokumen baru memakai pilihan pengaju.
      is_public: existingIsPublicMap.has(doc.url)
        ? existingIsPublicMap.get(doc.url)
        : doc.is_public !== false
    }))
  } else {
    // Jurnal baru -> pakai pilihan pengaju (default publik jika tidak dikirim)
    mergedDocs = incomingDocs.map(doc => ({
      nama: doc.nama,
      url: doc.url,
      tipe: doc.tipe,
      is_public: doc.is_public !== false
    }))
  }

  const valuesToUpsert = {
    source_id: payload.source_id,
    judul: payload.judul,
    ringkasan: payload.ringkasan || null,
    tanggal_kegiatan: payload.tanggal_kegiatan,
    kategori: payload.kategori,
    link_publikasi: payload.link_publikasi || null,
    dokumentasi: payload.dokumentasi || [],
    dokumen_pendukung: mergedDocs,
    pihak_terkait: payload.pihak_terkait || [],
    custom_fields: payload.custom_fields || [],
    tags: payload.tags || [],
    redaksi: payload.redaksi || null,
    divisi: payload.divisi || null,
    is_published: true, // Default to true on publish sync
    workflow_status: 'published',
    synced_at: new Date(),
    updated_at: new Date()
  }

  const [row] = await database.insert(jurnal).values({
    ...valuesToUpsert,
    created_at: new Date()
  }).onConflictDoUpdate({
    target: jurnal.source_id,
    set: valuesToUpsert,
  }).returning({ id: jurnal.id })

  return { id: row.id, action: existing ? "updated" : "created" }
}
