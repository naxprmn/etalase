import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const LAWET_API_URL = process.env.LAWET_API_URL as string
  if (!LAWET_API_URL) {
    return new NextResponse('LAWET_API_URL not configured', {
      status: 500,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  }

  const token = request.cookies.get('lawet_token')?.value
  if (!token) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  }

  const [prefix, ...rest] = params.path
  const allowedPrefixes = new Set(['jurnal-foto', 'jurnal-dokumen', 'alas_media'])
  const hasUnsafeSegment = params.path.some(
    (segment) => !segment || segment === '.' || segment === '..' || /[\\/]/.test(segment),
  )
  if (!allowedPrefixes.has(prefix) || rest.length === 0 || hasUnsafeSegment) {
    return new NextResponse('Invalid media path', {
      status: 400,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  }

  const pathStr = params.path.map(encodeURIComponent).join('/')
  const url = `${LAWET_API_URL}/api/v1/jurnal-alas/media/${pathStr}`
  const configuredTimeout = Number(process.env.LAWET_REQUEST_TIMEOUT_MS ?? '5000')
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : 5000

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!res.ok) {
      return new NextResponse('Media tidak tersedia', {
        status: res.status,
        headers: { 'Cache-Control': 'private, no-store' },
      })
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream'
    const contentDisposition = res.headers.get('content-disposition')

    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Cache-Control', 'private, no-store')
    if (contentDisposition) {
      headers.set('Content-Disposition', contentDisposition)
    }

    return new NextResponse(res.body, {
      status: 200,
      headers
    })
  } catch {
    return new NextResponse('Server media tidak merespons', {
      status: 502,
      headers: { 'Cache-Control': 'private, no-store' },
    })
  }
}
export const dynamic = 'force-dynamic'
