import { describe, it, expect } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
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
  })
})
