'use client'
import React, { useState } from 'react'

export const DokumentasiSection = ({ photos = [] }: { photos?: Array<{url: string, judul: string, kategori: string}> }) => {
  const [startIndex, setStartIndex] = useState(0)

  const handleNext = () => {
    if (photos.length > 3) {
      setStartIndex((prev) => (prev + 1) % photos.length)
    }
  }

  const handlePrev = () => {
    if (photos.length > 3) {
      setStartIndex((prev) => (prev - 1 + photos.length) % photos.length)
    }
  }

  const visiblePhotos = photos.length > 3 
    ? [
        photos[startIndex],
        photos[(startIndex + 1) % photos.length],
        photos[(startIndex + 2) % photos.length]
      ]
    : photos;

  return (
    <section className="relative w-full pt-10 pb-20 overflow-hidden" style={{ fontFamily: 'Poppins' }}>
      <style>{`
        @keyframes subtleBreathe {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.03); opacity: 1; }
        }
        .idle-animate {
          animation: subtleBreathe 6s ease-in-out infinite;
        }
        .group:hover .idle-animate {
          animation: none;
        }
      `}</style>

      <div className="max-w-[1440px] mx-auto px-4 md:px-10 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 md:mb-12">
          <div>
            <h2 className="text-[#142B42] text-[26px] md:text-[40px] font-bold leading-tight mb-1">
              Dokumentasi Kegiatan
            </h2>
            <p className="text-[#5D6A77] text-xs md:text-sm">
              Dokumentasi aktivitas dan kegiatan arsip Bawaslu Kebumen
            </p>
          </div>
          {photos.length > 1 && (
            <div className="md:hidden flex items-center gap-1 text-[#F7921C] text-xs font-semibold mt-2">
              Geser ke samping &rarr;
            </div>
          )}
        </div>

        {/* Carousel Container */}
        <div className="relative w-full">
          
          {/* Left Arrow - Hanya muncul jika lebih dari 3 foto */}
          {photos.length > 3 && (
            <button onClick={handlePrev} className="absolute left-[-20px] top-1/2 -translate-y-1/2 z-20 w-[45px] h-[45px] rounded-full bg-[#F7921C] hover:bg-[#e08316] text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 hidden md:flex">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          )}

          {/* Cards Grid */}
          <div className={`flex md:grid overflow-x-auto snap-x snap-mandatory md:overflow-visible hide-scrollbar gap-4 md:gap-8 mx-auto -mx-4 px-4 pb-4 md:mx-auto md:px-0 md:pb-0 ${photos.length === 1 ? 'md:max-w-[486px]' : photos.length === 2 ? 'md:grid-cols-2 md:max-w-[800px]' : 'md:grid-cols-3'}`}>
            {photos.length > 0 ? visiblePhotos.map((foto, idx) => (
              <div key={`${startIndex}-${idx}`} className="min-w-[80vw] max-w-[340px] md:max-w-none snap-center md:min-w-0 md:snap-none relative flex flex-col items-center justify-center bg-[#F8FAFD] rounded-[24px] md:rounded-[32px] p-2.5 md:p-3 hover:shadow-xl transition-all duration-300 group cursor-pointer w-full shrink-0 md:shrink h-[260px] sm:h-[340px] md:h-[486px]">
                <div className="w-full h-full rounded-[20px] md:rounded-[30px] overflow-hidden relative">
                  <img src={foto?.url} alt={foto?.judul} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 idle-animate" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent md:bg-black/20 md:group-hover:bg-black/40 transition-colors"></div>
                  <div className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="bg-[#F7921C] text-white text-[11px] md:text-[12px] font-bold px-2.5 py-0.5 md:px-3 md:py-1 rounded-full mb-1.5 md:mb-2 inline-block shadow-sm">{foto?.kategori}</span>
                    <h3 className="text-white font-bold text-[15px] md:text-[18px] leading-tight line-clamp-2">{foto?.judul}</h3>
                  </div>
                </div>
              </div>
            )) : (
              <div className="min-w-full md:col-span-full text-center text-gray-400 p-10">Belum ada dokumentasi tersedia.</div>
            )}
          </div>

          {/* Right Arrow - Hanya muncul jika lebih dari 3 foto */}
          {photos.length > 3 && (
            <button onClick={handleNext} className="absolute right-[-20px] top-1/2 -translate-y-1/2 z-20 w-[45px] h-[45px] rounded-full bg-[#F7921C] hover:bg-[#e08316] text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 hidden md:flex">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
