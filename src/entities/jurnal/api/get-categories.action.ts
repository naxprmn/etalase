'use server'

import { cookies } from 'next/headers'
import { db } from '@/shared/lib/db'
import { jurnal } from '../../../../drizzle/schema'
import { eq } from 'drizzle-orm'

const LAWET_API_URL = process.env.LAWET_API_URL

export async function getCategoriesAction(): Promise<string[]> {
  let lawetCategories: string[] = []
  const token = cookies().get('lawet_token')?.value

  if (LAWET_API_URL) {
    try {
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const res = await fetch(`${LAWET_API_URL}/api/v1/jurnal-alas/config/kategori`, {
        headers,
        next: { revalidate: 60 },
      })
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json?.kategori)) {
          lawetCategories = json.kategori.filter((k: any) => typeof k === 'string' && k.trim().length > 0)
        }
      }
    } catch {
      // Graceful fallback if Lawet Hub is unreachable
    }
  }

  // Also query distinct published categories from local database
  let dbCategories: string[] = []
  try {
    const rows = await db
      .selectDistinct({ kategori: jurnal.kategori })
      .from(jurnal)
      .where(eq(jurnal.is_published, true))
    dbCategories = rows.map(r => r.kategori).filter(Boolean)
  } catch {
    // If database query fails
  }

  // Deduplicate case-insensitively while preserving original label casing
  const categoryMap = new Map<string, string>()

  for (const cat of lawetCategories) {
    const trimmed = cat.trim()
    const lower = trimmed.toLowerCase()
    if (!categoryMap.has(lower)) {
      categoryMap.set(lower, trimmed)
    }
  }

  for (const cat of dbCategories) {
    const trimmed = cat.trim()
    const lower = trimmed.toLowerCase()
    if (!categoryMap.has(lower)) {
      categoryMap.set(lower, trimmed)
    }
  }

  const result = Array.from(categoryMap.values())
  if (result.length > 0) {
    return result
  }

  // Fallback defaults matching Lawet Hub default configuration
  return ['mou', 'koordinasi', 'sosialisasi', 'pembinaan', 'pengawasan', 'rapat', 'lainnya']
}
