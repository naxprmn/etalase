'use server'

import { cookies } from 'next/headers'
import { canApproveJurnal, getMeAction } from '@/entities/lawet-user'
import { toMediaDisplayUrl } from '@/entities/jurnal/lib/media-url'

export type JurnalWorkflowStatus =
  | 'draft'
  | 'rejected'
  | 'publish_pending'
  | 'published'
  | 'unpublish_pending'
  | 'deleted'

export type JurnalScope = 'mine' | 'subordinate'

export interface MyJurnalItem {
  id: string
  source_id: string
  judul: string
  tanggal_kegiatan: string
  kategori: string
  status: JurnalWorkflowStatus
  scope: JurnalScope
  is_published?: boolean
  owner_id?: string
  owner_name?: string
  divisi?: string
  link_publikasi?: string
  dokumentasi?: any[]
  dokumen_pendukung?: any[]
  pihak_terkait?: any[]
tags?: string[]
  deskripsi?: string
  created_at?: string
  updated_at?: string
  workflow_notes?: string
}

export interface JurnalWorkspace {
  mine: MyJurnalItem[]
  subordinates: MyJurnalItem[]
  canReview: boolean
  viewerId: string
  viewerName: string
  viewerIsSuperadmin: boolean
  divisionName?: string
  warnings: string[]
}

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function extractList(payload: unknown): JsonRecord[] {
  if (Array.isArray(payload)) return payload.filter(isRecord)
  if (!isRecord(payload)) return []

  const nested = payload.data ?? payload.items
  return Array.isArray(nested) ? nested.filter(isRecord) : []
}

function normalizeStatus(value: unknown, fallback: JurnalWorkflowStatus): JurnalWorkflowStatus {
  const allowed: JurnalWorkflowStatus[] = [
    'draft',
    'rejected',
    'publish_pending',
    'published',
    'unpublish_pending',
    'deleted',
  ]

  return allowed.includes(value as JurnalWorkflowStatus)
    ? value as JurnalWorkflowStatus
    : fallback
}

function normalizeJurnal(
  item: JsonRecord,
  fallbackStatus: JurnalWorkflowStatus,
  scope: JurnalScope
): MyJurnalItem | null {
  const id = readString(item.id) || readString(item.source_id)
  const judul = readString(item.judul)
  const tanggal = readString(item.tanggal_kegiatan)
  const kategori = readString(item.kategori)
  if (!id || !judul || !tanggal || !kategori) return null

  const submitter = isRecord(item.submitter) ? item.submitter : undefined
  const records = (value: unknown) => Array.isArray(value) ? value.filter(isRecord) : []
  const withDisplayUrl = (entry: JsonRecord) =>
    typeof entry.url === 'string' ? { ...entry, url: toMediaDisplayUrl(entry.url) } : entry
  const customFields = records(item.custom_fields)

  return {
    id,
    source_id: readString(item.source_id) || id,
    judul,
    tanggal_kegiatan: tanggal,
    kategori,
    status: normalizeStatus(item.status, fallbackStatus),
    scope,
    owner_id: readString(submitter?.id) || readString(item.submitted_by),
    owner_name: readString(submitter?.name)
      || readString(item.created_by)
      || readString(item.redaksi),
    divisi: readString(item.divisi),
    link_publikasi: readString(item.link_publikasi),
    dokumentasi: records(item.dokumentasi).map(withDisplayUrl),
    dokumen_pendukung: records(item.dokumen_pendukung).map(withDisplayUrl),
    // Lawet Hub tidak punya flag visibilitas jurnal; pilihan Privat/Publik di
    // panel disimpan per dokumen pendukung (`is_public`).
    is_published: records(item.dokumen_pendukung).length > 0
      ? records(item.dokumen_pendukung).some((d) => d.is_public !== false)
      : true,
    pihak_terkait: records(item.pihak_terkait),
    tags: Array.isArray(item.tags) ? item.tags.filter((t): t is string => typeof t === 'string') : [],
    deskripsi: readString(item.ringkasan)
      || readString(customFields.find((f) => f.label === 'Ringkasan')?.value),
    created_at: readString(item.created_at),
    updated_at: readString(item.updated_at) || readString(item.last_synced_at),
    workflow_notes: readString(item.workflow_notes),
  }
}

function normalizeName(value: string | undefined): string {
  return (value || '').trim().toLocaleLowerCase('id-ID')
}

function isOwnedBy(item: MyJurnalItem, userId: string, userName: string): boolean {
  if (item.owner_id) return item.owner_id === userId
  return Boolean(item.owner_name) && normalizeName(item.owner_name) === normalizeName(userName)
}

function sortJurnals(items: MyJurnalItem[]): MyJurnalItem[] {
  return [...items].sort((left, right) => {
    const dateDifference = Date.parse(right.tanggal_kegiatan) - Date.parse(left.tanggal_kegiatan)
    if (dateDifference !== 0) return dateDifference
    return Date.parse(right.updated_at || right.created_at || '')
      - Date.parse(left.updated_at || left.created_at || '')
  })
}

function uniqueJurnals(items: MyJurnalItem[]): MyJurnalItem[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = `${item.source_id}:${item.status}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function fetchLawetList(endpoint: string, token: string): Promise<JsonRecord[]> {
  const apiUrl = process.env.LAWET_API_URL
  if (!apiUrl) throw new Error('LAWET_API_URL belum dikonfigurasi')

  const response = await fetch(`${apiUrl}${endpoint}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const detail = isRecord(body) ? readString(body.detail) : undefined
    throw new Error(detail || `Server merespons ${response.status}`)
  }

  return extractList(await response.json())
}

function settledValue(
  result: PromiseSettledResult<JsonRecord[]>,
  label: string,
  warnings: string[],
): JsonRecord[] {
  if (result.status === 'fulfilled') return result.value
  warnings.push(`${label} tidak dapat dimuat: ${result.reason instanceof Error ? result.reason.message : 'kesalahan tidak diketahui'}`)
  return []
}

export async function getJurnalWorkspaceAction(): Promise<JurnalWorkspace> {
  const user = await getMeAction()
  if (!user) throw new Error('Unauthorized')

  const token = cookies().get('lawet_token')?.value
  if (!token) throw new Error('Unauthorized')

  const canReview = canApproveJurnal(user)
  const [draftResult, publishedResult, reviewResult] = await Promise.allSettled([
    fetchLawetList('/api/v1/jurnal-alas/draft?page=1&limit=50&sort=tanggal_desc', token),
    fetchLawetList('/api/v1/jurnal-alas/?page=1&limit=50&sort=tanggal_desc', token),
    canReview
      ? fetchLawetList('/api/v1/jurnal-alas/approval-queue', token)
      : Promise.resolve([]),
  ])

  const warnings: string[] = []
  const draftRecords = settledValue(draftResult, 'Draft jurnal', warnings)
  const publishedRecords = settledValue(publishedResult, 'Jurnal terbit', warnings)
  const reviewRecords = settledValue(reviewResult, 'Jurnal bawahan', warnings)

  const mineDrafts = draftRecords
    .map((item) => normalizeJurnal(item, 'draft', 'mine'))
    .filter((item): item is MyJurnalItem => Boolean(item))
    .filter((item) => !item.owner_id && !item.owner_name
      ? true
      : isOwnedBy(item, user.id, user.name))

  // Daftar "terbit" Lawet Hub dibaca dari ALAS Service API yang juga memuat
  // baris lama/belum terbit; hanya ambil yang benar-benar terbit.
  const published = publishedRecords
    .map((item) => normalizeJurnal(item, 'published', 'mine'))
    .filter((item): item is MyJurnalItem => Boolean(item))
    .filter((item) => item.status === 'published')

  const minePublished = published.filter((item) => isOwnedBy(item, user.id, user.name))
  const subordinatePublished = canReview
    ? published
      .filter((item) => !isOwnedBy(item, user.id, user.name))
      .map((item) => ({ ...item, scope: 'subordinate' as const }))
    : []

  const subordinateDrafts = reviewRecords
    .map((item) => normalizeJurnal(item, 'draft', 'subordinate'))
    .filter((item): item is MyJurnalItem => Boolean(item))
    .filter((item) => !isOwnedBy(item, user.id, user.name))

  const subs = sortJurnals(uniqueJurnals([...subordinateDrafts, ...subordinatePublished]))
  


  return {
    // ADR-0005: panel hanya membaca Lawet Hub; DB lokal ALAS murni read model publik.
    mine: sortJurnals(uniqueJurnals([...mineDrafts, ...minePublished])),
    subordinates: subs,
    canReview,
    viewerId: user.id,
    viewerName: user.name,
    viewerIsSuperadmin: Boolean(user.role?.is_superadmin),
    divisionName: user.division?.name,
    warnings,
  }
}

