"use client"
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = ['Ming', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const CalendarSection = ({ onEventClick }: { onEventClick?: (jurnalId: string) => void }) => {
  const router = useRouter();
  // Mulai dari bulan berjalan.
  const [currentDate, setCurrentDate] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1) });
  const [activeDates, setActiveDates] = useState<number[]>([]);
  const [eventsMap, setEventsMap] = useState<Record<number, { id: string, judul: string }[]>>({});
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    const fetchCalendar = async () => {
      setLoading(true);
      try {
        const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
        const res = await fetch(`/api/jurnal/calendar?month=${monthStr}`);
        const data = await res.json();
        if (data.status === 'ok') {
          setActiveDates(data.data.dates || []);
          setEventsMap(data.data.eventsMap || {});
        } else {
          setActiveDates([]);
          setEventsMap({});
        }
      } catch (err) {
        console.error(err);
        setActiveDates([]);
        setEventsMap({});
      } finally {
        setLoading(false);
      }
    };
    fetchCalendar();
    setSelectedDate(null); // Reset popup on month change
  }, [year, month]);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Calendar logic
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const gridCells = [];
  // Previous month days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    gridCells.push({ day: daysInPrevMonth - i, isCurrentMonth: false });
  }
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    gridCells.push({ day: i, isCurrentMonth: true });
  }
  // Next month days to fill grid (either 35 or 42 cells)
  const totalCells = gridCells.length > 35 ? 42 : 35;
  let nextMonthDay = 1;
  while (gridCells.length < totalCells) {
    gridCells.push({ day: nextMonthDay++, isCurrentMonth: false });
  }

  const isToday = (d: number) => {
    const today = new Date();
    return d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  return (
    <section id="section-kalender" className="w-full max-w-[1440px] mx-auto px-4 md:px-10 mt-8 mb-12">
      <div className="w-full bg-white rounded-[32px] border border-[#E5E7EB] shadow-sm flex flex-col md:flex-row overflow-hidden min-h-[700px]" style={{ fontFamily: 'Poppins' }}>
        
        {/* Left Sidebar - Mini Calendar */}
        <div className="w-full md:w-[320px] bg-white border-r border-[#E5E7EB] p-8 flex flex-col hidden md:flex">
          <div className="flex items-center gap-2 mb-10">
            <h2 className="text-[#142B42] text-[20px] font-semibold">Kalender</h2>
            <div className="flex gap-1 ml-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF4C4C]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFA500]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#00D084]"></div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6 px-2">
            <button onClick={handlePrevMonth} className="text-gray-400 hover:text-gray-700 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <h3 className="text-[#142B42] text-[14px] font-medium">{MONTH_NAMES[month]} {year}</h3>
            <button onClick={handleNextMonth} className="text-gray-400 hover:text-gray-700 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-4 text-center mb-4">
            {DAY_NAMES.map((day) => (
              <div key={day} className="text-[#142B42] text-[12px] font-medium">{day}</div>
            ))}
            
            {gridCells.map((cell, i) => {
              const hasEvent = cell.isCurrentMonth && activeDates.includes(cell.day);
              const today = cell.isCurrentMonth && isToday(cell.day);
              
              if (!cell.isCurrentMonth) {
                return <div key={i}></div>;
              }
              
              return (
                <div key={i} className="flex flex-col items-center justify-center gap-1 cursor-pointer">
                  <span className={`text-[13px] font-medium w-7 h-7 flex items-center justify-center rounded-full ${today ? 'bg-[#346BFF] text-white' : 'text-[#5D6A77] hover:bg-gray-100'}`}>
                    {cell.day}
                  </span>
                  <div className={`w-3 h-[3px] rounded-full transition-colors ${hasEvent ? 'bg-[#FFB054]' : 'bg-transparent'}`}></div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 border-t border-gray-100 pt-6">
            <h4 className="text-[#142B42] text-[14px] font-semibold mb-4">Keterangan</h4>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 rounded-full bg-[#FFB054]"></div>
              <span className="text-[#5D6A77] text-[13px]">Ada Kegiatan Jurnal</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#346BFF]"></div>
              <span className="text-[#5D6A77] text-[13px]">Hari Ini</span>
            </div>
          </div>
        </div>

        {/* Right Main Content */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-6">
              <button onClick={handlePrevMonth} className="text-gray-400 hover:text-gray-700 p-2 transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <h2 className="text-[#142B42] text-[24px] font-semibold w-[220px] text-center">
                {MONTH_NAMES[month]} {year}
              </h2>
              <button onClick={handleNextMonth} className="text-gray-400 hover:text-gray-700 p-2 transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 flex flex-col">
            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-[#E5E7EB]">
              {DAY_NAMES.map((day) => (
                <div key={day} className="py-4 px-4 text-[#142B42] text-[15px] font-semibold text-center border-r border-[#E5E7EB] last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid Body */}
            <div className="flex-1 grid grid-cols-7 auto-rows-[minmax(120px,1fr)]">
              {gridCells.map((cell, i) => {
                const hasEvent = cell.isCurrentMonth && activeDates.includes(cell.day);
                const isBorderR = (i + 1) % 7 !== 0;
                const isBorderB = Math.floor(i / 7) < (gridCells.length / 7) - 1;
                const today = cell.isCurrentMonth && isToday(cell.day);

                return (
                  <div key={i} className={`p-3 relative flex flex-col ${isBorderR ? 'border-r border-[#E5E7EB]' : ''} ${isBorderB ? 'border-b border-[#E5E7EB]' : ''}`}>
                    <span className={`text-[14px] font-medium inline-flex items-center justify-center w-7 h-7 mb-2 ${!cell.isCurrentMonth ? 'text-[#A0ABBB]' : today ? 'bg-[#346BFF] text-white rounded-full' : 'text-[#142B42]'}`}>
                      {cell.day}
                    </span>
                    
                    {hasEvent && (
                        <>
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(selectedDate === cell.day ? null : cell.day);
                            }} 
                            className="w-full bg-[#FFDFB8] hover:bg-[#ffc98a] cursor-pointer text-[#F7921C] text-[11px] font-semibold px-2 py-1.5 rounded-[6px] truncate transition-all shadow-sm"
                          >
                            Ada Kegiatan
                          </div>

                          {/* Popup Detail */}
                            {selectedDate === cell.day && (
                                <div className={`absolute ${Math.floor(i / 7) >= 3 ? 'bottom-[80%] pb-2' : 'top-[80%] pt-2'} left-1/2 -translate-x-1/2 z-50 w-[250px]`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="relative w-full">
                                  {/* White Front Layer */}
                                    <div className="relative z-10 w-full bg-white rounded-[20px] p-4 text-left shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-[#E5E7EB] max-h-[200px] overflow-y-auto custom-scrollbar">
                                    <div className="flex items-center justify-between text-[#F7921C] mb-3">
                                      <div className="flex items-center gap-2">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                          <line x1="16" y1="2" x2="16" y2="6"></line>
                                          <line x1="8" y1="2" x2="8" y2="6"></line>
                                          <line x1="3" y1="10" x2="21" y2="10"></line>
                                        </svg>
                                        <span className="text-[15px] font-bold">{cell.day} {MONTH_NAMES[month].substring(0,3)} {year}</span>
                                      </div>
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                    </div>
                                    <ul className="space-y-2.5">
                                      {eventsMap[cell.day]?.map((evt, idx) => (
                                        <li 
                                          key={idx} 
                                          className="flex items-start gap-2.5 cursor-pointer group"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            // Klik judul kegiatan → buka detail jurnal tersebut.
                                            if (onEventClick) {
                                              onEventClick(evt.id);
                                            } else {
                                              router.push(`/?date=${year}-${String(month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}#section-arsip`);
                                            }
                                            setSelectedDate(null);
                                          }}
                                        >
                                          <div className="w-2.5 h-2.5 rounded-full bg-[#F7921C] mt-[4px] shrink-0 group-hover:scale-125 transition-transform"></div>
                                          <span className="text-[14px] text-[#5D6A77] font-semibold leading-tight group-hover:text-[#346BFF] transition-colors">{evt.judul}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            )}
                        </>
                      )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
