import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/shared/lib/db'
import { jurnal } from '../drizzle/schema'
import { eq, inArray } from 'drizzle-orm'
import { upsertJurnal } from '@/features/jurnal-sync/lib/upsert-jurnal'
import { getJurnalStatsByYear, getJurnalYears } from '@/entities/jurnal/api/get-jurnal-stats'

describe('Jurnal Stats & Analytics API Query Integration', () => {
  const sourceA = '11111111-aaaa-bbbb-cccc-111111111111'
  const sourceB = '22222222-aaaa-bbbb-cccc-222222222222'
  const sourceC = '33333333-aaaa-bbbb-cccc-333333333333'
  const targetYear = 2026

  beforeAll(async () => {
    process.env.DATABASE_URL = 'postgresql://alas_user:change-this-strong-password@localhost:5433/alas'

    await db.delete(jurnal).where(inArray(jurnal.source_id, [sourceA, sourceB, sourceC]))

    // Item 1: MoU in March 2026, Divisi HPPH, with 2 partners, published link
    await upsertJurnal({
      source_id: sourceA,
      judul: 'Penandatanganan MoU dengan Bawaslu Jateng & Polres',
      tanggal_kegiatan: '2026-03-10',
      kategori: 'mou',
      divisi: 'Divisi Hukum dan Sengketa',
      pihak_terkait: [{ nama: 'Polres Kebumen' }, { nama: 'Kejaksaan Negeri' }],
      link_publikasi: 'https://kebumen.bawaslu.go.id/berita/mou',
    })

    // Item 2: Audiensi in March 2026, Divisi SDMOD, with 1 partner, no link
    await upsertJurnal({
      source_id: sourceB,
      judul: 'Audiensi dengan KPU Kebumen',
      tanggal_kegiatan: '2026-03-25',
      kategori: 'audiensi',
      divisi: 'Divisi SDM dan Organisasi',
      pihak_terkait: [{ nama: 'KPU Kebumen' }],
      link_publikasi: '',
    })

    // Item 3: Pelaporan in August 2026, Divisi Penanganan Pelanggaran, draft (unpublished)
    await upsertJurnal({
      source_id: sourceC,
      judul: 'Laporan Dugaan Pelanggaran',
      tanggal_kegiatan: '2026-08-05',
      kategori: 'pelaporan',
      divisi: 'Divisi Penanganan Pelanggaran',
      pihak_terkait: [{ nama: 'Pelapor A' }],
    })
    // Ensure item 3 is unpublished
    await db.update(jurnal).set({ is_published: false }).where(eq(jurnal.source_id, sourceC))
  })

  afterAll(async () => {
    await db.delete(jurnal).where(inArray(jurnal.source_id, [sourceA, sourceB, sourceC]))
  })

  it('should list available years accurately', async () => {
    const years = await getJurnalYears()
    expect(Array.isArray(years)).toBe(true)
    expect(years).toContain(targetYear)
  })

  it('should return enriched analytics payload with backwards compatibility', async () => {
    const res = await getJurnalStatsByYear(targetYear)

    // 1. Backward compatibility: stats dictionary
    expect(res).toBeDefined()
    expect(res.stats).toBeDefined()
    expect(res.stats.mou).toBeGreaterThanOrEqual(1)
    expect(res.stats.audiensi).toBeGreaterThanOrEqual(1)

    // 2. Monthly Trend (Array of 12 months)
    expect(res.monthly_trend).toBeDefined()
    expect(res.monthly_trend.length).toBe(12)
    // Month 3 (March) should have at least 2 activities (MoU + Audiensi)
    const march = res.monthly_trend.find(m => m.month === 3)
    expect(march).toBeDefined()
    expect(march!.total).toBeGreaterThanOrEqual(2)

    // 3. Division Stats
    expect(res.division_stats).toBeDefined()
    expect(typeof res.division_stats).toBe('object')

    // 4. KPI Summary
    expect(res.kpi_summary).toBeDefined()
    expect(res.kpi_summary.total_kegiatan).toBeGreaterThanOrEqual(2)
    expect(res.kpi_summary.total_mitra).toBeGreaterThanOrEqual(3)
    expect(res.kpi_summary.published_media_count).toBeGreaterThanOrEqual(1)
    expect(res.kpi_summary.top_category).toBeDefined()

    // 5. Recent highlights (Max 4 activities)
    expect(res.recent_highlights).toBeDefined()
    expect(Array.isArray(res.recent_highlights)).toBe(true)
    expect(res.recent_highlights.length).toBeGreaterThanOrEqual(1)
    expect(res.recent_highlights[0]).toHaveProperty('id')
    expect(res.recent_highlights[0]).toHaveProperty('judul')
    expect(res.recent_highlights[0]).toHaveProperty('tanggal_kegiatan')
    expect(res.recent_highlights[0]).toHaveProperty('kategori')
  })
})
