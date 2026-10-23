import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { eq, inArray } from 'drizzle-orm'
import { db } from '@/shared/lib/db'
import { jurnal } from '../drizzle/schema'
import { getJurnalList } from '@/entities/jurnal/api/get-jurnal-list'
import { getJurnalDetail } from '@/entities/jurnal/api/get-jurnal-detail'

const ids = {
  neutral: 'c1111111-2222-4333-8444-555555555551',
  hadir: 'c1111111-2222-4333-8444-555555555552',
  privat: 'c1111111-2222-4333-8444-555555555553',
  privatHuruf: 'c1111111-2222-4333-8444-555555555554',
  aksesPublik: 'c1111111-2222-4333-8444-555555555555',
  objectFields: 'c1111111-2222-4333-8444-555555555556',
}

function base(source_id: string, custom_fields: unknown) {
  return {
    source_id,
    judul: `Uji visibilitas ${source_id.slice(-1)}`,
    tanggal_kegiatan: '2026-09-01',
    kategori: 'uji-visibilitas',
    is_published: true,
    workflow_status: 'published',
    custom_fields: custom_fields as any,
  }
}

describe('filter privat di kueri publik memeriksa label, bukan sembarang nilai', () => {
  const rows = {
    [ids.neutral]: [],
    [ids.hadir]: [{ label: 'Hadir daring', value: 'false' }],
    [ids.privat]: [{ label: 'akses', value: 'privat' }],
    [ids.privatHuruf]: [{ label: ' Is_Published ', value: ' FALSE ' }],
    [ids.aksesPublik]: [{ label: 'akses_publik', value: 'private' }],
    [ids.objectFields]: { bukan: 'array' },
  }

  beforeAll(async () => {
    await db.delete(jurnal).where(inArray(jurnal.source_id, Object.keys(rows)))
    await db.insert(jurnal).values(Object.entries(rows).map(([id, fields]) => base(id, fields)))
  })

  afterAll(async () => {
    await db.delete(jurnal).where(inArray(jurnal.source_id, Object.keys(rows)))
  })

  async function listedSourceIds() {
    const { items } = await getJurnalList({ kategori: 'uji-visibilitas', limit: 50 })
    return items.map((item) => item.source_id)
  }

  it('daftar publik menyembunyikan jurnal berlabel akses privat dalam variasi huruf dan spasi', async () => {
    const listed = await listedSourceIds()
    expect(listed).not.toContain(ids.privat)
    expect(listed).not.toContain(ids.privatHuruf)
    expect(listed).not.toContain(ids.aksesPublik)
  })

  it('nilai "false" pada field lain tidak menyembunyikan jurnal', async () => {
    const listed = await listedSourceIds()
    expect(listed).toContain(ids.hadir)
    expect(listed).toContain(ids.neutral)
  })

  it('custom_fields yang bukan array tidak merusak kueri dan dianggap netral', async () => {
    expect(await listedSourceIds()).toContain(ids.objectFields)
  })

  it('detail publik memakai aturan yang sama', async () => {
    const [hadir] = await db.select().from(jurnal).where(eq(jurnal.source_id, ids.hadir))
    const [privat] = await db.select().from(jurnal).where(eq(jurnal.source_id, ids.privat))

    expect(await getJurnalDetail(hadir.id, true)).not.toBeNull()
    expect(await getJurnalDetail(privat.id, true)).toBeNull()
  })
})
