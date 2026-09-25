import React, { useState } from 'react';

import type { JurnalWorkspace } from '@/features/jurnal-saya/api/get-my-jurnals.action';

import { useRouter } from 'next/navigation';

import { setujuJurnalAction, tolakJurnalAction } from '@/features/jurnal-saya/api/approve.action';



export default function Approval({ workspace }: { workspace: JurnalWorkspace | null }) {

  const router = useRouter();

  const subordinates = [
    ...(workspace?.mine || []).filter(s => s.status === 'publish_pending'),
    ...(workspace?.subordinates || []).filter(s => s.status === 'publish_pending')
  ];

  

  const [selectedQueue, setSelectedQueue] = useState(subordinates[0]?.id || null);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);

  const [isApproved, setIsApproved] = useState(false);

  const [isRejecting, setIsRejecting] = useState(false);



  const selectedItem = subordinates.find(item => item.id === selectedQueue) || subordinates[0];



  return (

    <div className="px-8 pt-8 pb-8">

      <div className="flex flex-row gap-8">

        

        {/* Left Column: Queue List */}

        <div className="w-full md:w-[469px] flex flex-col shrink-0">

          <div className="mb-6">

            <div className="flex items-center gap-3 mb-1">

              <h3 className="text-[20px] font-bold text-[#142B42]">Antrean baru</h3>

              <span className="bg-[#D92D20] text-white text-[12px] font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">{subordinates.length}</span>

            </div>

            <p className="text-[#5D6A77] text-[13px]">Pilih jurnal untuk mulai meninjau</p>

          </div>

          

          <div className="flex flex-col gap-4 overflow-y-auto pr-2 pb-10">

            {subordinates.length === 0 && (

               <div className="text-gray-400 p-4 border rounded text-center text-sm">Tidak ada antrean baru.</div>

            )}

            {subordinates.map((item) => (

              <div 

                key={item.id}

                onClick={() => setSelectedQueue(item.id)}

                className={`bg-white rounded-[11px] border ${selectedQueue === item.id ? 'border-[#075599] shadow-sm' : 'border-[#E2E8F0] shadow-sm'} p-5 cursor-pointer transition-all hover:border-[#075599]/50`}

              >

                <div className="flex items-center gap-3 mb-4">

                  <span className="bg-[#FEF3C7] text-[#D97706] text-[10px] font-bold px-2.5 py-1 rounded-[6px]">Menunggu Review</span>

                  <span className="text-[#7B8EA0] text-[10px] font-medium">{item.tanggal_kegiatan || '-'}</span>

                </div>

                <h4 className="text-[#142B42] text-[13px] font-bold mb-5 leading-snug">{item.judul || 'Untitled'}</h4>

                <div className="flex items-center justify-between mt-1">

                  <div className="flex items-center gap-5 text-[10px] text-[#7B8EA0] font-medium leading-[1.3]">

                    <div className="flex items-center gap-1.5">

                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> 

                      <span>{item.owner_name || 'Staf'}</span>

                    </div>

                    <div className="flex items-center gap-1.5">

                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> 

                      <span>{item.divisi || 'Divisi'}</span>

                    </div>

                  </div>

                  <button className="w-[102px] h-[28px] shrink-0 flex items-center justify-center bg-[#F7921C] text-white text-[10px] font-bold rounded-[6px] hover:bg-[#e08419] transition-colors">Tinjau jurnal</button>

                </div>

              </div>

            ))}

          </div>

        </div>



        {/* Right Column: Details Preview */}

        <div className="flex-1 min-w-0 flex flex-col">

          {selectedItem ? (

          <div className="rounded-[16px] border border-[#D9E2EC] bg-white flex flex-col overflow-hidden">

            <div className="bg-[#0F3963] px-8 pt-8 pb-6 flex flex-col relative text-white rounded-t-[16px]">

              <h2 className="text-[20px] font-bold leading-[1.4] mb-8 pr-12 text-white">

                {selectedItem.judul}

              </h2>

              <div className="flex items-center gap-6 text-[11px] font-medium opacity-90 text-white">

                <div className="flex items-center gap-2">

                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>

                  {selectedItem.tanggal_kegiatan}

                </div>

                <div className="flex items-center gap-2">

                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>

                  {selectedItem.kategori}

                </div>

              </div>

            </div>

              <div className="p-8 pb-6 border-b border-[#F0F4F8] flex flex-col gap-6 text-[12px] text-[#142B42] overflow-y-auto max-h-[500px]">

                {/* Ringkasan Jurnal */}

                <div>

                  <h5 className="font-bold mb-3">Ringkasan Jurnal</h5>

                  <p className="leading-relaxed opacity-80">

                    {selectedItem.deskripsi || 'Tidak ada deskripsi.'}

                  </p>

                </div>



                {/* Dokumentasi */}

                <div>

                  <div className="flex items-center gap-2 font-bold mb-3">

                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>

                    Dokumentasi

                  </div>

                  <div className="flex gap-3 overflow-x-auto">

                    {selectedItem.dokumentasi && selectedItem.dokumentasi.length > 0 ? (

                      selectedItem.dokumentasi.map((doc, idx) => {

                        const isValidUrl = doc.url && (doc.url.startsWith('http') || doc.url.startsWith('/') || doc.url.startsWith('data:') || doc.url.startsWith('blob:'));

                        return (

                          <div key={idx} className="w-[180px] h-[100px] bg-gray-200 rounded-[8px] overflow-hidden shrink-0 cursor-pointer" onClick={() => isValidUrl && window.open(doc.url, '_blank')}>

                            <img src={isValidUrl ? doc.url : '/assets/banner-image.jpg'} alt={`Dokumentasi ${idx + 1}`} className="w-full h-full object-cover" />

                          </div>

                        );

                      })

                    ) : (

                      <span className="text-gray-400 italic">Tidak ada foto dokumentasi</span>

                    )}

                  </div>

                </div>



                {/* Dokumen Pendukung */}

                <div>

                  <div className="flex items-center gap-2 font-bold mb-3">

                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>

                    Dokumen pendukung

                  </div>

                  <div className="flex flex-col gap-2">

                    {selectedItem.dokumen_pendukung && selectedItem.dokumen_pendukung.length > 0 ? (

                      selectedItem.dokumen_pendukung.map((dok, idx) => (

                        <a key={idx} href={dok.url} target="_blank" rel="noreferrer" download={dok.nama} className="flex items-center justify-between border border-[#E2E8F0] rounded-[8px] p-3 hover:border-[#075599] transition-colors cursor-pointer">

                          <div className="flex items-center gap-3">

                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7B8EA0" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>

                            <span className="font-medium text-[#142B42]">{dok.nama}</span>

                          </div>

                          <div className="flex items-center gap-3">

                            <span className="text-[#075599] font-bold text-[11px]">PDF</span>

                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#075599" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            </div>
                          </a>
                        ))
                      ) : (

                      <span className="text-gray-400 italic">Tidak ada dokumen pendukung</span>

                    )}

                  </div>

                </div>



                {/* Pihak Terkait */}

                <div>

                  <div className="flex items-center gap-2 font-bold mb-3">

                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>

                    Pihak Terkait

                  </div>

                  <div className="border border-[#E2E8F0] rounded-[8px] p-3 flex gap-2 overflow-x-auto">

                    {selectedItem.pihak_terkait && selectedItem.pihak_terkait.length > 0 ? (

                      selectedItem.pihak_terkait.map((pihak, idx) => (

                        <span key={idx} className="px-3 py-1.5 bg-[#F0F4F8] text-[#142B42] rounded-[6px] font-medium whitespace-nowrap">

                          {pihak.nama}

                        </span>

                      ))

                    ) : (

                      <span className="text-gray-400 italic">Tidak ada pihak terkait</span>

                    )}

                  </div>

                </div>



                {/* Publikasi Berita */}

                <div>

                  <div className="flex items-center gap-2 font-bold mb-3 text-[#142B42]">

                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>

                    Publikasi Berita

                  </div>

                  {selectedItem.link_publikasi ? (

                    <div className="border border-[#E2E8F0] rounded-[8px] p-3 flex items-center justify-between cursor-pointer hover:border-[#075599] transition-colors" onClick={() => window.open(selectedItem.link_publikasi, '_blank')}>

                      <span className="font-medium text-[#142B42] text-[12px] truncate max-w-[85%]">{selectedItem.link_publikasi}</span>

                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#142B42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>

                    </div>

                  ) : (

                    <div className="border border-[#E2E8F0] rounded-[8px] p-3 flex">

                      <span className="text-gray-400 italic">Tidak ada link publikasi</span>

                    </div>

                  )}

                </div>

              </div>

            

            <div className="px-8 pt-6 pb-8 bg-white rounded-b-[16px] flex gap-3 w-full">

              {!isApproved ? (

                <>

                  <button 

                    onClick={() => setIsRejectModalOpen(true)}

                    className="flex-1 flex items-center justify-center gap-2 h-[40px] rounded-[6px] border border-[#D92D20] text-[#D92D20] text-[12px] font-bold bg-white hover:bg-[#FEF3F2] transition-colors"

                  >

                    Tolak/Kembalikan

                  </button>

                  <button 

                    onClick={() => router.push(`?tab=edit&editId=${selectedItem.id}`)}

                    className="flex-1 flex items-center justify-center gap-2 h-[40px] rounded-[6px] border border-[#0F3963] text-[#0F3963] text-[12px] font-bold bg-white hover:bg-gray-50 transition-colors"

                  >

                    Edit Jurnal

                  </button>

                  <button 

                    onClick={() => setIsApproveModalOpen(true)}

                    className="flex-1 flex items-center justify-center gap-2 h-[40px] rounded-[6px] bg-[#EE8810] text-white text-[12px] font-bold hover:bg-[#d4780e] transition-colors"

                  >

                    Setuju jurnal

                  </button>

                </>

              ) : (

                <>

                  <button onClick={() => setIsApproved(false)} className="flex-1 flex items-center justify-center h-[40px] rounded-[6px] border border-[#0F3963] text-[#0F3963] text-[12px] font-bold bg-white hover:bg-gray-50 transition-colors">

                    Kembali ke Antrean

                  </button>

                  {subordinates.find(i => i.id !== selectedItem.id && i.status === 'publish_pending') && (

                    <button onClick={() => {

                      const nextItem = subordinates.find(i => i.id !== selectedItem.id && i.status === 'publish_pending');

                      if (nextItem) setSelectedQueue(nextItem.id);

                      setIsApproved(false);

                    }} className="w-[325px] flex items-center justify-center gap-2 h-[40px] rounded-[6px] bg-[#EE8810] text-white text-[12px] font-bold hover:bg-[#d4780e] transition-colors">

                      Tinjau Jurnal berikutnya

                    </button>

                  )}

                </>

              )}

            </div>

          </div>

          ) : (

            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-[#7B8EA0] opacity-60">

              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4">

                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>

                <line x1="9" y1="3" x2="9" y2="21"></line>

              </svg>

              <p className="text-[14px]">Pilih jurnal untuk melihat detail</p>

            </div>

          )}

        </div>



      </div>



      {/* Reject Modal */}

      {isRejectModalOpen && selectedItem && (

        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">

          <div className="bg-white rounded-[10px] p-8 w-[734px] shadow-2xl flex flex-col">

            <h2 className="text-[#142B42] text-[27px] font-bold mb-3">Tolak Jurnal ini?</h2>

            <p className="text-[#5D6A77] text-[16px] leading-relaxed mb-6">

              Jurnal <span className="font-bold text-[#142B42]">{selectedItem.judul}</span> akan dikembalikan ke staf pengaju untuk direvisi.

            </p>

            <div className="flex justify-end gap-3">

              <button 

                onClick={() => setIsRejectModalOpen(false)}

                disabled={isRejecting}

                className="w-[126px] h-[56px] rounded-[13px] border border-[rgba(0,0,0,0.43)] text-[#142B42] text-[16px] font-bold bg-white hover:bg-gray-50 transition-colors"

              >

                Batal

              </button>

              <button 

                onClick={async () => {

                  setIsRejecting(true);

                  await tolakJurnalAction(selectedItem.id);

                  setIsRejecting(false);

                  setIsRejectModalOpen(false);

                  setIsApproved(true);

                }}

                disabled={isRejecting}

                className="w-[199px] h-[56px] rounded-[13px] bg-[#EFD3D0] text-[#AB0000] text-[20px] font-semibold hover:bg-[#e3c2bf] transition-colors"

              >

                {isRejecting ? 'Loading...' : 'Kirim Penolakan'}

              </button>

            </div>

          </div>

        </div>

      )}



      {/* Approve Modal */}

      {isApproveModalOpen && selectedItem && (

        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">

          <div className="bg-white rounded-[10px] p-8 w-[734px] shadow-2xl flex flex-col">

            <h2 className="text-[#142B42] text-[27px] font-bold mb-3">Setujui Jurnal ini?</h2>

            <p className="text-[#5D6A77] text-[16px] leading-relaxed mb-6">

              Anda akan menyetujui <span className="font-bold">{selectedItem.judul}</span>.

            </p>

            <div className="flex justify-end gap-3">

              <button 

                onClick={() => setIsApproveModalOpen(false)}

                disabled={isRejecting}

                className="w-[126px] h-[56px] rounded-[13px] border border-[rgba(0,0,0,0.43)] text-[#142B42] text-[16px] font-bold bg-white hover:bg-gray-50 transition-colors"

              >

                Batal

              </button>

              <button 

                onClick={async () => {

                  setIsRejecting(true);

                  await setujuJurnalAction(selectedItem.id);

                  setIsRejecting(false);

                  setIsApproved(true);

                  setIsApproveModalOpen(false);

                }}

                disabled={isRejecting}

                className="w-[199px] h-[56px] rounded-[13px] bg-[#E1F3EA] text-[#0F9347] text-[20px] font-semibold hover:bg-[#d1ebd9] transition-colors"

              >

                {isRejecting ? 'Loading...' : 'Setujui Jurnal'}

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}



















