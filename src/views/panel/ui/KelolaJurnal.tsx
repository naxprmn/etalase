"use client"
import React, { useState, useMemo } from 'react';
import type { JurnalWorkspace } from '@/features/jurnal-saya/api/get-my-jurnals.action';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from 'recharts';
import { Search, Eye, Edit2, Trash2, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { deleteJurnalAction } from '@/features/jurnal-saya/api/delete.action';
import { JurnalDetailModal } from '@/entities/jurnal/ui/jurnal-detail-modal.client';

const COLORS = ['#4ade80', '#fb923c', '#f87171', '#60a5fa', '#a78bfa'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

export default function KelolaJurnal({ workspace, error }: { workspace: JurnalWorkspace | null, error: string | null }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'Semua'|'Draft'|'Terbit'>('Semua');
  const [chartYear, setChartYear] = useState<number>(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [deletePopup, setDeletePopup] = useState<string | null>(null);
  const [detailPopup, setDetailPopup] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const generateCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };
  const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const [toast, setToast] = useState<{message: string, type: 'info'|'success'|'error'} | null>(null);
  const showToast = (message: string, type: 'info'|'success'|'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  const itemsPerPage = 5;

  const allItems = useMemo(() => {
    return workspace ? [...workspace.mine, ...workspace.subordinates] : [];
  }, [workspace]);
  
  const total = allItems.length;
  const published = allItems.filter(i => i.status === 'published').length;
  const draft = allItems.filter(i => i.status === 'draft').length;
  const pending = allItems.filter(i => i.status === 'publish_pending').length;

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    allItems.forEach(item => {
      if (item.tanggal_kegiatan) {
        const d = new Date(item.tanggal_kegiatan);
        if (!isNaN(d.getTime())) years.add(d.getFullYear());
      }
    });
    if (years.size === 0) years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [allItems]);

  const barData = useMemo(() => {
    const counts = new Array(12).fill(0);
    allItems.forEach(item => {
      if (item.tanggal_kegiatan) {
        const date = new Date(item.tanggal_kegiatan);
        if (!isNaN(date.getTime()) && date.getFullYear() === chartYear) {
          counts[date.getMonth()] += 1;
        }
      }
    });
    return counts.map((count, i) => ({ name: i.toString(), value: count }));
  }, [allItems, chartYear]);
  
  const pieStatusData = useMemo(() => {
    return [
      { name: 'Terbit', value: published },
      { name: 'Menunggu', value: pending },
      { name: 'Draft', value: draft }
    ];
  }, [published, pending, draft]);

  const kategoriData = useMemo(() => {
    const counts: Record<string, number> = {};
    allItems.forEach(item => {
      const cat = item.kategori || 'Lainnya';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    
    const result = Object.entries(counts).map(([name, value]) => ({ name, value }));
    if (result.length === 0) {
      return [{name: 'Belum ada data', value: 1}];
    }
    return result;
  }, [allItems]);

  const pieStaffData = useMemo(() => {
    const counts: Record<string, number> = {};
    allItems.forEach(item => {
      const name = item.owner_name || 'Tanpa Nama';
      if (name.toLowerCase().includes('kasubag')) return;
      counts[name] = (counts[name] || 0) + 1;
    });
    const STAFF_COLORS = ['#6366F1', '#F87171', '#FBBF24', '#38BDF8', '#A78BFA', '#34D399'];
    return Object.entries(counts).map(([name, value], index) => ({
      name,
      value,
      color: STAFF_COLORS[index % STAFF_COLORS.length]
    }));
  }, [allItems]);

  // Filtering Logic
  const filteredItems = useMemo(() => {
    let items = allItems;
    if (activeTab === 'Draft') {
       items = items.filter(i => i.status === 'draft' || i.status === 'publish_pending');
    } else if (activeTab === 'Terbit') {
       items = items.filter(i => i.status === 'published');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => i.judul.toLowerCase().includes(q) || (i.kategori && i.kategori.toLowerCase().includes(q)));
    }

    if (selectedDate) {
      items = items.filter(i => i.tanggal_kegiatan && i.tanggal_kegiatan.startsWith(selectedDate));
    }

    return items;
  }, [allItems, activeTab, searchQuery, selectedDate]);

  if (error) {
    return <div className="p-10 text-red-500">{error}</div>;
  }
  if (!workspace) {
    return <div className="p-10 text-gray-500">Memuat data...</div>;
  }


  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const currentItems = filteredItems.slice((validCurrentPage - 1) * itemsPerPage, validCurrentPage * itemsPerPage);

  const startItemIdx = (validCurrentPage - 1) * itemsPerPage + 1;
  const endItemIdx = Math.min(validCurrentPage * itemsPerPage, filteredItems.length);

  return (
    <div className="flex-1 min-w-0 p-6 md:p-10 flex flex-col w-full">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-semibold transition-all animate-fade-in
          ${toast.type === 'error' ? 'bg-red-500' : toast.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}>
          {toast.type === 'error' ? <AlertTriangle size={18} /> : toast.type === 'success' ? <CheckCircle2 size={18} /> : <Eye size={18} />} {toast.message}
        </div>
      )}
      {/* Dashboard Top Section */}
      <div className="flex flex-col md:flex-row gap-6 mb-6">
        {/* Left: 4 Metric Cards (2x2) */}
        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-[17px] border border-[#0F3E79] p-5 shadow-sm h-[160px] flex flex-col justify-between">
            <div>
              <h4 className="text-[#142B42] text-[13px] font-bold mb-4 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#142B42]"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                Total Jurnal
              </h4>
              <p className="text-[32px] font-bold text-[#142B42] leading-none mb-1">{total}</p>
            </div>
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-medium text-[#7B8EA0]">Bulan September 2026</span>
              <ChevronRight size={14} className="text-[#142B42]" />
            </div>
          </div>
          
          <div className="bg-white rounded-[17px] border border-[#FDE68A] p-5 shadow-sm h-[160px] flex flex-col justify-between">
            <div>
              <h4 className="text-[#142B42] text-[13px] font-bold mb-4 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#142B42]"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
                Jurnal Terbit
              </h4>
              <p className="text-[32px] font-bold text-[#142B42] leading-none mb-1">{published}</p>
            </div>
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-medium text-[#7B8EA0]">Dokumen Terverifikasi</span>
              <ChevronRight size={14} className="text-[#F7921C]" />
            </div>
          </div>
          
          <div className="bg-white rounded-[17px] border border-[#0F3E79] p-5 shadow-sm h-[160px] flex flex-col justify-between">
            <div>
              <h4 className="text-[#142B42] text-[13px] font-bold mb-4 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#142B42]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Jumlah Draft
              </h4>
              <p className="text-[32px] font-bold text-[#142B42] leading-none mb-1">{draft}</p>
            </div>
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-medium text-transparent">Spasi</span>
              <ChevronRight size={14} className="text-[#142B42]" />
            </div>
          </div>
          
          <div className="bg-white rounded-[17px] border border-[#FDE68A] p-5 shadow-sm h-[160px] flex flex-col justify-between">
            <div>
              <h4 className="text-[#142B42] text-[13px] font-bold mb-4 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#142B42]"><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10.4 12.6a2 2 0 1 1 3 3L17 19"/><path d="M4 15V4a2 2 0 0 1 2-2h8.5L20 7.5V20a2 2 0 0 1-2 2H4"/></svg>
                Menunggu Verifikasi
              </h4>
              <p className="text-[32px] font-bold text-[#142B42] leading-none mb-1">{pending}</p>
            </div>
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-medium text-transparent">Spasi</span>
              <ChevronRight size={14} className="text-[#F7921C]" />
            </div>
          </div>
        </div>

        {/* Right: Calendar */}
        <div className="w-full md:w-[320px] shrink-0 flex">
          <div className="bg-white rounded-[21px] border border-[#E5E7EB] shadow-[0_4px_20px_rgba(0,0,0,0.05)] w-full h-full flex flex-col overflow-hidden">
            {/* macOS Style Top Bar */}
            <div className="h-[28px] w-full bg-[#254360] flex items-center px-4 gap-2 shrink-0">
              <div className="w-[10px] h-[10px] rounded-full bg-[#ED695E]"></div>
              <div className="w-[10px] h-[10px] rounded-full bg-[#F4BF4F]"></div>
              <div className="w-[10px] h-[10px] rounded-full bg-[#61C554]"></div>
            </div>
            
            <div className="p-5 flex-1 flex flex-col min-w-0 min-h-0">
              {/* Calendar Nav */}
              <div className="flex justify-between items-center mb-6 gap-1">
                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                    className="p-0.5 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ChevronLeft size={16} className="text-[#142B42]" />
                  </button>
                  <h4 className="text-[11px] font-bold text-[#142B42] uppercase tracking-wider min-w-[70px] text-center">
                    {MONTH_NAMES[calendarDate.getMonth()]}
                  </h4>
                  <button 
                    onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                    className="p-0.5 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ChevronRight size={16} className="text-[#142B42]" />
                  </button>
                </div>
                <div className="flex bg-[#F0F4F8] rounded-full p-1 items-center shrink-0">
                  <div className="text-[9px] px-2 py-1 font-bold text-[#7B8EA0] cursor-pointer hover:text-[#142B42]">Hari</div>
                  <div className="text-[9px] px-2 py-1 font-bold text-[#7B8EA0] cursor-pointer hover:text-[#142B42]">Minggu</div>
                  <div className="text-[9px] px-2 py-1 font-bold bg-[#254360] text-white rounded-full shadow-sm">Bulan</div>
                </div>
              </div>
            
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['Ming', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
                <div key={d} className="text-[11px] font-bold text-[#7B8EA0]">{d}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {generateCalendar().map((date, idx) => {
                if (!date) return <div key={`empty-${idx}`} className="h-9"></div>;
                const tZoffset = date.getTimezoneOffset() * 60000;
                const localISOTime = (new Date(date.getTime() - tZoffset)).toISOString().split('T')[0];
                const isSelected = selectedDate === localISOTime;
                const isToday = (new Date(Date.now() - tZoffset)).toISOString().split('T')[0] === localISOTime;
                
                // Real data connection: check if there are drafts or published journals on this date
                const hasDraft = allItems.some(j => j.tanggal_kegiatan && j.tanggal_kegiatan.startsWith(localISOTime) && j.status === 'draft');
                const hasPublished = allItems.some(j => j.tanggal_kegiatan && j.tanggal_kegiatan.startsWith(localISOTime) && j.status === 'published');
                
                return (
                  <div key={localISOTime} className="flex flex-col items-center justify-start pt-1 h-10 relative">
                    <button 
                      type="button"
                      onClick={() => setSelectedDate(isSelected ? null : localISOTime)}
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-[11.5px] transition-colors ${
                        isSelected ? 'bg-[#396094] text-white font-bold shadow-sm' : 
                        isToday ? 'bg-[#EEF2F6] text-[#396094] font-bold' : 
                        'text-[#142B42] hover:bg-[#F6F9FC] font-medium'
                      }`}
                    >
                      {date.getDate()}
                    </button>
                    {/* Activity Dots / Today Label */}
                    <div className="absolute bottom-[2px] w-full flex justify-center items-center gap-[2px]">
                      {isToday && <span className="text-[6.5px] font-bold text-[#396094] uppercase tracking-tighter" style={{ transform: 'scale(0.85)', whiteSpace: 'nowrap' }}>HARI INI</span>}
                      {!isToday && hasDraft && <div className="w-1 h-1 rounded-full bg-[#F4BF4F]"></div>}
                      {!isToday && hasPublished && <div className="w-1.5 h-1 rounded-full bg-[#F7921C]"></div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* 4 Charts */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {/* Chart 1: Bar Chart */}
        <div className="bg-white rounded-[22px] border-[0.5px] border-black/10 p-5 shadow-sm h-[273px] flex flex-col min-w-0 min-h-0">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-semibold text-[#142B42]">Jumlah Jurnal Per Bulan</h4>
            <div className="relative inline-block"><select className="appearance-none text-xs bg-gray-100 pl-2 pr-5 py-1 rounded outline-none border border-transparent focus:border-[#4F83F5] focus:bg-white text-[#142B42] font-semibold cursor-pointer" value={chartYear} onChange={(e) => setChartYear(parseInt(e.target.value))}>{availableYears.map(yr => (<option key={yr} value={yr}>{yr}</option>))}</select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-[#142B42]"><ChevronDown size={12} strokeWidth={3} /></div></div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#E5E7EB" vertical={true} />
              <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tickMargin={10} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} tickMargin={10} />
              <Tooltip cursor={{fill: '#f1f5f9'}} />
              <Bar dataKey="value" fill="#FFB240" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Status Jurnal */}
        <div className="bg-white rounded-[22px] border-[0.5px] border-black/10 p-5 shadow-sm h-[273px] flex flex-col min-w-0 min-h-0">
          <h4 className="text-sm font-semibold text-[#142B42] mb-2">Status Jurnal</h4>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieStatusData} cx="50%" cy="45%" innerRadius={0} outerRadius={70} dataKey="value">
                <Cell fill="#4ade80" /> {/* Di Terima / Terbit */}
                <Cell fill="#fbbf24" /> {/* Menunggu */}
                <Cell fill="#f87171" /> {/* Di Tolak / Draft */}
              </Pie>
              <Tooltip />
              <Legend 
                verticalAlign="bottom" 
                height={20}
                iconType="circle"
                iconSize={6}
                wrapperStyle={{ fontSize: '9px', color: '#6b7280' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 3: Kategori Jurnal */}
        <div className="bg-white rounded-[22px] border-[0.5px] border-black/10 p-5 shadow-sm h-[273px] flex flex-col min-w-0 min-h-0">
          <h4 className="text-sm font-semibold text-[#142B42] mb-2">Kategori Jurnal</h4>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={kategoriData} cx="50%" cy="45%" innerRadius={0} outerRadius={70} dataKey="value">
                {kategoriData.map((entry, index) => <Cell key={index} fill={COLORS[(index + 1) % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend 
                verticalAlign="bottom" 
                height={20}
                iconType="circle"
                iconSize={6}
                wrapperStyle={{ fontSize: '9px', color: '#6b7280' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 4: Staff Upload Jurnal */}
        <div className="bg-white rounded-[22px] border-[0.5px] border-black/10 p-5 shadow-sm h-[273px] flex flex-col min-w-0 min-h-0">
          <h4 className="text-sm font-semibold text-[#142B42] mb-2">Staff Upload Jurnal</h4>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieStaffData} cx="50%" cy="45%" innerRadius={0} outerRadius={70} dataKey="value">
                {pieStaffData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend 
                verticalAlign="bottom" 
                height={20}
                iconType="circle"
                iconSize={6}
                wrapperStyle={{ fontSize: '9px', color: '#6b7280' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex-1 min-w-0 flex flex-col w-full">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div className="relative w-full lg:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari Jurnal" 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 pl-10 pr-4 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" 
            />
          </div>
          <div className="flex bg-gray-100 rounded-full p-1 w-full sm:w-auto overflow-x-auto hide-scrollbar">
            <button 
              onClick={() => { setActiveTab('Semua'); setCurrentPage(1); }}
              className={`flex-1 sm:flex-none px-5 py-1.5 text-sm rounded-full font-medium transition-colors whitespace-nowrap ${activeTab === 'Semua' ? 'bg-[#142B42] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
            >
              Semua
            </button>
            <button 
              onClick={() => { setActiveTab('Draft'); setCurrentPage(1); }}
              className={`flex-1 sm:flex-none px-5 py-1.5 text-sm rounded-full font-medium transition-colors whitespace-nowrap ${activeTab === 'Draft' ? 'bg-[#142B42] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
            >
              Draft
            </button>
            <button 
              onClick={() => { setActiveTab('Terbit'); setCurrentPage(1); }}
              className={`flex-1 sm:flex-none px-5 py-1.5 text-sm rounded-full font-medium transition-colors whitespace-nowrap ${activeTab === 'Terbit' ? 'bg-[#142B42] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
            >
              Terbit
            </button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-sm text-gray-600 border border-gray-200/50">
            <thead>
              <tr className="border-b border-gray-200/50 bg-[#F8FAFC] divide-x divide-gray-200/50">
                <th className="py-3 px-4 font-semibold">No</th>
                <th className="py-3 px-4 font-semibold">Judul Jurnal</th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">Pembuat</th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">Tanggal</th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">Kategori</th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">Status</th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">Akses</th>
                <th className="py-3 px-4 font-semibold text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length > 0 ? currentItems.map((item, idx) => {
                const isPub = item.status === 'published';
                return (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50 divide-x divide-gray-100">
                  <td className="py-3 px-4">{(validCurrentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td className="py-3 px-4 font-medium text-blue-900">{item.judul || 'Untitled'}</td>
                  <td className="py-3 px-4 whitespace-nowrap">{item.owner_name || 'Staff'}</td>
                  <td className="py-3 px-4 whitespace-nowrap">{item.tanggal_kegiatan || '-'}</td>
                  <td className="py-3 px-4">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[11px] rounded-full font-medium whitespace-nowrap">
                      {item.kategori || 'Umum'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={isPub ? 'px-3 py-1 text-[11px] rounded-full font-medium bg-green-100 text-green-700' : 'px-3 py-1 text-[11px] rounded-full font-medium bg-orange-100 text-orange-700'}>
                      {isPub ? 'Terbit' : 'Draft'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 text-[11px] rounded-full font-medium ${item.is_published ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>
                      {item.is_published ? 'Publik' : 'Privat'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-4">
                      <button 
                        type="button"
                        onClick={() => setDetailPopup(item.id)}
                        className="text-[#142B42] hover:text-blue-700 transition-colors focus:outline-none"
                        title="Lihat Detail"
                      >
                        <Eye size={16} strokeWidth={2.5} />
                      </button>
                      <>
                          <button 
                            type="button"
                            onClick={() => router.push(`/panel?tab=edit&editId=${item.id}`)}
                            className="text-[#142B42] hover:text-blue-700 transition-colors focus:outline-none"
                            title="Edit Jurnal"
                          >
                            <Edit2 size={16} strokeWidth={2.5} />
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => { 
                              e.stopPropagation();
                              setDeletePopup(item.id); 
                            }}
                            className="text-[#F04438] hover:text-red-700 transition-colors focus:outline-none"
                            title="Hapus"
                          >
                            <Trash2 size={16} strokeWidth={2.5} />
                          </button>
                        </>
                      </div>
                  </td>
                </tr>
              )}) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">Tidak ada data jurnal ditemukan</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-6">
          <span className="text-xs text-gray-400">
            {filteredItems.length > 0 ? `Menampilkan ${startItemIdx}-${endItemIdx} dari ${filteredItems.length} jurnal` : 'Menampilkan 0 jurnal'}
          </span>
          <div className="flex items-center gap-1">
            <button 
              disabled={validCurrentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button 
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 flex items-center justify-center rounded border ${validCurrentPage === page ? 'bg-[#142B42] text-white border-[#142B42]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {page}
              </button>
            ))}

            <button 
              disabled={validCurrentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
      {/* DELETE CONFIRMATION POPUP */}
      {deletePopup && (
        <div className="fixed inset-0 bg-black/40 z-[999] flex items-center justify-center animate-in fade-in">
          <div className="bg-white w-[400px] rounded-[16px] shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Hapus Jurnal?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Apakah Anda yakin ingin menghapus jurnal ini? Data yang sudah dihapus tidak dapat dikembalikan.
              </p>
              <div className="flex items-center gap-3 w-full">
                <button 
                  onClick={() => setDeletePopup(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={async () => {
                    setIsDeleting(true);
                    await deleteJurnalAction(deletePopup);
                    setIsDeleting(false);
                    setDeletePopup(null);
                    showToast("Jurnal berhasil dihapus secara permanen", "success");
                  }}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
                >
                  {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JURNAL DETAIL MODAL */}
      <JurnalDetailModal 
        id={detailPopup} 
        isOpen={!!detailPopup} 
        onClose={() => setDetailPopup(null)} 
        isLoggedIn={true}
      />
    </div>
  );
}




