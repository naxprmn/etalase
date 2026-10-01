import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const replace = vi.hoisted(() => vi.fn())
const params = vi.hoisted(() => ({ value: new URLSearchParams() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => params.value,
}))

// Jalankan debounce secara langsung agar URL bisa diperiksa sinkron.
vi.mock('use-debounce', () => ({
  useDebouncedCallback: (fn: (...args: unknown[]) => unknown) => fn,
}))

import { useJurnalFilter } from '@/features/jurnal-filter/lib/use-jurnal-filter'

describe('useJurnalFilter (filter arsip beranda)', () => {
  beforeEach(() => {
    replace.mockClear()
    params.value = new URLSearchParams()
  })

  it('reads q, kategori, tahun and date from the URL', () => {
    params.value = new URLSearchParams('q=rapat&kategori=mou&tahun=2026&date=2026-10-15')
    const { result } = renderHook(() => useJurnalFilter())
    expect(result.current).toMatchObject({ q: 'rapat', kategori: 'mou', tahun: '2026', date: '2026-10-15' })
  })

  it('writes only filled filters to the URL without scrolling', () => {
    const { result } = renderHook(() => useJurnalFilter())
    act(() => result.current.setFilter('pleno', 'penanganan pelanggaran', '2026'))
    expect(replace).toHaveBeenCalledWith('/?q=pleno&kategori=penanganan+pelanggaran&tahun=2026', { scroll: false })
  })

  it('resets every filter', () => {
    const { result } = renderHook(() => useJurnalFilter())
    act(() => result.current.resetFilter())
    expect(replace).toHaveBeenCalledWith('/', { scroll: false })
  })
})
