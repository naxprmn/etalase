import { describe, it, expect } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { JurnalDetailModal } from '@/entities/jurnal/ui/jurnal-detail-modal.client'
import '@testing-library/jest-dom'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

function renderWithClient(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('JurnalDetailModal - Dokumen Tambahan Download Boundary', () => {
  const dummyItem = {
    id: 'j-1',
    judul: 'Laporan Kerjasama',
    kategori: 'kerjasama',
    tanggal_kegiatan: '2026-10-10',
    ringkasan: 'Ringkasan laporan',
    dokumentasi: [
      { url: 'https://cdn.example.com/foto1.jpg', caption: 'Foto 1' }
    ],
    dokumen_pendukung: [
      { nama: 'Lampiran SK.pdf', url: 'https://cdn.example.com/sk.pdf' },
    ],
  }

  it('restricts download on external views (isInternal=false)', () => {
    renderWithClient(
      <JurnalDetailModal
        id="j-1"
        isOpen={true}
        onClose={() => {}}
        isLoggedIn={true}
        isInternal={false}
        initialData={dummyItem}
      />
    )

    expect(screen.getByText('Dokumen Tambahan')).toBeInTheDocument()
    expect(screen.getByText('Lampiran SK.pdf')).toBeInTheDocument()
    expect(screen.getByText('Khusus Internal')).toBeInTheDocument()

    // Does NOT render an active download link for Lampiran SK.pdf
    const link = screen.queryByRole('link', { name: /Lampiran SK\.pdf/i })
    expect(link).toBeNull()
  })

  it('allows download on internal views (isInternal=true)', () => {
    renderWithClient(
      <JurnalDetailModal
        id="j-1"
        isOpen={true}
        onClose={() => {}}
        isLoggedIn={true}
        isInternal={true}
        initialData={dummyItem}
      />
    )

    expect(screen.getByText('Dokumen Tambahan')).toBeInTheDocument()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://cdn.example.com/sk.pdf')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('download', 'Lampiran SK.pdf')
  })

  it('provides photo download action in modal and lightbox for all users', () => {
    renderWithClient(
      <JurnalDetailModal
        id="j-1"
        isOpen={true}
        onClose={() => {}}
        isLoggedIn={false}
        isInternal={false}
        initialData={dummyItem}
      />
    )

    // Dokumentasi header and photo thumbnail download button should be present
    expect(screen.getByText('Dokumentasi')).toBeInTheDocument()
    const downloadThumbnailBtn = screen.getByRole('button', { name: 'Unduh Foto 1' })
    expect(downloadThumbnailBtn).toBeInTheDocument()

    // Open lightbox by clicking the photo
    const photo = screen.getByAltText('Dokumentasi 1')
    fireEvent.click(photo)

    // Lightbox should have an "Unduh foto ini" button
    const lightboxDownloadBtn = screen.getByRole('button', { name: 'Unduh foto ini' })
    expect(lightboxDownloadBtn).toBeInTheDocument()
  })
})
