'use server'

import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'
import { db } from '@/shared/lib/db'
import { jurnal } from '../../../../drizzle/schema'
import { eq } from 'drizzle-orm'

const LAWET_API_URL = process.env.LAWET_API_URL

// Cache in-memory untuk menyimpan hasil get terakhir dari Lawet Hub
let inMemoryLastLawetCategories: string[] = []

function getCacheFilePath(): string {
  return path.join(process.cwd(), 'public', 'uploads', '.lawet-categories-cache.json')
}

export async function getLastKnownLawetCategories(): Promise<string[]> {
  if (inMemoryLastLawetCategories.length > 0) {
    return inMemoryLastLawetCategories
  }
  try {
    const filePath = getCacheFilePath()
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryLastLawetCategories = parsed
        return parsed
      }
    }
  } catch {
    // Ignore read errors
  }
  return []
}

function persistLastLawetCategories(categories: string[]): void {
  if (!Array.isArray(categories) || categories.length === 0) return
  inMemoryLastLawetCategories = [...categories]
  try {
    const filePath = getCacheFilePath()
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(categories, null, 2), 'utf-8')
  } catch {
    // Ignore write errors (e.g. read-only filesystem)
  }
}

export async function resetCategoriesCache(): Promise<void> {
  inMemoryLastLawetCategories = []
  try {
    const filePath = getCacheFilePath()
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch {
    // Ignore
  }
}

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
          if (lawetCategories.length > 0) {
            persistLastLawetCategories(lawetCategories)
          }
        }
      }
    } catch {
      // Graceful fallback if Lawet Hub is unreachable
    }
  }

  // Jika get saat ini dari Lawet gagal atau tidak ada token,
  // gunakan hasil get terakhir yang tersimpan dari Lawet Hub
  if (lawetCategories.length === 0) {
    lawetCategories = await getLastKnownLawetCategories()
  }

  // Query distinct published categories from local database
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

  // Fallback awal hanya jika belum pernah ada get dari Lawet sama sekali dan DB lokal kosong
  return ['mou', 'koordinasi', 'sosialisasi', 'pembinaan', 'pengawasan', 'rapat', 'lainnya']
}
