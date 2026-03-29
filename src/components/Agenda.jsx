import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Clock, Phone, User, Scissors, ChevronLeft, ChevronRight, Calendar as CalendarIcon, UserX, X, Check, Trash2 } from 'lucide-react';
import AbsenceModal from './AbsenceModal';
import NewAppointmentModal from './NewAppointmentModal';
import { supabase } from '../lib/supabaseClient';

const hairdressers = ['Riqui', 'Youssef', 'Miguel', 'Bryan'];

// Formato local YYYY-MM-DD para igualar en cualquier zona
const formatDate = (date) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

const timeToMins = (t) => { 
  if (!t || t === 'extra') return 0;
  const [h, m] = t.split(':').map(Number); 
  return h * 60 + m; 
};

const minsToTime = (m) => { 
  const hh = Math.floor(m / 60).toString().padStart(2, '0'); 
  const mm = (m % 60).toString().padStart(2, '0'); 
  return `${hh}:${mm}`; 
};

const today = new Date();
const strToday = formatDate(today);

const CustomDatePicker = ({ currentDate, onSelectDate, onClose }) => {
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
      className="absolute top-[130%] right-0 lg:-translate-x-1/4 w-[280px] bg-white border border-gray-200 rounded-2xl shadow-2xl p-5 z-[1000] animate-in fade-in zoom-in-95 duration-200 cursor-default"
      onClick={(e) => e.stopPropagation()}
    >
       <div className="flex justify-between items-center mb-5">
         <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft className="w-5 h-5 text-gray-600"/></button>
         <div className="font-extrabold text-sm text-gray-900 uppercase tracking-widest">{monthNames[currentView.getMonth()]} {currentView.getFullYear()}</div>
         <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight className="w-5 h-5 text-gray-600"/></button>
       </div>
       
       <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">
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
               className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center transition-colors ${selected ? 'bg-black text-white font-extrabold shadow-md' : today ? 'text-blue-600 font-extrabold bg-blue-100/50 hover:bg-blue-100' : 'text-gray-700 hover:bg-gray-100'} `}
             >
               {d}
             </button>
           );
         })}
       </div>

       <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end">
         <button 
           onClick={(e) => {
             e.stopPropagation();
             onSelectDate(new Date());
             onClose();
           }}
           className="text-[11px] font-black text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-widest px-3 py-1.5 hover:bg-blue-50 rounded-lg"
         >
           Hoy
         </button>
       </div>
    </div>
  )
};

export default function Agenda() {
  const [currentDate, setCurrentDate] = useState(today);
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [absences, setAbsences] = useState([]);
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAptId, setSelectedAptId] = useState(null);
  const [newAptModal, setNewAptModal] = useState({ open: false, time: '', hairdresser: '', hairdresserId: null });
  const [hairdresserMap, setHairdresserMap] = useState({});
  const menuRef = useRef(null);

  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [confirmDeleteAbsenceId, setConfirmDeleteAbsenceId] = useState(null);

  const handleAttendance = async (aptId, attended) => {
    // 1. Marcar asistencia en la cita
    const { error } = await supabase
      .from('Citas')
      .update({ asistencia: attended })
      .eq('idCita', aptId);
    
    if (!error) {
      setAppointments(prev => prev.map(a => 
        a.id === aptId ? { ...a, status: attended ? 'completed' : 'no-show' } : a
      ));

      // 2. Si ha asistido, actualizar la última visita en el cliente correspondiente
      if (attended) {
        const apt = appointments.find(a => a.id === aptId);
        if (apt && apt.clientId && apt.rawDate) {
          // Extraemos solo la parte YYYY-MM-DD para guardarla sin problema
          const visitDateStr = new Date(apt.rawDate).toISOString().split('T')[0];
          await supabase
            .from('Cliente')
            .update({ ultimaVisita: visitDateStr })
            .eq('idCliente', apt.clientId);
        }
      }
    }
    setSelectedAptId(null);
  };

  const handleCancel = async (aptId) => {
    const { error } = await supabase
      .from('Citas')
      .update({ cancelada: true })
      .eq('idCita', aptId);
    
    if (!error) {
      setAppointments(prev => prev.filter(a => a.id !== aptId));
    }
    setConfirmCancelId(null);
  };

  const handleAddAbsence = async (data) => {
    const hdId = Object.entries(hairdresserMap).find(([k,v]) => v === data.hairdresser)?.[0];

    const { error } = await supabase.from('Ausencia').insert([{
      idPeluquero: hdId ? Number(hdId) : 1,
      fechaInicio: `${data.startDate} 00:00:00`,
      fechaFin: `${data.endDate} 23:59:59`
    }]);

    if (!error) {
      loadAgenda();
    } else {
      console.error('Error adding absence:', error);
    }
    setIsAbsenceModalOpen(false);
  };

  const handleDeleteAbsence = async (absenceId) => {
    // Optimistic UI update
    setAbsences(prev => prev.filter(a => a.id !== absenceId));
    setConfirmDeleteAbsenceId(null);
    
    // Soft delete in DB
    const { error } = await supabase.from('Ausencia').update({ cancelada: true }).eq('idAusencia', absenceId);
    if (error) {
      const { error: err2 } = await supabase.from('Ausencia').update({ cancelada: true }).eq('id', absenceId);
      if (err2) {
        console.error('Error soft-deleting absence:', err2);
        loadAgenda(); // Revert on failure
      }
    }
  };

  async function loadAgenda() {
    setLoading(true);
    try {
      const [{ data: citasData }, { data: absencesData }, { data: peluquerosData }, { data: cortesData }] = await Promise.all([
        supabase.from('Citas').select('*, Cliente(*)'),
        supabase.from('Ausencia').select('*'),
        supabase.from('Peluqueros').select('*'),
        supabase.from('Tipo Corte').select('*')
      ]);

      const hdMap = {};
      if (peluquerosData) {
        peluquerosData.forEach(p => hdMap[p.idPeluquero] = p.nombre);
        setHairdresserMap(hdMap);
      }

      const svcMap = {};
      if (cortesData) {
        cortesData.forEach(s => svcMap[s.idCorte] = s.nombreCorte);
      }

      if (citasData) {
        const mapped = citasData.map(c => {
          let timeVal = c.hora_inicio ? c.hora_inicio.substring(0, 5) : '00:00';
          let dateStr = '';
          
          if (c.fechaInicio) {
            const d = new Date(c.fechaInicio);
            if (!c.hora_inicio) {
              const h = d.getHours();
              const m = d.getMinutes();
              const isSat = d.getDay() === 6;
              if ((isSat && h >= 14) || (!isSat && (h >= 21 || (h === 20 && m > 30)))) {
                timeVal = 'extra';
              } else {
                timeVal = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
              }
            }
            dateStr = formatDate(d);
          }

          let status = 'pending';
          if (c.asistencia === true) status = 'completed';
          else if (c.asistencia === false) status = 'no-show';

          const peluqueroId = c.idPeluquero || c.peluquero || 1; // Default to first if missing
          const corteId = c.corte || c.idCorte || null;

          let durationMins = 30;
          if (c.fechaInicio && c.fechaFin) {
            const dtStart = new Date(c.fechaInicio);
            const dtEnd = new Date(c.fechaFin);
            durationMins = Math.round((dtEnd - dtStart) / 60000);
          } else {
            durationMins = c.duracion || 30;
          }

          return {
            id: c.idCita,
            client: c.Cliente?.nombreCliente || 'Sin nombre',
            clientId: c.cliente,
            phone: c.Cliente?.telefono || 'Sin teléfono',
            service: svcMap[corteId] || c.tipo_corte || 'Servicio',
            time: timeVal,
            date: dateStr,
            rawDate: c.fechaInicio,
            hairdresser: hdMap[peluqueroId] || 'Miguel',
            hairdresserId: peluqueroId,
            status: c.cancelada ? 'cancelled' : status,
            durationMins: durationMins,
            cancelada: c.cancelada,
            confirmado: c.confirmado
          };
        }).filter(a => !a.cancelada);
        setAppointments(mapped);
      }

      if (absencesData) {
        const mappedAbs = absencesData.map(abs => ({
          id: abs.idAusencia || abs.id || Math.random(),
          hairdresser: hdMap[abs.idPeluquero] || 'Miguel',
          hairdresserId: abs.idPeluquero,
          tipo: 'Ausencia',
          startDate: abs.fechaInicio ? formatDate(abs.fechaInicio) : '',
          endDate: abs.fechaFin ? formatDate(abs.fechaFin) : '',
          startTime: '00:00',
          endTime: '23:59',
          isAllDay: true,
          cancelada: abs.cancelada
        })).filter(a => !a.cancelada);
        setAbsences(mappedAbs);
      }
    } catch (err) {
      console.error('Error loading agenda:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAgenda();
  }, [currentDate, hairdresserMap]); // Reload when hairdresserMap is ready

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsDateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentFormattedDate = formatDate(currentDate);
  const isToday = currentFormattedDate === strToday;
  
  const timeSlots = useMemo(() => {
    const day = currentDate.getDay(); 
    const morningSlots = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30'];
    const afternoonSlots = ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
    if (day >= 1 && day <= 5) return [...morningSlots, ...afternoonSlots];
    if (day === 6) return morningSlots;
    return []; 
  }, [currentDate]);

  const handlePrevDay = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    setCurrentDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const getServiceBadge = (service) => {
    const s = (service || '').toLowerCase();
    if (s.includes('barba')) return 'bg-slate-900 text-slate-100 border-slate-900';
    if (s.includes('niño') || s.includes('infantil')) return 'bg-gray-100 text-gray-800 border-gray-200';
    if (s.includes('jubilado') || s.includes('senior')) return 'bg-gray-200 text-gray-900 border-gray-300';
    return 'bg-black text-white border-black';
  };

  return (
    <div className="h-full bg-[#fcfcfc] text-black font-sans relative flex flex-col min-h-0 overflow-hidden max-w-full">
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='none' stroke='%23000' stroke-width='1.5'/%3E%3Cpath d='M15 15l30 30M15 45l30-30' stroke='%23000' stroke-width='1.5'/%3E%3C/svg%3E")`,
          backgroundSize: '80px 80px'
        }}
      />
      
      <main className="flex-1 w-full pl-8 pr-8 py-4 relative z-10 flex flex-col h-full min-h-0 overflow-hidden max-w-full">
        <header className="flex justify-between items-end mb-6 border-b-2 border-black pb-4 shrink-0">
          <div>
            <h1 className="text-5xl font-bold tracking-normal leading-none mb-1" style={{ fontFamily: "'Aref Ruqaa', serif" }}>
              Casablanca <span className="text-gray-400 font-light italic text-3xl ml-1">Barbershop</span>
            </h1>
          </div>
          
          <div className="text-right flex items-end gap-6">
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsAbsenceModalOpen(true)}
                  className="px-3 py-1 font-bold text-sm bg-black text-white rounded-lg transition-all hover:bg-slate-800 flex items-center gap-1.5 shadow-sm hover:shadow"
                >
                  <UserX className="w-4 h-4"/>
                  Ausencia
                </button>

                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                  <button onClick={handlePrevDay} className="p-1 hover:bg-gray-100 rounded transition-colors" aria-label="Día anterior">
                    <ChevronLeft className="w-5 h-5"/>
                  </button>
                  <div className="relative flex items-center" ref={menuRef}>
                    <button 
                      onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
                      className={`px-3 py-1 font-semibold text-sm hover:bg-gray-100 rounded transition-colors flex items-center gap-2 ${isDateMenuOpen ? 'bg-gray-100' : ''}`}
                    >
                      <CalendarIcon className="w-4 h-4"/>
                      {isToday ? 'Hoy' : currentDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </button>
                    {isDateMenuOpen && (
                      <CustomDatePicker 
                        currentDate={currentDate} 
                        onSelectDate={(date) => {
                          setCurrentDate(date);
                          setIsDateMenuOpen(false);
                        }}
                        onClose={() => setIsDateMenuOpen(false)}
                      />
                    )}
                  </div>
                  <button onClick={handleNextDay} className="p-1 hover:bg-gray-100 rounded transition-colors" aria-label="Día siguiente">
                    <ChevronRight className="w-5 h-5"/>
                  </button>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 capitalize font-medium min-w-[200px] text-right">
                {currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </header>

        <section className="bg-white border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl flex-1 flex flex-col min-h-0 min-w-0" style={{ overflowX: 'clip', overflowY: 'hidden' }}>
          <div className="grid grid-cols-[50px_1fr_1fr_1fr_1fr] border-b border-gray-200 bg-gray-50 shrink-0">
            <div className="p-4 flex items-center justify-center border-r border-gray-100">
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
            {hairdressers.map(hd => (
              <div key={hd} className="p-4 text-center font-bold text-gray-800 border-r border-gray-100 last:border-r-0 uppercase tracking-wider text-sm flex justify-center items-center gap-2">
                <Scissors className="w-4 h-4 text-gray-400" />
                {hd}
              </div>
            ))}
          </div>

          <div className="overflow-y-auto overflow-x-hidden flex-1 pb-10 custom-scrollbar relative bg-white">
            <div className="flex flex-col h-full min-w-[700px] lg:min-w-0">
              {timeSlots.length > 0 ? (
                <>
                  {timeSlots.map((time, slotIndex) => {
                    const SLOT_HEIGHT = 5.5; // rem
                    return (
                    <div key={time} className="grid grid-cols-[50px_1fr_1fr_1fr_1fr] border-b border-gray-100 group/row" style={{ height: `${SLOT_HEIGHT}rem`, overflow: 'visible', zIndex: 100 - slotIndex }}>
                      <div className="bg-gray-50 border-r border-gray-100 flex items-center justify-center text-[10px] md:text-sm font-bold text-gray-400 group-hover/row:text-black transition-colors uppercase tracking-[0.1em]" style={{ height: `${SLOT_HEIGHT}rem` }}>
                        {time}
                      </div>

                      {hairdressers.map(hd => {
                        const slotStartMins = timeToMins(time);
                        const nextSlotMins = slotStartMins + 30;
                        const hdId = Object.entries(hairdresserMap).find(([k,v]) => v === hd)?.[0];

                        const slotApts = appointments.filter(a => {
                          if (a.date !== currentFormattedDate || a.hairdresser !== hd) return false;
                          const aptMins = timeToMins(a.time);
                          return aptMins >= slotStartMins && aptMins < nextSlotMins;
                        }).sort((a,b) => timeToMins(a.time) - timeToMins(b.time));

                        const prevApt = appointments.find(a => {
                          if (a.date !== currentFormattedDate || a.hairdresser !== hd) return false;
                          const aptStartMins = timeToMins(a.time);
                          const aptEndMins = aptStartMins + (a.durationMins || 30);
                          return aptStartMins < slotStartMins && aptEndMins > slotStartMins;
                        });

                        const isOccupiedByPrevious = !!prevApt;
                        const isMultiSlot = slotApts.some(a => timeToMins(a.time) + (a.durationMins || 30) > nextSlotMins);

                        const absenceRecord = absences.find(abs => {
                          if (abs.hairdresser !== hd) return false;
                          if (currentFormattedDate < abs.startDate || currentFormattedDate > abs.endDate) return false;
                          if (abs.isAllDay) return true;
                          return time >= abs.startTime && time < abs.endTime;
                        });

                        return (
                          <div key={`${time}-${hd}`} className="p-1 md:p-2 border-r border-gray-100 last:border-r-0 relative group cursor-pointer" style={{ height: `${SLOT_HEIGHT}rem`, overflow: isMultiSlot ? 'visible' : undefined }}>
                            {absenceRecord ? (
                              <div 
                                className="w-full h-full rounded-xl bg-gray-50 border border-gray-200 flex flex-col items-center justify-center opacity-80 relative group/absence transition-colors"
                              >
                                {confirmDeleteAbsenceId !== absenceRecord.id ? (
                                  <div 
                                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteAbsenceId(absenceRecord.id); }}
                                    className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-red-50 hover:border-red-200 transition-colors rounded-xl absolute inset-0"
                                  >
                                    <span className="text-[10px] sm:text-xs font-bold text-gray-400 group-hover/absence:text-red-500 uppercase tracking-widest">Ausente</span>
                                  </div>
                                ) : (
                                  <div className="absolute inset-0 bg-red-600/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-2 z-[70] animate-in fade-in duration-200">
                                    <p className="text-white text-[10px] font-black uppercase tracking-tighter mb-2 text-center">¿Eliminar<br/>Ausencia?</p>
                                    <div className="flex gap-2 w-full">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteAbsence(absenceRecord.id); }}
                                        className="flex-1 bg-white text-red-600 text-[10px] font-bold py-1 rounded-lg shadow-sm hover:bg-gray-100 transition-colors"
                                      >
                                        Sí
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteAbsenceId(null); }}
                                        className="flex-1 bg-black/20 text-white text-[10px] font-bold py-1 rounded-lg hover:bg-black/40 transition-colors"
                                      >
                                        No
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col h-full gap-0.5 md:gap-1">
                                {isOccupiedByPrevious && (
                                  <div style={{ height: `${(Math.min(30, (timeToMins(prevApt.time) + (prevApt.durationMins || 30)) - slotStartMins) / 30) * SLOT_HEIGHT - 0.25}rem` }} className="w-full shrink-0" />
                                )}
                                
                                {(() => {
                                  const els = [];
                                  let currentMins = isOccupiedByPrevious ? (timeToMins(prevApt.time) + (prevApt.durationMins || 30)) : slotStartMins;

                                  if (slotApts.length === 0) {
                                    const gapMins = nextSlotMins - currentMins;
                                    const showGap = gapMins >= 5 && currentMins < nextSlotMins;
                                    const isPast = currentFormattedDate < strToday || (currentFormattedDate === strToday && currentMins < (new Date().getHours() * 60 + new Date().getMinutes()));
                                    
                                    return showGap ? (
                                      <div 
                                        className={`flex-1 rounded-xl border-2 border-dashed border-transparent transition-colors flex items-center justify-center opacity-0 ${isPast ? 'cursor-not-allowed bg-gray-50/10' : 'hover:border-gray-200 group-hover:opacity-100 cursor-pointer'}`}
                                        onClick={(e) => { e.stopPropagation(); if (!isPast) setNewAptModal({ open: true, time: minsToTime(currentMins), hairdresser: hd, hairdresserId: hdId ? Number(hdId) : null }); }}
                                      >
                                        {!isPast && <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">+ Libre</span>}
                                      </div>
                                    ) : null;
                                  }

                                  slotApts.forEach((apt, idx) => {
                                    const aptStartMins = timeToMins(apt.time);
                                    
                                    const gapBefore = aptStartMins - currentMins;
                                    if (gapBefore >= 5 && currentMins < aptStartMins) {
                                      const isPast = currentFormattedDate < strToday || (currentFormattedDate === strToday && currentMins < (new Date().getHours() * 60 + new Date().getMinutes()));
                                      els.push(
                                        <div 
                                          key={`gap-${currentMins}`}
                                          style={{ height: `${(gapBefore / 30) * SLOT_HEIGHT - 0.25}rem`, flexShrink: 0 }} 
                                          className={`w-full rounded-xl border-2 border-dashed border-transparent transition-colors flex items-center justify-center opacity-0 ${isPast ? 'cursor-not-allowed bg-gray-50/10' : 'hover:border-gray-200 group-hover:opacity-100 cursor-pointer'}`}
                                          onClick={(e) => { e.stopPropagation(); if (!isPast) setNewAptModal({ open: true, time: minsToTime(currentMins), hairdresser: hd, hairdresserId: hdId ? Number(hdId) : null }); }}
                                        >
                                          {!isPast && <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">+ Libre</span>}
                                        </div>
                                      );
                                    }

                                    const cardHeight = `${((apt.durationMins || 30) / 30) * SLOT_HEIGHT - 0.5}rem`;
                                    els.push(
                                      <article 
                                        key={apt.id}
                                        onClick={(e) => { e.stopPropagation(); if (apt.status !== 'completed' && apt.status !== 'no-show') setSelectedAptId(apt.id); }}
                                        className={`w-full rounded-xl border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 cursor-pointer flex flex-col justify-between relative shrink-0 ${apt.durationMins < 25 ? 'p-1.5' : 'p-3'} ${apt.status === 'completed' ? 'bg-green-50 border-green-300' : apt.status === 'no-show' ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200 hover:border-black'}`}
                                        style={{ height: cardHeight, zIndex: 20 - idx }}
                                      >
                                        {!(selectedAptId === apt.id || confirmCancelId === apt.id) && (
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); setConfirmCancelId(apt.id); }}
                                            className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-500 transition-all flex items-center justify-center shadow-sm z-[60]"
                                            title="Cancelar Cita"
                                          >
                                            <X className="w-3.5 h-3.5" strokeWidth={3} />
                                          </button>
                                        )}

                                        {confirmCancelId === apt.id && (
                                          <div className="absolute inset-0 bg-red-600/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-2 z-[70] animate-in fade-in duration-200">
                                            <p className="text-white text-[10px] font-black uppercase tracking-tighter mb-2 text-center">¿Cancelar?</p>
                                            <div className="flex gap-2 w-full">
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); handleCancel(apt.id); }}
                                                className="flex-1 bg-white text-red-600 text-[10px] font-bold py-1 rounded-lg shadow-sm hover:bg-gray-100 transition-colors"
                                              >
                                                Sí
                                              </button>
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); setConfirmCancelId(null); }}
                                                className="flex-1 bg-black/20 text-white text-[10px] font-bold py-1 rounded-lg hover:bg-black/40 transition-colors"
                                              >
                                                No
                                              </button>
                                            </div>
                                          </div>
                                        )}

                                        {selectedAptId === apt.id && (
                                          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center gap-4 z-50" onClick={(e) => { e.stopPropagation(); setSelectedAptId(null); }}>
                                            <button onClick={() => handleAttendance(apt.id, false)} className="w-10 h-10 rounded-full bg-red-100 text-red-500 flex items-center justify-center shadow-sm"><X className="w-5 h-5"/></button>
                                            <button onClick={() => handleAttendance(apt.id, true)} className="w-10 h-10 rounded-full bg-green-100 text-green-500 flex items-center justify-center shadow-sm"><Check className="w-5 h-5"/></button>
                                          </div>
                                        )}

                                        <div className="flex flex-col h-full justify-between min-h-0">
                                          <h2 className={`${apt.durationMins < 20 ? 'text-[11px]' : 'text-sm'} font-bold leading-none truncate uppercase mb-0.5`}>{apt.client}</h2>
                                          <div className="flex items-center justify-between gap-1 mt-auto pt-0.5 border-t border-gray-50 overflow-hidden">
                                            <div className="flex items-center gap-1 shrink overflow-hidden">
                                              <span className={`truncate text-[8px] font-bold uppercase px-1 py-0 rounded border ${getServiceBadge(apt.service)}`}>{apt.service}</span>
                                              <span title={apt.confirmado ? "Cita Confirmada" : "Pendiente de Confirmación"} className={`shrink-0 flex items-center justify-center px-1 py-0 rounded border ${apt.confirmado ? 'bg-green-100/80 text-green-600 border-green-300/50' : 'bg-amber-100/80 text-amber-600 border-amber-300/50'}`}>
                                                {apt.confirmado ? <Check className="w-2.5 h-2.5 mr-0.5" strokeWidth={3}/> : <Clock className="w-2.5 h-2.5 mr-0.5" strokeWidth={3}/>}
                                                <span className="text-[7px] font-black uppercase tracking-wider">{apt.confirmado ? 'Confirmado' : 'Pendiente'}</span>
                                              </span>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-0.5 text-[10px] sm:text-[11px] text-gray-400 font-bold"><Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3" /><span>{apt.phone}</span></div>
                                          </div>
                                        </div>
                                      </article>
                                    );

                                    currentMins = aptStartMins + (apt.durationMins || 30);
                                  });

                                  const finalGapMins = nextSlotMins - currentMins;
                                  if (finalGapMins >= 5 && currentMins < nextSlotMins) {
                                    const isFinalPast = currentFormattedDate < strToday || (currentFormattedDate === strToday && currentMins < (new Date().getHours() * 60 + new Date().getMinutes()));
                                    els.push(
                                      <div 
                                        key={`gap-final`}
                                        className={`flex-1 min-h-0 rounded-xl border-2 border-dashed border-transparent transition-colors flex items-center justify-center opacity-0 ${isFinalPast ? 'cursor-not-allowed bg-gray-50/10' : 'hover:border-gray-200 group-hover:opacity-100 cursor-pointer'}`} 
                                        onClick={(e) => { e.stopPropagation(); if (!isFinalPast) setNewAptModal({ open: true, time: minsToTime(currentMins), hairdresser: hd, hairdresserId: hdId ? Number(hdId) : null }); }}
                                      >
                                        {!isFinalPast && <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">+ Libre</span>}
                                      </div>
                                    );
                                  }

                                  return <>{els}</>;
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  <div className="grid grid-cols-[50px_1fr_1fr_1fr_1fr] min-h-[6.5rem] border-t-4 border-double border-gray-200 bg-orange-50/20 group/row">
                    <div className="bg-orange-50/50 border-r border-orange-100 flex flex-col items-center justify-center text-[9px] font-black uppercase text-orange-400">
                      <span className="text-xl font-light">+</span>Fuera<br/>Hora
                    </div>
                    {hairdressers.map(hd => {
                      const apt = appointments.find(a => a.date === currentFormattedDate && a.time === 'extra' && a.hairdresser === hd);
                      const hdId = Object.entries(hairdresserMap).find(([k,v]) => v === hd)?.[0];
                      return (
                        <div key={`extra-${hd}`} className="p-2 border-r border-orange-100/50 last:border-r-0 relative group">
                          {apt ? (
                            <article className="h-full w-full p-3 rounded-xl border border-orange-200 bg-white shadow-sm transition-all hover:border-black flex flex-col justify-between">
                              <h2 className="text-sm font-bold truncate">{apt.client}</h2>
                              <div className="flex flex-col gap-1 mt-auto">
                                <span className="self-start text-[9px] font-bold uppercase px-2 py-0.5 rounded border bg-orange-100 text-orange-800 border-orange-300">EXTRA</span>
                                <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium"><Phone className="w-3 h-3" /><span>{apt.phone}</span></div>
                              </div>
                            </article>
                          ) : (
                               (() => {
                                 const isExtraPast = currentFormattedDate < strToday;
                                 return (
                                   <div 
                                     className={`w-full h-full rounded-xl border-2 border-dashed border-orange-200/50 transition-colors flex flex-col items-center justify-center opacity-0 ${isExtraPast ? 'cursor-not-allowed' : 'hover:border-orange-400 group-hover:opacity-100 cursor-pointer text-orange-400'}`} 
                                     onClick={() => { if (!isExtraPast) setNewAptModal({ open: true, time: currentDate.getDay() === 6 ? '14:00' : '21:00', hairdresser: hd, hairdresserId: hdId ? Number(hdId) : null }); }}
                                   >
                                     {!isExtraPast && <><span className="text-xl font-light">+</span><span className="text-[10px] font-bold uppercase text-center">Cita<br/>Especial</span></>}
                                   </div>
                                 );
                               })()
                            )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center text-gray-400 gap-4 bg-gray-50/50">
                  <CalendarIcon className="w-16 h-16 opacity-20" />
                  <p className="text-xl font-bold uppercase tracking-widest text-gray-500">Peluquería Cerrada</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <AbsenceModal 
        isOpen={isAbsenceModalOpen} 
        onClose={() => setIsAbsenceModalOpen(false)}
        onAddAbsence={handleAddAbsence}
        hairdressers={hairdressers}
        absences={absences}
        appointments={appointments}
      />
      <NewAppointmentModal 
        isOpen={newAptModal.open} onClose={() => setNewAptModal({ ...newAptModal, open: false })}
        onCreated={loadAgenda} slotTime={newAptModal.time} slotDate={formatDate(currentDate)}
        hairdresser={newAptModal.hairdresser} hairdresserId={newAptModal.hairdresserId}
      />
    </div>
  );
}
