import { describe, it, expect } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { DokumentasiSection } from '@/widgets/dokumentasi/ui/DokumentasiSection'
import '@testing-library/jest-dom'

describe('DokumentasiSection - Unduh Foto Dokumentasi', () => {
  const dummyPhotos = [
    {
      id: 'j-101',
      url: 'https://images.unsplash.com/photo-1?w=600',
      judul: 'Sosialisasi Pemilu Partisipatif',
      kategori: 'Pencegahan',
    },
    {
      id: 'j-102',
      url: 'jurnal-foto/sidang-sengketa.jpg',
      judul: 'Sidang Penyelesaian Sengketa',
      kategori: 'Sengketa',
    },
  ]

  it('renders download button on documentation cards', () => {
    render(<DokumentasiSection photos={dummyPhotos} />)

    const downloadButtons = screen.getAllByTitle('Unduh Foto Dokumentasi')
    expect(downloadButtons).toHaveLength(2)

    expect(
      screen.getByRole('button', { name: 'Unduh foto Sosialisasi Pemilu Partisipatif' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Unduh foto Sidang Penyelesaian Sengketa' })
    ).toBeInTheDocument()
  })

  it('handles empty photos gracefully', () => {
    render(<DokumentasiSection photos={[]} />)
    expect(screen.getByText('Belum ada dokumentasi tersedia.')).toBeInTheDocument()
  })
})
