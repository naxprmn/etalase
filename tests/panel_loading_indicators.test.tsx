import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import '@testing-library/jest-dom'

const setujuJurnalAction = vi.hoisted(() => vi.fn())
const tolakJurnalAction = vi.hoisted(() => vi.fn())
const deleteJurnalAction = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/features/jurnal-saya/api/approve.action', () => ({ setujuJurnalAction, tolakJurnalAction }))
vi.mock('@/features/jurnal-saya/api/delete.action', () => ({ deleteJurnalAction }))
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

import { Spinner } from '@/shared/ui/spinner'
import Approval from '@/views/panel/ui/Approval'
import JurnalSaya from '@/views/panel/ui/JurnalSaya'

function pending<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

const item = {
  id: 'j-1', source_id: 'j-1', judul: 'Rapat Koordinasi', tanggal_kegiatan: '2026-10-20', kategori: 'rapat',
  status: 'draft' as const, scope: 'subordinate' as const, is_published: false, tags: [], dokumentasi: [],
  dokumen_pendukung: [], pihak_terkait: [], owner_name: 'Staf', deskripsi: 'Ringkasan',
}

const workspace = {
  mine: [], subordinates: [item], canReview: true, viewerId: 'u-9', viewerName: 'Kasubag',
  viewerIsSuperadmin: false, warnings: [],
} as any

describe('Spinner', () => {
  it('diumumkan sebagai status dengan label yang dapat dibaca pembaca layar', () => {
    render(<Spinner label="Menyimpan jurnal" />)
    const spinner = screen.getByRole('status', { name: 'Menyimpan jurnal' })
    expect(spinner).toBeInTheDocument()
    expect(spinner.querySelector('.animate-spin')).not.toBeNull()
  })

  it('memakai label bawaan dan ukuran yang dapat diatur', () => {
    render(<Spinner size={24} />)
    const icon = screen.getByRole('status', { name: 'Memproses' }).querySelector('.animate-spin') as HTMLElement
    expect(icon.style.width).toBe('24px')
    expect(icon.style.height).toBe('24px')
  })
})

describe('Approval: persetujuan dan penolakan menampilkan spinner selama transaksi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('tombol Setujui Jurnal memutar spinner, terkunci, lalu normal kembali bila gagal', async () => {
    const call = pending<{ success: boolean; error?: string }>()
    setujuJurnalAction.mockReturnValue(call.promise)
    render(<Approval workspace={workspace} />)

    fireEvent.click(screen.getByRole('button', { name: /Setuju jurnal/i }))
    const confirm = await screen.findByRole('button', { name: /Setujui Jurnal/ })
    fireEvent.click(confirm)

    await waitFor(() => expect(within(screen.getByRole('button', { name: /Memproses|Menyetujui/ })).getByRole('status')).toBeInTheDocument())
    const busy = screen.getByRole('button', { name: /Memproses|Menyetujui/ })
    expect(busy).toBeDisabled()
    expect(busy).toHaveAttribute('aria-busy', 'true')

    await act(async () => { call.resolve({ success: false, error: 'Gagal menyetujui' }) })
    expect(screen.queryByRole('status', { name: 'Memproses' })).toBeNull()
    expect(screen.getByRole('button', { name: /Setujui Jurnal/ })).toBeEnabled()
  })

  it('tombol Kirim Penolakan memutar spinner selama permintaan berjalan', async () => {
    const call = pending<{ success: boolean }>()
    tolakJurnalAction.mockReturnValue(call.promise)
    render(<Approval workspace={workspace} />)

    fireEvent.click(screen.getByRole('button', { name: /Tolak\/Kembalikan/i }))
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'Lengkapi ringkasan' } })
    fireEvent.click(screen.getByRole('button', { name: /Kirim Penolakan/ }))

    const busy = await screen.findByRole('button', { name: /Memproses|Mengirim/ })
    expect(busy).toBeDisabled()
    expect(within(busy).getByRole('status')).toBeInTheDocument()

    await act(async () => { call.resolve({ success: true }) })
  })
})

describe('JurnalSaya: hapus jurnal menampilkan spinner selama transaksi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('tombol Ya, Hapus memutar spinner dan terkunci', async () => {
    const call = pending<{ success: boolean }>()
    deleteJurnalAction.mockReturnValue(call.promise)
    render(<JurnalSaya error={null} workspace={{ ...workspace, viewerIsSuperadmin: true, mine: [{ ...item, scope: 'mine' as const }], subordinates: [] }} />)

    const trashButtons = screen.getAllByRole('button', { name: /hapus/i })
    fireEvent.click(trashButtons[0])
    fireEvent.click(await screen.findByRole('button', { name: 'Ya, Hapus' }))

    const busy = await screen.findByRole('button', { name: /Menghapus/ })
    expect(busy).toBeDisabled()
    expect(within(busy).getByRole('status')).toBeInTheDocument()

    await act(async () => { call.resolve({ success: false }) })
  })
})
