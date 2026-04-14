import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Calendar as CalendarIcon, TrendingUp, Scissors, UserX, ChevronLeft, ChevronRight, BarChart3, AlertCircle, X } from 'lucide-react';
import { createPortal } from 'react-dom';

const CustomDatePicker = ({ currentDate, onSelectDate, onClose, filterType }) => {
  const [viewDate, setViewDate] = useState(new Date(currentDate));
  const currentView = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const daysInMonth = new Date(currentView.getFullYear(), currentView.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = currentView.getDay();
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  const prevMonth = (e) => { e.stopPropagation(); setViewDate(new Date(currentView.getFullYear(), currentView.getMonth() - 1, 1)); };
  const nextMonth = (e) => { e.stopPropagation(); setViewDate(new Date(currentView.getFullYear(), currentView.getMonth() + 1, 1)); };
  
  const isSelected = (d) => currentDate.getDate() === d && currentDate.getMonth() === currentView.getMonth() && currentDate.getFullYear() === currentView.getFullYear();
  const isToday = (d) => {
    const t = new Date();
    return t.getDate() === d && t.getMonth() === currentView.getMonth() && t.getFullYear() === currentView.getFullYear();
  }

  return (
    <div 
      className="absolute top-[130%] left-1/2 sm:left-auto lg:-translate-x-1/2 sm:-translate-x-0 sm:right-0 w-[280px] bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-5 z-[1000] animate-in fade-in zoom-in-95 duration-200 cursor-default"
      onClick={(e) => e.stopPropagation()}
    >
       {/* If we are analyzing by Year, just show months. For Month/Week/Day show days */}
       {filterType === 'year' ? (
         <div className="grid grid-cols-3 gap-2">
           <div className="col-span-3 flex justify-between items-center mb-4">
             <button onClick={(e) => { e.stopPropagation(); setViewDate(new Date(currentView.getFullYear() - 10, 1, 1)); }} className="p-1.5 hover:bg-white/10 rounded-full transition-colors"><ChevronLeft className="w-5 h-5 text-gray-400"/></button>
             <div className="font-extrabold text-sm text-white uppercase tracking-widest">{Math.floor(currentView.getFullYear() / 10) * 10} - {Math.floor(currentView.getFullYear() / 10) * 10 + 9}</div>
             <button onClick={(e) => { e.stopPropagation(); setViewDate(new Date(currentView.getFullYear() + 10, 1, 1)); }} className="p-1.5 hover:bg-white/10 rounded-full transition-colors"><ChevronRight className="w-5 h-5 text-gray-400"/></button>
           </div>
           {Array.from({ length: 12 }).map((_, i) => {
             const year = Math.floor(currentView.getFullYear() / 10) * 10 - 1 + i;
             return (
               <button
                 key={year}
                 onClick={(e) => {
                   e.stopPropagation();
                   onSelectDate(new Date(year, 0, 1));
                 }}
                 className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${currentDate.getFullYear() === year ? 'bg-white text-black' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
               >
                 {year}
               </button>
             );
           })}
         </div>
       ) : filterType === 'month' ? (
         <div className="grid grid-cols-3 gap-2">
           <div className="col-span-3 flex justify-between items-center mb-4">
             <button onClick={(e) => { e.stopPropagation(); setViewDate(new Date(currentView.getFullYear() - 1, 1, 1)); }} className="p-1.5 hover:bg-white/10 rounded-full transition-colors"><ChevronLeft className="w-5 h-5 text-gray-400"/></button>
             <div className="font-extrabold text-sm text-white uppercase tracking-widest">{currentView.getFullYear()}</div>
             <button onClick={(e) => { e.stopPropagation(); setViewDate(new Date(currentView.getFullYear() + 1, 1, 1)); }} className="p-1.5 hover:bg-white/10 rounded-full transition-colors"><ChevronRight className="w-5 h-5 text-gray-400"/></button>
           </div>
           {monthNames.map((m, i) => (
             <button
               key={m}
               onClick={(e) => {
                 e.stopPropagation();
                 onSelectDate(new Date(currentView.getFullYear(), i, 1));
               }}
               className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${currentDate.getMonth() === i && currentDate.getFullYear() === currentView.getFullYear() ? 'bg-white text-black' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
             >
               {m.substring(0,3)}
             </button>
           ))}
         </div>
       ) : (
         <>
           <div className="flex justify-between items-center mb-5">
             <button onClick={prevMonth} className="p-1.5 hover:bg-white/10 rounded-full transition-colors"><ChevronLeft className="w-5 h-5 text-gray-400"/></button>
             <div className="font-extrabold text-sm text-white uppercase tracking-widest">{monthNames[currentView.getMonth()]} {currentView.getFullYear()}</div>
             <button onClick={nextMonth} className="p-1.5 hover:bg-white/10 rounded-full transition-colors"><ChevronRight className="w-5 h-5 text-gray-400"/></button>
           </div>
           
           <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[10px] font-black uppercase tracking-widest text-gray-500">
             {dayNames.map(d => <div key={d} className="py-1">{d}</div>)}
           </div>
           
           <div className="grid grid-cols-7 gap-1 text-center text-sm font-semibold">
             {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
             {Array.from({ length: daysInMonth }).map((_, i) => {
               const d = i + 1;
               const selected = isSelected(d);
               const today = isToday(d);
               return (
                 <button 
                   key={d}
                   onClick={(e) => {
                     e.stopPropagation();
                     onSelectDate(new Date(currentView.getFullYear(), currentView.getMonth(), d));
                   }}
                   className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center transition-colors ${selected ? 'bg-white text-black font-extrabold shadow-[0_0_10px_rgba(255,255,255,0.3)]' : today ? 'text-[#38bdf8] font-extrabold bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20' : 'text-gray-400 hover:bg-white/10 hover:text-white'} `}
                 >
                   {d}
                 </button>
               );
             })}
           </div>
         </>
       )}

       <div className="mt-5 pt-4 border-t border-white/10 flex justify-end">
         <button 
           onClick={(e) => {
             e.stopPropagation();
             onSelectDate(new Date());
             onClose();
           }}
           className="text-[11px] font-black text-[#38bdf8] hover:text-white transition-colors uppercase tracking-widest px-3 py-1.5 hover:bg-white/10 rounded-lg border border-transparent"
         >
           Hoy
         </button>
       </div>
    </div>
  )
};

// timetz "HH:MM:SS+00" (UTC) → minutos desde medianoche
const timetzToMins = (t) => {
  if (!t) return null;
  const [h, m] = t.substring(0, 5).split(':').map(Number);
  return h * 60 + m;
};

// Minutos abiertos en un día según la fila de Horario
const calcDayOpenMins = (row) => {
  if (!row || !row.abierto) return 0;
  const aperMañ   = timetzToMins(row.horaAperturaMañana);
  const cierreMañ = timetzToMins(row.horaCierreMañana);
  const aperTarde  = timetzToMins(row.horaAperturaTarde);
  const cierreTarde = timetzToMins(row.horaCierreTarde);
  if (aperMañ === null) return 0;
  // Continuo (sin cierre mañana ni apertura tarde)
  if (!cierreMañ && !aperTarde) return cierreTarde !== null ? cierreTarde - aperMañ : 0;
  // Con siesta (dos bloques)
  if (aperTarde !== null && cierreTarde !== null && cierreMañ !== null)
    return (cierreMañ - aperMañ) + (cierreTarde - aperTarde);
  // Solo mañana
  if (cierreMañ !== null) return cierreMañ - aperMañ;
  return 0;
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [data, setData] = useState({ citas: [], peluqueros: {}, cortes: {}, horarioRows: [] });
  
  // Filters
  const [filterType, setFilterType] = useState('month'); // day, week, month, year
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const menuRef = React.useRef(null);

  // Modal for breakdown
  const [selectedHairdresser, setSelectedHairdresser] = useState(null);
  const [showNoShowsModal, setShowNoShowsModal] = useState(false);

  // Helper to normalize date
  const formatDate = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  // Compute period bounds
  const periodBounds = useMemo(() => {
    const start = new Date(referenceDate);
    const end = new Date(referenceDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (filterType === 'day') {
      // already set
    } else if (filterType === 'week') {
      const day = start.getDay();
      const diffStart = start.getDate() - day + (day === 0 ? -6 : 1); // Lunes
      start.setDate(diffStart);
      end.setDate(start.getDate() + 6);
    } else if (filterType === 'month') {
      start.setDate(1);
      end.setMonth(end.getMonth() + 1, 0);
    } else if (filterType === 'year') {
      start.setMonth(0, 1);
      end.setMonth(11, 31);
    }
    
    return { 
      start: formatDate(start), 
      end: formatDate(end),
      startObj: start,
      endObj: end
    };
  }, [referenceDate, filterType]);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Citas dentro del rango. Aseguramos que la fechaInicio contenga fechas hasta fin de dia.
      const [{ data: citasData }, { data: peluquerosData }, { data: cortesData }, { data: horarioData }] = await Promise.all([
        supabase.from('Citas').select('*, Cliente(*)').gte('fechaInicio', `${periodBounds.start} 00:00:00`).lte('fechaInicio', `${periodBounds.end} 23:59:59`),
        supabase.from('Peluqueros').select('*'),
        supabase.from('Tipo Corte').select('*'),
        supabase.from('Horario').select('*').gte('dia', periodBounds.start).lte('dia', periodBounds.end)
      ]);

      const pMap = {};
      (peluquerosData || []).forEach(p => pMap[p.idPeluquero] = p.nombre);

      const cMap = {};
      (cortesData || []).forEach(c => cMap[c.idCorte] = c.nombreCorte);

      setData({
        citas: citasData || [],
        peluqueros: pMap,
        cortes: cMap,
        horarioRows: horarioData || []
      });
    } catch (err) {
      console.error(err);
      setLoadError('No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [periodBounds]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsDateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const prevPeriod = () => {
    const next = new Date(referenceDate);
    if (filterType === 'day') next.setDate(next.getDate() - 1);
    else if (filterType === 'week') next.setDate(next.getDate() - 7);
    else if (filterType === 'month') next.setMonth(next.getMonth() - 1);
    else if (filterType === 'year') next.setFullYear(next.getFullYear() - 1);
    setReferenceDate(next);
  };

  const nextPeriod = () => {
    const next = new Date(referenceDate);
    if (filterType === 'day') next.setDate(next.getDate() + 1);
    else if (filterType === 'week') next.setDate(next.getDate() + 7);
    else if (filterType === 'month') next.setMonth(next.getMonth() + 1);
    else if (filterType === 'year') next.setFullYear(next.getFullYear() + 1);
    setReferenceDate(next);
  };

  const isCurrentPeriod = (() => {
    const now = new Date();
    if (filterType === 'day') return formatDate(referenceDate) === formatDate(now);
    if (filterType === 'week') {
      const weekStart = (d) => { const day = d.getDay(); return new Date(d.getFullYear(), d.getMonth(), d.getDate() - (day === 0 ? 6 : day - 1)); };
      return weekStart(referenceDate).toDateString() === weekStart(now).toDateString();
    }
    if (filterType === 'month') return referenceDate.getMonth() === now.getMonth() && referenceDate.getFullYear() === now.getFullYear();
    if (filterType === 'year') return referenceDate.getFullYear() === now.getFullYear();
    return true;
  })();

  const getLabel = () => {
    if (filterType === 'day') return referenceDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    if (filterType === 'week') {
      const fmt = (s) => new Date(s + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      return `${fmt(periodBounds.start)} – ${fmt(periodBounds.end)}`;
    }
    if (filterType === 'month') return referenceDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    if (filterType === 'year') return referenceDate.getFullYear().toString();
    return '';
  };

  // --- Compute KPIs ---
  // Only completely non-cancelled items.
  const validCitas = data.citas.filter(c => !c.cancelada);
  
  // Total Citas Atendidas (Strictly by attendance status)
  const attendedCitas = validCitas.filter(c => c.asistencia === true);
  
  // No shows: Citas that were marked as NOT attended
  const noShows = validCitas.filter(c => c.asistencia === false);
  
  // Confirmed appointments (useful for "incoming" services count)
  const confirmedCitas = validCitas.filter(c => c.confirmado === true);

  const totalRevenue = attendedCitas.reduce((acc, c) => acc + (Number(c.precio) || 0), 0);

  // Group by Hairdresser and Services
  const byHairdresser = {};
  Object.keys(data.peluqueros).forEach(id => {
    byHairdresser[id] = { id, name: data.peluqueros[id], count: 0, revenue: 0, servicesBreakdown: {} };
  });

  attendedCitas.forEach(c => {
    const pid = c.idPeluquero || c.peluquero || 1;
    if (byHairdresser[pid]) {
      byHairdresser[pid].count++;
      byHairdresser[pid].revenue += Number(c.precio) || 0;
      
      const corteId = c.corte || c.idCorte;
      const corteName = data.cortes[corteId] || c.tipo_corte || 'Otros';
      if (!byHairdresser[pid].servicesBreakdown[corteName]) {
        byHairdresser[pid].servicesBreakdown[corteName] = 0;
      }
      byHairdresser[pid].servicesBreakdown[corteName]++;
    }
  });

  // Popular days and hours among attended
  const dayCounts = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 }; // Sunday to Saturday
  const hourCounts = {};
  
  attendedCitas.forEach(c => {
    if (c.fechaInicio) {
      const d = new Date(c.fechaInicio);
      dayCounts[d.getDay()]++;
      const hStr = `${d.getHours().toString().padStart(2, '0')}:00`;
      hourCounts[hStr] = (hourCounts[hStr] || 0) + 1;
    }
  });
  const daysMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const popularDayIndex = Object.keys(dayCounts).reduce((a, b) => dayCounts[a] > dayCounts[b] ? a : b, 1);
  const bestDayCount = dayCounts[popularDayIndex];
  
  const popularHour = Object.keys(hourCounts).reduce((a, b) => hourCounts[a] > hourCounts[b] ? a : b, '');
  const bestHourCount = hourCounts[popularHour] || 0;

  // --- Advanced Metrics ---
  const numHairdressers = Object.keys(data.peluqueros).length || 1;
  const totalOccupiedMins = attendedCitas.reduce((acc, c) => acc + (c.durationMins || 30), 0);
  const totalAvailableMins = data.horarioRows.reduce((acc, row) => acc + calcDayOpenMins(row) * numHairdressers, 0);
  const capacityPer = totalAvailableMins > 0 ? Math.min(100, Math.round((totalOccupiedMins / totalAvailableMins) * 100)) : 0;
  const availableHours = totalAvailableMins > 0 ? (totalAvailableMins / 60).toFixed(1).replace(/\.0$/, '') : null;
  const occupiedHours = (totalOccupiedMins / 60).toFixed(1).replace(/\.0$/, '');

  const avgTicket = attendedCitas.length > 0 ? (totalRevenue / attendedCitas.length).toFixed(2) : 0;
  const totalCitasCount = data.citas.length || 0;
  const cancelledCount = data.citas.filter(c => c.cancelada).length;
  const cancellationRate = totalCitasCount > 0 ? Math.round((cancelledCount / totalCitasCount) * 100) : 0;
  const avgServiceTime = attendedCitas.length > 0 ? Math.round(totalOccupiedMins / attendedCitas.length) : 0;

  // Render Modals
  const HairdresserDetailModal = () => {
    if (!selectedHairdresser) return null;
    const hd = byHairdresser[selectedHairdresser];
    
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 pb-20 sm:p-6 transition-all duration-300">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setSelectedHairdresser(null)} />
        <div className="relative bg-white rounded-[2rem] w-full max-w-sm overflow-hidden flex flex-col max-h-[70vh] shadow-2xl animate-in zoom-in-95">
          <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 bg-gray-50 flex-shrink-0">
            <div>
              <h3 className="font-extrabold text-black uppercase tracking-tight text-lg leading-none">{hd.name}</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Desglose de Servicios</p>
            </div>
            <button onClick={() => setSelectedHairdresser(null)} className="p-2 bg-white rounded-full text-gray-400 hover:text-black shadow-sm">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1 overscroll-contain pb-8">
            <div className="grid gap-3">
              {Object.entries(hd.servicesBreakdown).sort((a,b) => b[1] - a[1]).map(([service, count]) => (
                <div key={service} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="font-bold text-xs uppercase tracking-tight text-gray-700">{service}</span>
                  <span className="font-black text-sm bg-black text-white px-3 py-1 rounded-full">{count}</span>
                </div>
              ))}
              {Object.keys(hd.servicesBreakdown).length === 0 && (
                <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest py-8">Sin servicios facturados</p>
              )}
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const NoShowsModal = () => {
    if (!showNoShowsModal) return null;
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowNoShowsModal(false)} />
        <div className="relative w-full max-w-sm bg-[#111] border border-white/10 rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 max-h-[80vh] flex flex-col">
          <div className="flex justify-between items-center mb-6 shrink-0 border-b border-white/5 pb-4">
            <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
              <UserX className="w-5 h-5 text-red-500" /> No Shows
            </h3>
            <button onClick={() => setShowNoShowsModal(false)} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {noShows.map(ns => {
              const d = new Date(ns.fechaInicio);
              const corteName = data.cortes[ns.corte || ns.idCorte] || ns.tipo_corte || 'Servicio';
              return (
                <div key={ns.idCita} className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col gap-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-white text-sm">{ns.Cliente?.nombreCliente || 'Sin nombre'}</span>
                    <span className="text-[10px] font-black uppercase text-red-500 bg-red-500/10 px-2 py-0.5 rounded">No Vino</span>
                  </div>
                  <span className="text-xs text-gray-400 font-medium">Tel: {ns.Cliente?.telefono}</span>
                  <div className="mt-2 pt-2 border-t border-white/10 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">{corteName}</span>
                    <span className="text-[10px] font-black text-white">{d.toLocaleDateString('es-ES')} - {d.getHours().toString().padStart(2, '0')}:{d.getMinutes().toString().padStart(2, '0')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="h-full w-full bg-[#0a0a0a] text-white font-sans flex flex-col overflow-hidden max-w-full">
      {/* Dark elegant grid background */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '32px 32px' }} />

      <main className="flex-1 w-full p-4 sm:p-6 md:p-8 flex flex-col h-full min-h-0 relative z-10 overflow-hidden gap-4 sm:gap-6">
        
        {/* Header & Controls */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 shrink-0 pb-2 sm:pb-4 border-b border-white/10">
          <div>
             <h1 className="text-5xl font-bold tracking-normal leading-none text-white" style={{ fontFamily: "'Aref Ruqaa', serif" }}>
               Dashboard
             </h1>

          </div>

          <div className="flex flex-row items-center gap-3 w-full sm:w-auto">
            <div className="flex bg-white/5 p-1 rounded-xl w-full sm:w-auto border border-white/10">
              {['day', 'week', 'month', 'year'].map(ft => (
                <button 
                  key={ft}
                  onClick={() => setFilterType(ft)}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterType === ft ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                >
                  {ft === 'day' ? 'Día' : ft === 'week' ? 'Semana' : ft === 'month' ? 'Mes' : 'Año'}
                </button>
              ))}
            </div>
            
            {!isCurrentPeriod && (
              <button
                onClick={() => setReferenceDate(new Date())}
                className="px-2 py-1 text-xs font-black uppercase tracking-widest text-[#38bdf8] bg-[#38bdf8]/10 border border-[#38bdf8]/30 rounded-lg hover:bg-[#38bdf8]/20 transition-colors whitespace-nowrap"
              >
                Ahora
              </button>
            )}
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-1.5 shadow-sm w-full sm:w-auto justify-between sm:justify-start relative" ref={menuRef}>
              <button onClick={prevPeriod} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5 text-gray-400 hover:text-white"/></button>
              
              <button 
                onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
                className="font-bold text-sm min-w-[140px] text-center text-white capitalize px-2 py-1 hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <CalendarIcon className="w-4 h-4 text-gray-400" />
                {getLabel()}
              </button>

              {isDateMenuOpen && (
                <CustomDatePicker 
                  currentDate={referenceDate}
                  filterType={filterType}
                  onSelectDate={(d) => {
                    setReferenceDate(d);
                    setIsDateMenuOpen(false);
                  }}
                  onClose={() => setIsDateMenuOpen(false)}
                />
              )}

              <button onClick={nextPeriod} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><ChevronRight className="w-5 h-5 text-gray-400 hover:text-white"/></button>
            </div>
          </div>
        </header>

        {loadError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <AlertCircle className="w-12 h-12 text-red-400 opacity-60" />
            <p className="text-sm font-bold uppercase tracking-widest text-red-400">{loadError}</p>
            <button onClick={loadData} className="px-5 py-2.5 bg-white text-black text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-100 transition-colors">
              Reintentar
            </button>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#38bdf8] border-t-transparent flex items-center justify-center rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col gap-4 sm:gap-6 overflow-hidden">
            
            {/* Top Cards: Core KPIs */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 shrink-0 min-h-[5rem] md:min-h-[7rem] lg:min-h-[7rem]">
              <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-[2rem] p-3 sm:p-6 flex flex-col justify-center relative overflow-hidden backdrop-blur-md">
                <div className="absolute right-[-10px] top-[-10px] sm:right-0 sm:top-0 opacity-10">
                  <Scissors className="w-16 h-16 sm:w-24 sm:h-24" />
                </div>
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#38bdf8] mb-1 sm:mb-2">Cortes Atendidos</p>
                <div className="text-3xl sm:text-5xl font-black text-white">{attendedCitas.length}</div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-[2rem] p-3 sm:p-6 flex flex-col justify-center relative overflow-hidden backdrop-blur-md">
                <div className="absolute right-[-10px] top-[-10px] sm:right-0 sm:top-0 opacity-10">
                  <TrendingUp className="w-16 h-16 sm:w-24 sm:h-24" />
                </div>
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-green-400 mb-1 sm:mb-2">Facturado</p>
                <div className="text-2xl sm:text-4xl lg:text-5xl font-black text-white">{totalRevenue}€</div>
              </div>

              <div 
                onClick={() => noShows.length > 0 && setShowNoShowsModal(true)}
                className={`bg-white/5 border border-white/10 rounded-2xl sm:rounded-[2rem] p-3 sm:p-6 flex flex-col justify-center relative overflow-hidden backdrop-blur-md transition-colors ${noShows.length > 0 ? 'hover:bg-white/10 cursor-pointer' : ''}`}
              >
                <div className="absolute right-[-10px] top-[-10px] sm:right-0 sm:top-0 opacity-10">
                  <AlertCircle className="w-16 h-16 sm:w-24 sm:h-24" />
                </div>
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-red-400 mb-1 sm:mb-2 flex items-center gap-1">
                  No Shows {noShows.length > 0 && <span className="lowercase font-normal underline decoration-dotted">ver lista →</span>}
                </p>
                <div className="text-3xl sm:text-5xl font-black text-red-500">{noShows.length}</div>
              </div>
            </div>

            {/* Bottom Section: Robust Flex layout for iPad/Safari */}
            <div className="flex-1 flex flex-col md:flex-row gap-4 sm:gap-6 min-h-0 overflow-hidden">
               
               {/* Hairdressers List & Charts */}
               <div className="bg-white/5 border border-white/10 rounded-[2rem] p-4 sm:p-6 flex flex-col backdrop-blur-md md:flex-[2] min-h-[300px] md:min-h-0 overflow-hidden">
                 <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 shrink-0">Desglose por Peluquero</h2>
                 
                 <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6 pr-1 pb-8 dashboard-scroll-container" style={{ WebkitOverflowScrolling: 'touch' }}>
                   {/* Small Summary Cards */}
                   <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
                     {Object.values(byHairdresser).map(hd => (
                       <div 
                         key={hd.id} 
                         onClick={() => hd.count > 0 && setSelectedHairdresser(hd.id)}
                         className={`flex flex-col justify-between p-3 rounded-2xl border transition-all ${hd.count > 0 ? 'bg-black border-white/20 hover:border-[#38bdf8] cursor-pointer' : 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'}`}
                         title={hd.count === 0 ? 'Sin servicios en este periodo' : undefined}
                       >
                         <h3 className="font-black text-xs uppercase truncate mb-2">{hd.name}</h3>
                         <div className="flex justify-between items-baseline">
                           <p className="text-[9px] font-bold text-[#38bdf8] uppercase">{hd.count} SERVICIOS</p>
                           <p className="text-sm font-bold bg-white/5 px-2 py-0.5 rounded text-white">{hd.revenue}€</p>
                         </div>
                       </div>
                     ))}
                   </div>

                   {/* Bar Charts */}
                   {(() => {
                      const hdList = Object.values(byHairdresser);
                      if (hdList.length === 0) return null;
                      const maxCount = Math.max(...hdList.map(h => h.count));
                      const maxReactCount = maxCount || 1;
                      const maxRev = Math.max(...hdList.map(h => h.revenue));
                      const maxReactRev = maxRev || 1;
                      
                      return (
                        <div className="flex flex-col gap-6 border-t border-white/10 pt-4 shrink-0">
                          <div>
                            <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-3">Volumen de Servicios</h3>
                            <div className="flex flex-col gap-2">
                              {hdList.sort((a,b) => b.count - a.count).map(hd => (
                                <div key={hd.id} className="flex items-center gap-2">
                                  <span className="w-16 text-[9px] font-bold text-gray-300 uppercase truncate text-right">{hd.name}</span>
                                  <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden flex items-center">
                                    <div className="h-full bg-[#38bdf8] rounded-full transition-all duration-1000 ease-out" style={{ width: `${(hd.count / maxReactCount) * 100}%` }} />
                                  </div>
                                  <span className="w-8 text-[9px] font-black text-[#38bdf8] text-left">{hd.count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-3">Facturación Generada</h3>
                            <div className="flex flex-col gap-2">
                              {hdList.sort((a,b) => b.revenue - a.revenue).map(hd => (
                                <div key={hd.id} className="flex items-center gap-2">
                                  <span className="w-16 text-[9px] font-bold text-gray-300 uppercase truncate text-right">{hd.name}</span>
                                  <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden flex items-center">
                                    <div className="h-full bg-green-400 rounded-full transition-all duration-1000 ease-out" style={{ width: `${(hd.revenue / maxReactRev) * 100}%` }} />
                                  </div>
                                  <span className="w-10 text-[9px] font-black text-green-400 text-left">{hd.revenue}€</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                   })()}
                 </div>
               </div>

               {/* Trends */}
               <div className="bg-white/5 border border-white/10 rounded-[2rem] p-4 sm:p-6 flex flex-col backdrop-blur-md md:flex-1 min-h-[400px] md:min-h-0 overflow-hidden">
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 shrink-0">Tendencias del Periodo</h2>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-1 pb-8 dashboard-scroll-container" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {filterType !== 'day' && (
                      <div className="flex flex-col gap-3 shrink-0">
                        <div className="bg-black/50 border border-white/10 rounded-2xl p-3 flex items-center justify-between">
                          <div>
                            <p className="text-[8px] font-bold uppercase text-gray-500 tracking-wider">Día Más Fuerte</p>
                            <p className="text-sm font-black truncate text-white">{bestDayCount > 0 ? daysMap[popularDayIndex] : '-'}</p>
                          </div>
                          <div className="bg-[#38bdf8]/10 text-[#38bdf8] w-10 h-10 rounded-full flex items-center justify-center font-black text-xs">
                            {bestDayCount}
                          </div>
                        </div>

                        <div className="bg-black/50 border border-white/10 rounded-2xl p-3 flex items-center justify-between">
                          <div>
                            <p className="text-[8px] font-bold uppercase text-gray-500 tracking-wider">Hora Más Fuerte</p>
                            <p className="text-sm font-black truncate text-white">{bestHourCount > 0 ? popularHour : '-'}</p>
                          </div>
                          <div className="bg-amber-500/10 text-amber-500 w-10 h-10 rounded-full flex items-center justify-center font-black text-xs">
                            {bestHourCount}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 shrink-0">
                      <div className="bg-black/50 border border-white/10 rounded-2xl p-3 flex flex-col justify-between gap-1">
                        <p className="text-[8px] font-bold uppercase text-gray-500 tracking-wider">Capacidad</p>
                        <div className="flex items-end justify-between">
                          <span className="text-lg font-black text-white">{availableHours !== null ? `${capacityPer}%` : '—'}</span>
                          <div className="w-12 bg-white/10 h-1.5 rounded-full overflow-hidden mb-1">
                            <div className="bg-[#38bdf8] h-full" style={{ width: `${capacityPer}%` }}></div>
                          </div>
                        </div>
                        <p className="text-[8px] text-gray-500 font-medium leading-tight">
                          {availableHours !== null
                            ? <><span className="text-[#38bdf8] font-black">{occupiedHours}h</span> de {availableHours}h</>
                            : <span className="italic">Configúralo en Agenda</span>}
                        </p>
                      </div>

                      <div className="bg-black/50 border border-white/10 rounded-2xl p-3 flex flex-col justify-between">
                        <p className="text-[8px] font-bold uppercase text-gray-500 tracking-wider mb-1">Ticket Medio</p>
                        <span className="text-lg font-black text-green-400">{avgTicket}€</span>
                      </div>

                      <div className="bg-black/50 border border-white/10 rounded-2xl p-3 flex flex-col justify-between">
                        <p className="text-[8px] font-bold uppercase text-gray-500 tracking-wider mb-1">Tasa Cancelación</p>
                        <span className="text-lg font-black text-red-400">{cancellationRate}%</span>
                      </div>

                      <div className="bg-black/50 border border-white/10 rounded-2xl p-3 flex flex-col justify-between">
                        <p className="text-[8px] font-bold uppercase text-gray-500 tracking-wider mb-1">Tiempo Medio</p>
                        <span className="text-lg font-black text-amber-500">{avgServiceTime} min</span>
                      </div>
                    </div>

                    <div className="bg-black/50 border border-white/10 rounded-2xl p-4 flex items-center justify-between shrink-0">
                       <div>
                         <p className="text-[9px] font-bold uppercase text-gray-500 tracking-wider">Ratio Asistencia</p>
                         <div className="w-full bg-white/10 h-1 mt-2 rounded-full overflow-hidden w-24">
                           <div className="bg-green-400 h-full" style={{ width: `${attendedCitas.length > 0 ? Math.round((attendedCitas.length / (attendedCitas.length + noShows.length)) * 100) : 0}%` }}></div>
                         </div>
                       </div>
                       <div className="text-lg font-black text-green-400">
                         {attendedCitas.length > 0 ? Math.round((attendedCitas.length / (attendedCitas.length + noShows.length)) * 100) : 0}%
                       </div>
                    </div>
                  </div>
               </div>
            </div>

          </div>
        )}
      </main>
      
      {/* Modals outside to avoid z-index and overflow clipping */}
      <HairdresserDetailModal />
      <NoShowsModal />
    </div>
  );
}
