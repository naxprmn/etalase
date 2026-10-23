/** Batas aman bila token tidak memuat klaim `exp` yang dapat dibaca (Lawet Hub memberi 8 jam untuk panel). */
export const DEFAULT_SESSION_SECONDS = 8 * 60 * 60

function readExpiry(token: string): number | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    return typeof payload?.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp : null
  } catch {
    return null
  }
}

/**
 * Sisa umur token dalam detik; cookie sesi mengikuti ini agar tidak hidup lebih lama dari token.
 * Hasil <= 0 berarti token sudah kedaluwarsa.
 */
export function sessionSecondsRemaining(token: string, nowSeconds = Date.now() / 1000): number {
  const expiry = readExpiry(token)
  return expiry === null ? DEFAULT_SESSION_SECONDS : Math.floor(expiry - nowSeconds)
}
