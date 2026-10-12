import { db } from '@/shared/lib/db'
import { jurnal } from '../../../../drizzle/schema'
import { and, eq, sql } from 'drizzle-orm'

export async function getJurnalCalendar(month: string) {
  // month format YYYY-MM
  const results = await db.select({
    id: jurnal.id,
    judul: jurnal.judul,
    tanggal: jurnal.tanggal_kegiatan
  })
  .from(jurnal)
  .where(
    and(
      eq(jurnal.is_published, true),
      eq(jurnal.workflow_status, 'published'),
      sql`NOT (${jurnal.custom_fields}::text ILIKE '%"value": "privat"%' OR ${jurnal.custom_fields}::text ILIKE '%"value":"privat"%' OR ${jurnal.custom_fields}::text ILIKE '%"value": "false"%' OR ${jurnal.custom_fields}::text ILIKE '%"value":"false"%')`,
      sql`TO_CHAR(${jurnal.tanggal_kegiatan}, 'YYYY-MM') = ${month}`
    )
  )
  .orderBy(jurnal.tanggal_kegiatan)

  const dateMap: Record<number, { id: string, judul: string }[]> = {}

  results.forEach(r => {
    // If it's a string YYYY-MM-DD
    let day = 1;
    if (typeof r.tanggal === 'string') {
      day = parseInt(r.tanggal.split('-')[2], 10)
    } else {
      // If it's a Date object
      const d = new Date(r.tanggal)
      day = d.getUTCDate() // use UTC to avoid local timezone offset shifts
    }

    if (!dateMap[day]) {
      dateMap[day] = []
    }
    dateMap[day].push({ id: r.id, judul: r.judul })
  })

  const dates = Object.keys(dateMap).map(d => parseInt(d, 10)).sort((a, b) => a - b)
  const [yearStr, monthStr] = month.split('-')

  return {
    year: parseInt(yearStr, 10),
    month: parseInt(monthStr, 10),
    dates,
    eventsMap: dateMap,
    total_entries: dates.length
  }
}

