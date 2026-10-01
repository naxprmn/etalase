/**
 * Kontrak media Lawet Hub: field `url` pada dokumentasi/dokumen_pendukung
 * menyimpan object_name MinIO (mis. `jurnal-foto/abc.png`). Saat publish,
 * Lawet Hub menyalin object tersebut ke bucket publik ALAS.
 *
 * Di browser, object_name ditampilkan lewat proxy ALAS
 * `/api/v1/jurnal-alas/media/<object_name>` (butuh login).
 */
export const JURNAL_MEDIA_PREFIX = '/api/v1/jurnal-alas/media/'

/** URL proxy / object_name → object_name yang disimpan di Lawet Hub. */
export function toMediaObjectName(url: string): string {
  return url.startsWith(JURNAL_MEDIA_PREFIX) ? url.slice(JURNAL_MEDIA_PREFIX.length) : url
}

/** object_name → URL yang bisa dipakai di <img>/<a>. URL absolut dibiarkan. */
export function toMediaDisplayUrl(url: string): string {
  if (!url || /^(https?:|data:|blob:|\/)/.test(url)) return url
  return `${JURNAL_MEDIA_PREFIX}${url}`
}
