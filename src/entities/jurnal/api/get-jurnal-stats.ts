import { db } from '@/shared/lib/db'
import { jurnal } from '../../../../drizzle/schema'
import { sql, eq, and } from 'drizzle-orm'

export interface MonthlyTrendItem {
  month: number
  total: number
}

export interface DailyTrendItem {
  day: string
  total: number
}

export interface ActivityHighlight {
  id: string
  judul: string
  tanggal_kegiatan: string
  kategori: string
  thumbnail_url: string | null
  link_publikasi: string | null
}

export interface KpiSummary {
  total_kegiatan: number
  total_mitra: number
  published_media_count: number
  top_category: {
    kategori: string
    total: number
    percentage: number
  } | null
}

export interface JurnalStatsAnalytics {
  stats: Record<string, number>
  mitra_stats: Record<string, number>
  media_stats: Record<string, number>
  monthly_trend: MonthlyTrendItem[]
  daily_trend: DailyTrendItem[]
  division_stats: Record<string, number>
  kpi_summary: KpiSummary
  recent_highlights: ActivityHighlight[]
}

/** Ambil semua tahun yang punya data jurnal published */
export async function getJurnalYears(): Promise<number[]> {
  const rows = await db
    .select({
      year: sql<number>`EXTRACT(YEAR FROM ${jurnal.tanggal_kegiatan})::int`,
    })
    .from(jurnal)
    .where(and(eq(jurnal.is_published, true), eq(jurnal.workflow_status, 'published')))
    .groupBy(sql`EXTRACT(YEAR FROM ${jurnal.tanggal_kegiatan})`)
    .orderBy(sql`EXTRACT(YEAR FROM ${jurnal.tanggal_kegiatan})`)

  return rows.map(r => r.year)
}

/** Hitung analitik jurnal lengkap untuk tahun tertentu */
export async function getJurnalStatsByYear(year: number): Promise<JurnalStatsAnalytics> {
  // 1. Kategori
  const catRows = await db
    .select({
      kategori: jurnal.kategori,
      total: sql<number>`COUNT(*)::int`,
    })
    .from(jurnal)
    .where(
      and(
        eq(jurnal.is_published, true),
          eq(jurnal.workflow_status, 'published'),
        sql`EXTRACT(YEAR FROM ${jurnal.tanggal_kegiatan}) = ${year}`
      )
    )
    .groupBy(jurnal.kategori)

  const stats: Record<string, number> = Object.fromEntries(catRows.map(r => [r.kategori, r.total]))
  const totalKegiatan = catRows.reduce((acc, r) => acc + r.total, 0)

  // 2. Tren Bulanan (1 - 12)
  const monthRows = await db
    .select({
      month: sql<number>`EXTRACT(MONTH FROM ${jurnal.tanggal_kegiatan})::int`,
      total: sql<number>`COUNT(*)::int`,
    })
    .from(jurnal)
    .where(
      and(
        eq(jurnal.is_published, true),
          eq(jurnal.workflow_status, 'published'),
        sql`EXTRACT(YEAR FROM ${jurnal.tanggal_kegiatan}) = ${year}`
      )
    )
    .groupBy(sql`EXTRACT(MONTH FROM ${jurnal.tanggal_kegiatan})`)

  const monthMap = new Map<number, number>()
  for (const r of monthRows) {
    monthMap.set(r.month, r.total)
  }
  const monthly_trend: MonthlyTrendItem[] = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    return {
      month: m,
      total: monthMap.get(m) ?? 0,
    }
  })


  // 2.5 Tren 7 Hari Terakhir
  const last7DaysRows = await db.execute(sql`
    WITH last_7_days AS (
      SELECT current_date - generate_series(6, 0, -1) AS d
    )
    SELECT 
      l.d,
      COALESCE(COUNT(j.id), 0)::int as total
    FROM last_7_days l
    LEFT JOIN ${jurnal} j ON DATE(j.tanggal_kegiatan) = l.d AND j.is_published = true
    GROUP BY l.d
    ORDER BY l.d ASC
  `)
  
  const daysOfWeek = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
  const daily_trend: DailyTrendItem[] = []
  
  if (last7DaysRows && last7DaysRows.rows) {
    for (const row of last7DaysRows.rows) {
      const d = new Date(row.d as string)
      daily_trend.push({
        day: daysOfWeek[d.getDay()],
        total: row.total as number
      })
    }
  }

  // 3. Divisi
  const divRows = await db
    .select({
      divisi: sql<string>`COALESCE(NULLIF(TRIM(${jurnal.divisi}), ''), 'Umum / Sekretariat')`,
      total: sql<number>`COUNT(*)::int`,
    })
    .from(jurnal)
    .where(
      and(
        eq(jurnal.is_published, true),
          eq(jurnal.workflow_status, 'published'),
        sql`EXTRACT(YEAR FROM ${jurnal.tanggal_kegiatan}) = ${year}`
      )
    )
    .groupBy(sql`COALESCE(NULLIF(TRIM(${jurnal.divisi}), ''), 'Umum / Sekretariat')`)

  const division_stats: Record<string, number> = Object.fromEntries(divRows.map(r => [r.divisi, r.total]))

    // 4. Publikasi Media & Media Stats
  const media_stats: Record<string, number> = {
    'Pendidikan': 0,
    'Pemda': 0,
    'Swasta': 0,
    'Lainnya': 0
  }

  const mediaRows = await db
    .select({
      link: jurnal.link_publikasi,
    })
    .from(jurnal)
    .where(
      and(
        eq(jurnal.is_published, true),
          eq(jurnal.workflow_status, 'published'),
        sql`EXTRACT(YEAR FROM ${jurnal.tanggal_kegiatan}) = ${year}`,
        sql`${jurnal.link_publikasi} IS NOT NULL AND TRIM(${jurnal.link_publikasi}) != ''`
      )
    )

  const published_media_count = mediaRows.length

  for (const row of mediaRows) {
    if (!row.link) continue
    const url = row.link.toLowerCase()
    
    // Smart domain detection
    if (url.includes('.go.id') || url.includes('bawaslu') || url.includes('kpu') || url.includes('kebumenkab') || url.includes('jatengprov')) {
      media_stats['Pemda']++
    } else if (url.includes('.ac.id') || url.includes('.sch.id') || url.includes('.edu') || url.includes('universitas') || url.includes('kampus')) {
      media_stats['Pendidikan']++
    } else if (url.includes('.com') || url.includes('.co.id') || url.includes('.net') || url.includes('news') || url.includes('tribun') || url.includes('detik') || url.includes('kompas')) {
      media_stats['Swasta']++
    } else {
      media_stats['Lainnya']++
    }
  }

    // 5. Total Mitra Unik (dari pihak_terkait) & Mitra Stats
  let total_mitra = 0
  const mitra_stats: Record<string, number> = {
    'Pemerintah Daerah': 0,
    'Instansi Pendidikan': 0,
    'Organisasi Masyarakat': 0,
    'Swasta / Lainnya': 0
  }

  try {
    const partnerRes: any = await db.execute(sql`
      SELECT 
        CASE 
          WHEN jsonb_typeof(partner) = 'string' THEN partner#>>'{}'
          WHEN jsonb_typeof(partner) = 'object' THEN COALESCE(partner->>'instansi', partner->>'nama')
          ELSE NULL
        END as val
      FROM ${jurnal},
      jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(${jurnal.pihak_terkait}) = 'array' THEN ${jurnal.pihak_terkait}
          ELSE '[]'::jsonb
        END
      ) AS partner
      WHERE ${jurnal.is_published} = true
        AND ${jurnal.workflow_status} = 'published'
        AND EXTRACT(YEAR FROM ${jurnal.tanggal_kegiatan}) = ${year}
    `)
    
    const uniqueMitras = new Set<string>()
    
    if (partnerRes && partnerRes.rows) {
      for (const row of partnerRes.rows) {
        const val = (row.val || '').toString().trim().toLowerCase()
        if (!val) continue
        uniqueMitras.add(val)
        
        // Categorize
        if (val.match(/pemda|dinas|pemerintah|bawaslu|kpu|kementerian|badan|desa|camat|kab|provinsi/i)) {
          mitra_stats['Pemerintah Daerah']++
        } else if (val.match(/sekolah|universitas|kampus|institut|akademi|sma|smp|sd|tk|politeknik|madrasah/i)) {
          mitra_stats['Instansi Pendidikan']++
        } else if (val.match(/lsm|ormas|forum|komunitas|yayasan|pemuda|masyarakat|pkk|karang taruna/i)) {
          mitra_stats['Organisasi Masyarakat']++
        } else {
          mitra_stats['Swasta / Lainnya']++
        }
      }
    }
    
    total_mitra = uniqueMitras.size
  } catch (e) {
    console.error('Error fetching mitra:', e)
    total_mitra = 0
  }

  // Top Kategori
  let topCategory: KpiSummary['top_category'] = null
  if (catRows.length > 0 && totalKegiatan > 0) {
    const sorted = [...catRows].sort((a, b) => b.total - a.total)
    const top = sorted[0]
    topCategory = {
      kategori: top.kategori,
      total: top.total,
      percentage: Math.round((top.total / totalKegiatan) * 100),
    }
  }

  const kpi_summary: KpiSummary = {
    total_kegiatan: totalKegiatan,
    total_mitra,
    published_media_count,
    top_category: topCategory,
  }

  // 6. Recent Highlights (Max 4 kegiatan terbaru)
  const highlightRows = await db
    .select({
      id: jurnal.id,
      judul: jurnal.judul,
      tanggal_kegiatan: jurnal.tanggal_kegiatan,
      kategori: jurnal.kategori,
      dokumentasi: jurnal.dokumentasi,
      link_publikasi: jurnal.link_publikasi,
    })
    .from(jurnal)
    .where(
      and(
        eq(jurnal.is_published, true),
          eq(jurnal.workflow_status, 'published'),
        sql`EXTRACT(YEAR FROM ${jurnal.tanggal_kegiatan}) = ${year}`
      )
    )
    .orderBy(sql`${jurnal.tanggal_kegiatan} DESC`, sql`${jurnal.id} DESC`)
    .limit(4)

  const recent_highlights: ActivityHighlight[] = highlightRows.map(r => {
    const docs = Array.isArray(r.dokumentasi) ? r.dokumentasi : []
    const firstImg = docs.find((d: any) => d && (d.type === 'image' || d.url))
    return {
      id: r.id,
      judul: r.judul,
      tanggal_kegiatan: r.tanggal_kegiatan,
      kategori: r.kategori,
      thumbnail_url: firstImg?.url ?? null,
      link_publikasi: r.link_publikasi ?? null,
    }
  })

  return {
    stats,
    mitra_stats,
    media_stats,
    monthly_trend,
    daily_trend,
    division_stats,
    kpi_summary,
    recent_highlights,
  }
}

