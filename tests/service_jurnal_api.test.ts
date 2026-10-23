import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { NextRequest } from 'next/server'

const TOKEN = 'integration-service-token'
const SECRET = 'integration-signing-secret'

describe('Direct Service API jurnal: PATCH, daftar, dan retensi ledger', () => {
  let container: StartedPostgreSqlContainer
  let pool: Pool
  let auth: typeof import('@/features/service-auth/lib/verify-token')
  let listRoute: typeof import('../src/app/api/service/jurnal/route')
  let itemRoute: typeof import('../src/app/api/service/jurnal/[sourceId]/route')
  let purge: typeof import('@/features/service-events/lib/purge-service-events')

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    process.env.DATABASE_URL = container.getConnectionUri()
    process.env.ALAS_SERVICE_TOKEN = TOKEN
    process.env.ALAS_WEBHOOK_SECRET = SECRET
    process.env.ALAS_REPLAY_WINDOW_SECONDS = '300'

    pool = new Pool({ connectionString: process.env.DATABASE_URL })
    await migrate(drizzle(pool), { migrationsFolder: './drizzle/migrations' })
    vi.resetModules()
    auth = await import('@/features/service-auth/lib/verify-token')
    listRoute = await import('../src/app/api/service/jurnal/route')
    itemRoute = await import('../src/app/api/service/jurnal/[sourceId]/route')
    purge = await import('@/features/service-events/lib/purge-service-events')
  }, 120_000)

  afterAll(async () => {
    await (await import('@/shared/lib/db')).db.$client.end()
    await pool?.end()
    await container?.stop()
  })

  beforeEach(async () => {
    await pool.query('TRUNCATE jurnal, service_events RESTART IDENTITY CASCADE')
  })

  let counter = 0
  const nextId = () => `d0000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`

  async function seed(overrides: Record<string, unknown> = {}) {
    const source_id = nextId()
    const row = {
      source_id, judul: `Jurnal ${source_id.slice(-3)}`, tanggal_kegiatan: '2026-09-01', kategori: 'rapat',
      is_published: true, workflow_status: 'published', ...overrides,
    }
    await pool.query(
      `INSERT INTO jurnal (source_id, judul, tanggal_kegiatan, kategori, is_published, workflow_status, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [row.source_id, row.judul, row.tanggal_kegiatan, row.kategori, row.is_published, row.workflow_status,
        JSON.stringify((row as any).tags ?? [])],
    )
    return row
  }

  function signed(method: string, pathname: string, bodyObject?: unknown) {
    const body = bodyObject === undefined ? '' : JSON.stringify(bodyObject)
    const timestamp = String(Math.floor(Date.now() / 1000))
    const signature = auth.createServiceSignature({ timestamp, method, pathname, body })
    return new NextRequest(`http://alas.test${pathname}`, {
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'X-ALAS-Event-Id': crypto.randomUUID(),
        'X-ALAS-Timestamp': timestamp,
        'X-ALAS-Signature': signature,
      },
      body: body || undefined,
    })
  }

  function list(query = '') {
    return listRoute.GET(new NextRequest(`http://alas.test/api/service/jurnal${query}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    }))
  }

  it('PATCH menyimpan ringkasan', async () => {
    const row = await seed()

    const res = await itemRoute.PATCH(
      signed('PATCH', `/api/service/jurnal/${row.source_id}`, { ringkasan: 'Ringkasan baru' }),
      { params: { sourceId: row.source_id } },
    )

    expect(res.status).toBe(200)
    const saved = await pool.query('SELECT ringkasan FROM jurnal WHERE source_id = $1', [row.source_id])
    expect(saved.rows[0].ringkasan).toBe('Ringkasan baru')
  })

  it('daftar tanpa page/limit tetap dibatasi dan melaporkan total', async () => {
    for (let i = 0; i < 3; i++) await seed()

    const body = await (await list()).json()

    expect(body.status).toBe('ok')
    expect(body.total).toBe(3)
    expect(body.data).toHaveLength(3)
    expect(body.limit).toBe(50)
    expect(body.page).toBe(1)
  })

  it('limit dibatasi maksimum 100 dan halaman mengikuti total yang sama', async () => {
    for (let i = 0; i < 5; i++) await seed()

    const capped = await (await list('?limit=100000')).json()
    expect(capped.limit).toBe(100)

    const second = await (await list('?page=2&limit=2')).json()
    expect(second.data).toHaveLength(2)
    expect(second.total).toBe(5)
    const third = await (await list('?page=3&limit=2')).json()
    expect(third.data).toHaveLength(1)
  })

  it('published=true hanya mengembalikan jurnal yang benar-benar terbit dan menghitung totalnya', async () => {
    await seed()
    await seed({ is_published: false })
    await seed({ workflow_status: 'draft' })

    const all = await (await list()).json()
    const published = await (await list('?published=true')).json()

    expect(all.total).toBe(3)
    expect(published.total).toBe(1)
    expect(published.data.every((r: any) => r.is_published && r.workflow_status === 'published')).toBe(true)
  })

  it('search memperlakukan % dan _ sebagai teks biasa', async () => {
    await seed({ judul: 'Rapat 100% hadir' })
    await seed({ judul: 'Rapat biasa' })
    await seed({ judul: 'Rapat_koordinasi' })

    expect((await (await list('?search=100%25')).json()).data.map((r: any) => r.judul)).toEqual(['Rapat 100% hadir'])
    expect((await (await list('?search=%25')).json()).total).toBe(1)
    expect((await (await list('?search=_koordinasi')).json()).total).toBe(1)
    expect((await (await list('?search=Rapat_k')).json()).total).toBe(1)
  })

  it('search juga mencari di tags dengan teks biasa', async () => {
    await seed({ tags: ['pengawasan', 'tps'] })
    await seed({ tags: ['lain'] })

    expect((await (await list('?search=tps')).json()).total).toBe(1)
    expect((await (await list('?search=%25')).json()).total).toBe(0)
  })

  it('tanpa bearer token daftar ditolak', async () => {
    const res = await listRoute.GET(new NextRequest('http://alas.test/api/service/jurnal'))
    expect(res.status).toBe(401)
  })

  it('retensi ledger menghapus event lama saja', async () => {
    const insert = (id: string, age: string) => pool.query(
      `INSERT INTO service_events (event_id, resource_type, source_id, operation, processed_at)
       VALUES ($1, 'jurnal', $2, 'upsert', now() - $3::interval)`,
      [id, nextId(), age],
    )
    await insert('e0000000-0000-4000-8000-000000000001', '120 days')
    await insert('e0000000-0000-4000-8000-000000000002', '91 days')
    await insert('e0000000-0000-4000-8000-000000000003', '89 days')
    await insert('e0000000-0000-4000-8000-000000000004', '1 minute')

    const removed = await purge.purgeServiceEvents(90)

    expect(removed).toBe(2)
    const left = await pool.query('SELECT event_id FROM service_events ORDER BY event_id')
    expect(left.rows.map((r) => r.event_id)).toEqual([
      'e0000000-0000-4000-8000-000000000003',
      'e0000000-0000-4000-8000-000000000004',
    ])
  })

  it('retensi tidak pernah lebih pendek dari jendela replay', async () => {
    await expect(purge.purgeServiceEvents(0)).rejects.toThrow()
  })
})
