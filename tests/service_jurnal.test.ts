import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/shared/lib/db'
import { jurnal } from '../drizzle/schema'
import { eq, sql } from 'drizzle-orm'
import { upsertJurnal } from '@/features/jurnal-sync/lib/upsert-jurnal'

describe('Service Jurnal CRUD Integration', () => {
  const testSourceId = '11111111-2222-3333-4444-555555555555'

  beforeAll(async () => {
    process.env.DATABASE_URL = 'postgresql://alas_user:change-this-strong-password@localhost:5433/alas'
    await db.delete(jurnal).where(eq(jurnal.source_id, testSourceId))
  })

  afterAll(async () => {
    await db.delete(jurnal).where(eq(jurnal.source_id, testSourceId))
  })

  it('should insert new Jurnal (action: created)', async () => {
    const payload = {
      source_id: testSourceId,
      judul: 'Test Jurnal Kegiatan',
      tanggal_kegiatan: '2026-06-15',
      kategori: 'mou',
      tags: ['test', 'alas'],
      redaksi: 'Superadmin Test',
      dokumen_pendukung: [
        { nama: 'Doc 1', url: 'https://media.com/doc1.pdf', tipe: 'pdf' },
      ],
    }

    const res = await upsertJurnal(payload)
    expect(res.action).toBe('created')

    const dbItems = await db.select().from(jurnal).where(eq(jurnal.source_id, testSourceId)).limit(1)
    expect(dbItems.length).toBe(1)
    expect(dbItems[0].judul).toBe('Test Jurnal Kegiatan')
    expect(dbItems[0].redaksi).toBe('Superadmin Test')
    const tags = dbItems[0].tags as string[]
    expect(tags).toContain('test')
    expect(tags).toContain('alas')
    const docs = dbItems[0].dokumen_pendukung as any[]
    expect(docs[0].is_public).toBe(true)
  })

  it('should upsert Jurnal (action: updated) and merge is_public values', async () => {
    const dbItemsBefore = await db.select().from(jurnal).where(eq(jurnal.source_id, testSourceId)).limit(1)
    const existing = dbItemsBefore[0]
    const existingDocs = existing.dokumen_pendukung as any[]
    existingDocs[0].is_public = false
    await db.update(jurnal).set({ dokumen_pendukung: existingDocs }).where(eq(jurnal.id, existing.id))

    const payload = {
      source_id: testSourceId,
      judul: 'Test Jurnal Kegiatan (Updated Title)',
      tanggal_kegiatan: '2026-06-15',
      kategori: 'mou',
      dokumen_pendukung: [
        // Toggle admin yang sudah ada (false) harus menang atas nilai kiriman.
        { nama: 'Doc 1', url: 'https://media.com/doc1.pdf', tipe: 'pdf', is_public: true },
        { nama: 'Doc 2', url: 'https://media.com/doc2.pdf', tipe: 'pdf' },
        // Dokumen baru memakai pilihan pengaju.
        { nama: 'Doc 3', url: 'https://media.com/doc3.pdf', tipe: 'pdf', is_public: false },
      ],
    }

    const res = await upsertJurnal(payload)
    expect(res.action).toBe('updated')

    const dbItemsAfter = await db.select().from(jurnal).where(eq(jurnal.source_id, testSourceId)).limit(1)
    const updatedDocs = dbItemsAfter[0].dokumen_pendukung as any[]
    
    expect(dbItemsAfter[0].judul).toBe('Test Jurnal Kegiatan (Updated Title)')
    expect(updatedDocs.length).toBe(3)
    const doc1 = updatedDocs.find(d => d.url === 'https://media.com/doc1.pdf')
    expect(doc1.is_public).toBe(false)
    const doc2 = updatedDocs.find(d => d.url === 'https://media.com/doc2.pdf')
    expect(doc2.is_public).toBe(true)
    const doc3 = updatedDocs.find(d => d.url === 'https://media.com/doc3.pdf')
    expect(doc3.is_public).toBe(false)
  })

  it('should remove missing documents on upsert', async () => {
    const payload = {
      source_id: testSourceId,
      judul: 'Test Jurnal Kegiatan',
      tanggal_kegiatan: '2026-06-15',
      kategori: 'mou',
      dokumen_pendukung: [
        { nama: 'Doc 2', url: 'https://media.com/doc2.pdf', tipe: 'pdf' },
      ],
    }

    await upsertJurnal(payload)
    const dbItems = await db.select().from(jurnal).where(eq(jurnal.source_id, testSourceId)).limit(1)
    const docs = dbItems[0].dokumen_pendukung as any[]
    
    expect(docs.length).toBe(1)
    expect(docs[0].url).toBe('https://media.com/doc2.pdf')
  })

  it('should safely coalesce concurrent first deliveries for one source_id', async () => {
    await db.delete(jurnal).where(eq(jurnal.source_id, testSourceId))
    const payload = {
      source_id: testSourceId,
      judul: 'Concurrent delivery',
      tanggal_kegiatan: '2026-06-15',
      kategori: 'mou',
    }

    await db.execute(sql.raw(`
      CREATE OR REPLACE FUNCTION test_delay_jurnal_insert() RETURNS trigger AS $$
      BEGIN
        IF NEW.source_id = '${testSourceId}'::uuid THEN
          PERFORM pg_sleep(0.15);
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER test_delay_jurnal_insert
      BEFORE INSERT ON jurnal
      FOR EACH ROW EXECUTE FUNCTION test_delay_jurnal_insert();
    `))

    try {
      await expect(Promise.all([
        upsertJurnal(payload),
        upsertJurnal(payload),
      ])).resolves.toHaveLength(2)
    } finally {
      await db.execute(sql.raw(`
        DROP TRIGGER IF EXISTS test_delay_jurnal_insert ON jurnal;
        DROP FUNCTION IF EXISTS test_delay_jurnal_insert();
      `))
    }

    const rows = await db.select().from(jurnal).where(eq(jurnal.source_id, testSourceId))
    expect(rows).toHaveLength(1)
  })
})
