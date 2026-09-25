'use client'

import React, { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { JurnalCard } from '@/entities/jurnal/ui/jurnal-card'

interface JurnalListProps {
  q: string
  kategori: string
  date?: string
  activeId: string | null
  setActiveId: (id: string | null) => void
  onActiveDateChange: (date: string) => void
  onCardClick: (id: string) => void
  onHover?: (id: string, date: string) => void
  onLeaveHover?: () => void
  lineTargetId?: string | null
  scrollContainerRef?: React.RefObject<HTMLDivElement>
  navigatingRef?: React.MutableRefObject<boolean>
}

export const JurnalList: React.FC<JurnalListProps> = ({
  q,
  kategori,
  date,
  activeId,
  setActiveId,
  onActiveDateChange,
  onCardClick,
  onHover,
  onLeaveHover,
  lineTargetId,
  scrollContainerRef,
  navigatingRef,
}) => {
  const [page, setPage] = React.useState(1)

  const {
    data,
    isLoading,
    isError,
    isFetching
  } = useQuery({
    queryKey: ['jurnals', q, kategori, date, page],
    queryFn: () => {
      const url = new URL('/api/jurnal', window.location.origin)
      if (q) url.searchParams.set('q', q)
      if (kategori) url.searchParams.set('kategori', kategori)
        if (date) url.searchParams.set('date', date)
      url.searchParams.set('cursor', page.toString()) // Backend now treats this as page
      url.searchParams.set('limit', '6') // Show 6 per page
      url.searchParams.set('view', 'summary')
      return fetch(url.toString()).then(r => {
        if (!r.ok) throw new Error('Network error')
        return r.json()
      })
    },
  })

  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (navigatingRef?.current) return
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cardId = entry.target.id.replace('jurnal-card-', '')
            const date = entry.target.getAttribute('data-tanggal')
            setActiveId(cardId)
            if (date) {
              onActiveDateChange(date)
            }
          }
        })
      },
      {
        root: scrollContainerRef?.current ?? null,
        rootMargin: '-30% 0px -30% 0px',
        threshold: 0,
      }
    )

    const cards = document.querySelectorAll('.jurnal-card')
    cards.forEach((card) => observerRef.current?.observe(card))

    return () => observerRef.current?.disconnect()
  }, [data, setActiveId, onActiveDateChange, scrollContainerRef])

  const actualItems = data?.data || []
  const totalPages = data?.pagination?.total_pages || 1

  return (
    <div className="flex flex-col w-full pb-20">
      <div className="flex md:grid overflow-x-auto snap-x snap-mandatory md:overflow-visible hide-scrollbar md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 min-h-[400px] pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        {isLoading ? (
           <div className="min-w-[85vw] md:min-w-0 md:col-span-2 lg:col-span-3 flex justify-center py-20 text-[#142B42] font-medium">
             Memuat jurnal...
           </div>
        ) : actualItems.length === 0 ? (
           <div className="min-w-[85vw] md:min-w-0 md:col-span-2 lg:col-span-3 flex justify-center py-20 text-[#7B8EA0] font-medium">
             Tidak ada jurnal ditemukan
           </div>
        ) : (
          actualItems.map((item: any, idx: number) => {
            const delayMs = idx < 5 ? `${idx * 120 + 200}ms` : '0ms'
            return (
              <div key={item.id} className="min-w-[85vw] snap-center md:min-w-0 md:snap-none h-full flex flex-col shrink-0 md:shrink">
                <JurnalCard
                  id={item.id}
                  judul={item.judul}
                  ringkasan={item.ringkasan}
                  tanggal_kegiatan={item.tanggal_kegiatan}
                  kategori={item.kategori}
                  thumbnail_url={item.thumbnail_url}
                  pihak_terkait={item.pihak_terkait}
                  tags={item.tags}
                  isActive={activeId === item.id}
                  isLineTarget={lineTargetId === item.id}
                  onClick={() => onCardClick(item.id)}
                  onHover={onHover}
                  onLeaveHover={onLeaveHover}
                  staggerDelay={delayMs}
                />
              </div>
            )
          })
        )}
      </div>

      {/* Dynamic Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-12 mb-8" style={{ fontFamily: 'Poppins' }}>
          <div className="inline-flex items-center gap-2 px-3.5 py-[6px] border border-[#C6D2E8] rounded-full bg-white backdrop-blur-sm shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`w-[42px] h-[38px] flex items-center justify-center rounded-[12px] border border-[#DCE4F0] transition-colors ${page === 1 ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-white text-[#142B42] hover:bg-gray-50'}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18L9 12L15 6" />
              </svg>
            </button>
            
            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              // Simple pagination logic to show first, last, current, and adjacent
              if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
                return (
                  <button 
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-[42px] h-[38px] flex items-center justify-center rounded-[12px] font-bold text-[15px] transition-colors ${p === page ? 'bg-[#F7921C] text-white' : 'border border-[#DCE4F0] bg-white text-[#142B42] hover:bg-gray-50'}`}
                  >
                    {p}
                  </button>
                )
              } else if (p === page - 2 || p === page + 2) {
                return (
                  <span key={p} className="w-[42px] h-[38px] flex items-center justify-center rounded-[12px] border border-[#DCE4F0] bg-white text-[#142B42] font-bold text-[15px]">
                    ...
                  </span>
                )
              }
              return null;
            })}
            
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`w-[42px] h-[38px] flex items-center justify-center rounded-[12px] border border-[#DCE4F0] transition-colors ${page === totalPages ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-white text-[#142B42] hover:bg-gray-50'}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18L15 12L9 6" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
