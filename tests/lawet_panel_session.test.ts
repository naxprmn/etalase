import { beforeEach, describe, expect, it, vi } from 'vitest'

const cookieSet = vi.hoisted(() => vi.fn())
const cookieDelete = vi.hoisted(() => vi.fn())

vi.mock('next/headers', () => ({
  cookies: () => ({ set: cookieSet, get: vi.fn(), delete: cookieDelete }),
}))

function jwt(payload: Record<string, unknown>) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

function loginResponse(token: string) {
  return new Response(JSON.stringify({ access_token: token, user: { id: 'u-1', has_alas_access: true } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('sesi panel ALAS (ADR-0010)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('LAWET_API_URL', 'http://lawet.internal')
  })

  it('login memberi tahu Lawet Hub bahwa kliennya panel ALAS', async () => {
    const fetchMock = vi.fn().mockResolvedValue(loginResponse('opaque-token'))
    vi.stubGlobal('fetch', fetchMock)

    const { loginAction } = await import('@/features/lawet-auth/api/login.action')
    await loginAction('operator', '1234')

    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Lawet-Client': 'alas-panel',
    })
  })

  it('umur cookie mengikuti klaim exp token, bukan angka tetap', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(loginResponse(jwt({ sub: 'u-1', exp }))))

    const { loginAction } = await import('@/features/lawet-auth/api/login.action')
    await loginAction('operator', '1234')

    const { maxAge } = cookieSet.mock.calls[0][0]
    expect(maxAge).toBeGreaterThan(3590)
    expect(maxAge).toBeLessThanOrEqual(3600)
  })

  it('token tanpa exp yang terbaca memakai batas aman 8 jam', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(loginResponse('opaque-token')))

    const { loginAction } = await import('@/features/lawet-auth/api/login.action')
    await loginAction('operator', '1234')

    expect(cookieSet.mock.calls[0][0].maxAge).toBe(8 * 60 * 60)
  })

  it('token yang sudah kedaluwarsa tidak disimpan sebagai sesi', async () => {
    const exp = Math.floor(Date.now() / 1000) - 10
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(loginResponse(jwt({ sub: 'u-1', exp }))))

    const { loginAction } = await import('@/features/lawet-auth/api/login.action')
    const result = await loginAction('operator', '1234')

    expect(result.success).toBe(false)
    expect(cookieSet).not.toHaveBeenCalled()
  })

  it('cookie sesi httpOnly, lax, dan secure di produksi', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(loginResponse('opaque-token')))

    const { loginAction } = await import('@/features/lawet-auth/api/login.action')
    await loginAction('operator', '1234')

    expect(cookieSet.mock.calls[0][0]).toMatchObject({
      name: 'lawet_token', httpOnly: true, sameSite: 'lax', secure: true, path: '/',
    })
  })
})
