"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import JurnalSaya from './JurnalSaya'
import KelolaJurnal from './KelolaJurnal'
import Approval from './Approval'
import type { LawetUser } from '@/entities/lawet-user/model/lawet-user'
import { submitJurnalAction } from '@/entities/jurnal/api/submit-jurnal.action'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

export default function PanelLayoutClient({ activeMenu, workspace, error, user, editId }: { activeMenu: string, workspace: any, error: string | null, user: LawetUser | null, editId?: string | null }) {
  const router = useRouter()
  
  // Toast Notification State
  const [toast, setToast] = React.useState<{message: string, type: 'error' | 'success'} | null>(null);
  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({message, type});
    setTimeout(() => setToast(null), 3000);
  };

  // Form states
  const [judul, setJudul] = React.useState('')
  const [tanggalKegiatan, setTanggalKegiatan] = React.useState('')
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false)
  const [calendarDate, setCalendarDate] = React.useState(new Date())
  const [kategori, setKategori] = React.useState('Penanganan Pelanggaran')
  const [isKategoriOpen, setIsKategoriOpen] = React.useState(false)
  const [ringkasan, setRingkasan] = React.useState('')
  const [tagsInput, setTagsInput] = React.useState('')
  const [pihakTerkaitInput, setPihakTerkaitInput] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (activeMenu === 'edit' && editId && workspace) {
      const allItems = [...(workspace.mine || []), ...(workspace.subordinates || [])];
      const item = allItems.find((i: any) => String(i.id) === String(editId));
      if (item) {
        setJudul(item.judul || '');
        setTanggalKegiatan(item.tanggal_kegiatan || '');
        setKategori(item.kategori || 'Penanganan Pelanggaran');
        setRingkasan(item.deskripsi || '');
        
        if (item.pihak_terkait && item.pihak_terkait.length > 0) {
          setPihakTerkaitInput(item.pihak_terkait.map((p: any) => p.nama).join(', '));
        } else {
          setPihakTerkaitInput('');
        }

        if (item.dokumentasi && item.dokumentasi.length > 0) {
          setFotos(item.dokumentasi.map((d: any) => d.url).filter(Boolean));
        } else {
          setFotos([]);
        }

        if (item.dokumen_pendukung && item.dokumen_pendukung.length > 0) {
          setDocs(item.dokumen_pendukung.map((d: any) => ({nama: d.nama, url: d.url})).filter((d: any) => d.nama));
        } else {
          setDocs([]);
        }

        if (item.link_publikasi) {
          setLinks([item.link_publikasi]);
          setCurrentLink(item.link_publikasi);
        } else {
          setLinks([]);
          setCurrentLink('');
        }

        if (item.tags && item.tags.length > 0) {
          setTagsInput(item.tags.join(', '));
        } else {
          setTagsInput('');
        }
      }
    } else if (activeMenu === 'tambah') {
      setJudul('');
      setTanggalKegiatan('');
      setKategori('Penanganan Pelanggaran');
      setRingkasan('');
      setPihakTerkaitInput('');
      setFotos([]);
      setDocs([]);
      setLinks([]);
    }
  }, [activeMenu, editId, workspace]);

  const generateCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days: (Date | null)[] = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const [isPrivat, setIsPrivat] = React.useState(true)
  const [links, setLinks] = React.useState<string[]>([])
  const [currentLink, setCurrentLink] = React.useState('')

  // Upload states
  const [fotos, setFotos] = React.useState<string[]>([])
  const [docs, setDocs] = React.useState<{nama: string, url: string}[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul || !tanggalKegiatan || !kategori) {
      showToast("Harap lengkapi field yang wajib (Judul, Tanggal, Kategori)", "error");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = {
        id: activeMenu === 'edit' && editId ? editId : undefined,
        judul,
        ringkasan,
        tanggal_kegiatan: tanggalKegiatan,
        kategori,
        is_published: !isPrivat,
        dokumentasi: fotos.map(f => ({ url: f, type: 'image' as const })),
        dokumen_pendukung: docs.map(d => ({ nama: d.nama, url: d.url, tipe: 'pdf' as const, is_public: !isPrivat })),
        pihak_terkait: pihakTerkaitInput ? pihakTerkaitInput.split(',').map(p => p.trim()).filter(Boolean).slice(0, 2).map(nama => ({ nama })) : [],
        custom_fields: ringkasan ? [{ label: 'Ringkasan', value: ringkasan }] : [],
        tags: tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [],
        link_publikasi: links.length > 0 ? links[0] : currentLink.trim()
      };

      const res = await submitJurnalAction(payload);
      if (res.success) {
        showToast(activeMenu === 'edit' ? "Jurnal berhasil diperbarui!" : "Jurnal berhasil diajukan!", "success");
        if (activeMenu === 'edit') {
          router.push('/panel?tab=kelola');
        } else {
          // Reset form
          setJudul(''); setTanggalKegiatan(''); setRingkasan(''); setPihakTerkaitInput('');
          setLinks([]); setFotos([]); setDocs([]);
        }
      } else {
        showToast("Gagal mengirim: " + res.error, "error");
      }
    } catch (err: any) {
      showToast("Terjadi kesalahan: " + err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  const removeFoto = (index: number) => {
    setFotos(fotos.filter((_, i) => i !== index));
  }
  const addFoto = () => {
    // Mock addition
    setFotos([...fotos, 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=200']);
  }

  const [dragActiveFoto, setDragActiveFoto] = React.useState(false);
  const fotoInputRef = React.useRef<HTMLInputElement>(null);

  const handleFotoFiles = async (files: FileList) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    const newFotos: string[] = [];
    for (const file of validFiles) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newFotos.push(dataUrl);
    }
    if(newFotos.length > 0) setFotos(prev => [...prev, ...newFotos]);
  };

  const handleDragFoto = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActiveFoto(true);
    else if (e.type === 'dragleave') setDragActiveFoto(false);
  };

  const handleDropFoto = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveFoto(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFotoFiles(e.dataTransfer.files);
    }
  };

  const removeDoc = (index: number) => {
    setDocs(docs.filter((_, i) => i !== index));
  }
  const addDoc = () => {
    // Mock addition
    setDocs([...docs as any, { nama: `Lampiran_${docs.length + 1}.pdf`, url: '#' }]);
  }

  const [dragActiveDoc, setDragActiveDoc] = React.useState(false);
  const docInputRef = React.useRef<HTMLInputElement>(null);

  const handleDocFiles = async (files: FileList) => {
    const validFiles = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    const newDocs: {nama: string, url: string}[] = [];
    for (const file of validFiles) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newDocs.push({ nama: file.name, url: dataUrl });
    }
    if(newDocs.length > 0) setDocs(prev => [...prev, ...newDocs]);
  };

  const handleDragDoc = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActiveDoc(true);
    else if (e.type === 'dragleave') setDragActiveDoc(false);
  };

  const handleDropDoc = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveDoc(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleDocFiles(e.dataTransfer.files);
    }
  };

  const handleAddLink = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      let val = currentLink.trim();
      if (!val) return;
      
      if (!/^https?:\/\//i.test(val)) {
        val = 'https://' + val;
      }

      try {
        new URL(val);
        if (!links.includes(val)) {
          setLinks([...links, val]);
          setCurrentLink('');
        }
      } catch (err) {
        showToast("Link tidak valid. Gunakan format URL yang benar.", "error");
      }
    }
  }

  const removeLink = (urlToRemove: string) => {
    setLinks(links.filter(url => url !== urlToRemove));
  }

  const handleMenuClick = (tab: string) => {
    router.push(`/panel?tab=${tab}`)
  }

  // Role checks
  const isKasubag = user?.role?.name?.toLowerCase().includes('kasubag') || user?.role?.can_approve;
  const isStaff = !isKasubag;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen flex overflow-y-auto bg-[#F4F7FB]" style={{ fontFamily: 'Poppins' }}>
        
        {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-[11px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center gap-3 transition-all duration-300 animate-in fade-in slide-in-from-top-5 ${toast.type === 'error' ? 'bg-[#FEF2F2] border border-[#F87171] text-[#B91C1C]' : 'bg-[#F0FDF4] border border-[#4ADE80] text-[#15803D]'}`}>
          {toast.type === 'error' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          )}
          <span className="font-bold text-[14px]">{toast.message}</span>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="w-[417px] bg-[#F1F6FC] border-r border-[#87BFFF]/80 flex flex-col justify-between shrink-0 sticky top-0 h-screen overflow-y-auto">
        
        <div>
          {/* Logo */}
          <div className="h-[143px] bg-[#F1F6FC] border-b border-[#78B5FF] flex items-center px-10 gap-4">
            <div className="w-[65px] h-[60px] bg-[#F7921C] rounded-[9px] flex flex-col items-center justify-center p-2 shadow-sm shrink-0">
              {/* Stacked layers icon */}
              <div className="w-full h-[6px] bg-white rounded-[2px] opacity-60 mb-[2px]"></div>
              <div className="w-full h-[6px] bg-white rounded-[2px] opacity-80 mb-[2px]"></div>
              <div className="w-full h-[6px] bg-white rounded-[2px]"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-[#00306E] text-[24px] font-semibold leading-tight tracking-tight">PANEL ARSIP</span>
              <span className="text-[#5D6A77] text-[12px]">Bawaslu Kebumen</span>
            </div>
          </div>

          {/* Menus */}
          <div className="p-6 px-10 flex flex-col gap-4 items-start mt-2">
            
            {/* Staff Menus */}
            {isStaff && (
              <>
                <button 
                  onClick={() => handleMenuClick('tambah')}
                  className={`w-[289px] h-[75px] flex items-center gap-4 px-5 rounded-[11px] transition-all text-left ${activeMenu === 'tambah' ? 'bg-[#FEB143]/25' : 'hover:bg-white'}`}
                >
                  <div className={`w-[42px] h-[42px] rounded-[10px] flex items-center justify-center shrink-0 ${activeMenu === 'tambah' ? 'bg-[#F7921C] text-white shadow-md' : 'bg-white text-[#F7921C] shadow-sm border border-[#E2E8F0]'}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-bold text-[#142B42]">Tambah Jurnal</span>
                    <span className="text-[11px] text-[#7B8EA0]">Buat Arsip Baru</span>
                  </div>
                </button>

                <button 
                  onClick={() => handleMenuClick('jurnal')}
                  className={`w-[289px] h-[75px] flex items-center gap-4 px-5 rounded-[11px] transition-all text-left ${activeMenu === 'jurnal' ? 'bg-[#FEB143]/25' : 'hover:bg-white'}`}
                >
                  <div className={`w-[42px] h-[42px] rounded-[10px] flex items-center justify-center shrink-0 ${activeMenu === 'jurnal' ? 'bg-[#F7921C] text-white shadow-md' : 'bg-white text-[#F7921C] shadow-sm border border-[#E2E8F0]'}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-bold text-[#142B42]">Jurnal Saya</span>
                    <span className="text-[11px] text-[#7B8EA0]">Lihat riwayat jurnal</span>
                  </div>
                </button>
              </>
            )}

            {/* Kasubag Menus */}
            {isKasubag && (
              <>
                <button 
                  onClick={() => handleMenuClick('kelola')}
                  className={`w-[289px] h-[75px] flex items-center gap-4 px-5 rounded-[11px] transition-all text-left ${activeMenu === 'kelola' ? 'bg-[#FEB143]/25' : 'hover:bg-white'}`}
                >
                  <div className={`w-[42px] h-[42px] rounded-[10px] flex items-center justify-center shrink-0 ${activeMenu === 'kelola' ? 'bg-[#F7921C] text-white shadow-md' : 'bg-white text-[#F7921C] shadow-sm border border-[#E2E8F0]'}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-bold text-[#142B42]">Kelola Jurnal</span>
                    <span className="text-[11px] text-[#7B8EA0]">Manajemen arsip jurnal</span>
                  </div>
                </button>

                <button 
                  onClick={() => handleMenuClick('approval')}
                  className={`w-[289px] h-[75px] flex items-center gap-4 px-5 rounded-[11px] transition-all text-left ${activeMenu === 'approval' ? 'bg-[#FEB143]/25' : 'hover:bg-white'}`}
                >
                  <div className={`w-[42px] h-[42px] rounded-[10px] flex items-center justify-center shrink-0 ${activeMenu === 'approval' ? 'bg-[#F7921C] text-white shadow-md' : 'bg-white text-[#F7921C] shadow-sm border border-[#E2E8F0]'}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M16 13H8"></path><path d="M16 17H8"></path><polyline points="10 9 9 9 8 9"></polyline></svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-bold text-[#142B42]">Approval</span>
                    <span className="text-[11px] text-[#7B8EA0]">Tinjau Pengajuan</span>
                  </div>
                </button>
              </>
            )}

          </div>
        </div>

        {/* Profile Area */}
        <div className="p-6 px-10 border-t border-[#E2E8F0] flex flex-col gap-4 items-start">
          <button 
            onClick={() => router.push('/')}
            className="w-[307px] h-[71px] flex items-center justify-center gap-2 bg-[#F1F6FC] border-2 border-[#005EBB] text-[#396094] hover:bg-[#E2EDF8] rounded-[11px] text-[18px] font-semibold transition-colors"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            Kembali ke Beranda
          </button>
          
          <div 
            onClick={async () => {
              const { logoutAction } = await import('@/features/lawet-auth/api/login.action');
              await logoutAction();
              router.push('/');
            }}
            className="w-[302px] h-[77px] flex items-center justify-between px-5 bg-[#DBEBFF] rounded-[12px] cursor-pointer hover:bg-[#ffcdd2] hover:text-red-700 transition-colors group"
            title="Logout"
          >
            <div className="flex items-center gap-3">
              <div className="w-[40px] h-[40px] bg-[#F7921C] rounded-full flex items-center justify-center text-white font-bold text-[18px]">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col">
                <span className="text-[#00306E] group-hover:text-red-700 text-[15px] font-bold">{user?.name || 'User'}</span>
                <span className="text-[#00306E]/[0.6] group-hover:text-red-700/80 text-[11px] font-semibold">{user?.division?.name || 'Divisi'}</span>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#5D6A77] group-hover:text-red-700"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </div>
        </div>

      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-h-screen bg-[#F1F6FC]">
        
        {/* Dynamic Header */}
          <header className="h-[143px] bg-[#F1F6FC] border-b border-[#87BFFF]/80 flex items-center px-10 shrink-0">
            <h1 className="text-[#142B42] text-[32px] font-semibold tracking-tight flex items-center gap-3">
              {activeMenu === 'tambah' && (
                <>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="12" y2="17"></line></svg>
                  Formulir Pengajuan Jurnal
                </>
              )}
              {activeMenu === 'edit' && (
                <>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                  Edit Jurnal
                </>
              )}
              {activeMenu === 'jurnal' && (
                <>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                  Jurnal Saya
                </>
              )}
              {activeMenu === 'kelola' && (
                <>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                  Kelola Jurnal
                </>
              )}
              {activeMenu === 'approval' && (
                <>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 4C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H20V6C20 4.89543 19.1046 4 18 4H6Z" fill="currentColor"/>
                    <path d="M7 7H17V9H7V7Z" fill="#F1F6FC"/>
                    <path d="M7 11H13V13H7V11Z" fill="#F1F6FC"/>
                    <circle cx="17.5" cy="17.5" r="5" fill="currentColor" stroke="#F1F6FC" strokeWidth="2"/>
                    <path d="M15.5 17.5L17 19L19.5 15.5" stroke="#F1F6FC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Persetujuan Jurnal
                </>
              )}
            </h1>
          </header>

        {activeMenu === 'approval' ? (
          <Approval workspace={workspace} />
        ) : activeMenu === 'kelola' ? (
          <KelolaJurnal workspace={workspace} error={error} />
        ) : activeMenu === 'jurnal' ? (
          <JurnalSaya workspace={workspace} error={error} />
        ) : (
          <div className="flex-1 p-6 md:p-10 flex flex-col h-full">
            {/* Form Container */}
            <div className="w-full bg-white rounded-[25px] p-[40px] relative flex-1">
            
            {/* Card Header */}
            <div className="flex items-start justify-between mb-10">
              <div className="flex items-start gap-4">
                <div className="w-[67px] h-[62px] bg-[#F7921C] rounded-[9px] flex items-center justify-center shrink-0">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <div className="flex flex-col pt-1">
                  <h2 className="text-[20px] text-[#142B42] font-bold leading-tight">Pengajuan Jurnal Kegiatan</h2>
                  <p className="text-[#5D6A77] text-[13px] mt-1">Lengkapi detail kegiatan di bawah untuk di dokumentasikan ke dalam sistem arsip</p>
                </div>
              </div>

              {/* Toggle Privat / Publik */}
              <div className="flex items-center bg-[#F6F9FC] border border-[#E5E7EB] rounded-[15px] p-[6px] shadow-sm shrink-0">
                <button 
                  type="button" 
                  onClick={() => setIsPrivat(true)} 
                  className={`w-[145px] h-[48px] text-[15px] font-semibold transition-all rounded-[11px] ${isPrivat ? 'bg-[#396094] text-white shadow-md' : 'bg-transparent text-[#7B8EA0] hover:text-[#142B42]'}`}
                >
                  Privat
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsPrivat(false)} 
                  className={`w-[145px] h-[48px] text-[15px] font-semibold transition-all rounded-[11px] ${!isPrivat ? 'bg-[#396094] text-white shadow-md' : 'bg-transparent text-[#7B8EA0] hover:text-[#142B42]'}`}
                >
                  Publik
                </button>
              </div>
            </div>

            <form className="flex flex-col gap-6" onSubmit={handleSubmit}>

              {/* Judul Jurnal */}
              <div className="mb-6">
                <label className="block text-[#142B42] text-[13px] font-bold mb-3 uppercase tracking-wide">
                  Judul Jurnal <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="Contoh : Rapat Koordinasi Persiapan Pengawasan Pilkada" 
                  className="w-full h-[73px] bg-[#F6F9FC] border border-[#C7C7C7] rounded-[11px] px-5 text-[14px] text-[#142B42] placeholder-[#A0AAB5] focus:outline-none focus:border-[#4F83F5] transition-colors" 
                />
              </div>

              {/* Ringkasan Jurnal */}
              <div className="mb-8">
                <label className="block text-[#142B42] text-[13px] font-bold mb-3 uppercase tracking-wide">
                  Ringkasan Jurnal
                </label>
                <textarea 
                  value={ringkasan}
                  onChange={(e) => setRingkasan(e.target.value)}
                  className="w-full h-[161px] bg-[#F6F9FC] border border-[#C7C7C7] rounded-[11px] p-5 text-[14px] text-[#142B42] focus:outline-none focus:border-[#4F83F5] transition-colors resize-none"
                  placeholder="Ketik ringkasan jurnal di sini"
                ></textarea>
              </div>

              {/* Tanggal & Kategori */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 relative">
                <div>
                  <label className="block text-[#142B42] text-[13px] font-bold mb-3 uppercase tracking-wide">
                    Tanggal Kegiatan <span className="text-red-500">*</span>
                  </label>
                  <div 
                    className="relative outline-none" 
                    tabIndex={0} 
                    onBlur={(e) => { 
                      if (!e.currentTarget.contains(e.relatedTarget)) setIsDatePickerOpen(false); 
                    }}
                  >
                    <div 
                      onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                      className={`w-full h-[73px] bg-[#F6F9FC] border ${isDatePickerOpen ? 'border-[#4F83F5]' : 'border-[#C7C7C7]'} rounded-[11px] px-5 flex items-center justify-between text-[14px] text-[#142B42] cursor-pointer transition-colors`}
                    >
                      <span className="truncate">
                        {tanggalKegiatan ? new Date(tanggalKegiatan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : <span className="text-[#A0AAB5]">Pilih Tanggal</span>}
                      </span>
                      <svg className="text-[#7B8EA0] pointer-events-none" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    </div>
                    
                    {isDatePickerOpen && (
                      <div className="absolute top-[calc(100%+6px)] left-0 w-[300px] bg-white border border-[#E5E7EB] rounded-[15px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] z-50 p-5">
                        <div className="flex items-center justify-between mb-5">
                          <button type="button" onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))} className="w-7 h-7 flex items-center justify-center hover:bg-[#F6F9FC] text-[#142B42] rounded-full transition-colors">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                          </button>
                          <span className="text-[14px] font-bold text-[#142B42]">
                            {MONTH_NAMES[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                          </span>
                          <button type="button" onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))} className="w-7 h-7 flex items-center justify-center hover:bg-[#F6F9FC] text-[#142B42] rounded-full transition-colors">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                          </button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center mb-3">
                          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
                            <div key={d} className="text-[11px] font-bold text-[#7B8EA0]">{d}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {generateCalendar().map((date, idx) => {
                            if (!date) return <div key={`empty-${idx}`} className="h-8"></div>;
                            const tZoffset = date.getTimezoneOffset() * 60000;
                            const localISOTime = (new Date(date.getTime() - tZoffset)).toISOString().split('T')[0];
                            const isSelected = tanggalKegiatan === localISOTime;
                            const isToday = (new Date(Date.now() - tZoffset)).toISOString().split('T')[0] === localISOTime;
                            
                            return (
                              <button 
                                key={localISOTime}
                                type="button"
                                onClick={() => {
                                  setTanggalKegiatan(localISOTime);
                                  setIsDatePickerOpen(false);
                                }}
                                className={`h-8 w-8 mx-auto rounded-full flex items-center justify-center text-[12px] transition-colors ${
                                  isSelected ? 'bg-[#396094] text-white font-bold shadow-sm' : 
                                  isToday ? 'bg-[#EEF2F6] text-[#396094] font-bold' : 
                                  'text-[#142B42] hover:bg-[#F6F9FC] font-medium'
                                }`}
                              >
                                {date.getDate()}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-[#142B42] text-[13px] font-bold mb-3 uppercase tracking-wide">
                    Kategori <span className="text-red-500">*</span>
                  </label>
                  <div 
                    className="relative outline-none" 
                    tabIndex={0} 
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setIsKategoriOpen(false);
                      }
                    }}
                  >
                    <div 
                      onClick={() => setIsKategoriOpen(!isKategoriOpen)}
                      className={`w-full h-[73px] bg-[#F6F9FC] border ${isKategoriOpen ? 'border-[#4F83F5]' : 'border-[#C7C7C7]'} rounded-[11px] px-5 flex items-center justify-between text-[14px] text-[#142B42] cursor-pointer transition-colors`}
                    >
                      <span className="truncate">{kategori}</span>
                      <svg className={`text-[#7B8EA0] transition-transform duration-200 pointer-events-none ${isKategoriOpen ? 'rotate-180' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>

                    {isKategoriOpen && (
                      <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white border border-[#E5E7EB] rounded-[11px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] z-50 py-2 overflow-hidden">
                        {['Penanganan Pelanggaran', 'Penyelesaian Sengketa'].map((opt) => (
                          <div 
                            key={opt}
                            onClick={() => {
                              setKategori(opt);
                              setIsKategoriOpen(false);
                            }}
                            className={`px-5 py-3 text-[14px] cursor-pointer transition-colors ${kategori === opt ? 'bg-[#4F83F5]/10 text-[#4F83F5] font-bold' : 'text-[#142B42] hover:bg-[#F6F9FC]'}`}
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags & Link */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 relative">
                <div>
                  <label className="block text-[#142B42] text-[13px] font-bold mb-3 uppercase tracking-wide">
                    Tags (Pisah dengan koma) <span className="text-red-500">*</span>
                  </label>
                  <input 
                      type="text" 
                      placeholder="Contoh : Pengawasan, Pemilu, Bawaslu" 
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      className="w-full h-[73px] bg-[#F6F9FC] border border-[#C7C7C7] rounded-[11px] px-5 text-[14px] text-[#142B42] placeholder-[#A0AAB5] focus:outline-none focus:border-[#4F83F5] transition-colors" 
                    />
                </div>
                <div>
                  <label className="block text-[#142B42] text-[13px] font-bold mb-3 uppercase tracking-wide">
                    Link Publikasi
                  </label>
                  <div className="flex flex-col gap-3">
                    <input 
                      type="text" 
                      placeholder="https://kebumen.Bawaslu (Tekan Enter untuk menambah)" 
                      value={currentLink}
                      onChange={(e) => setCurrentLink(e.target.value)}
                      onKeyDown={handleAddLink}
                      className="w-full h-[73px] bg-[#F6F9FC] border border-[#C7C7C7] rounded-[11px] px-5 text-[14px] text-[#142B42] placeholder-[#A0AAB5] focus:outline-none focus:border-[#4F83F5] transition-colors" 
                    />
                    {links.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {links.map((link, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-[#F6F9FC] border border-[#C7C7C7] px-4 py-2 rounded-lg group">
                            <a href={link} target="_blank" rel="noreferrer" className="text-[13px] text-[#396094] max-w-[200px] truncate hover:underline">
                              {link}
                            </a>
                            <button 
                              type="button" 
                              onClick={() => removeLink(link)} 
                              className="text-[#A0AAB5] hover:text-red-500 transition-colors"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* File Uploads (Drag & Drop) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                
                {/* Upload Foto */}
                <div 
                  className={`border ${dragActiveFoto ? 'border-[#4F83F5] bg-[#4F83F5]/5' : 'border-[#E5E7EB] bg-white'} rounded-[13px] p-6 shadow-sm transition-colors relative`}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActiveFoto(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActiveFoto(false); }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragActiveFoto(false); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) { handleFotoFiles(e.dataTransfer.files); } }}
                >
                  <input type="file" ref={fotoInputRef} className="hidden" accept="image/*" multiple onChange={(e) => { if (e.target.files) handleFotoFiles(e.target.files); }} />
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-[50px] h-[50px] rounded-[11px] bg-[#FF9A27] flex items-center justify-center shrink-0 shadow-sm">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    </div>
                    <div>
                      <h4 className="text-[#142B42] text-[15px] font-bold mb-0.5">Foto Dokumentasi</h4>
                      <p className="text-[#7B8EA0] text-[13px]">Unggah Foto Kegiatan</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4">
                    {fotos.map((foto, idx) => (
                      <div key={idx} className="relative group rounded-[11px] overflow-hidden w-[90px] h-[90px] border border-[#E5E7EB] shadow-sm">
                        <img src={foto} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeFoto(idx)} className="absolute top-1 right-1 bg-white/90 text-red-500 rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => fotoInputRef.current?.click()} className="w-[90px] h-[90px] rounded-[11px] bg-[#F6F9FC] border border-[#E5E7EB] flex items-center justify-center text-[#7B8EA0] hover:bg-[#EEF2F6] hover:text-[#4F83F5] transition-all cursor-pointer">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                  </div>
                </div>

                {/* Upload Dokumen */}
                <div 
                  className={`border ${dragActiveDoc ? 'border-[#4F83F5] bg-[#4F83F5]/5' : 'border-[#E5E7EB] bg-white'} rounded-[13px] p-6 shadow-sm transition-colors relative`}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActiveDoc(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActiveDoc(false); }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragActiveDoc(false); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) { handleDocFiles(e.dataTransfer.files); } }}
                >
                  <input type="file" ref={docInputRef} className="hidden" accept=".pdf" multiple onChange={(e) => { if (e.target.files) handleDocFiles(e.target.files); }} />
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-[50px] h-[50px] rounded-[11px] bg-[#8FA5C5] flex items-center justify-center shrink-0 shadow-sm">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </div>
                    <div>
                      <h4 className="text-[#142B42] text-[15px] font-bold mb-0.5">Dokumen Pendukung</h4>
                      <p className="text-[#7B8EA0] text-[13px]">PDF Lampiran Kegiatan</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    {docs.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-[#F6F9FC] border border-[#E5E7EB] px-4 py-3 rounded-[9px] group">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <svg className="text-[#D92D20] shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                          <span className="text-[#142B42] text-[13px] font-bold truncate max-w-[200px]">{doc.nama}</span>
                        </div>
                        <button type="button" onClick={() => removeDoc(idx)} className="text-[#A0AAB5] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => docInputRef.current?.click()} className="w-full h-[46px] rounded-[9px] bg-[#EEF2F6] flex items-center justify-center gap-2 text-[#7B8EA0] text-[13px] font-bold hover:bg-[#E5E9F0] hover:text-[#142B42] transition-colors cursor-pointer mt-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                      Tambah Dokumen
                    </button>
                  </div>
                </div>

              </div>

              {/* Pihak Terkait */}
              <div>
                <label className="block text-[#142B42] text-[13px] font-bold mb-3 uppercase tracking-wide">Pihak Terkait</label>
                <input 
                  type="text" 
                  value={pihakTerkaitInput}
                  onChange={(e) => setPihakTerkaitInput(e.target.value)}
                  placeholder="Contoh: KPU, Dinas Kesehatan, Universitas (Maks 2, pisahkan dengan koma)"
                  className="w-full h-[73px] bg-[#F6F9FC] border border-[#C7C7C7] rounded-[11px] px-5 text-[14px] text-[#142B42] focus:outline-none focus:border-[#4F83F5] transition-colors" 
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-[12px] text-gray-500 font-medium py-1">Saran Instansi:</span>
                  {['KPU', 'Bawaslu', 'Dinas', 'Pemda', 'Universitas', 'Sekolah', 'Polres', 'LSM'].map(saran => (
                    <button
                      key={saran}
                      type="button"
                      onClick={() => setPihakTerkaitInput(prev => prev ? prev + ', ' + saran : saran)}
                      className="px-3 py-1 bg-white border border-gray-200 rounded-full text-[11px] text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                    >
                      + {saran}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-gray-400">
                  *Sistem akan otomatis mengkategorikan statistik berdasarkan kata kunci (contoh: &quot;Dinas&quot; masuk ke Pemerintah Daerah).
                </p>
              </div>

              {/* Submit Action */}
              <div className="mt-3 pt-10 border-t border-[#BAC4DF] flex justify-end">
                <div className="relative">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className={`w-[229px] h-[59px] bg-[#396094] hover:bg-[#2A4B75] text-white font-bold text-[14px] rounded-[15px] flex items-center justify-center gap-2 transition-colors ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? 'Mengirim...' : activeMenu === 'edit' ? 'Simpan Perubahan' : 'Ajukan Jurnal'}
                    {!isSubmitting && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    )}
                  </button>
                </div>
              </div>

              </form>
            </div>
          </div>
        )}
      </main>

    </div>
    </QueryClientProvider>
  )
}





