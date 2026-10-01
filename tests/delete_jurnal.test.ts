import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetMeAction = vi.fn()
vi.mock('@/entities/lawet-user', () => ({
  getMeAction: () => mockGetMeAction(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const cookieGet = vi.hoisted(() => vi.fn(() => ({ value: 'user-token' })))
vi.mock('next/headers', () => ({
  cookies: () => ({ get: cookieGet }),
}))

const staff = { id: 'user-staff-1', name: 'Agus', role: { name: 'Staff', can_approve: false, is_superadmin: false } }

function mockLawet(status: number, body: unknown) {
  const fetchSpy = vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body })
  vi.stubGlobal('fetch', fetchSpy)
  return fetchSpy
}

describe('deleteJurnalAction (via Lawet Hub, ADR-0005)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('LAWET_API_URL', 'http://lawet.test')
    cookieGet.mockReturnValue({ value: 'user-token' })
  })

  it('rejects unauthenticated caller without calling Lawet Hub', async () => {
    mockGetMeAction.mockResolvedValue(null)
    const fetchSpy = mockLawet(200, {})
    const { deleteJurnalAction } = await import('@/features/jurnal-saya/api/delete.action')

    const res = await deleteJurnalAction('journal-1')
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/unauthorized/i)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('deletes through Lawet Hub with the user token', async () => {
    mockGetMeAction.mockResolvedValue(staff)
    const fetchSpy = mockLawet(200, { status: 'ok' })
    const { deleteJurnalAction } = await import('@/features/jurnal-saya/api/delete.action')

    const res = await deleteJurnalAction('journal-1')

    expect(res.success).toBe(true)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('http://lawet.test/api/v1/jurnal-alas/journal-1')
    expect(init.method).toBe('DELETE')
    expect(init.headers.Authorization).toBe('Bearer user-token')
  })

  it('surfaces Lawet Hub access denial for non-owners', async () => {
    mockGetMeAction.mockResolvedValue(staff)
    mockLawet(403, { detail: 'Akses tidak diizinkan' })
    const { deleteJurnalAction } = await import('@/features/jurnal-saya/api/delete.action')

    const res = await deleteJurnalAction('journal-1')
    expect(res.success).toBe(false)
    expect(res.error).toBe('Akses tidak diizinkan')
  })

  it('reports missing jurnal', async () => {
    mockGetMeAction.mockResolvedValue(staff)
    mockLawet(404, { detail: 'Jurnal tidak ditemukan' })
    const { deleteJurnalAction } = await import('@/features/jurnal-saya/api/delete.action')

    const res = await deleteJurnalAction('journal-1')
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/tidak ditemukan/i)
  })
})
