import React from 'react'

interface SpinnerProps {
  /** Diameter dalam piksel. */
  size?: number
  /** Teks untuk pembaca layar; tampilan visual hanya putaran. */
  label?: string
  className?: string
}

/**
 * Indikator putar untuk transaksi yang sedang berjalan (kirim, setujui, hapus, unggah, masuk).
 * Warna mengikuti `currentColor` sehingga cocok di tombol terang maupun gelap.
 */
export function Spinner({ size = 16, label = 'Memproses', className = '' }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className={`inline-flex items-center justify-center ${className}`.trim()}>
      <span
        aria-hidden="true"
        className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent"
        style={{ width: size, height: size }}
      />
    </span>
  )
}
