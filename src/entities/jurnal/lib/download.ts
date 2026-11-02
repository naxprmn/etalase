/**
 * Helper untuk mengunduh media/berkas di browser.
 * Berusaha mengunduh berkas sebagai Blob agar browser langsung menyimpan
 * ke disk lokal (tidak sekadar membuka tab baru).
 */
export async function triggerDownload(url: string, filename: string): Promise<boolean> {
  if (typeof window === 'undefined') return false

  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const objectUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(objectUrl)
    return true
  } catch {
    // Fallback bila terhalang CORS atau fetch gagal: gunakan tautan download langsung
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    return false
  }
}
