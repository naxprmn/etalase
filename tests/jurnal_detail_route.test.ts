import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMeAction = vi.hoisted(() => vi.fn())
const getJurnalDetail = vi.hoisted(() => vi.fn())
const canViewRestrictedJurnal = vi.hoisted(() => vi.fn())

vi.mock('@/entities/lawet-user', () => ({ getMeAction }))
vi.mock('@/entities/jurnal/api/get-jurnal-detail', () => ({ getJurnalDetail }))
vi.mock('@/entities/jurnal/api/can-view-restricted-jurnal', () => ({ canViewRestrictedJurnal }))

import { GET } from '../src/app/api/jurnal/[id]/route'

const item = {
  id: 'j-1',
  source_id: 's-1',
  judul: 'Rapat',
  redaksi: 'Staf Uji',
  divisi: 'Humas',
  is_published: true,
  workflow_status: 'published',
  dokumen_pendukung: [
    { nama: 'Undangan', url: 'https://cdn/undangan.pdf', tipe: 'pdf', is_public: true },
    { nama: 'Notulen', url: 'https://cdn/notulen.pdf', tipe: 'pdf', is_public: false },
  ],
}

async function call() {
  return GET({} as any, { params: { id: 'j-1' } })
}

async function docNames() {
  const body = await (await call()).json()
  return body.data.dokumen_pendukung.map((d: any) => d.nama)
}

describe('GET /api/jurnal/[id] dokumen pendukung (ADR-0007)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getJurnalDetail.mockResolvedValue(item)
    canViewRestrictedJurnal.mockResolvedValue(false)
  })

  it('tidak mengekspos dokumen ke pengunjung anonim', async () => {
    getMeAction.mockResolvedValue(null)
    expect(await docNames()).toEqual([])
    expect(canViewRestrictedJurnal).not.toHaveBeenCalled()
  })

  it('hanya dokumen publik untuk pengguna login biasa', async () => {
    getMeAction.mockResolvedValue({ id: 'u-2', name: 'Staf Lain', role: { can_approve: false } })
    expect(await docNames()).toEqual(['Undangan'])
  })

  it('pengguna yang berwenang atas jurnal melihat semua dokumen', async () => {
    getMeAction.mockResolvedValue({ id: 'u-1', name: 'Staf Uji', role: { can_approve: false } })
    canViewRestrictedJurnal.mockResolvedValue(true)
    expect(await docNames()).toEqual(['Undangan', 'Notulen'])
  })

  it('nama yang sama dengan redaksi bukan bukti kepemilikan', async () => {
    getMeAction.mockResolvedValue({ id: 'u-9', name: 'Staf Uji', role: { can_approve: false } })
    expect(await docNames()).toEqual(['Undangan'])
  })

  it('tidak menanyakan kewenangan bila jurnal tidak punya dokumen privat', async () => {
    getJurnalDetail.mockResolvedValue({ ...item, dokumen_pendukung: [item.dokumen_pendukung[0]] })
    getMeAction.mockResolvedValue({ id: 'u-2', name: 'Staf Lain', role: { can_approve: false } })
    await docNames()
    expect(canViewRestrictedJurnal).not.toHaveBeenCalled()
  })
})

describe('GET /api/jurnal/[id] jurnal yang belum atau tidak publik', () => {
  const draft = { ...item, is_published: false }

  beforeEach(() => {
    vi.clearAllMocks()
    getJurnalDetail.mockResolvedValue(draft)
    canViewRestrictedJurnal.mockResolvedValue(false)
  })

  it('404 untuk pengunjung anonim', async () => {
    getMeAction.mockResolvedValue(null)
    expect((await call()).status).toBe(404)
  })

  it('404 untuk pengguna login tanpa kewenangan atas jurnal itu', async () => {
    getMeAction.mockResolvedValue({ id: 'u-2', name: 'Staf Uji', role: { can_approve: true } })
    expect((await call()).status).toBe(404)
    expect(canViewRestrictedJurnal).toHaveBeenCalledWith(expect.objectContaining({ id: 'u-2' }), draft)
  })

  it('terbuka bagi pengguna yang berwenang dan dokumen privat ikut tampil', async () => {
    getMeAction.mockResolvedValue({ id: 'u-1', name: 'Staf Uji', role: { can_approve: false } })
    canViewRestrictedJurnal.mockResolvedValue(true)
    const res = await call()
    expect(res.status).toBe(200)
    expect((await res.json()).data.dokumen_pendukung.map((d: any) => d.nama)).toEqual(['Undangan', 'Notulen'])
  })

  it('404 bila jurnal tidak ada', async () => {
    getJurnalDetail.mockResolvedValue(null)
    getMeAction.mockResolvedValue(null)
    expect((await call()).status).toBe(404)
  })

  it('tidak membocorkan pesan galat internal', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    getJurnalDetail.mockRejectedValue(new Error('relation "jurnal" does not exist'))
    getMeAction.mockResolvedValue(null)
    const res = await call()
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('relation')
  })
})
