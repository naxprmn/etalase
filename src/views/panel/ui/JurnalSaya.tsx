"use client"
import React, { useState, useMemo } from 'react';
import type { JurnalWorkspace } from '@/features/jurnal-saya/api/get-my-jurnals.action';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, Grid, UserCheck, ChevronDown, User, Calendar, Clock, CheckCircle2, Edit2, Trash2, Eye, AlertTriangle } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
const STATUS_COLORS = ['#4ADE80', '#FB923C', '#F87171']; // Di Terima (Green), Menunggu (Orange), Di Tolak (Red)
const CAT_COLORS = ['#60A5FA', '#F87171', '#FBBF24', '#818CF8']; // Sosialisasi (Blue), Rapat (Red), MoU (Yellow), Lainnya (Indigo)

import { useRouter } from 'next/navigation';
import { deleteJurnalAction } from '@/features/jurnal-saya/api/delete.action';
import { JurnalDetailModal } from '@/entities/jurnal/ui/jurnal-detail-modal.client';
export default function JurnalSaya({ workspace, error }: { workspace: JurnalWorkspace | null, error: string | null }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'Semua'|'Draft'|'Terbit'>('Semua');
  const [chartYear, setChartYear] = useState<number>(new Date().getFullYear());
  const [deletePopup, setDeletePopup] = useState<string | null>(null);
  const [detailPopup, setDetailPopup] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [toast, setToast] = useState<{message: string, type: 'info'|'success'|'error'} | null>(null);
  const showToast = (message: string, type: 'info'|'success'|'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const subordinates = workspace ? workspace.subordinates : [];
  const mine = workspace ? workspace.mine : [];
  
  const hasSubordinates = subordinates.length > 0;
  const listToRender = hasSubordinates ? subordinates : mine;

  const filteredList = useMemo(() => {
    let items = listToRender;
    if (activeTab === 'Draft') {
       items = items.filter(i => i.status === 'draft' || i.status === 'publish_pending' || i.status === 'rejected');
    } else if (activeTab === 'Terbit') {
       items = items.filter(i => i.status === 'published');
    }
    return items;
  }, [listToRender, activeTab]);

  const itemsPerPage = 6;
  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const currentItems = filteredList.slice((validCurrentPage - 1) * itemsPerPage, validCurrentPage * itemsPerPage);



  const allItems = workspace ? [...workspace.mine, ...workspace.subordinates] : [];
  
  const total = allItems.length;
  const published = allItems.filter(i => i.status === 'published').length;
  const pending = allItems.filter(i => i.status === 'publish_pending').length;
  const rejectedCount = allItems.filter(i => i.status === 'rejected').length;

  const barData = MONTHS.map((m, idx) => {
    const count = allItems.filter(i => {
       if (!i.tanggal_kegiatan) return false;
       const d = new Date(i.tanggal_kegiatan);
       return d.getFullYear() === chartYear && d.getMonth() === idx;
    }).length;
    return { name: m, value: count };
  });
  
  const pieStatusData = [
    { name: 'Di Terima', value: published, color: '#4ADE80' },
    { name: 'Menunggu', value: pending, color: '#FB923C' },
    { name: 'Di Tolak', value: rejectedCount, color: '#F87171' },
    { name: 'Draft', value: allItems.filter(i => i.status === 'draft').length, color: '#9CA3AF' }
  ].filter(d => d.value > 0);
  
  const pieCatData = useMemo(() => {
    const counts: Record<string, number> = {};
    allItems.forEach(item => {
      const cat = item.kategori || 'Lainnya';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value], index) => ({
      name,
      value,
      color: CAT_COLORS[index % CAT_COLORS.length]
    }));
  }, [allItems]);

  const pieStaffData = useMemo(() => {
    const counts: Record<string, number> = {};
    // Only count subordinates for the staff chart if applicable
    const sourceItems = hasSubordinates ? workspace!.subordinates : allItems;
    sourceItems.forEach(item => {
      const name = item.owner_name || 'Tanpa Nama';
      counts[name] = (counts[name] || 0) + 1;
    });
    const STAFF_COLORS = ['#6366F1', '#F87171', '#FBBF24', '#38BDF8', '#A78BFA', '#34D399'];
    return Object.entries(counts).map(([name, value], index) => ({
      name,
      value,
      color: STAFF_COLORS[index % STAFF_COLORS.length]
    }));
  }, [allItems, hasSubordinates, workspace]);

  if (error) {
    return <div className="p-10 text-red-500">{error}</div>;
  }
  if (!workspace) {
    return <div className="p-10 text-gray-500">Memuat data...</div>;
  }

  return (
    <div className="flex-1 p-6 md:p-10 flex flex-col w-full max-w-[1200px] mx-auto">
      {toast && (
        <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-semibold transition-all animate-fade-in
          ${toast.type === 'error' ? 'bg-red-500' : toast.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}>
          {toast.type === 'error' ? <AlertTriangle size={18} /> : toast.type === 'success' ? <CheckCircle2 size={18} /> : <FileText size={18} />} {toast.message}
        </div>
      )}
      {/* Top 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-[16px] border border-[#E5E7EB] p-6 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-[#396094]">
              <FileText size={24} strokeWidth={2} />
            </div>
            <h4 className="text-[#396094] font-bold text-[18px]">Semua Jurnal</h4>
          </div>
          <h2 className="text-[40px] font-bold text-[#142B42] mb-1">{total}</h2>
          <p className="text-[#A0AAB5] text-sm">Total Jurnal yang diajukan</p>
        </div>
        
        <div className="bg-white rounded-[16px] border border-[#E5E7EB] p-6 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-[#142B42]">
              <Grid size={24} strokeWidth={2} />
            </div>
            <h4 className="text-[#142B42] font-bold text-[18px]">Menunggu Proses</h4>
          </div>
          <h2 className="text-[40px] font-bold text-[#142B42] mb-1">{pending}</h2>
          <p className="text-[#A0AAB5] text-sm">Dalam Tahap Verifikasi</p>
        </div>
        
        <div className="bg-white rounded-[16px] border border-[#E5E7EB] p-6 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-[#142B42]">
              <UserCheck size={24} strokeWidth={2} />
            </div>
            <h4 className="text-[#142B42] font-bold text-[18px]">Terbit</h4>
          </div>
          <h2 className="text-[40px] font-bold text-[#142B42] mb-1">{published}</h2>
          <p className="text-[#A0AAB5] text-sm">Telah Di Publikasikan</p>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className={`grid grid-cols-1 ${hasSubordinates ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-6 mb-8`}>
        {/* Bar Chart */}
        <div className="bg-white rounded-[16px] border border-[#E5E7EB] p-6 shadow-sm h-[320px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-sm font-bold text-[#142B42]">Jumlah Jurnal Per Bulan</h4>
            <select 
              value={chartYear} 
              onChange={(e) => setChartYear(Number(e.target.value))} 
              className="text-xs bg-[#F6F9FC] text-[#7B8EA0] px-3 py-1.5 rounded-full outline-none font-semibold cursor-pointer appearance-none text-center"
              style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="%237B8EA0" height="14" viewBox="0 0 24 24" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: '24px' }}
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex-1 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" fontSize={10} axisLine={true} tickLine={false} tick={{fill: '#A0AAB5'}} />
                <YAxis fontSize={10} axisLine={true} tickLine={false} tick={{fill: '#A0AAB5'}} />
                <Tooltip cursor={{fill: '#f1f5f9'}} />
                <Bar dataKey="value" fill="#FBBF24" radius={[2, 2, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Pie Chart */}
        <div className="bg-white rounded-[16px] border border-[#E5E7EB] p-6 shadow-sm h-[320px] flex flex-col items-center">
          <h4 className="text-sm font-bold text-[#142B42] w-full text-left mb-2">Status Jurnal</h4>
          <div className="flex-1 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie data={pieStatusData} cx="50%" cy="50%" innerRadius={0} outerRadius={80} dataKey="value" stroke="none">
                  {pieStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2 w-full text-[10px] text-[#7B8EA0] font-medium">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#4ADE80]"></div>Di Terima</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#FB923C]"></div>Menunggu</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#F87171]"></div>Di Tolak</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#9CA3AF]"></div>Draft</div>
          </div>
        </div>

        {/* Kategori Pie Chart */}
        <div className="bg-white rounded-[16px] border border-[#E5E7EB] p-6 shadow-sm h-[320px] flex flex-col items-center">
          <h4 className="text-sm font-bold text-[#142B42] w-full text-left mb-2">Kategori Jurnal</h4>
          <div className="flex-1 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie data={pieCatData} cx="50%" cy="50%" innerRadius={0} outerRadius={80} dataKey="value" stroke="none">
                  {pieCatData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center flex-wrap gap-3 mt-2 w-full text-[10px] text-[#7B8EA0] font-medium">
            {pieCatData.map((entry, index) => (
              <div key={index} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                {entry.name}
              </div>
            ))}
          </div>
        </div>

        {/* Staff Pie Chart (Kasubag Only) */}
        {hasSubordinates && (
          <div className="bg-white rounded-[16px] border border-[#E5E7EB] p-6 shadow-sm h-[320px] flex flex-col items-center">
            <h4 className="text-sm font-bold text-[#142B42] w-full text-left mb-2">Staff Uploud Jurnal</h4>
            <div className="flex-1 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie data={pieStaffData} cx="50%" cy="50%" innerRadius={0} outerRadius={80} dataKey="value" stroke="none">
                    {pieStaffData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center flex-wrap gap-3 mt-2 w-full text-[10px] text-[#7B8EA0] font-medium">
              {pieStaffData.map((entry, index) => (
                <div key={index} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                  {entry.name}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Jurnal List Section */}
      <div className="bg-white rounded-[24px] p-8 shadow-sm mb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 w-full">
          <div className="flex gap-4">
            <div className="mt-1 text-[#142B42]">
              <User size={24} strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-bold text-[#142B42] text-[20px] mb-1">
                {hasSubordinates ? 'Jurnal Bawahan' : 'Daftar Jurnal'}
              </h3>
              <p className="text-[#7B8EA0] text-[14px]">
                {hasSubordinates ? 'Draft yang menunggu review dan jurnal terbit staf' : 'Daftar jurnal yang telah Anda ajukan'}
              </p>
            </div>
          </div>
          
          <div className="flex bg-[#F6F9FC] p-1.5 rounded-full w-full md:w-auto overflow-x-auto hide-scrollbar">
            <button 
              onClick={() => { setActiveTab('Semua'); setCurrentPage(1); }}
              className={`flex-1 md:flex-none px-6 py-2 rounded-full text-[14px] font-semibold transition-colors whitespace-nowrap ${activeTab === 'Semua' ? 'bg-[#142B42] text-white' : 'text-[#7B8EA0] hover:bg-gray-100'}`}
            >
              Semua
            </button>
            <button 
              onClick={() => { setActiveTab('Draft'); setCurrentPage(1); }}
              className={`flex-1 md:flex-none px-6 py-2 rounded-full text-[14px] font-semibold transition-colors whitespace-nowrap ${activeTab === 'Draft' ? 'bg-[#142B42] text-white' : 'text-[#7B8EA0] hover:bg-gray-100'}`}
            >
              Draft
            </button>
            <button 
              onClick={() => { setActiveTab('Terbit'); setCurrentPage(1); }}
              className={`flex-1 md:flex-none px-6 py-2 rounded-full text-[14px] font-semibold transition-colors whitespace-nowrap ${activeTab === 'Terbit' ? 'bg-[#142B42] text-white' : 'text-[#7B8EA0] hover:bg-gray-100'}`}
            >
              Terbit
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {currentItems.map((item, idx) => {
            const isPub = item.status === 'published';
            return (
              <div key={idx} className="bg-[#FFFEFE] border border-[#142B42] rounded-[12px] p-4 flex flex-col transition-all hover:shadow-md w-full min-h-[185px]">
                <div className="flex justify-between items-start gap-1 mb-3">
                  <span className="bg-[#E7F2FE] text-[#3B82F6] px-2 h-[20px] rounded-[10px] text-[9px] font-bold flex items-center gap-1 whitespace-nowrap shrink-0 overflow-hidden">
                    <FileText size={10} strokeWidth={2.5} className="shrink-0" /> 
                    <span className="truncate">{item.kategori || 'Sosialisasi'}</span>
                  </span>
                                    {isPub ? (
                    <span className="bg-[#C0FFDF] text-[#22C55E] px-2 h-[20px] rounded-[10px] text-[9px] font-bold flex items-center justify-center gap-1 whitespace-nowrap shrink-0">
                      <CheckCircle2 size={10} strokeWidth={2.5} className="shrink-0" /> 
                      Terbit Publik
                    </span>
                  ) : item.status === 'rejected' ? (
                    <span className="bg-[#FF3333] text-white px-3 h-[24px] rounded-[12px] text-[10px] font-bold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0">
                      <Clock size={12} strokeWidth={2.5} className="shrink-0" /> 
                      Di Tolak
                    </span>
                  ) : item.status === 'draft' ? (
                    <span className="bg-[#F3F4F6] text-[#6B7280] px-2 h-[20px] rounded-[10px] text-[9px] font-bold flex items-center justify-center gap-1 whitespace-nowrap shrink-0">
                      <Edit2 size={10} strokeWidth={2.5} className="shrink-0" /> 
                      Draft
                    </span>
                  ) : (
                    <span className="bg-[#FFE5C8] text-[#F97316] px-2 h-[20px] rounded-[10px] text-[9px] font-bold flex items-center justify-center gap-1 whitespace-nowrap shrink-0">
                      <Clock size={10} strokeWidth={2.5} className="shrink-0" /> 
                      Menunggu Approval
                    </span>
                  )}
                </div>

                <h4 className="font-medium text-[#283D52] text-[12px] line-clamp-2 min-h-[18px]">{item.judul || 'Tanpa Judul'}</h4>

                <div className="flex-1" />

                <div className="flex flex-col gap-1 text-[#475569] text-[10px] font-medium mb-3 mt-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} strokeWidth={2.5} /> 
                    {item.tanggal_kegiatan ? new Date(item.tanggal_kegiatan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '18 September 2026'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User size={12} strokeWidth={2.5} />
                    {item.divisi ? `Staf ${item.divisi}` : 'Staf Divisi Pengawasan'}
                  </div>
                </div>

                {item.status === 'rejected' && item.workflow_notes && (
                  <div className="mb-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-[6px] p-2 text-[#991B1B] text-[10px]">
                    <span className="font-bold">Catatan Pengembalian:</span> {item.workflow_notes}
                  </div>
                )}

                <div className="w-full">
                  {isPub ? (
                    <button 
                      onClick={() => window.open('/?jurnalId=' + item.id, '_blank')}
                      className="w-full h-[26px] bg-[#142B42] hover:bg-[#1f3f61] text-white rounded-[8px] text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Eye size={12} strokeWidth={2.5} /> Lihat
                    </button>
                  ) : (
                    <div className="flex gap-2 w-full">
                      <button 
                        onClick={() => router.push(`/panel?tab=edit&editId=${item.id}`)}
                        className="flex-1 shrink-0 h-[26px] bg-[#1F365C] hover:bg-[#142642] text-white rounded-[8px] text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Edit2 size={12} strokeWidth={2.5} /> Edit
                      </button>
                      <button 
                        onClick={() => setDeletePopup(item.id)}
                        className="w-[51px] h-[26px] shrink-0 bg-[#FF3030] hover:bg-[#DC2626] text-white rounded-[8px] flex items-center justify-center transition-colors"
                      >
                        <Trash2 size={12} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {filteredList.length === 0 && (
            <div className="col-span-1 md:col-span-3 py-10 text-center text-[#7B8EA0] font-medium">
              {hasSubordinates ? 'Tidak ada jurnal bawahan' : 'Belum ada jurnal yang diajukan'}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 pt-6 border-t border-gray-100">
            <span className="text-xs text-[#7B8EA0] font-medium">Menampilkan {currentItems.length} dari {filteredList.length} jurnal</span>
            <div className="flex gap-2">
              <button disabled={validCurrentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-[#7B8EA0] hover:bg-gray-50 disabled:opacity-50">«</button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 flex items-center justify-center rounded border ${validCurrentPage === i + 1 ? 'bg-[#142B42] text-white border-[#142B42]' : 'border-gray-200 text-[#7B8EA0] hover:bg-gray-50'}`}>{i + 1}</button>
              ))}
              <button disabled={validCurrentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 text-[#7B8EA0] hover:bg-gray-50 disabled:opacity-50">»</button>
            </div>
          </div>
        )}
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
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={async () => {
                    if(!deletePopup) return;
                    setIsDeleting(true);
                    const res = await deleteJurnalAction(deletePopup);
                    setIsDeleting(false);
                    if(res.success) {
                      setDeletePopup(null);
                      showToast('Jurnal berhasil dihapus', 'success');
                    } else {
                      showToast('Gagal menghapus jurnal: ' + res.error, 'error');
                    }
                  }}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}










