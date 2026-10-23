import { beforeEach, describe, expect, it, vi } from 'vitest'

const cookieGet = vi.hoisted(() => vi.fn())

vi.mock('next/headers', () => ({ cookies: () => ({ get: cookieGet }) }))

import { canViewRestrictedJurnal } from '../src/entities/jurnal/api/can-view-restricted-jurnal'

const item = { source_id: 'ssssssss-0000-4000-8000-000000000001', divisi: 'Humas' }

function user(overrides: Record<string, any> = {}) {
  return {
    id: 'u-1',
    name: 'Staf',
    division: { id: 'd-1', name: 'Humas' },
    role: { can_approve: false, is_superadmin: false },
    ...overrides,
  } as any
}

describe('canViewRestrictedJurnal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('LAWET_API_URL', 'http://lawet.internal')
    cookieGet.mockReturnValue({ value: 'user-token' })
  })

  it('menolak pengunjung tanpa sesi', async () => {
    expect(await canViewRestrictedJurnal(null, item)).toBe(false)
  })

  it('mengizinkan superadmin tanpa bertanya ke Lawet Hub', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await canViewRestrictedJurnal(user({ role: { is_superadmin: true } }), item)).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('mengizinkan approver hanya untuk jurnal divisinya', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 403 }))
    vi.stubGlobal('fetch', fetchMock)
    const approver = user({ role: { can_approve: true } })

    expect(await canViewRestrictedJurnal(approver, item)).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(await canViewRestrictedJurnal(approver, { ...item, divisi: 'SDM' })).toBe(false)
  })

  it('approver tanpa divisi tidak mendapat akses lintas divisi', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 403 })))
    expect(await canViewRestrictedJurnal(user({ division: null, role: { can_approve: true } }), item)).toBe(false)
  })

  it('pemilik dibuktikan oleh Lawet Hub dengan token pengguna', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await canViewRestrictedJurnal(user(), item)).toBe(true)

    expect(fetchMock).toHaveBeenCalledWith(
      `http://lawet.internal/api/v1/jurnal-alas/${item.source_id}`,
      expect.objectContaining({ headers: { Authorization: 'Bearer user-token' } }),
    )
  })

  it.each([403, 404, 500])('menolak bila Lawet Hub menjawab %i', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })))
    expect(await canViewRestrictedJurnal(user(), item)).toBe(false)
  })

  it('menolak bila Lawet Hub tidak terjangkau atau token tidak ada', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))
    expect(await canViewRestrictedJurnal(user(), item)).toBe(false)

    cookieGet.mockReturnValue(undefined)
    expect(await canViewRestrictedJurnal(user(), item)).toBe(false)
  })
})
