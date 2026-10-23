import { NextResponse } from 'next/server'

/**
 * Respons 500 untuk rute publik: detail galat (SQL, path, stack) hanya masuk log server,
 * tidak pernah ke badan respons.
 */
export function internalErrorResponse(scope: string, error: unknown): NextResponse {
  console.error(`[api] ${scope} gagal:`, error)
  return NextResponse.json({ status: 'error', message: 'internal error' }, { status: 500 })
}
