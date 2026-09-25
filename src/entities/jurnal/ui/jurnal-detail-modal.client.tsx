'use client'



import React, { useEffect } from 'react'

import { useQuery } from '@tanstack/react-query'



interface JurnalDetailModalProps {

  id: string | null

  isOpen: boolean

  onClose: () => void

}



export const JurnalDetailModal: React.FC<JurnalDetailModalProps> = ({

  id,

  isOpen,

  onClose

}) => {
  const [zoomedImage, setZoomedImage] = React.useState<string | null>(null);
  const [zoomedIndex, setZoomedIndex] = React.useState<number>(0);
  const [slideDir, setSlideDir] = React.useState<'left' | 'right'>('right');

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!zoomedImage) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomedImage(null);
      if (e.key === 'ArrowRight') {
        const docs = (document.querySelector('[data-docs-count]') as any)?.dataset?.docsCount;
        const total = docs ? parseInt(docs) : 0;
        if (total > 1) {
          setSlideDir('right');
          setZoomedIndex(prev => {
            const newIdx = (prev + 1) % total;
            const imgs = document.querySelectorAll('[data-doc-url]');
            const newUrl = (imgs[newIdx] as HTMLImageElement)?.src;
            if (newUrl) setZoomedImage(newUrl);
            return newIdx;
          });
        }
      }
      if (e.key === 'ArrowLeft') {
        const docs = (document.querySelector('[data-docs-count]') as any)?.dataset?.docsCount;
        const total = docs ? parseInt(docs) : 0;
        if (total > 1) {
          setSlideDir('left');
          setZoomedIndex(prev => {
            const newIdx = (prev - 1 + total) % total;
            const imgs = document.querySelectorAll('[data-doc-url]');
            const newUrl = (imgs[newIdx] as HTMLImageElement)?.src;
            if (newUrl) setZoomedImage(newUrl);
            return newIdx;
          });
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [zoomedImage]);



  const { data: response, isLoading } = useQuery({

    queryKey: ['jurnal', id],

    queryFn: async () => {

      if (!id) return null

      const res = await fetch(`/api/jurnal/${id}`)

      if (!res.ok) throw new Error('Network error')

      return res.json()

    },

    enabled: !!id && isOpen,

  })



  const item = response?.data



  useEffect(() => {

    if (isOpen) {

      document.body.style.overflow = 'hidden'

    } else {

      document.body.style.overflow = ''

    }

    return () => {

      document.body.style.overflow = ''

    }

  }, [isOpen])



  if (!isOpen) return null



  return (

    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm" style={{ fontFamily: 'Poppins' }}>

      <div 

        className="absolute inset-0"

        onClick={onClose}

      ></div>



      <div className="relative w-full max-w-[760px] max-h-[90vh] min-h-[400px] bg-[#F1F6FC] rounded-[24px] shadow-2xl overflow-y-auto overflow-x-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">

        

        {/* Close Button */}

        <button 

          onClick={onClose}

          className="absolute top-6 right-6 z-10 text-[#9CA3AF] hover:text-[#142B42] transition-colors p-2 bg-white rounded-full shadow-sm hover:shadow-md"

        >

          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>

        </button>



        {isLoading || !item ? (

          <div className="flex-1 flex items-center justify-center p-12 text-[#142B42] font-medium">

            Memuat data jurnal...

          </div>

        ) : (

          <div className="p-8 sm:p-10 pb-8">

            

            {/* Header */}

            <div className="mb-6 relative">

              <div className="inline-block bg-[#F7921C] text-white px-6 py-1.5 rounded-full font-bold text-[13px] mb-6 shadow-sm capitalize">

                {item.kategori || 'Tanpa Kategori'}

              </div>

              

              <h2 className="text-[#142B42] text-[22px] sm:text-[24px] font-bold leading-[1.4] mb-5 pr-12">

                {item.judul}

              </h2>



              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 text-[14px] text-[#71717A] font-medium">

                <div className="flex items-center gap-2.5">

                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>

                  <span>{item.tanggal_kegiatan}</span>

                </div>

                {item.tags && item.tags.length > 0 && (

                  <div className="flex items-center gap-2.5">

                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>

                    <span>{item.tags.map((t: any) => t.nama || t).join(', ')}</span>

                  </div>

                )}

              </div>

            </div>



                        {/* Deskripsi / Redaksi (Ringkasan) */}
            {item.ringkasan && (
              <div className="text-[14px] text-[#475569] leading-[1.8] text-justify mt-8 mb-6 font-semibold">
                {item.ringkasan}
              </div>
            )}

            <hr className="border-[#E2E8F0] mb-8 -mx-10" />



            {/* Dokumentasi */}

            {item.dokumentasi && item.dokumentasi.length > 0 && (

              <div className="mb-10">

                <div className="flex items-center gap-3 mb-5 text-[#64748B] font-bold text-[15px]">

                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>

                  Dokumentasi

                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4" data-docs-count={item.dokumentasi.length}>

                  {item.dokumentasi.map((doc: any, i: number) => (

                    <img key={i} data-doc-url={doc.url} src={doc.url} alt={`Dokumentasi ${i+1}`} className="w-full h-[90px] object-cover rounded-[16px] cursor-pointer hover:scale-105 transition-transform shadow-sm" onClick={(e) => { e.stopPropagation(); setSlideDir('right'); setZoomedIndex(i); setZoomedImage(doc.url); }} />

                  ))}

                </div>

              </div>

            )}





            {/* Pihak Terkait */}

            {item.pihak_terkait && item.pihak_terkait.length > 0 && (

              <div className="mb-10">

                <div className="flex items-center gap-3 mb-5 text-[#64748B] font-bold text-[15px]">

                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>

                  Pihak Terkait

                </div>

                <div className="flex items-center justify-center gap-4 flex-wrap mb-4">

                  {item.pihak_terkait.map((pihak: any, i: number) => {

                    const nama = pihak.nama || pihak;

                    const initial = typeof nama === 'string' ? nama.substring(0, 2).toUpperCase() : 'PT';

                    const colors = [

                      { bg: '#F7921C', light: 'bg-[#F7921C]/10', text: 'text-[#F7921C]' },

                      { bg: '#507CF1', light: 'bg-[#507CF1]/10', text: 'text-[#507CF1]' },

                      { bg: '#22C55E', light: 'bg-[#22C55E]/10', text: 'text-[#22C55E]' }

                    ];

                    const color = colors[i % colors.length];

                    return (

                      <div key={i} className={`flex items-center pr-6 ${color.light} rounded-full`}>

                        <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-white/90 to-white/10 p-[6px] flex items-center justify-center shrink-0">

                          <div className={`w-full h-full rounded-full bg-[${color.bg}] text-white flex items-center justify-center font-bold text-[13px]`} style={{ backgroundColor: color.bg }}>{initial}</div>

                        </div>

                        <span className={`ml-3 ${color.text} font-bold text-[15px]`}>{nama}</span>

                      </div>

                    )

                  })}

                </div>

              </div>

            )}



            {/* Publikasi Berita */}

            {typeof item.link_publikasi === 'string' && item.link_publikasi.trim() !== '' && (

              <div className="mb-8 flex flex-col gap-3">

                <a href={item.link_publikasi} target="_blank" rel="noreferrer" className="flex items-center justify-between p-5 border border-[#CBD5E1] rounded-[16px] bg-transparent hover:bg-black/5 transition-colors cursor-pointer group">

                  <div className="flex items-start gap-4">

                    <div className="mt-0.5">

                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 6h8v4h-8V6Z"></path></svg>

                    </div>

                    <div>

                      <div className="text-[#334155] font-bold text-[15px] mb-1 group-hover:text-[#507CF1] transition-colors">Publikasi Berita</div>

                      <div className="text-[#64748B] text-[13px] font-medium break-all max-w-[400px]">{item.link_publikasi.replace(/^https?:\/\//, '')}</div>

                    </div>

                  </div>

                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:text-[#F7921C] transition-colors"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>

                </a>

              </div>

            )}



            <div className="text-[12px] text-[#94A3B8] font-medium pt-2">

              Dibuat oleh {item.redaksi || 'Admin'} • {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit' })}

            </div>



          </div>

        )}

      </div>

      {/* LIGHTBOX */}
      {zoomedImage && item?.dokumentasi && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setZoomedImage(null)}
        >
          <style>{`
            @keyframes slideFromRight {
              from { opacity: 0; transform: translateX(60px) scale(0.96); }
              to   { opacity: 1; transform: translateX(0)     scale(1); }
            }
            @keyframes slideFromLeft {
              from { opacity: 0; transform: translateX(-60px) scale(0.96); }
              to   { opacity: 1; transform: translateX(0)      scale(1); }
            }
            .lightbox-slide-right { animation: slideFromRight 0.3s cubic-bezier(0.25,0.46,0.45,0.94) both; }
            .lightbox-slide-left  { animation: slideFromLeft  0.3s cubic-bezier(0.25,0.46,0.45,0.94) both; }
          `}</style>

          {/* Close button */}
          <button
            className="absolute top-5 right-5 z-10 text-white/70 hover:text-white p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"
            onClick={() => setZoomedImage(null)}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          {/* Counter */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/60 text-[14px] font-semibold bg-black/40 px-4 py-1 rounded-full">
            {zoomedIndex + 1} / {item.dokumentasi.length}
          </div>

          {/* Prev button */}
          {item.dokumentasi.length > 1 && (
            <button
              className="absolute left-4 text-white/70 hover:text-white p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all hover:scale-110 active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                setSlideDir('left');
                const newIdx = (zoomedIndex - 1 + item.dokumentasi.length) % item.dokumentasi.length;
                setZoomedIndex(newIdx);
                setZoomedImage(item.dokumentasi[newIdx].url);
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          )}

          {/* Image — key triggers remount → fresh animation each time */}
          <img
            key={`${zoomedIndex}-${slideDir}`}
            src={zoomedImage}
            alt="Preview"
            className={`max-w-[90vw] max-h-[85vh] object-contain rounded-[12px] shadow-2xl ${slideDir === 'right' ? 'lightbox-slide-right' : 'lightbox-slide-left'}`}
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next button */}
          {item.dokumentasi.length > 1 && (
            <button
              className="absolute right-4 text-white/70 hover:text-white p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all hover:scale-110 active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                setSlideDir('right');
                const newIdx = (zoomedIndex + 1) % item.dokumentasi.length;
                setZoomedIndex(newIdx);
                setZoomedImage(item.dokumentasi[newIdx].url);
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          )}

          {/* Dot indicators */}
          {item.dokumentasi.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {item.dokumentasi.map((_: any, i: number) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSlideDir(i > zoomedIndex ? 'right' : 'left');
                    setZoomedIndex(i);
                    setZoomedImage(item.dokumentasi[i].url);
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${i === zoomedIndex ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/70'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

    </div>


  )

}









