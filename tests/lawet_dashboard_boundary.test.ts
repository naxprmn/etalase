import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const cookieSet = vi.hoisted(() => vi.fn())
const cookieGet = vi.hoisted(() => vi.fn(() => ({ value: 'read-token' })))

vi.mock('next/headers', () => ({
  cookies: () => ({
    set: cookieSet,
    get: cookieGet,
    delete: vi.fn(),
  }),
}))

describe('Lawet dashboard security boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('LAWET_API_URL', 'http://lawet.internal')
  })

  it('authenticates with Lawet Hub without read-only restrictions (ADR-0005)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      access_token: 'auth-token',
      user: { id: 'user-1', has_alas_access: true },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const { loginAction } = await import('@/features/lawet-auth/api/login.action')
    const result = await loginAction('operator', '1234')

    expect(result.success).toBe(true)
    expect(cookieSet).toHaveBeenCalledWith(expect.objectContaining({
      name: 'lawet_token',
      value: 'auth-token',
    }))
    expect(fetchMock).toHaveBeenCalledWith(
      'http://lawet.internal/api/v1/auth/login',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    )
  })

  it('rejects login for users without ALAS access', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      access_token: 'auth-token-no-access',
      user: { id: 'user-no-access', has_alas_access: false },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const { loginAction } = await import('@/features/lawet-auth/api/login.action')
    const result = await loginAction('no_access_staff', '1234')

    expect(result.success).toBe(false)
    expect(result.error).toContain('tidak memiliki hak akses ke sistem ALAS')
    expect(cookieSet).not.toHaveBeenCalled()
  })

  it('getMeAction returns null for authenticated user without ALAS access', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'user-no-access',
      name: 'Staff Lain',
      username: 'staff_lain',
      has_alas_access: false,
      role: { id: 'r1', name: 'staff', level: 1, is_superadmin: false },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    const { getMeAction } = await import('@/entities/lawet-user/api/get-current-user.action')
    const user = await getMeAction()

    expect(user).toBeNull()
  })

  it('proxies protected media with bearer auth and private no-store caching', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('image', {
      status: 200,
      headers: { 'Content-Type': 'image/jpeg' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    const { GET } = await import('../src/app/api/v1/jurnal-alas/media/[...path]/route')
    const request = new NextRequest('http://alas.local/api/v1/jurnal-alas/media/jurnal-foto/a.jpg', {
      headers: { cookie: 'lawet_token=read-token' },
    })

    const response = await GET(request, { params: { path: ['jurnal-foto', 'a.jpg'] } })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://lawet.internal/api/v1/jurnal-alas/media/jurnal-foto/a.jpg',
      expect.objectContaining({
        cache: 'no-store',
        headers: { Authorization: 'Bearer read-token' },
      }),
    )
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })

  it('rejects unauthenticated and out-of-prefix media paths before calling Lawet', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { GET } = await import('../src/app/api/v1/jurnal-alas/media/[...path]/route')

    const unauthenticated = await GET(
      new NextRequest('http://alas.local/api/v1/jurnal-alas/media/jurnal-foto/a.jpg'),
      { params: { path: ['jurnal-foto', 'a.jpg'] } },
    )
    const invalidPath = await GET(
      new NextRequest('http://alas.local/api/v1/jurnal-alas/media/private/a.jpg', {
        headers: { cookie: 'lawet_token=read-token' },
      }),
      { params: { path: ['private', 'a.jpg'] } },
    )

    expect(unauthenticated.status).toBe(401)
    expect(invalidPath.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

})
