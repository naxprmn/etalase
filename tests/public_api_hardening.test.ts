import { beforeEach, describe, expect, it, vi } from 'vitest'

const getJurnalList = vi.hoisted(() => vi.fn())
const getMeAction = vi.hoisted(() => vi.fn())
const getPimpinanList = vi.hoisted(() => vi.fn())
const getPimpinanDetail = vi.hoisted(() => vi.fn())
const getJurnalCalendar = vi.hoisted(() => vi.fn())
const getCategoriesAction = vi.hoisted(() => vi.fn())
const getJurnalYears = vi.hoisted(() => vi.fn())
const dbExecute = vi.hoisted(() => vi.fn())

vi.mock('@/entities/jurnal/api/get-jurnal-list', () => ({ getJurnalList }))
vi.mock('@/entities/lawet-user', () => ({ getMeAction }))
vi.mock('@/entities/pimpinan/api/get-pimpinan-list', () => ({ getPimpinanList }))
vi.mock('@/entities/pimpinan/api/get-pimpinan-detail', () => ({ getPimpinanDetail }))
vi.mock('@/entities/jurnal/api/get-jurnal-calendar', () => ({ getJurnalCalendar }))
vi.mock('@/entities/jurnal/api/get-categories.action', () => ({ getCategoriesAction }))
vi.mock('@/entities/jurnal/api/get-jurnal-stats', () => ({ getJurnalYears, getJurnalStatsByYear: vi.fn() }))
vi.mock('@/shared/lib/db', () => ({ db: { execute: dbExecute } }))

const SECRET = 'relation "jurnal" does not exist at /srv/alas/secret.ts'

const row = {
  id: 'j-1', source_id: 's-1', judul: 'Rapat', ringkasan: 'R', tanggal_kegiatan: '2026-10-01', kategori: 'rapat',
  link_publikasi: null, dokumentasi: [], pihak_terkait: [], tags: [], custom_fields: [], redaksi: 'Staf',
  created_at: '2026-10-01',
  dokumen_pendukung: [
    { nama: 'Undangan', url: 'https://cdn/a.pdf', tipe: 'pdf', is_public: true },
    { nama: 'Notulen', url: 'https://cdn/b.pdf', tipe: 'pdf', is_public: false },
  ],
}

function request(query = '') {
  const url = new URL(`http://alas.test/api/jurnal${query}`)
  return { nextUrl: url, url: url.toString() } as any
}

describe('daftar jurnal publik: dokumen pendukung (ADR-0007)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getJurnalList.mockResolvedValue({ items: [row], totalCount: 1 })
  })

  it('pengunjung anonim tidak menerima dokumen pendukung sama sekali', async () => {
    getMeAction.mockResolvedValue(null)
    const { GET } = await import('../src/app/api/jurnal/route')

    const body = await (await GET(request())).json()

    expect(body.data[0].dokumen_pendukung).toEqual([])
    expect(JSON.stringify(body)).not.toContain('cdn/a.pdf')
  })

  it('pengguna login menerima dokumen publik tanpa penanda visibilitas', async () => {
    getMeAction.mockResolvedValue({ id: 'u-1', name: 'Staf' })
    const { GET } = await import('../src/app/api/jurnal/route')

    const body = await (await GET(request())).json()

    expect(body.data[0].dokumen_pendukung).toEqual([{ nama: 'Undangan', url: 'https://cdn/a.pdf', tipe: 'pdf' }])
  })

  it('ringkasan tidak memuat dokumen dan tidak perlu memeriksa sesi', async () => {
    getMeAction.mockResolvedValue(null)
    const { GET } = await import('../src/app/api/jurnal/route')

    const body = await (await GET(request('?view=summary'))).json()

    expect(body.data[0]).not.toHaveProperty('dokumen_pendukung')
  })
})

describe('rute publik tidak membocorkan pesan galat internal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  async function expectGeneric500(res: Response) {
    expect(res.status).toBe(500)
    const text = JSON.stringify(await res.json())
    expect(text).not.toContain('relation')
    expect(text).not.toContain('secret.ts')
    expect(text).toContain('internal error')
  }

  it('/api/jurnal', async () => {
    getMeAction.mockResolvedValue(null)
    getJurnalList.mockRejectedValue(new Error(SECRET))
    const { GET } = await import('../src/app/api/jurnal/route')
    await expectGeneric500(await GET(request()))
  })

  it('/api/jurnal/calendar', async () => {
    getJurnalCalendar.mockRejectedValue(new Error(SECRET))
    const { GET } = await import('../src/app/api/jurnal/calendar/route')
    await expectGeneric500(await GET({ nextUrl: new URL('http://alas.test/api/jurnal/calendar?month=2026-10') } as any))
  })

  it('/api/jurnal/kategori', async () => {
    getCategoriesAction.mockRejectedValue(new Error(SECRET))
    const { GET } = await import('../src/app/api/jurnal/kategori/route')
    await expectGeneric500(await GET())
  })

  it('/api/jurnal/stats', async () => {
    getJurnalYears.mockRejectedValue(new Error(SECRET))
    const { GET } = await import('../src/app/api/jurnal/stats/route')
    await expectGeneric500(await GET({ nextUrl: new URL('http://alas.test/api/jurnal/stats') } as any))
  })

  it('/api/pimpinan dan /api/pimpinan/[id]', async () => {
    getPimpinanList.mockRejectedValue(new Error(SECRET))
    getPimpinanDetail.mockRejectedValue(new Error(SECRET))
    const list = await import('../src/app/api/pimpinan/route')
    const detail = await import('../src/app/api/pimpinan/[id]/route')
    await expectGeneric500(await list.GET({ nextUrl: new URL('http://alas.test/api/pimpinan') } as any))
    await expectGeneric500(await detail.GET({} as any, { params: { id: 'p-1' } }))
  })
})

describe('/api/health', () => {
  beforeEach(() => vi.clearAllMocks())

  it('hanya melaporkan status dan konektivitas database tanpa versi atau uptime', async () => {
    dbExecute.mockResolvedValue([])
    const { GET } = await import('../src/app/api/health/route')

    const body = await (await GET()).json()

    expect(body).toEqual({ status: 'ok', service: 'alas', db_connected: true })
  })

  it('tidak menyertakan pesan galat database saat gagal', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    dbExecute.mockRejectedValue(new Error(SECRET))
    const { GET } = await import('../src/app/api/health/route')

    const res = await GET()

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ status: 'error', service: 'alas', db_connected: false })
  })
})
