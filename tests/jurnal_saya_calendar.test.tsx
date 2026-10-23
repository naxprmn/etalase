import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import JurnalSaya from '@/views/panel/ui/JurnalSaya'
import '@testing-library/jest-dom'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
}))

describe('JurnalSaya calendar widget for staff', () => {
  const mockWorkspace = {
    mine: [
      {
        id: 'jurnal-staff-1',
        source_id: 'jurnal-staff-1',
        judul: 'Sosialisasi Staf Pengawasan',
        tanggal_kegiatan: '2026-10-20',
        kategori: 'sosialisasi',
        status: 'draft' as const,
        scope: 'mine' as const,
        is_published: false,
        tags: [],
        dokumentasi: [],
        dokumen_pendukung: [],
        pihak_terkait: [],
      },
    ],
    subordinates: [],
    viewerName: 'Staf Humas',
    viewerIsSuperadmin: false,
    canReview: false,
  }

  it('renders activity calendar headers and days in staff panel', () => {
    render(<JurnalSaya workspace={mockWorkspace as any} error={null} />)

    // Calendar day headers
    expect(screen.getByText('Ming')).toBeInTheDocument()
    expect(screen.getByText('Sen')).toBeInTheDocument()
    expect(screen.getByText('Sel')).toBeInTheDocument()
    expect(screen.getByText('Rab')).toBeInTheDocument()
    expect(screen.getByText('Kam')).toBeInTheDocument()
    expect(screen.getByText('Jum')).toBeInTheDocument()
    expect(screen.getByText('Sab')).toBeInTheDocument()

    // Journal item present
    expect(screen.getByText('Sosialisasi Staf Pengawasan')).toBeInTheDocument()
  })
})
