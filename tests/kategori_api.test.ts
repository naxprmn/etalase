import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock next/headers cookies
const cookieGet = vi.hoisted(() => vi.fn(() => ({ value: 'lawet-staff-token' })))
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: cookieGet,
  }),
}))

// Mock db
const selectDistinctMock = vi.hoisted(() => vi.fn())
vi.mock('@/shared/lib/db', () => ({
  db: {
    selectDistinct: selectDistinctMock,
  },
}))

describe('Kategori API and Lawet Hub Integration', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.stubEnv('LAWET_API_URL', 'http://127.0.0.1:2002')
    cookieGet.mockReturnValue({ value: 'lawet-staff-token' } as any)
    const { resetCategoriesCache } = await import('@/entities/jurnal/api/get-categories.action')
    await resetCategoriesCache()
  })

  it('fetches categories from Lawet Hub config endpoint with bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        kategori: ['mou', 'koordinasi', 'sosialisasi', 'pembinaan'],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    selectDistinctMock.mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([{ kategori: 'rapat' }]),
      }),
    })

    const { getCategoriesAction } = await import('@/entities/jurnal/api/get-categories.action')
    const categories = await getCategoriesAction()

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:2002/api/v1/jurnal-alas/config/kategori',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer lawet-staff-token',
        }),
      }),
    )

    // Should include Lawet Hub categories + db categories
    expect(categories).toContain('mou')
    expect(categories).toContain('koordinasi')
    expect(categories).toContain('sosialisasi')
    expect(categories).toContain('pembinaan')
    expect(categories).toContain('rapat')
  })

  it('falls back to database categories when Lawet Hub endpoint is unreachable', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Connection refused'))
    vi.stubGlobal('fetch', fetchMock)

    selectDistinctMock.mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([
          { kategori: 'audiensi' },
          { kategori: 'pengawasan' },
        ]),
      }),
    })

    const { getCategoriesAction } = await import('@/entities/jurnal/api/get-categories.action')
    const categories = await getCategoriesAction()

    expect(categories).toEqual(['audiensi', 'pengawasan'])
  })

  it('falls back to default categories if both Lawet Hub and DB are empty', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    })
    vi.stubGlobal('fetch', fetchMock)

    selectDistinctMock.mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([]),
      }),
    })

    const { getCategoriesAction } = await import('@/entities/jurnal/api/get-categories.action')
    const categories = await getCategoriesAction()

    expect(categories).toEqual([
      'mou',
      'koordinasi',
      'sosialisasi',
      'pembinaan',
      'pengawasan',
      'rapat',
      'lainnya',
    ])
  })

  it('GET /api/jurnal/kategori route returns categories payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        kategori: ['mou', 'sosialisasi'],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    selectDistinctMock.mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([]),
      }),
    })

    const { GET } = await import('../src/app/api/jurnal/kategori/route')
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('ok')
    expect(data.data).toContain('mou')
    expect(data.data).toContain('sosialisasi')
  })

  it('falls back to the last successfully fetched categories from Lawet when subsequent fetch fails', async () => {
    const { getCategoriesAction } = await import('@/entities/jurnal/api/get-categories.action')

    // First fetch: Lawet Hub returns custom categories configured in platform_configs
    const customLawetCategories = ['publikasi_khusus', 'agenda_pemilu', 'sidang_pelanggaran']
    const fetchSuccess = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        kategori: customLawetCategories,
      }),
    })
    vi.stubGlobal('fetch', fetchSuccess)
    selectDistinctMock.mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([]),
      }),
    })

    const firstRun = await getCategoriesAction()
    expect(firstRun).toEqual(customLawetCategories)

    // Second fetch: Lawet Hub endpoint fails / offline, and local DB has no records
    const fetchFailure = vi.fn().mockRejectedValue(new Error('Lawet Hub offline'))
    vi.stubGlobal('fetch', fetchFailure)

    const secondRun = await getCategoriesAction()
    // Must match the last get from Lawet, NOT the static initial hardcoded array
    expect(secondRun).toEqual(customLawetCategories)
  })
})
