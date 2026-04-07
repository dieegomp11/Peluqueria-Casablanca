import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Calendar, TrendingUp, Scissors, UserX, ChevronLeft, ChevronRight, BarChart3, AlertCircle, X } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ citas: [], peluqueros: {}, cortes: {} });
  
  // Filters
  const [filterType, setFilterType] = useState('month'); // day, week, month, year
  const [referenceDate, setReferenceDate] = useState(new Date());

  // Modal for breakdown
  const [selectedHairdresser, setSelectedHairdresser] = useState(null);

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
    try {
      // Citas dentro del rango. Aseguramos que la fechaInicio contenga fechas hasta fin de dia.
      const [{ data: citasData }, { data: peluquerosData }, { data: cortesData }] = await Promise.all([
        supabase.from('Citas').select('*, Cliente(*)').gte('fechaInicio', `${periodBounds.start}T00:00:00`).lte('fechaInicio', `${periodBounds.end}T23:59:59`),
        supabase.from('Peluqueros').select('*'),
        supabase.from('Tipo Corte').select('*')
      ]);

      const pMap = {};
      (peluquerosData || []).forEach(p => pMap[p.idPeluquero] = p.nombre);

      const cMap = {};
      (cortesData || []).forEach(c => cMap[c.idCorte] = c.nombreCorte);

      setData({
        citas: citasData || [],
        peluqueros: pMap,
        cortes: cMap
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [periodBounds]);

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

  const getLabel = () => {
    if (filterType === 'day') return referenceDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    if (filterType === 'week') return `Semana ${periodBounds.start} a ${periodBounds.end.slice(-2)}`;
    if (filterType === 'month') return referenceDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    if (filterType === 'year') return referenceDate.getFullYear().toString();
    return '';
  };

  // --- Compute KPIs ---
  // Only completely non-cancelled items.
  const validCitas = data.citas.filter(c => !c.cancelada);
  const confirmedCitas = validCitas.filter(c => c.confirmado === true);
  
  // Total Citas Atendidas (Confirmado y que no es no-show: asistencia puede ser null o true, asumimos si no es falso, es atendido)
  const attendedCitas = confirmedCitas.filter(c => c.asistencia !== false);
  
  // No shows: Confirmado pero no asistió
  const noShows = confirmedCitas.filter(c => c.asistencia === false);

  const totalRevenue = attendedCitas.reduce((acc, c) => acc + (Number(c.precio) || 0), 0);

  // Group by Hairdresser
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

  // Render Modal
  const HairdresserDetailModal = () => {
    if (!selectedHairdresser) return null;
    const hd = byHairdresser[selectedHairdresser];
    
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh] shadow-2xl animate-in zoom-in-95">
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

  return (
    <div className="h-full w-full bg-[#0a0a0a] text-white font-sans flex flex-col overflow-hidden max-w-full">
      {/* Dark elegant grid background */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '32px 32px' }} />

      <main className="flex-1 w-full p-4 sm:p-6 md:p-8 flex flex-col h-full min-h-0 relative z-10 overflow-hidden gap-4 sm:gap-6">
        
        {/* Header & Controls */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 shrink-0 pb-2 sm:pb-4 border-b border-white/10">
          <div>
             <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-none mb-2 text-white">
               Dashboard
             </h1>
             <p className="text-xs font-bold uppercase tracking-widest text-[#38bdf8] opacity-80">Rendimiento y Métricas clave</p>
          </div>

          <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
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
            
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-1.5 shadow-sm w-full sm:w-auto justify-between sm:justify-start">
              <button onClick={prevPeriod} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5 text-gray-400 hover:text-white"/></button>
              <div className="font-bold text-sm min-w-[140px] text-center text-white capitalize">{getLabel()}</div>
              <button onClick={nextPeriod} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><ChevronRight className="w-5 h-5 text-gray-400 hover:text-white"/></button>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#38bdf8] border-t-transparent flex items-center justify-center rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col gap-4 sm:gap-6 overflow-hidden">
            
            {/* Top Cards: Core KPIs */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 shrink-0 h-24 sm:h-32">
              <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-[2rem] p-3 sm:p-6 flex flex-col justify-center relative overflow-hidden backdrop-blur-md">
                <div className="absolute right-[-10px] top-[-10px] sm:right-0 sm:top-0 opacity-10">
                  <Scissors className="w-16 h-16 sm:w-24 sm:h-24" />
                </div>
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#38bdf8] mb-1 sm:mb-2">Total Cortes</p>
                <div className="text-3xl sm:text-5xl font-black text-white">{attendedCitas.length}</div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-[2rem] p-3 sm:p-6 flex flex-col justify-center relative overflow-hidden backdrop-blur-md">
                <div className="absolute right-[-10px] top-[-10px] sm:right-0 sm:top-0 opacity-10">
                  <TrendingUp className="w-16 h-16 sm:w-24 sm:h-24" />
                </div>
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-green-400 mb-1 sm:mb-2">Facturado</p>
                <div className="text-2xl sm:text-4xl lg:text-5xl font-black text-white">{totalRevenue}€</div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-[2rem] p-3 sm:p-6 flex flex-col justify-center relative overflow-hidden backdrop-blur-md">
                <div className="absolute right-[-10px] top-[-10px] sm:right-0 sm:top-0 opacity-10">
                  <AlertCircle className="w-16 h-16 sm:w-24 sm:h-24" />
                </div>
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-red-400 mb-1 sm:mb-2">No Shows</p>
                <div className="text-3xl sm:text-5xl font-black text-red-500">{noShows.length}</div>
              </div>
            </div>

            {/* Bottom Section: Flexible grid for Hairdressers and Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 flex-1 min-h-0 overflow-hidden">
               
               {/* Hairdressers List */}
               <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-[2rem] p-4 sm:p-6 flex flex-col min-h-0 backdrop-blur-md">
                 <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 shrink-0">Desglose por Peluquero</h2>
                 <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 lg:grid-cols-4 gap-3">
                   {Object.values(byHairdresser).map(hd => (
                     <div 
                       key={hd.id} 
                       onClick={() => hd.count > 0 && setSelectedHairdresser(hd.id)}
                       className={`flex flex-col justify-between p-4 rounded-2xl border transition-all ${hd.count > 0 ? 'bg-black border-white/20 hover:border-[#38bdf8] cursor-pointer' : 'bg-white/5 border-white/5 opacity-50'}`}
                     >
                       <div className="mb-4">
                         <h3 className="font-black text-sm uppercase truncate mb-1">{hd.name}</h3>
                         <p className="text-[10px] font-bold text-[#38bdf8] uppercase">{hd.count} serv.</p>
                       </div>
                       <div className="text-xl font-bold bg-white/5 px-3 py-1 rounded-xl w-fit">
                         {hd.revenue}€
                       </div>
                     </div>
                   ))}
                 </div>
               </div>

               {/* Trends */}
               <div className="bg-white/5 border border-white/10 rounded-[2rem] p-4 sm:p-6 flex flex-col min-h-0 backdrop-blur-md">
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 shrink-0">Tendencias del Periodo</h2>
                  
                  <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                    <div className="bg-black/50 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                       <div>
                         <p className="text-[9px] font-bold uppercase text-gray-500 tracking-wider">Día Más Fuerte</p>
                         <p className="text-base font-black truncate text-white">{bestDayCount > 0 ? daysMap[popularDayIndex] : '-'}</p>
                       </div>
                       <div className="bg-[#38bdf8]/10 text-[#38bdf8] w-12 h-12 rounded-full flex items-center justify-center font-black">
                         {bestDayCount}
                       </div>
                    </div>

                    <div className="bg-black/50 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                       <div>
                         <p className="text-[9px] font-bold uppercase text-gray-500 tracking-wider">Hora Más Fuerte</p>
                         <p className="text-base font-black truncate text-white">{bestHourCount > 0 ? popularHour : '-'}</p>
                       </div>
                       <div className="bg-amber-500/10 text-amber-500 w-12 h-12 rounded-full flex items-center justify-center font-black">
                         {bestHourCount}
                       </div>
                    </div>

                    <div className="bg-black/50 border border-white/10 rounded-2xl p-4 flex items-center justify-between mt-auto">
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
    </div>
  );
}
