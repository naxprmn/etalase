import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMeAction = vi.hoisted(() => vi.fn())
const getJurnalDetail = vi.hoisted(() => vi.fn())

vi.mock('@/entities/lawet-user', () => ({ getMeAction }))
vi.mock('@/entities/jurnal/api/get-jurnal-detail', () => ({ getJurnalDetail }))

import { GET } from '../src/app/api/jurnal/[id]/route'

const item = {
  id: 'j-1',
  source_id: 's-1',
  judul: 'Rapat',
  redaksi: 'Staf Uji',
  is_published: true,
  workflow_status: 'published',
  dokumen_pendukung: [
    { nama: 'Undangan', url: 'https://cdn/undangan.pdf', tipe: 'pdf', is_public: true },
    { nama: 'Notulen', url: 'https://cdn/notulen.pdf', tipe: 'pdf', is_public: false },
  ],
}

async function docNames() {
  const res = await GET({} as any, { params: { id: 'j-1' } })
  const body = await res.json()
  return body.data.dokumen_pendukung.map((d: any) => d.nama)
}

describe('GET /api/jurnal/[id] dokumen pendukung (ADR-0007)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getJurnalDetail.mockResolvedValue(item)
  })

  it('tidak mengekspos dokumen ke pengunjung anonim', async () => {
    getMeAction.mockResolvedValue(null)
    expect(await docNames()).toEqual([])
  })

  it('hanya dokumen publik untuk pengguna login biasa', async () => {
    getMeAction.mockResolvedValue({ name: 'Staf Lain', role: { can_approve: false } })
    expect(await docNames()).toEqual(['Undangan'])
  })

  it('pemilik dan approver melihat semua dokumen', async () => {
    getMeAction.mockResolvedValue({ name: 'Staf Uji', role: { can_approve: false } })
    expect(await docNames()).toEqual(['Undangan', 'Notulen'])

    getMeAction.mockResolvedValue({ name: 'Kasubag', role: { can_approve: true } })
    expect(await docNames()).toEqual(['Undangan', 'Notulen'])
  })
})
