'use client'

import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart, BarChartItem } from './bar-chart'
import { TrendChart } from './trend-chart'
import { KpiMetricStrip } from './kpi-metric-strip'
import { ActivityPanel } from './activity-panel'
import {
  MonthlyTrendItem,
  ActivityHighlight,
  KpiSummary,
} from '@/entities/jurnal/api/get-jurnal-stats'
import { getCategoryLabel } from '@/shared/ui/colors'
import { TrendingUp, PieChart, Layers } from 'lucide-react'
import { StatsModal } from './StatsModal.client'

interface StatsData {
  years: number[]
  year: number
  stats: Record<string, number>
  monthly_trend?: MonthlyTrendItem[]
  division_stats?: Record<string, number>
  kpi_summary?: KpiSummary
  recent_highlights?: ActivityHighlight[]
}

type ChartMode = 'trend' | 'kategori' | 'divisi'

interface ActiveFilter {
  type: 'kategori' | 'bulan' | 'divisi'
  value: string | number
  label: string
  count?: number
}

const StatsSectionInner: React.FC = () => {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeCard, setActiveCard] = useState<'overview' | 'kategori' | 'mitra' | 'berita'>('overview')
  const [data, setData] = useState<StatsData | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSectionVisible, setIsSectionVisible] = useState(false)
  const [chartMode, setChartMode] = useState<ChartMode>('trend')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter | null>(null)
  const sectionRef = useRef<HTMLElement>(null)

  const fetchStats = useCallback(async (year?: number) => {
    setLoading(true)
    try {
      const url = year ? `/api/jurnal/stats?year=${year}` : '/api/jurnal/stats'
      const res = await fetch(url)
      const json = await res.json()
      if (json.status === 'ok') {
        setData(json)
        setSelectedYear(json.year)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsSectionVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleYearClick = (year: number) => {
    setSelectedYear(year)
    setActiveFilter(null)
    fetchStats(year)
  }

  // 1. Kategori Data
  const categoriesList = useMemo(() => {
    const defaultCats = ['mou', 'audiensi', 'pelaporan', 'sengketa']
    const dbCats = data?.stats ? Object.keys(data.stats) : []
    const combined = Array.from(new Set([...defaultCats, ...dbCats.map(c => c.toLowerCase())]))
    const listWithoutLainnya = combined.filter(c => c !== 'lainnya')
    return [...listWithoutLainnya, 'lainnya']
  }, [data?.stats])

  const categoryChartData = useMemo<BarChartItem[]>(() => {
    return categoriesList
      .map(k => ({
        kategori: k,
        label: getCategoryLabel(k),
        total: data?.stats?.[k] ?? 0,
      }))
      .filter(d => d.total > 0 || (data?.stats && Object.keys(data.stats).length > 0))
  }, [categoriesList, data?.stats])

  // 2. Divisi Data
  const divisionChartData = useMemo<BarChartItem[]>(() => {
    if (!data?.division_stats) return []
    return Object.entries(data.division_stats).map(([div, total]) => ({
      kategori: div,
      label: div,
      total,
    }))
  }, [data?.division_stats])

  // 3. Tren Bulanan Data
  const monthlyTrendData = useMemo<MonthlyTrendItem[]>(() => {
    if (data?.monthly_trend && data.monthly_trend.length > 0) {
      return data.monthly_trend
    }
    return Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total: 0 }))
  }, [data?.monthly_trend])

  const totalKegiatan = useMemo(() => {
    if (data?.kpi_summary?.total_kegiatan !== undefined) {
      return data.kpi_summary.total_kegiatan
    }
    return categoryChartData.reduce((acc, d) => acc + d.total, 0)
  }, [data?.kpi_summary, categoryChartData])

  // Filtered highlights for the activity panel
  const displayedHighlights = useMemo(() => {
    const all = data?.recent_highlights ?? []
    if (!activeFilter) return all

    if (activeFilter.type === 'kategori') {
      return all.filter(h => h.kategori.toLowerCase() === String(activeFilter.value).toLowerCase())
    }
    if (activeFilter.type === 'bulan') {
      return all.filter(h => {
        const parts = h.tanggal_kegiatan.split('-')
        return parts.length === 3 && parseInt(parts[1], 10) === activeFilter.value
      })
    }
    return all
  }, [data?.recent_highlights, activeFilter])

  // Handlers for interactions
  const handleBarClick = (item: BarChartItem) => {
    if (chartMode === 'kategori') {
      setActiveFilter({
        type: 'kategori',
        value: item.kategori,
        label: item.label || getCategoryLabel(item.kategori),
        count: item.total,
      })
    } else if (chartMode === 'divisi') {
      setActiveFilter({
        type: 'divisi',
        value: item.kategori,
        label: item.label || item.kategori,
        count: item.total,
      })
    }
  }

  const handleMonthClick = (month: number) => {
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]
    const item = monthlyTrendData.find(m => m.month === month)
    setActiveFilter({
      type: 'bulan',
      value: month,
      label: `${monthNames[month - 1]} ${selectedYear ?? ''}`,
      count: item?.total ?? 0,
    })
  }

  const handleSelectActivity = (item: ActivityHighlight) => {
    // Navigate straight to archive with search query for this activity title
    const params = new URLSearchParams()
    params.set('q', item.judul)
    router.replace(`/?${params.toString()}`, { scroll: false })
    document.getElementById('section-arsip')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleViewArchiveWithFilter = (filter: ActiveFilter | null) => {
    const params = new URLSearchParams()
    if (filter) {
      if (filter.type === 'kategori') {
        params.set('kategori', String(filter.value))
      } else if (filter.type === 'bulan') {
        const mm = String(filter.value).padStart(2, '0')
        params.set('date', `${selectedYear ?? 2026}-${mm}`)
      } else if (filter.type === 'divisi') {
        params.set('q', String(filter.value))
      }
    }
    const queryStr = params.toString()
    router.replace(queryStr ? `/?${queryStr}` : '/', { scroll: false })
    document.getElementById('section-arsip')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleKpiFilterCategory = (cat: string) => {
    const params = new URLSearchParams()
    params.set('kategori', cat)
    router.replace(`/?${params.toString()}`, { scroll: false })
    document.getElementById('section-arsip')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleViewAll = () => {
    router.replace('/', { scroll: false })
    document.getElementById('section-arsip')?.scrollIntoView({ behavior: 'smooth' })
  }
  return (
    <section
      id="section-stats"
      ref={sectionRef}
      className="relative w-full pt-12 pb-8"
      style={{ fontFamily: 'Poppins' }}
    >
      <div className="max-w-[1440px] mx-auto px-4 md:px-10">

        {/* Title Area */}
        <div className="mb-6 flex flex-col items-start text-left">
          <div className="flex items-center gap-2.5 mb-[2px]">
            <div className="w-[4px] h-[26px] bg-[#F7921C] rounded-[2px]"></div>
            <h2 className="text-[#142B42] text-[24px] font-bold tracking-tight leading-none">
              Rekapitulasi Kegiatan
            </h2>
          </div>
          <p className="text-[#5D6A77] text-[15px] ml-[14px]">
            Ringkasan aktivitas dan informasi terkini
          </p>
        </div>

        {/* 4 KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          
          {/* Card 1 */}
          <div 
            onClick={() => { setActiveCard('overview'); setIsModalOpen(true); }}
            className="w-full bg-white rounded-[20px] p-6 flex flex-col justify-between cursor-pointer border border-[#E2E8F0] shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all"
          >
            <div className="flex items-center gap-3 mb-6">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#142B42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><path d="M8 21h8"/><path d="M12 17v4"/><path d="M6 10h2l2-3 3 6 2-3h3"/></svg>
              <span className="text-[#142B42] text-[15px] font-bold">Total Kegiatan</span>
            </div>
            <div>
              <div className="text-[#142B42] text-[28px] font-bold mb-1 leading-none">{data?.kpi_summary?.total_kegiatan ?? 0}</div>
              <div className="flex items-center justify-between">
                <span className="text-[#5D6A77] text-[13px]">Tahun {selectedYear || new Date().getFullYear()}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#142B42" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"></path></svg>
              </div>
            </div>
          </div>

          {/* Card 2 */}
              <div onClick={() => { setActiveCard('kategori'); setIsModalOpen(true); }} className="w-full bg-white border border-[#F7921C]/40 rounded-[20px] p-6 flex flex-col justify-between cursor-pointer hover:-translate-y-1 transition-all shadow-[0_4px_20px_rgba(247,146,28,0.08)] hover:shadow-[0_8px_30px_rgba(247,146,28,0.15)]">
            <div className="flex items-center gap-3 mb-6">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#142B42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
              <span className="text-[#142B42] text-[15px] font-bold">Kategori Terbanyak</span>
            </div>
            <div>
              <div className="text-[#142B42] text-[24px] font-bold mb-1 leading-tight line-clamp-2">{data?.kpi_summary?.top_category?.kategori ? getCategoryLabel(data.kpi_summary.top_category.kategori) : '-'}</div>
              <div className="flex items-center justify-between">
                <span className="text-[#5D6A77] text-[13px]">{data?.kpi_summary?.top_category ? `${data.kpi_summary.top_category.total} kegiatan` : 'Belum ada kegiatan'}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F7921C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"></path></svg>
              </div>
            </div>
          </div>

          {/* Card 3 */}
              <div onClick={() => { setActiveCard('mitra'); setIsModalOpen(true); }} className="w-full bg-white border border-[#E2E8F0] rounded-[20px] p-6 flex flex-col justify-between cursor-pointer hover:-translate-y-1 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-3 mb-6">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#142B42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span className="text-[#142B42] text-[15px] font-bold">Mitra Kolaborasi</span>
            </div>
            <div>
              <div className="text-[#142B42] text-[28px] font-bold mb-1 leading-none">{data?.kpi_summary?.total_mitra ?? 0}</div>
              <div className="flex items-center justify-between">
                <span className="text-[#5D6A77] text-[13px]">Instansi</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#142B42" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"></path></svg>
              </div>
            </div>
          </div>

          {/* Card 4 */}
              <div onClick={() => { setActiveCard('berita'); setIsModalOpen(true); }} className="w-full bg-white border border-[#F7921C]/40 rounded-[20px] p-6 flex flex-col justify-between cursor-pointer hover:-translate-y-1 transition-all shadow-[0_4px_20px_rgba(247,146,28,0.08)] hover:shadow-[0_8px_30px_rgba(247,146,28,0.15)]">
            <div className="flex items-center gap-3 mb-6">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#142B42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><circle cx="10" cy="13" r="2"/><line x1="11.5" y1="14.5" x2="14" y2="17"/></svg>
              <span className="text-[#142B42] text-[15px] font-bold">Terekspos Berita</span>
            </div>
            <div>
              <div className="text-[#142B42] text-[28px] font-bold mb-1 leading-none">{data?.kpi_summary?.published_media_count ?? 0}</div>
              <div className="flex items-center justify-between">
                <span className="text-[#5D6A77] text-[13px]">Kegiatan</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F7921C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"></path></svg>
              </div>
            </div>
          </div>

        </div>
      </div>
      <StatsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={data} activeCard={activeCard} />
    </section>
  )
}

export const StatsSection = memo(StatsSectionInner)

