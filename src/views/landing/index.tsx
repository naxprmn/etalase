'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useJurnalFilter } from '@/features/jurnal-filter/lib/use-jurnal-filter'
import { JurnalList } from '@/widgets/jurnal-list/ui'
import { JurnalDetailModal } from '@/entities/jurnal/ui/jurnal-detail-modal.client'
import { CalendarSection } from '@/widgets/calendar/ui'
import { DokumentasiSection } from '@/widgets/dokumentasi/ui'
import { Footer } from '@/widgets/footer/ui'
import { StatsSection } from '@/widgets/stats-section/ui'
import { getCategoryLabel } from '@/shared/ui/colors'
import { loginAction } from '@/features/lawet-auth/api/login.action'
import {
  HeroLogoReveal,
  HeroTitleReveal,
  HeroSubtitleReveal,
} from './hero-text-reveal.client'

import { type LawetUser } from '@/entities/lawet-user'

const queryClient = new QueryClient()

const NAV_ITEMS: { label: string; target: string | null }[] = [
  { label: 'Beranda', target: null },
  { label: 'E-kalender', target: 'section-kalender' },
  { label: 'Jurnal', target: 'section-arsip' },
  { label: 'Dokumentasi', target: 'section-dokumentasi' },
]

const LandingView: React.FC<{ heroImagePath: string; heroTitle: string; heroSubtitle: string; user: LawetUser | null; recentPhotos?: any[] }> = ({ heroImagePath, heroTitle, heroSubtitle, user, recentPhotos }) => {
  const { q, kategori, tahun, date, setFilter, resetFilter } = useJurnalFilter()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [selectedJurnalId, setSelectedJurnalId] = useState<string | null>(null)
  const [isLoginOpen, setIsLoginOpen] = React.useState(false)
  const [isKategoriOpen, setIsKategoriOpen] = useState(false)
  const [isTahunOpen, setIsTahunOpen] = useState(false)
  const kategoriRef = useRef<HTMLDivElement>(null)
  const tahunRef = useRef<HTMLDivElement>(null)

  // Click outside listener for custom dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (kategoriRef.current && !kategoriRef.current.contains(event.target as Node)) setIsKategoriOpen(false)
      if (tahunRef.current && !tahunRef.current.contains(event.target as Node)) setIsTahunOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  const [showPin, setShowPin] = React.useState(false)
  const [showForgotPin, setShowForgotPin] = React.useState(false)

  // Opsi filter mengikuti data nyata: kategori dari Lawet Hub, tahun berjalan mundur ke 2024.
  const [kategoriOptions, setKategoriOptions] = useState<string[]>([])
  useEffect(() => {
    fetch('/api/jurnal/kategori')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data?.data)) setKategoriOptions(data.data) })
      .catch(() => setKategoriOptions([]))
  }, [])
  const currentYear = new Date().getFullYear()
  const tahunOptions = Array.from({ length: Math.max(currentYear - 2024 + 1, 1) }, (_, i) => String(currentYear - i))
  
  const [username, setUsername] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  useEffect(() => {
    const jId = searchParams.get('jurnalId');
    if (jId) setSelectedJurnalId(jId);
  }, [searchParams])
  const [pin, setPin] = useState(['', '', '', ''])
  const pinRefs = useRef<(HTMLInputElement | null)[]>([])
  
  const handlePinChange = async (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setLoginError(null);
    
    if (value && index < 3) {
      pinRefs.current[index + 1]?.focus();
    }
    
    if (index === 3 && value) {
       const fullPin = newPin.join('');
       setIsSubmitting(true);
       try {
         const res = await loginAction(username, fullPin);
         if (res.success) {
           router.push('/panel')
         } else {
           setLoginError(res.error || 'Login gagal')
           setPin(['', '', '', ''])
           pinRefs.current[0]?.focus()
         }
       } catch (err) {
         setLoginError('Terjadi kesalahan')
       } finally {
         setIsSubmitting(false)
       }
    }
  }

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  }

  const [scrollY, setScrollY] = useState(0)
  const [vhPx, setVhPx] = useState(800)

  const [hoveredNav, setHoveredNav] = useState<number | null>(null)
  const [hoverLine, setHoverLine] = useState<{ id: string; date: string } | null>(null)
  const listScrollRef = useRef<HTMLDivElement>(null)
  // Flag yang memblokir IntersectionObserver selama scroll programatik dari kalender
  const navigatingRef = useRef<boolean>(false)

  const [isSection3Visible, setIsSection3Visible] = useState(false)
  const section3Ref = useRef<HTMLElement>(null)

  const [isScrolled, setIsScrolled] = useState(false)
  const mainRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const scrollMarkerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Open login modal if URL has #login
    if (window.location.hash === '#login') {
      setIsLoginOpen(true);
      window.history.replaceState(null, '', ' '); // Clean up the hash
    }

    // Height calculation for parallax
    setVhPx(window.innerHeight)
    const onResize = () => setVhPx(window.innerHeight)
    window.addEventListener('resize', onResize)

    // Foolproof polling loop for scroll position
    const pollScroll = setInterval(() => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      setIsScrolled(currentScrollY > 150);
    }, 100);

    return () => {
      window.removeEventListener('resize', onResize);
      clearInterval(pollScroll);
    }
  }, [])

  useEffect(() => {
    const el = section3Ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsSection3Visible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleDateClick = (dateStr: string) => {
    setHoverLine(null)
    setActiveDate(dateStr)
    if (q || kategori) resetFilter()
    // Kunci observer agar tidak menimpa activeDate/activeId saat scroll berlangsung
    navigatingRef.current = true
    setTimeout(() => {
      const el = listScrollRef.current?.querySelector(`[data-tanggal="${dateStr}"]`)
      if (el) {
        // Set activeId langsung dari elemen yang ditemukan — jangan tunggu observer
        const cardId = el.id.replace('jurnal-card-', '')
        setActiveId(cardId)
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      // Lepas kunci setelah smooth scroll selesai (~1000ms)
      setTimeout(() => { navigatingRef.current = false }, 1000)
    }, 100)
  }

  const progress = Math.min(scrollY / (vhPx || 800), 1)
  const bannerTranslate = scrollY * 0.4
  const titleTranslateY = -scrollY * 0.6
  const subtitleOpacity = Math.max(1 - progress * 3, 0)
  const navProgress = Math.max(0, Math.min((progress - 0.7) / 0.3, 1))
  const navVisible = navProgress > 0

  return (
    <QueryClientProvider client={queryClient}>
      {/* Sticky Header — appears only on scroll */}
      <div className={`fixed top-0 left-0 w-full z-[100] pt-2 md:pt-4 pb-2 transition-all duration-500 ${isScrolled ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}>
        <div className="w-full max-w-[1429px] mx-auto px-3 md:px-10">
          <div className="bg-white/95 backdrop-blur-md shadow-md rounded-[28px] md:rounded-[44.5px] h-[54px] md:h-[89px] px-4 md:px-8 flex items-center justify-between" style={{ fontFamily: 'Poppins' }}>
            <div className="flex items-center">
              <img src="/assets/hero-logo-etalase.png" alt="ETALASE" className="h-[28px] md:h-[45px] object-contain" />
            </div>
            <div className="hidden lg:flex items-center gap-[60px]" onMouseLeave={() => setHoveredNav(null)}>
              {NAV_ITEMS.map((item, i) => {
                const isActive = i === 0
                const showIndicator = hoveredNav === null ? isActive : hoveredNav === i
                return (
                  <button
                    key={item.label}
                    onMouseEnter={() => setHoveredNav(i)}
                    onFocus={() => setHoveredNav(i)}
                    onBlur={() => setHoveredNav(null)}
                    onClick={() => item.target
                      ? document.getElementById(item.target)?.scrollIntoView({ behavior: 'smooth' })
                      : window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className={`relative text-[15px] transition-colors ${isActive ? 'text-[#142B42] font-semibold' : 'text-[#5D6A77] font-medium hover:text-[#F7921C]'}`}
                  >
                    {item.label}
                    <span
                      className={`absolute -bottom-1.5 left-0 w-full h-[2px] origin-center transition-transform duration-300 ${isActive ? 'bg-[#142B42]' : 'bg-[#F7921C]'} ${showIndicator ? 'scale-x-100' : 'scale-x-0'}`}
                    />
                  </button>
                )
              })}
            </div>
            <button 
              className="bg-[#F7921C] hover:bg-[#e08316] transition-colors text-white font-semibold text-xs md:text-[15px] px-4 md:px-0 w-auto md:w-[154px] h-[36px] md:h-[67px] rounded-full md:rounded-[34px] flex items-center justify-center gap-1.5 md:gap-2 cursor-pointer shadow-sm active:scale-95"
              onClick={() => user ? (window.location.href = '/panel') : setIsLoginOpen(true)}
            >
              {user ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                  Panel
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  Login
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* overflow-x:clip does NOT create a scroll container (unlike overflow-x:hidden) */}
      <div ref={mainRef} className="relative bg-[var(--color-canvas)] min-h-screen" style={{ overflowX: 'clip' }}>
        
        {/* The true scroll marker that moves with the content */}
        <div ref={scrollMarkerRef} className="w-full h-px pointer-events-none" />

        {/* NEW WHITE HERO SECTION */}
        <section className="relative w-full pt-[60px] pb-[40px]">
          
          <div className="relative z-25 w-full max-w-[1440px] mx-auto px-4 md:px-12 flex flex-col lg:flex-row items-center justify-between">
            
            {/* Top Right Bawaslu Logo */}
            <div className="absolute top-[-25px] md:top-[-38px] right-4 md:right-8 lg:right-12 z-50">
              <img src="/assets/bawaslu_hero_logo.png" alt="Bawaslu Kebumen" className="w-[85px] md:w-[110px] lg:w-[125px] object-contain drop-shadow-sm" />
            </div>

            {/* Left Content */}
              <div className="w-full lg:w-[50%] flex flex-col pt-4 lg:pt-12 z-20">
                <h2 className="text-[#394B5D] text-[20px] md:text-[24px] font-semibold mb-5" style={{ fontFamily: 'Poppins' }}>
                  Selamat Datang di
                </h2>
                
                <div className="flex items-center gap-5 md:gap-8 mb-6">
                  {/* Left: Giant Circular Icon */}
                  <img 
                    src="/assets/hero-logo-left.png" 
                    alt="ETALASE Icon" 
                    className="w-[120px] md:w-[155px] shrink-0 object-contain drop-shadow-lg" 
                  />
                  
                  {/* Right: Stack of ETALASE Text + Arsip Langkah */}
                  <div className="flex flex-col justify-center">
                    <img 
                      src="/assets/hero-logo-etalase.png" 
                      alt="ETALASE Text" 
                      className="w-[190px] md:w-[260px] mb-3 object-contain" 
                    />
                    <h1 className="text-[#2C3E50] text-[24px] md:text-[28px] leading-[1.3] font-medium tracking-tight" style={{ fontFamily: 'Poppins' }}>
                      Arsip Jurnal Bawaslu<br/>Kebumen
                    </h1>
                  </div>
                </div>

                <p className="text-[#5D6A77] text-[15px] md:text-[17px] leading-[1.75] max-w-[520px] mb-10 font-medium" style={{ fontFamily: 'Poppins' }}>
                  Temukan, jelajahi, dan akses informasi arsip, serta jurnal Bawaslu Kebumen dengan mudah dan terstruktur dalam satu platform
                </p>

                <div className="flex flex-row flex-nowrap gap-4 md:gap-5 w-full">
                  <button 
                    onClick={() => document.getElementById('section-kalender')?.scrollIntoView({ behavior: 'smooth' })}
                    className="bg-[#FCA035] text-white px-6 md:px-10 py-3.5 md:py-4 rounded-full font-semibold text-[15px] hover:bg-[#e68d27] transition-all hover:-translate-y-0.5 shadow-[0_8px_16px_rgba(252,160,53,0.3)] whitespace-nowrap"
                  >
                    Lihat Kalender
                  </button>
                  <button 
                    onClick={() => document.getElementById('section-arsip')?.scrollIntoView({ behavior: 'smooth' })}
                    className="bg-transparent text-[#FCA035] border-[2px] border-[#FCA035] px-6 md:px-10 py-3.5 md:py-4 rounded-full font-semibold text-[15px] hover:bg-[#FFF5EA] transition-colors whitespace-nowrap"
                  >
                    Jelajahi Kami
                  </button>
                </div>
              </div>

              {/* Right Content - The Calendars */}
              <div className="w-full lg:w-[50%] flex justify-center lg:justify-end mt-16 lg:mt-0 relative z-20">
                <div className="relative w-full max-w-[650px] aspect-[4/3] flex items-center justify-center">
                  
                  {/* Abstract Blue Glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[70%] bg-[#346BFF] opacity-[0.08] blur-[80px] pointer-events-none -z-10"></div>

                  {/* Layer 1: Background Floating Cards (kalender_header.png) */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-[62%] -translate-y-[45%] w-[110%] sm:w-[125%] z-0 pointer-events-none">
                    <img 
                      src="/assets/kalender_header.png" 
                      alt="Background decorative cards" 
                      className="w-full h-auto object-contain opacity-95"
                    />
                  </div>

                  {/* Layer 2: The Core Calendar UI (Flat Mac Window) */}
                  <div className="absolute top-1/2 right-[5%] -translate-y-[40%] w-[75%] sm:w-[80%] z-10 flex items-center justify-end drop-shadow-2xl">
                    <img 
                      src="/assets/kalender_asli_hd.png" 
                      alt="ETALASE Calendar Illustration" 
                      className="w-full h-auto object-contain cursor-pointer transition-transform hover:scale-[1.02]" 
                      onClick={() => {
                        document.getElementById('section-kalender')?.scrollIntoView({ behavior: 'smooth' })
                      }} 
                    />
                  </div>

                  {/* Layer 3: The Floating Event Card ("8 Sept 2026") */}
                  <div className="absolute bottom-[-8%] right-[-10%] sm:right-[-5%] lg:right-[-5%] z-20 pointer-events-none drop-shadow-xl hover:scale-105 transition-transform duration-300">
                    <img 
                      src="/assets/floating_event_card.png" 
                      alt="Event Card" 
                      className="w-[150px] md:w-[190px] lg:w-[210px] h-auto object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

        {/* SECTION 2 — STATS */}
        <StatsSection />

        {/* SECTION 2.5 - CALENDAR */}
        <div id="section-kalender" className="w-full pb-4 scroll-mt-16 md:scroll-mt-24">
          <CalendarSection onEventClick={(id) => setSelectedJurnalId(id)} />
        </div>

        {/* SECTION 3 - ARSIP JURNAL */}
        <section
          id="section-arsip"
          ref={section3Ref}
          className="relative w-full pb-4 scroll-mt-16 md:scroll-mt-24"
        >
          <div className="max-w-[1440px] mx-auto px-4 md:px-10 pt-4">
            
              {/* Figma-Matched Search Bar Container */}
              <div className="bg-white rounded-[18px] md:rounded-[20px] p-3 md:px-6 md:py-5 flex flex-col md:flex-row items-center justify-between mb-6 md:mb-8 max-w-[1282px] mx-auto gap-2.5 md:gap-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.03)]" style={{ fontFamily: 'Poppins' }}>
                
                {/* Search Input */}
                <div className="flex-none h-[48px] md:h-[62px] w-full md:w-[604px] flex items-center px-4 md:px-6 bg-[#F8FAFC] border border-[#737272]/50 rounded-[14px] md:rounded-[20px] transition-colors focus-within:border-[#F7921C]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2.5 md:mr-3 shrink-0"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <input 
                    type="text" 
                    placeholder="Cari artikel, topik, penulis..." 
                    className="w-full bg-transparent border-none outline-none text-[#142B42] text-[13px] md:text-[14px] placeholder-[#9CA3AF]"
                    value={q}
                    onChange={(e) => setFilter(e.target.value, kategori, tahun)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        document.getElementById('section-arsip')?.scrollIntoView({ behavior: 'smooth' })
                      }
                    }}
                  />
                </div>
                
                {/* Filters & Button Group */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 md:gap-[16px] flex-1 w-full md:w-auto">
                  
                  {/* Dropdowns side-by-side on mobile */}
                  <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                    {/* Kategori Dropdown */}
                    <div className="relative h-[44px] md:h-[62px] w-1/2 sm:w-full md:max-w-[230px] flex-1 bg-[#F8FAFC] border border-[#737272]/50 rounded-[14px] md:rounded-[20px] transition-colors hover:border-[#F7921C]/50" ref={kategoriRef}>
                      <div 
                        className="w-full h-full flex items-center justify-between px-3 md:px-6 cursor-pointer text-[#5D6A77] text-[12px] md:text-[14px] font-medium"
                        onClick={() => { setIsKategoriOpen(!isKategoriOpen); setIsTahunOpen(false); }}
                      >
                        <span className="truncate">{kategori ? getCategoryLabel(kategori) : "Semua Kategori"}</span>
                        <svg className={`w-4 h-4 md:w-5 md:h-5 text-[#9CA3AF] transition-transform duration-200 shrink-0 ${isKategoriOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                      
                      {isKategoriOpen && (
                        <div className="absolute top-[calc(100%+8px)] left-0 min-w-full w-max max-w-[90vw] bg-white border border-[#E2E8F0] rounded-[16px] shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="py-2">
                            {[
                              { label: "Semua Kategori", val: "" },
                              ...kategoriOptions.map((k) => ({ label: getCategoryLabel(k), val: k })),
                            ].map((opt) => (
                              <div 
                                key={opt.label}
                                className={`px-4 md:px-5 py-2.5 md:py-3 text-[13px] md:text-[14px] cursor-pointer transition-colors whitespace-nowrap ${kategori === opt.val ? 'bg-[#F7921C]/10 text-[#F7921C] font-bold' : 'text-[#475569] hover:bg-slate-50 font-medium'}`}
                                onClick={() => {
                                  setFilter(q, opt.val, tahun);
                                  setIsKategoriOpen(false);
                                }}
                              >
                                {opt.label}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
  
                    {/* Tahun Dropdown */}
                    <div className="relative h-[44px] md:h-[62px] w-1/2 sm:w-full md:max-w-[190px] flex-1 bg-[#F8FAFC] border border-[#737272]/50 rounded-[14px] md:rounded-[20px] transition-colors hover:border-[#F7921C]/50" ref={tahunRef}>
                      <div 
                        className="w-full h-full flex items-center justify-between px-3 md:px-6 cursor-pointer text-[#5D6A77] text-[12px] md:text-[14px] font-medium"
                        onClick={() => { setIsTahunOpen(!isTahunOpen); setIsKategoriOpen(false); }}
                      >
                        <span className="truncate">{tahun || "Semua Tahun"}</span>
                        <svg className={`w-4 h-4 md:w-5 md:h-5 text-[#9CA3AF] transition-transform duration-200 shrink-0 ${isTahunOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                      
                      {isTahunOpen && (
                        <div className="absolute top-[calc(100%+8px)] left-0 min-w-full w-max bg-white border border-[#E2E8F0] rounded-[16px] shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="py-2">
                            {[
                              { label: "Semua Tahun", val: "" },
                              ...tahunOptions.map((y) => ({ label: y, val: y })),
                            ].map((opt) => (
                              <div 
                                key={opt.label}
                                className={`px-4 md:px-5 py-2.5 md:py-3 text-[13px] md:text-[14px] cursor-pointer transition-colors whitespace-nowrap ${tahun === opt.val ? 'bg-[#F7921C]/10 text-[#F7921C] font-bold' : 'text-[#475569] hover:bg-slate-50 font-medium'}`}
                                onClick={() => {
                                  setFilter(q, kategori, opt.val);
                                  setIsTahunOpen(false);
                                }}
                              >
                                {opt.label}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
  
                  {/* Search Button */}
                  <button 
                    onClick={() => document.getElementById('section-arsip')?.scrollIntoView({ behavior: 'smooth' })}
                    className="h-[44px] md:h-[62px] w-full sm:w-auto md:w-[140px] px-6 flex-none bg-[#F7921C] rounded-[14px] md:rounded-[20px] flex items-center justify-center gap-2 text-white text-[13px] md:text-[15px] font-bold hover:bg-[#e08419] transition-all active:scale-95"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    Cari
                  </button>
                </div>
              </div>

            {/* Mobile swipe hint */}
            <div className="md:hidden flex items-center justify-between px-2 mb-3 text-xs text-[#7B8EA0] font-medium">
              <span>Arsip Jurnal Terbit</span>
              <span className="flex items-center gap-1 text-[#F7921C] font-semibold">Geser ke samping &rarr;</span>
            </div>

            {date && (
              <div className="max-w-[1282px] mx-auto mb-4 flex items-center gap-2 text-[13px] text-[#142B42]" style={{ fontFamily: 'Poppins' }}>
                <span>Menampilkan kegiatan tanggal</span>
                <button
                  type="button"
                  onClick={() => setFilter(q, kategori, tahun)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#F7921C]/10 px-3 py-1 font-semibold text-[#F7921C] hover:bg-[#F7921C]/20"
                  aria-label="Hapus filter tanggal"
                >
                  {new Date(date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  <span aria-hidden>✕</span>
                </button>
              </div>
            )}

            {/* Jurnal Grid List */}
            <JurnalList
              q={q}
              kategori={kategori}
              tahun={tahun}
              date={date}
              activeId={activeId}
              setActiveId={setActiveId}
              onActiveDateChange={setActiveDate}
              onCardClick={(id) => {
                setSelectedJurnalId(id)
              }}
            />

          </div>
        </section>

        {/* SECTION 4 - DOKUMENTASI KEGIATAN */}
        <div id="section-dokumentasi" className="scroll-mt-16 md:scroll-mt-24">
          <DokumentasiSection photos={recentPhotos || []} onPhotoClick={(id) => setSelectedJurnalId(id)} />
        </div>

        {/* FOOTER */}
        <Footer />

        <JurnalDetailModal
          id={selectedJurnalId}
          isOpen={!!selectedJurnalId}
          onClose={() => setSelectedJurnalId(null)}
          isLoggedIn={!!user}
        />
      </div>

      {/* Login Modal Overlay */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-[110] flex justify-center p-4 bg-black/60 overflow-y-auto items-center md:py-10" onClick={() => setIsLoginOpen(false)}>
          <div 
            className="relative w-full max-w-[420px] md:max-w-[1306px] min-h-[auto] max-h-[90vh] bg-white rounded-[28px] md:rounded-[64px] flex overflow-hidden shadow-2xl mx-auto flex-col md:flex-row" 
            onClick={(e) => e.stopPropagation()} 
            style={{ fontFamily: 'Poppins' }}
          >
            <button 
              className="absolute top-4 right-4 md:top-8 md:right-8 text-gray-400 hover:text-gray-700 transition z-10"
              aria-label="Tutup"
              onClick={() => setIsLoginOpen(false)}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <div className="hidden md:flex md:w-1/2 items-center justify-center p-8 bg-white">
              <img src="/assets/login-illustration.png" alt="Login Illustration" className="w-full max-w-[500px] object-contain" />
            </div>
            <div className="w-full md:w-1/2 flex flex-col justify-center px-6 sm:px-10 lg:px-24 py-8 md:py-12 relative bg-white overflow-y-auto">
              <div className="flex justify-center mb-5 md:mb-10">
                <img src="/assets/login-logo.png" alt="ETALASE" className="h-[64px] md:h-[120px] object-contain" />
              </div>
              <h2 className="text-[24px] md:text-[40px] font-medium text-[#142B42] mb-2 text-center">
                Log in to your account
              </h2>
              <p className="text-[14px] md:text-[18px] text-[#7B8EA0] font-medium mb-6 md:mb-12 text-center">
                welcome back! Please enter your detail
              </p>
              <div className="max-w-[520px] w-full mx-auto">
                <div className="mb-5 md:mb-8">
                  <label className="block text-[14px] md:text-[16px] text-[#142B42] font-medium mb-2 md:mb-3 ml-2">Username</label>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username" 
                    autoComplete="username"
                    className="w-full h-[50px] md:h-[60px] bg-[#F2F5FF] rounded-[14px] md:rounded-[16px] px-5 md:px-6 text-[16px] text-[#142B42] font-medium outline-none border-2 border-transparent focus:border-[#4F83F5] transition-colors placeholder:text-[#142B42]/50" 
                  />
                </div>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2 md:mb-3 px-2">
                      <label className="text-[14px] md:text-[16px] text-[#142B42] font-medium">PIN</label>
                      <button 
                        onClick={() => setShowPin(!showPin)}
                        className="text-[#7B8EA0] hover:text-[#142B42] transition-colors"
                      >
                        {showPin ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        )}
                      </button>
                    </div>
                    <div className="flex justify-center gap-3 sm:gap-6">
                      {[0, 1, 2, 3].map((index) => (
                        <input 
                          key={index} 
                          ref={(el) => { pinRefs.current[index] = el }}
                          type={showPin ? "text" : "password"}
                          maxLength={1} 
                          inputMode="numeric"
                          value={pin[index]}
                          onChange={(e) => handlePinChange(index, e.target.value)}
                          onKeyDown={(e) => handlePinKeyDown(index, e)}
                          className="flex-1 min-w-0 aspect-square max-w-[64px] md:max-w-[100px] max-h-[100px] bg-[#F2F5FF] rounded-[14px] md:rounded-[16px] text-center text-[28px] md:text-[40px] font-bold text-[#142B42] outline-none border-2 border-transparent focus:border-[#4F83F5] transition-colors [&::-ms-reveal]:hidden [&::-ms-clear]:hidden" 
                        />
                      ))}
                    </div>
                  </div>
                    {loginError && (
                      <div className="mt-4 text-center text-red-500 font-medium text-sm">
                        {loginError}
                      </div>
                    )}
                    <div className="flex flex-col items-end mt-4 md:mb-8 gap-2">
                      <button
                        type="button"
                        onClick={() => setShowForgotPin(v => !v)}
                        className="text-[#F14141] font-medium text-[14px] hover:underline"
                        aria-expanded={showForgotPin}
                      >
                        lupa PIN
                      </button>
                      {showForgotPin && (
                        <p className="w-full rounded-[12px] bg-[#FFF5EA] px-4 py-3 text-[13px] text-[#7A4A12]">
                          Akun dan PIN dikelola di Lawet Hub. Hubungi Superadmin Lawet Hub untuk mengatur ulang PIN Anda.
                        </p>
                      )}
                    </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </QueryClientProvider>
  )
}

export default LandingView




