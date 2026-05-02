import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Clock, Phone, User, Scissors, ChevronLeft, ChevronRight, Calendar as CalendarIcon, UserX, X, Check, Trash2, Users, Hourglass, AlertCircle, RefreshCw } from 'lucide-react';
import { createPortal } from 'react-dom';
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

const timeToMins = (t, rawDate) => {
  if (rawDate) {
    const d = new Date(rawDate);
    return d.getHours() * 60 + d.getMinutes();
  }
  if (!t || t === 'extra') return 0;
  if (t === 'extra_mid') return 14 * 60;
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

const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL;

const formatPhoneDisplay = (phone) => {
  if (!phone) return '';
  const digits = phone.replace(/[\s\-().+]/g, '');
  return digits.length > 9 ? digits.slice(-9) : phone.trim();
};

function WaitlistPopup({ entries, time, hairdresser, onClose, onRefresh }) {
  if (!entries || entries.length === 0) return null;

  const [notifyingId, setNotifyingId] = useState(null);
  const [localNotified, setLocalNotified] = useState(new Set());
  const [localNotifiedAt, setLocalNotifiedAt] = useState(new Map());
  const [notifyError, setNotifyError] = useState('');

  const formatTime = (iso) => {
    if (!iso) return '--:--';
    const d = new Date(iso);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateShort = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const getSpainNowIso = () => new Date().toISOString();

  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

  // Devuelve true si la notificación enviada a 'e' lleva menos de 3 horas sin respuesta
  const isBlockingNotification = (e) => {
    if (!(e.notificado || localNotified.has(e.id))) return false;
    if (e.denegado) return false;
    const envioRaw = localNotifiedAt.get(e.id) || e.fechaEnvio;
    if (!envioRaw) return true; // registro antiguo sin fechaEnvio → bloquear por precaución
    return (Date.now() - new Date(envioRaw).getTime()) < THREE_HOURS_MS;
  };

  const isNotified = (e) => e.notificado || localNotified.has(e.id);
  const hasPendingNotification = entries.some(isBlockingNotification);

  const handleNotify = async (w) => {
    if (notifyingId || isNotified(w) || hasPendingNotification) return;
    setNotifyingId(w.id);
    try {
      const fechaEnvio = getSpainNowIso();
      await supabase.from('Lista Espera').update({ notificado: true, fechaEnvio }).eq('idEspera', w.id);
      setLocalNotified(prev => new Set([...prev, w.id]));
      setLocalNotifiedAt(prev => new Map([...prev, [w.id, fechaEnvio]]));
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        await fetch(WEBHOOK_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: String(w.id),
          signal: controller.signal,
        });
      } catch (fetchErr) {
        console.warn('Webhook no respondió:', fetchErr?.message);
      } finally {
        clearTimeout(timeout);
      }
      onRefresh();
    } catch (err) {
      setNotifyError('No se pudo enviar la notificación. Inténtalo de nuevo.');
    } finally {
      setNotifyingId(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-violet-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hourglass className="w-4 h-4 text-violet-200" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-violet-300">Lista de Espera</p>
              <p className="text-white font-bold text-sm leading-tight">
                {time}{hairdresser ? ` · ${hairdresser}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Entries list */}
        <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto modal-scroll-container">
          {[...entries].sort((a, b) => a.id - b.id).map((w, i) => (
            <div key={w.id} className="px-5 py-3.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="font-bold text-sm text-gray-900 truncate uppercase">{w.client}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-gray-400 font-semibold shrink-0">
                  <Phone className="w-3 h-3" />
                  {formatPhoneDisplay(w.phone)}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap pl-7">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200">{w.service}</span>
                <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100">
                  {formatTime(w.fechaDeseada)} – {formatTime(w.fechaFinDeseada)}
                </span>
                {w.hairdresser && (
                  <span className="text-[10px] font-semibold text-gray-500">{w.hairdresser}</span>
                )}
              </div>
              <div className="flex items-center justify-between pl-7">
                <span className="text-[9px] text-gray-400 font-medium">
                  {isNotified(w) && !w.denegado && !isBlockingNotification(w)
                    ? <span className="text-amber-500 font-bold">Sin respuesta +3h</span>
                    : <>Solicitado el {formatDateShort(w.fechaCreacion)}</>
                  }
                </span>
                <button
                  onClick={() => handleNotify(w)}
                  disabled={!!notifyingId || isNotified(w) || w.denegado || (!isNotified(w) && !w.denegado && hasPendingNotification)}
                  title={hasPendingNotification && !isNotified(w) && !w.denegado ? 'Hay una notificación pendiente de respuesta. Espera 3 h antes de notificar a otro cliente.' : undefined}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    w.denegado
                      ? 'bg-red-100 text-red-600 border border-red-200 cursor-default'
                      : isNotified(w)
                      ? 'bg-green-100 text-green-600 border border-green-200 cursor-default'
                      : notifyingId === w.id
                      ? 'bg-violet-100 text-violet-400 border border-violet-200 cursor-wait'
                      : hasPendingNotification
                      ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                      : 'bg-violet-600 text-white hover:bg-violet-700 active:scale-95 shadow-sm'
                  }`}
                >
                  {w.denegado ? (
                    <>Denegado</>
                  ) : isNotified(w) ? (
                    <><Check className="w-3 h-3" /> Notificado</>
                  ) : notifyingId === w.id ? (
                    <>Enviando…</>
                  ) : (
                    <>Notificar</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-col gap-2">
          {notifyError && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-500">⚠ {notifyError}</p>
              <button onClick={() => setNotifyError('')} className="text-red-400 hover:text-red-600 transition-colors shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <p className="text-[10px] text-gray-400 text-center font-semibold uppercase tracking-wider">
            {entries.length} cliente{entries.length !== 1 ? 's' : ''} en espera para este tramo
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}

const TIME_OPTIONS = [];
for (let h = 7; h <= 23; h++) {
  TIME_OPTIONS.push(`${h.toString().padStart(2,'0')}:00`);
  if (h < 23) TIME_OPTIONS.push(`${h.toString().padStart(2,'0')}:30`);
}

// timetz "HH:MM:SS+00" → "HH:MM" tal cual, sin conversión
const timetzToLocal = (t) => {
  if (!t) return '';
  return t.substring(0, 5);
};

// Guarda la hora tal cual, sin conversión
const localToUTC = (hhmm) => hhmm || null;

function HorarioModal({ isOpen, onClose, onSave, horarioData, currentDate }) {
  const existing = horarioData;
  const [abierto, setAbierto] = useState(existing?.abierto ?? false);
  const [aperMañ, setAperMañ]   = useState(timetzToLocal(existing?.horaAperturaMañana) || '09:00');
  const [cierreMañ, setCierreMañ] = useState(timetzToLocal(existing?.horaCierreMañana) || '14:00');
  const [hasTarde, setHasTarde] = useState(!!(existing?.horaAperturaTarde));
  const [aperTarde, setAperTarde]   = useState(timetzToLocal(existing?.horaAperturaTarde) || '17:00');
  const [cierreTarde, setCierreTarde] = useState(timetzToLocal(existing?.horaCierreTarde) || '21:00');
  const [isContinuo, setIsContinuo] = useState(!existing?.horaCierreMañana && !existing?.horaAperturaTarde && existing?.abierto);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const initialRef = useRef({ abierto: existing?.abierto ?? false, aperMañ: timetzToLocal(existing?.horaAperturaMañana) || '09:00', cierreMañ: timetzToLocal(existing?.horaCierreMañana) || '14:00', hasTarde: !!(existing?.horaAperturaTarde), aperTarde: timetzToLocal(existing?.horaAperturaTarde) || '17:00', cierreTarde: timetzToLocal(existing?.horaCierreTarde) || '21:00', isContinuo: !existing?.horaCierreMañana && !existing?.horaAperturaTarde && existing?.abierto });
  const iv = initialRef.current;
  const isDirty = abierto !== iv.abierto || aperMañ !== iv.aperMañ || cierreMañ !== iv.cierreMañ || hasTarde !== iv.hasTarde || aperTarde !== iv.aperTarde || cierreTarde !== iv.cierreTarde || isContinuo !== iv.isContinuo;

  const handleClose = () => {
    if (isDirty && !window.confirm('Tienes cambios sin guardar. ¿Cerrar sin guardar?')) return;
    onClose();
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        abierto,
        horaAperturaMañana: abierto ? localToUTC(aperMañ) : null,
        horaCierreMañana:   abierto && !isContinuo ? localToUTC(cierreMañ) : null,
        horaAperturaTarde:  abierto && !isContinuo && hasTarde ? localToUTC(aperTarde) : null,
        horaCierreTarde:    abierto ? (isContinuo ? localToUTC(cierreMañ) : (hasTarde ? localToUTC(cierreTarde) : null)) : null,
      };
      // En horario continuo usamos cierreMañ como cierre único y los campos de tarde quedan null
      if (abierto && isContinuo) {
        payload.horaCierreTarde = localToUTC(cierreMañ);
        payload.horaAperturaMañana = localToUTC(aperMañ);
        payload.horaCierreMañana = null;
        payload.horaAperturaTarde = null;
      }
      await onSave(payload);
    } catch (err) {
      setError(err?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const dayLabel = currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/30">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-sm font-black uppercase tracking-tight text-gray-900">Horario · <span className="capitalize font-semibold text-gray-500">{dayLabel}</span></h2>
          <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="p-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-[10px] font-bold">⚠ {error}</div>}

          {/* Toggle Abierto / Cerrado */}
          <div className="flex items-center justify-between p-3 rounded-xl border-2 border-gray-100">
            <span className="text-sm font-bold text-gray-800">Estado del día</span>
            <button
              type="button"
              onClick={() => setAbierto(v => !v)}
              className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${abierto ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${abierto ? 'translate-x-7' : 'translate-x-0'}`} />
            </button>
            <span className={`text-sm font-black uppercase tracking-wide ${abierto ? 'text-green-600' : 'text-red-500'}`}>{abierto ? 'Abierto' : 'Cerrado'}</span>
          </div>

          {abierto && (
            <>
              {/* Toggle Continuo / Split */}
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="relative flex items-center justify-center w-5 h-5 border-2 border-gray-300 rounded overflow-hidden">
                  <input type="checkbox" checked={isContinuo} onChange={e => setIsContinuo(e.target.checked)} className="sr-only" />
                  {isContinuo && <div className="w-full h-full bg-black flex items-center justify-center"><svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg></div>}
                </div>
                <span className="text-sm font-bold text-gray-800">Horario continuo (sin siesta)</span>
              </label>

              {/* Horario mañana */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{isContinuo ? 'Apertura y Cierre' : 'Turno Mañana'}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold uppercase text-gray-400 mb-1 block">Apertura</label>
                    <select value={aperMañ} onChange={e => setAperMañ(e.target.value)} className="w-full border-2 border-gray-100 rounded-xl p-2.5 text-sm font-medium outline-none focus:border-black bg-white">
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase text-gray-400 mb-1 block">Cierre</label>
                    <select value={cierreMañ} onChange={e => setCierreMañ(e.target.value)} className="w-full border-2 border-gray-100 rounded-xl p-2.5 text-sm font-medium outline-none focus:border-black bg-white">
                      {TIME_OPTIONS.filter(t => t > aperMañ).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Turno tarde (solo si no es continuo) */}
              {!isContinuo && (
                <>
                  <label className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="relative flex items-center justify-center w-5 h-5 border-2 border-gray-300 rounded overflow-hidden">
                      <input type="checkbox" checked={hasTarde} onChange={e => setHasTarde(e.target.checked)} className="sr-only" />
                      {hasTarde && <div className="w-full h-full bg-black flex items-center justify-center"><svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg></div>}
                    </div>
                    <span className="text-sm font-bold text-gray-800">Abrir turno de tarde</span>
                  </label>

                  {hasTarde && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Turno Tarde</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-bold uppercase text-gray-400 mb-1 block">Apertura</label>
                          <select value={aperTarde} onChange={e => setAperTarde(e.target.value)} className="w-full border-2 border-gray-100 rounded-xl p-2.5 text-sm font-medium outline-none focus:border-black bg-white">
                            {TIME_OPTIONS.filter(t => t > cierreMañ).map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase text-gray-400 mb-1 block">Cierre</label>
                          <select value={cierreTarde} onChange={e => setCierreTarde(e.target.value)} className="w-full border-2 border-gray-100 rounded-xl p-2.5 text-sm font-medium outline-none focus:border-black bg-white">
                            {TIME_OPTIONS.filter(t => t > aperTarde).map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          <div className="pt-1 flex gap-3">
            <button type="button" onClick={handleClose} className="flex-1 py-2.5 px-4 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 px-4 font-bold text-white bg-black hover:bg-slate-900 rounded-xl transition-all shadow-md disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
  const scrollContainerRef = useRef(null);
  
  const SLOT_HEIGHT_VAL = 7; // rem tablet/desktop

  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [confirmDeleteAbsenceId, setConfirmDeleteAbsenceId] = useState(null);
  const [horarioData, setHorarioData] = useState(null);
  const [isHorarioModalOpen, setIsHorarioModalOpen] = useState(false);
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [waitlistPopup, setWaitlistPopup] = useState({ open: false, entries: [], time: '', hairdresser: '' });
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState('');
  const [savingAttendanceId, setSavingAttendanceId] = useState(null);
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [editingPriceValue, setEditingPriceValue] = useState('');
  const [mobileSelectedHd, setMobileSelectedHd] = useState(hairdressers[0]);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const visibleHairdressers = isMobile ? [mobileSelectedHd] : hairdressers;
  const gridColsClass = isMobile ? 'grid-cols-[44px_1fr]' : 'grid-cols-[50px_1fr_1fr_1fr_1fr]';
  const SLOT_HEIGHT = isMobile ? 5.5 : SLOT_HEIGHT_VAL;

  const handlePriceArrowChange = async (aptId, newValue) => {
    setEditingPriceValue(String(newValue));
    const { error } = await supabase.from('Citas').update({ precio: newValue }).eq('idCita', aptId);
    if (error) {
      setActionError('No se pudo actualizar el precio. Inténtalo de nuevo.');
    } else {
      setAppointments(prev => prev.map(a => a.id === aptId ? { ...a, price: newValue } : a));
    }
  };

  const handleAttendance = async (aptId, attended) => {
    setSavingAttendanceId(aptId);
    setActionError('');
    // 1. Marcar asistencia en la cita
    const { error } = await supabase
      .from('Citas')
      .update({ asistencia: attended })
      .eq('idCita', aptId);

    if (error) {
      setSavingAttendanceId(null);
      setActionError('No se pudo registrar la asistencia. Inténtalo de nuevo.');
      return;
    }

    if (!error) {
      setAppointments(prev => prev.map(a => 
        a.id === aptId ? { ...a, status: attended ? 'completed' : 'no-show' } : a
      ));

      // 2. Si ha asistido, actualizar última visita y visitasciclo
      if (attended) {
        const apt = appointments.find(a => a.id === aptId);
        if (apt && apt.clientId && apt.rawDate) {
          const visitDateStr = formatDate(new Date(apt.rawDate));

          const { data: clientData } = await supabase
            .from('Cliente')
            .select('visitasciclo')
            .eq('idCliente', apt.clientId)
            .single();

          const current = clientData?.visitasciclo || 0;
          const newVisitasCiclo = current >= 12 ? 0 : current + 1;
          const isThisBonus = current >= 12;

          if (isThisBonus) {
            await supabase.from('Citas').update({ esBonus: true }).eq('idCita', aptId);
            setAppointments(prev => prev.map(a => a.id === aptId ? { ...a, isBonus: true } : a));
          }

          const { error: clientError } = await supabase
            .from('Cliente')
            .update({ ultimaVisita: visitDateStr, visitasciclo: newVisitasCiclo })
            .eq('idCliente', apt.clientId);

          if (clientError) {
            console.error('[attendance] clientError:', clientError);
            setActionError('Asistencia registrada pero no se pudo actualizar el cliente.');
          }
        }
      }
    }
    setSavingAttendanceId(null);
    setSelectedAptId(null);
  };

  const handleCancel = async (aptId) => {
    const { error } = await supabase
      .from('Citas')
      .update({ cancelada: true })
      .eq('idCita', aptId);

    if (error) {
      setActionError('No se pudo cancelar la cita. Inténtalo de nuevo.');
      setConfirmCancelId(null);
      return;
    }
    setAppointments(prev => prev.filter(a => a.id !== aptId));
    setConfirmCancelId(null);
  };

  const handleAddAbsence = async (data) => {
    const hdId = Object.entries(hairdresserMap).find(([k,v]) => v === data.hairdresser)?.[0];

    const { error } = await supabase.from('Ausencia').insert([{
      idPeluquero: hdId ? Number(hdId) : 1,
      fechaInicio: data.startDate,
      fechaFin: data.endDate,
      horaInicio: data.isAllDay ? null : data.startTime,
      horaFin: data.isAllDay ? null : data.endTime
    }]);

    if (error) {
      setActionError('No se pudo registrar la ausencia. Inténtalo de nuevo.');
      throw error;
    }
    loadAgenda();
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
        setActionError('No se pudo eliminar la ausencia. Inténtalo de nuevo.');
        loadAgenda(); // Revert on failure
      }
    }
  };

  const handleSaveHorario = async (payload) => {
    const dateStr = formatDate(currentDate);
    // Si ya existe el registro, update; si no, insert
    if (horarioData) {
      const { error } = await supabase.from('Horario').update(payload).eq('idDia', horarioData.idDia);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('Horario').insert([{ dia: dateStr, ...payload }]);
      if (error) throw error;
    }
    setIsHorarioModalOpen(false);
    loadAgenda();
  };

  async function loadAgenda(silent = false) {
    if (!silent) setLoading(true);
    setLoadError(null);
    try {
      const dateStr = formatDate(currentDate);
      const [{ data: citasData }, { data: absencesData }, { data: peluquerosData }, { data: cortesData }, { data: horarioRow }] = await Promise.all([
        supabase.from('Citas').select('*, Cliente(*)'),
        supabase.from('Ausencia').select('*'),
        supabase.from('Peluqueros').select('*'),
        supabase.from('Tipo Corte').select('*'),
        supabase.from('Horario').select('*').eq('dia', dateStr).maybeSingle()
      ]);
      setHorarioData(horarioRow || null);

      // timetz llega como "HH:MM:SS+00" → minutos tal cual, sin conversión
      const parseHMinsLocal = (t) => {
        if (!t) return null;
        const [h, m] = t.substring(0, 5).split(':').map(Number);
        return h * 60 + m;
      };
      const horCierreMañ  = parseHMinsLocal(horarioRow?.horaCierreMañana);
      const horApertTarde = parseHMinsLocal(horarioRow?.horaAperturaTarde);
      const horCierreTarde = parseHMinsLocal(horarioRow?.horaCierreTarde);
      const horApertMañ   = parseHMinsLocal(horarioRow?.horaAperturaMañana);

      const { data: waitlistData } = await supabase
        .from('Lista Espera')
        .select('*, Cliente(*), "Tipo Corte"(*)');

      const hdMap = {};
      if (peluquerosData) {
        peluquerosData.forEach(p => hdMap[p.idPeluquero] = p.nombre);
        setHairdresserMap(hdMap);
      }

      const svcMap = {};
      if (cortesData) {
        cortesData.forEach(s => { svcMap[s.idCorte] = s.nombreCorte; });
      }

      if (citasData) {
        const mapped = citasData.map(c => {
          let dateStr = '';
          let timeVal = '';
          
          if (c.fechaInicio) {
            const d = new Date(c.fechaInicio);
            dateStr = formatDate(d);
            const h = d.getHours();
            const m = d.getMinutes();
            const totalMins = h * 60 + m;

            // Categorize based on Horario data
            const inSiesta = horCierreMañ !== null && horApertTarde !== null && totalMins >= horCierreMañ && totalMins < horApertTarde;
            const closingMins = horCierreTarde ?? horCierreMañ;
            const isExtra = (closingMins !== null && totalMins >= closingMins) || (horApertMañ !== null && totalMins < horApertMañ);
            if (inSiesta) {
              timeVal = 'extra_mid';
            } else if (isExtra) {
              timeVal = 'extra';
            } else {
              timeVal = c.hora_inicio ? c.hora_inicio.substring(0, 5) : `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            }
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
            clientId: c.Cliente?.idCliente ?? c.cliente ?? c.idCliente,
            phone: c.Cliente?.telefono || 'Sin teléfono',
            service: svcMap[corteId] || c.tipo_corte || 'Servicio',
            price: c.precio ?? null,
            corteId: corteId,
            time: timeVal,
            date: dateStr,
            rawDate: c.fechaInicio,
            hairdresser: hdMap[peluqueroId] || 'Miguel',
            hairdresserId: peluqueroId,
            status: c.cancelada ? 'cancelled' : status,
            durationMins: durationMins,
            cancelada: c.cancelada,
            confirmado: c.confirmado,
            isBonus: c.esBonus ?? false,
          };
        }).filter(a => !a.cancelada);
        setAppointments(mapped);
      }

      if (absencesData) {
        // horaInicio/horaFin son timetz → Supabase devuelve "HH:MM:SS+00", tomamos solo "HH:MM"
        const parseTimetz = (t) => t ? t.substring(0, 5) : null;
        const mappedAbs = absencesData.map(abs => ({
          id: abs.idAusencia || abs.id || Math.random(),
          hairdresser: hdMap[abs.idPeluquero] || 'Miguel',
          hairdresserId: abs.idPeluquero,
          tipo: 'Ausencia',
          startDate: abs.fechaInicio || '',   // tipo date → ya llega como "YYYY-MM-DD"
          endDate: abs.fechaFin || '',
          startTime: parseTimetz(abs.horaInicio),
          endTime: parseTimetz(abs.horaFin),
          isAllDay: !abs.horaInicio && !abs.horaFin,
          cancelada: abs.cancelada
        })).filter(a => !a.cancelada);
        setAbsences(mappedAbs);
      }

      if (waitlistData) {
        const mapped = waitlistData.map(w => {
          const dStart = w.fechaDeseada ? new Date(w.fechaDeseada) : null;
          const dEnd = w.fechaFinDeseada ? new Date(w.fechaFinDeseada) : null;
          return {
            id: w.idEspera,
            clientId: w.idCliente,
            client: w.Cliente?.nombreCliente || 'Sin nombre',
            phone: w.Cliente?.telefono || 'Sin teléfono',
            service: w['Tipo Corte']?.nombreCorte || 'Servicio',
            hairdresserId: w.idPeluquero,
            hairdresser: w.idPeluquero ? (hdMap[w.idPeluquero] || null) : null,
            date: dStart ? formatDate(dStart) : '',
            startMins: dStart ? dStart.getHours() * 60 + dStart.getMinutes() : 0,
            endMins: dEnd ? dEnd.getHours() * 60 + dEnd.getMinutes() : 0,
            fechaDeseada: w.fechaDeseada,
            fechaFinDeseada: w.fechaFinDeseada,
            notificado: w.notificado,
            denegado: w.denegado,
            fechaCreacion: w.fechaCreacion,
            fechaEnvio: w.fechaEnvio,
          };
        });
        setWaitlistEntries(mapped);
      }
    } catch (err) {
      console.error('Error loading agenda:', err);
      setLoadError('No se pudieron cargar las citas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAgenda();
  // hairdresserMap is intentionally excluded: loadAgenda itself sets it, including it causes an infinite refetch loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadAgenda(true);
    }, 60000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

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

  // Convierte "HH:MM:SS+00" a minutos tal cual, sin conversión de zona horaria
  const parseTimetzToLocalMins = (t) => {
    if (!t) return null;
    const [h, m] = t.substring(0, 5).split(':').map(Number);
    return h * 60 + m;
  };

  const horarioInfo = useMemo(() => {
    if (!horarioData) return null;
    const aperMañ   = parseTimetzToLocalMins(horarioData.horaAperturaMañana);
    const cierreMañ = parseTimetzToLocalMins(horarioData.horaCierreMañana);
    const aperTarde  = parseTimetzToLocalMins(horarioData.horaAperturaTarde);
    const cierreTarde = parseTimetzToLocalMins(horarioData.horaCierreTarde);
    return {
      abierto: horarioData.abierto,
      aperMañ,
      cierreMañ,
      aperTarde,
      cierreTarde,
      isContinuo: !horarioData.horaCierreMañana && !horarioData.horaAperturaTarde,
      hasTarde: !!horarioData.horaAperturaTarde && !!horarioData.horaCierreTarde,
    };
  }, [horarioData]);

  const timeSlots = useMemo(() => {
    if (!horarioInfo || !horarioInfo.abierto) return [];
    const { aperMañ, cierreMañ, aperTarde, cierreTarde, isContinuo, hasTarde } = horarioInfo;
    if (aperMañ === null) return [];

    const genSlots = (start, end) => {
      const slots = [];
      for (let m = start; m < end; m += 30) slots.push(minsToTime(m));
      return slots;
    };

    if (isContinuo) {
      return cierreTarde !== null ? genSlots(aperMañ, cierreTarde) : [];
    }
    if (!hasTarde) {
      return cierreMañ !== null ? genSlots(aperMañ, cierreMañ) : [];
    }
    return [...genSlots(aperMañ, cierreMañ), ...genSlots(aperTarde, cierreTarde)];
  }, [horarioInfo]);

  const handlePrevDay = () => {
    setActionError('');
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    setCurrentDate(prev);
  };

  const handleNextDay = () => {
    setActionError('');
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
      
      <main className="flex-1 w-full px-2 sm:pl-8 sm:pr-8 pt-2 sm:pt-4 pb-0 relative z-10 flex flex-col h-full min-h-0 overflow-hidden max-w-full">
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-2 sm:mb-6 border-b-2 border-black pb-2 sm:pb-4 shrink-0 gap-2 pl-12 sm:pl-0">
          {/* Título — solo tablet+ */}
          <div className="hidden sm:block">
            <h1 className="text-5xl font-bold tracking-normal leading-none mb-1" style={{ fontFamily: "'Aref Ruqaa', serif" }}>
              Casablanca <span className="text-gray-400 font-light italic text-3xl ml-1">Barbershop</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-6 w-full sm:w-auto">
            {/* Título compacto — solo mobile */}
            <h1 className="sm:hidden text-xl font-bold leading-none shrink-0" style={{ fontFamily: "'Aref Ruqaa', serif" }}>Casablanca</h1>

            <div className="flex flex-col items-end gap-1 sm:gap-2 flex-1 sm:flex-initial">
              <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap justify-end">
                {/* Horario — solo icono en mobile */}
                <button
                  onClick={() => setIsHorarioModalOpen(true)}
                  className={`p-1.5 sm:px-3 sm:py-1 font-bold text-sm rounded-lg transition-all flex items-center gap-1.5 shadow-sm hover:shadow border-2 ${
                    horarioData?.abierto === true
                      ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
                      : horarioData?.abierto === false
                      ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${horarioData?.abierto === true ? 'bg-green-500' : horarioData?.abierto === false ? 'bg-red-400' : 'bg-gray-300'}`} />
                  <span className="hidden sm:inline">{horarioData?.abierto === true ? 'Abierto' : horarioData?.abierto === false ? 'Cerrado' : 'Sin horario'}</span>
                </button>

                {/* Ausencia — solo icono en mobile */}
                <button
                  onClick={() => setIsAbsenceModalOpen(true)}
                  className="p-1.5 sm:px-3 sm:py-1 font-bold text-sm bg-black text-white rounded-lg transition-all hover:bg-slate-800 flex items-center gap-1.5 shadow-sm hover:shadow"
                >
                  <UserX className="w-4 h-4"/>
                  <span className="hidden sm:inline">Ausencia</span>
                </button>

                {/* Refrescar */}
                <button
                  onClick={async () => {
                    setIsRefreshing(true);
                    await loadAgenda();
                    setIsRefreshing(false);
                  }}
                  disabled={isRefreshing}
                  className="p-1.5 sm:px-3 sm:py-1 font-bold text-sm bg-gray-100 text-gray-600 border border-gray-200 rounded-lg transition-all hover:bg-gray-200 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  title="Actualizar datos"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}/>
                </button>

                {/* Lista de espera */}
                {(() => {
                  const THREE_H = 3 * 60 * 60 * 1000;
                  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
                  const waitlistCount = waitlistEntries.filter(w => {
                    if (w.date !== currentFormattedDate || w.denegado || w.notificado) return false;
                    const slotEnd = Math.floor(w.startMins / 30) * 30 + 30;
                    if (currentFormattedDate < strToday || (currentFormattedDate === strToday && slotEnd < nowMins)) return false;
                    return hairdressers.some(hd => {
                      const hdId = Object.entries(hairdresserMap).find(([k, v]) => v === hd)?.[0];
                      const matchHd = !w.hairdresserId || String(w.hairdresserId) === hdId;
                      if (!matchHd) return false;
                      const slotStartMins = Math.floor(w.startMins / 30) * 30;
                      const nextSlotMins = slotStartMins + 30;
                      const slotApts = appointments.filter(a => {
                        if (a.date !== currentFormattedDate || a.hairdresser !== hd) return false;
                        const aptMins = timeToMins(a.time);
                        return aptMins >= slotStartMins && aptMins < nextSlotMins;
                      });
                      if (slotApts.length > 0) return false;
                      const groupHasBlocking = waitlistEntries.some(other => {
                        if (other.date !== currentFormattedDate || !other.notificado || other.denegado) return false;
                        const otherHdId = Object.entries(hairdresserMap).find(([k, v]) => v === hd)?.[0];
                        const otherMatchHd = !other.hairdresserId || String(other.hairdresserId) === otherHdId;
                        if (!otherMatchHd) return false;
                        if (other.startMins < slotStartMins || other.startMins >= nextSlotMins) return false;
                        if (!other.fechaEnvio) return true;
                        return (Date.now() - new Date(other.fechaEnvio).getTime()) < THREE_H;
                      });
                      return !groupHasBlocking;
                    });
                  }).length;
                  return waitlistCount > 0 ? (
                    <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 bg-violet-100 border border-violet-200 rounded-lg">
                      <Hourglass className="w-3.5 h-3.5 text-violet-600" />
                      <span className="text-[11px] font-black text-violet-700 uppercase tracking-wider">{waitlistCount}</span>
                    </div>
                  ) : null;
                })()}

                {/* Navegación de fecha */}
                <div className="flex items-center gap-0.5 sm:gap-1 bg-white border border-gray-200 rounded-lg p-0.5 sm:p-1 shadow-sm">
                  {!isToday && (
                    <button
                      onClick={() => setCurrentDate(today)}
                      className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                    >
                      Hoy
                    </button>
                  )}
                  <button onClick={handlePrevDay} className="p-1 hover:bg-gray-100 rounded transition-colors" aria-label="Día anterior">
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5"/>
                  </button>
                  <div className="relative flex items-center" ref={menuRef}>
                    <button
                      onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
                      className={`px-2 sm:px-3 py-1 font-semibold text-xs sm:text-sm hover:bg-gray-100 rounded transition-colors flex items-center gap-1.5 sm:gap-2 ${isDateMenuOpen ? 'bg-gray-100' : ''}`}
                    >
                      <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4"/>
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
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5"/>
                  </button>
                </div>
              </div>

              {/* Fecha larga — solo tablet+ */}
              <p className="hidden sm:block text-xs sm:text-sm text-gray-500 capitalize font-medium min-w-[200px] text-right">
                {currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </header>

        {isMobile && (
          <div className="flex gap-1.5 mb-2 shrink-0">
            {hairdressers.map(hd => (
              <button
                key={hd}
                onClick={() => setMobileSelectedHd(hd)}
                className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wide rounded-xl border-2 transition-all ${
                  mobileSelectedHd === hd
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-500 border-gray-200 active:border-gray-400'
                }`}
              >
                {hd}
              </button>
            ))}
          </div>
        )}

        {actionError && (
          <div className="mb-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-4 shrink-0">
            <p className="text-[11px] font-black uppercase tracking-widest text-red-600">⚠ {actionError}</p>
            <button onClick={() => setActionError('')} className="text-red-400 hover:text-red-600 transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <section className="bg-white border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-2xl flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden relative">
          <div className={`grid ${gridColsClass} border-b border-gray-200 bg-gray-50 shrink-0`}>
            <div className="p-2 sm:p-4 flex items-center justify-center border-r border-gray-100">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            </div>
            {visibleHairdressers.map(hd => (
              <div key={hd} className="p-2 sm:p-4 text-center font-bold text-gray-800 border-r border-gray-100 last:border-r-0 uppercase tracking-wider text-xs sm:text-sm flex justify-center items-center gap-1.5 sm:gap-2">
                <Scissors className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                {hd}
              </div>
            ))}
          </div>

          <div 
            ref={scrollContainerRef}
            className={`overflow-y-auto overflow-x-auto flex-1 pb-10 relative bg-white touch-auto overscroll-contain ${timeSlots.length > 0 ? 'agenda-scroll-container' : ''}`}
          >
            <div className="block md:min-w-[500px] lg:min-w-0">
              {loadError ? (
                <div className="flex flex-col items-center justify-center gap-4 py-20 px-8 text-center">
                  <AlertCircle className="w-12 h-12 text-red-400 opacity-60" />
                  <p className="text-sm font-bold uppercase tracking-widest text-red-500">{loadError}</p>
                  <button onClick={loadAgenda} className="mt-2 px-5 py-2.5 bg-black text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-colors">Reintentar</button>
                </div>
              ) : timeSlots.length > 0 ? (
                <>
                  {timeSlots.map((time, slotIndex) => {
                    return (
                    <React.Fragment key={time}>
                      <div className={`grid ${gridColsClass} border-b border-gray-100 group/row`} style={{ height: `${SLOT_HEIGHT}rem`, overflow: 'visible', zIndex: 100 - slotIndex }}>
                        <div className="bg-gray-50 border-r border-gray-100 flex items-center justify-center text-[9px] sm:text-[10px] md:text-sm font-bold text-gray-400 group-hover/row:text-black transition-colors uppercase tracking-[0.05em] sm:tracking-[0.1em]" style={{ height: `${SLOT_HEIGHT}rem` }}>
                          {isMobile ? time.slice(0, 5) : time}
                        </div>

                      {visibleHairdressers.map(hd => {
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

                        // Waitlist entry from a previous slot spilling into this one
                        const prevWaitlist = !prevApt ? waitlistEntries.find(w => {
                          if (w.date !== currentFormattedDate || w.denegado) return false;
                          const matchHd = !w.hairdresserId || String(w.hairdresserId) === hdId;
                          return matchHd && w.startMins < slotStartMins && w.endMins > slotStartMins;
                        }) : null;
                        const isOccupiedByPreviousWaitlist = !!prevWaitlist;

                        // Waitlist entry starting in this slot that extends beyond it
                        const hasMultiSlotWaitlist = slotApts.length === 0 && waitlistEntries.some(w => {
                          if (w.date !== currentFormattedDate || w.denegado) return false;
                          const matchHd = !w.hairdresserId || String(w.hairdresserId) === hdId;
                          return matchHd && w.startMins >= slotStartMins && w.startMins < nextSlotMins && w.endMins > nextSlotMins;
                        });

                        const absenceRecord = absences.find(abs => {
                          if (abs.hairdresser !== hd) return false;
                          if (currentFormattedDate < abs.startDate || currentFormattedDate > abs.endDate) return false;
                          if (abs.isAllDay) return true;
                          return time >= abs.startTime && time < abs.endTime;
                        });

                        return (
                          <div key={`${time}-${hd}`} className="p-1 md:p-2 border-r border-gray-100 last:border-r-0 relative group cursor-pointer min-w-0" style={{ height: `${SLOT_HEIGHT}rem`, overflow: (isMultiSlot || hasMultiSlotWaitlist) ? 'visible' : undefined }}>
                            {absenceRecord ? (
                              <div
                                className="w-full h-full rounded-xl bg-gray-50 border border-gray-200 flex flex-col items-center justify-center opacity-80 relative group/absence transition-colors"
                              >
                                {confirmDeleteAbsenceId !== absenceRecord.id ? (
                                  <div className="w-full h-full flex items-center justify-center relative">
                                    <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">Ausente</span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteAbsenceId(absenceRecord.id); }}
                                      className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-red-100 text-red-500 opacity-0 group-hover/absence:opacity-100 transition-opacity hover:bg-red-200"
                                      title="Eliminar ausencia"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="absolute inset-0 bg-red-600/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-2 z-[70] animate-in fade-in duration-200">
                                    <p className="text-white text-[10px] font-black uppercase tracking-tighter mb-2 text-center">¿Eliminar<br/>Ausencia?</p>
                                    <div className="flex gap-2 w-full">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteAbsence(absenceRecord.id); }}
                                        className="flex-1 bg-white text-red-600 text-[10px] font-bold py-2 rounded-lg shadow-sm hover:bg-gray-100 transition-colors"
                                      >
                                        Sí
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteAbsenceId(null); }}
                                        className="flex-1 bg-black/20 text-white text-[10px] font-bold py-2 rounded-lg hover:bg-black/40 transition-colors"
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
                                {isOccupiedByPreviousWaitlist && (
                                  <div style={{ height: `${(Math.min(30, prevWaitlist.endMins - slotStartMins) / 30) * SLOT_HEIGHT - 0.25}rem` }} className="w-full shrink-0" />
                                )}

                                {(() => {
                                  const els = [];
                                  let currentMins = isOccupiedByPrevious
                                    ? (timeToMins(prevApt.time) + (prevApt.durationMins || 30))
                                    : isOccupiedByPreviousWaitlist
                                    ? prevWaitlist.endMins
                                    : slotStartMins;

                                  if (slotApts.length === 0) {
                                    const gapMins = nextSlotMins - currentMins;
                                    const showGap = gapMins >= 5 && currentMins < nextSlotMins;
                                    const isPast = currentFormattedDate < strToday || (currentFormattedDate === strToday && (currentMins + 30) < (new Date().getHours() * 60 + new Date().getMinutes()));

                                    const slotWaitlist = !isPast ? waitlistEntries.filter(w => {
                                      if (w.date !== currentFormattedDate) return false;
                                      if (w.denegado) return false;
                                      const matchHd = !w.hairdresserId || String(w.hairdresserId) === hdId;
                                      if (!matchHd) return false;
                                      if (!(w.startMins >= slotStartMins && w.startMins < nextSlotMins)) return false;
                                      // No mostrar si el rango solicitado se solapa con alguna cita existente
                                      if (w.endMins > 0) {
                                        const hasOverlap = appointments.some(a => {
                                          if (a.date !== currentFormattedDate || a.hairdresser !== hd) return false;
                                          const aptStart = timeToMins(a.time);
                                          const aptEnd = aptStart + (a.durationMins || 30);
                                          return w.startMins < aptEnd && w.endMins > aptStart;
                                        });
                                        if (hasOverlap) return false;
                                      }
                                      return true;
                                    }) : [];

                                    if (!showGap) return null;

                                    if (slotWaitlist.length > 0) {
                                      const wDuration = slotWaitlist[0].endMins > slotWaitlist[0].startMins
                                        ? slotWaitlist[0].endMins - slotWaitlist[0].startMins
                                        : 30;
                                      const wCardHeight = `${(wDuration / 30) * SLOT_HEIGHT - 0.5}rem`;
                                      return (
                                        <div
                                          className="rounded-xl border-2 border-violet-300 bg-violet-50 transition-all flex items-center justify-center cursor-pointer hover:bg-violet-100 hover:border-violet-500 hover:shadow-sm shrink-0 overflow-hidden"
                                          style={{ height: wCardHeight }}
                                          onClick={(e) => { e.stopPropagation(); setWaitlistPopup({ open: true, entries: slotWaitlist, time: minsToTime(slotStartMins), hairdresser: hd }); }}
                                        >
                                          <div className="flex flex-col items-center gap-0.5 pointer-events-none">
                                            <div className="flex items-center gap-1">
                                              <Hourglass className="w-3 h-3 text-violet-500" />
                                              <span className="text-[10px] font-black text-violet-600 uppercase tracking-wider">Espera</span>
                                            </div>
                                            <span className="text-[9px] font-bold text-violet-400">{slotWaitlist.length} cliente{slotWaitlist.length !== 1 ? 's' : ''}</span>
                                          </div>
                                        </div>
                                      );
                                    }

                                    return (
                                      <div
                                        className={`flex-1 rounded-xl border-2 border-dashed border-transparent transition-colors flex items-center justify-center opacity-0 ${isPast ? 'cursor-not-allowed bg-gray-50/10' : 'hover:border-gray-200 group-hover:opacity-100 cursor-pointer'}`}
                                        onClick={(e) => { e.stopPropagation(); if (!isPast) setNewAptModal({ open: true, time: minsToTime(currentMins), hairdresser: hd, hairdresserId: hdId ? Number(hdId) : null }); }}
                                      >
                                        {!isPast && <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">+ Libre</span>}
                                      </div>
                                    );
                                  }

                                  slotApts.forEach((apt, idx) => {
                                    const aptStartMins = timeToMins(apt.time);

                                    const gapBefore = aptStartMins - currentMins;
                                    if (gapBefore >= 5 && currentMins < aptStartMins) {
                                      const gapStartMins = currentMins; // capture before mutation
                                      const isPast = currentFormattedDate < strToday || (currentFormattedDate === strToday && (gapStartMins + 30) < (new Date().getHours() * 60 + new Date().getMinutes()));
                                      els.push(
                                        <div
                                          key={`gap-${gapStartMins}`}
                                          style={{ height: `${(gapBefore / 30) * SLOT_HEIGHT - 0.25}rem`, flexShrink: 0 }}
                                          className={`w-full rounded-xl border-2 border-dashed border-transparent transition-colors flex items-center justify-center opacity-0 ${isPast ? 'cursor-not-allowed bg-gray-50/10' : 'hover:border-gray-200 group-hover:opacity-100 cursor-pointer'}`}
                                          onClick={(e) => { e.stopPropagation(); if (!isPast) setNewAptModal({ open: true, time: minsToTime(gapStartMins), hairdresser: hd, hairdresserId: hdId ? Number(hdId) : null }); }}
                                        >
                                          {!isPast && <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">+ Libre</span>}
                                        </div>
                                      );
                                    }

                                    const cardHeight = `${((apt.durationMins || 30) / 30) * SLOT_HEIGHT - 0.5}rem`;
                                    
                                    const aptEndTime = new Date(apt.rawDate).getTime() + (apt.durationMins * 60000);
                                    const isAptPast = aptEndTime < new Date().getTime();

                                    els.push(
                                      <article 
                                        key={apt.id}
                                        onClick={(e) => { e.stopPropagation(); if (apt.status !== 'completed' && apt.status !== 'no-show') setSelectedAptId(apt.id); }}
                                        className={`w-full rounded-xl border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 cursor-pointer flex flex-col justify-between relative shrink-0 ${apt.durationMins < 25 ? 'p-1 px-1.5' : 'p-2 md:p-3'} ${apt.status === 'completed' ? 'bg-green-50 border-green-300' : apt.status === 'no-show' ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200 hover:border-black'}`}
                                        style={{ height: cardHeight, zIndex: 20 - idx }}
                                      >
                                        {!(selectedAptId === apt.id || confirmCancelId === apt.id) && apt.status === 'pending' && !isAptPast && (
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
                                          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center gap-4 z-50" onClick={(e) => { e.stopPropagation(); if (!savingAttendanceId) setSelectedAptId(null); }}>
                                            {savingAttendanceId === apt.id ? (
                                              <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                              <>
                                                <button onClick={(e) => { e.stopPropagation(); handleAttendance(apt.id, false); }} className="w-10 h-10 rounded-full bg-red-100 text-red-500 flex items-center justify-center shadow-sm"><X className="w-5 h-5"/></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleAttendance(apt.id, true); }} className="w-10 h-10 rounded-full bg-green-100 text-green-500 flex items-center justify-center shadow-sm"><Check className="w-5 h-5"/></button>
                                              </>
                                            )}
                                          </div>
                                        )}

                                        {apt.durationMins < 25 ? (
                                          <div className="flex flex-col justify-center h-full min-h-0 gap-0.5 overflow-hidden">
                                            <div className="flex items-center gap-1 w-full overflow-hidden shrink-0">
                                              <span title={apt.confirmado ? "Cita Confirmada" : "Pendiente de Confirmación"} className={`shrink-0 flex items-center justify-center p-[2px] rounded border ${apt.confirmado ? 'bg-green-100/80 text-green-600 border-green-300/50' : 'bg-amber-100/80 text-amber-600 border-amber-300/50'}`}>
                                                {apt.confirmado ? <Check className="w-2 h-2" strokeWidth={3}/> : <Clock className="w-2 h-2" strokeWidth={3}/>}
                                              </span>
                                              <h2 className="text-[10px] md:text-[11px] font-bold leading-none truncate uppercase" title={apt.client}>{apt.client}</h2>
                                            </div>
                                            <div className="flex items-center justify-between gap-1 w-full overflow-hidden shrink-0 mt-0.5">
                                              <div className="flex-1 min-w-0 overflow-hidden">
                                                <span className={`inline-block max-w-full truncate text-[9px] md:text-[8px] font-bold uppercase px-1 py-[1px] rounded border ${getServiceBadge(apt.service)}`}>{apt.service}</span>
                                              </div>
                                              <div className="flex items-center gap-1 shrink-0 ml-1">
                                                {editingPriceId === apt.id ? (
                                                  <div className="flex items-center gap-0.5 shrink-0">
                                                    <button onClick={(e) => { e.stopPropagation(); const v = Math.max(0, (parseFloat(editingPriceValue) || 0) - 1); handlePriceArrowChange(apt.id, v); }} className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold text-[10px] flex items-center justify-center select-none transition-colors">−</button>
                                                    <span className="text-[9px] md:text-[8px] font-bold text-emerald-600 min-w-[18px] text-center">{editingPriceValue !== '' ? `${editingPriceValue}€` : '0€'}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); const v = (parseFloat(editingPriceValue) || 0) + 1; handlePriceArrowChange(apt.id, v); }} className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold text-[10px] flex items-center justify-center select-none transition-colors">+</button>
                                                    <button onClick={(e) => { e.stopPropagation(); setEditingPriceId(null); }} className="text-gray-400 hover:text-gray-600 text-[9px] md:text-[7px] leading-none ml-0.5 select-none">✕</button>
                                                  </div>
                                                ) : (
                                                  <>
                                                    {apt.isBonus && <span className="text-[8px] font-black text-violet-600 bg-violet-50 border border-violet-200 rounded px-0.5 shrink-0" title="Precio con descuento bonus">%</span>}
                                                    <button
                                                      className="text-[9px] md:text-[8px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-1 py-0 rounded border border-emerald-200 shrink-0 transition-colors"
                                                      onClick={(e) => { e.stopPropagation(); setEditingPriceId(apt.id); setEditingPriceValue(apt.price != null ? String(apt.price) : '0'); }}
                                                    >
                                                      {apt.price != null ? `${apt.price}€` : <span className="text-gray-400 font-normal">+€</span>}
                                                    </button>
                                                  </>
                                                )}
                                                <div className="flex items-center gap-0.5 text-[9px] md:text-[8px] text-gray-400 font-bold">
                                                  <Phone className="w-2.5 h-2.5 md:w-2 md:h-2" />
                                                  <span>{formatPhoneDisplay(apt.phone)}</span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex flex-col h-full min-h-0 gap-0 overflow-hidden py-0.5">
                                            <div className="flex items-center gap-1 overflow-hidden shrink-0">
                                              <span title={apt.confirmado ? "Cita Confirmada" : "Pendiente de Confirmación"} className={`shrink-0 flex items-center justify-center p-[2px] rounded border ${apt.confirmado ? 'bg-green-100/80 text-green-600 border-green-300/50' : 'bg-amber-100/80 text-amber-600 border-amber-300/50'}`}>
                                                {apt.confirmado ? <Check className="w-3 h-3" strokeWidth={3}/> : <Clock className="w-3 h-3" strokeWidth={3}/>}
                                              </span>
                                              <h2 className="text-sm font-bold leading-none truncate uppercase">{apt.client}</h2>
                                            </div>
                                            <div className="shrink-0 mt-0.5 md:mt-1">
                                              {editingPriceId === apt.id ? (
                                                <div className="flex items-center gap-1.5">
                                                  <button onClick={(e) => { e.stopPropagation(); const v = Math.max(0, (parseFloat(editingPriceValue) || 0) - 1); handlePriceArrowChange(apt.id, v); }} className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold text-base flex items-center justify-center select-none transition-colors">−</button>
                                                  <span className="text-sm font-bold text-emerald-600 min-w-[3rem] text-center">{editingPriceValue !== '' ? `${editingPriceValue}€` : '0€'}</span>
                                                  <button onClick={(e) => { e.stopPropagation(); const v = (parseFloat(editingPriceValue) || 0) + 1; handlePriceArrowChange(apt.id, v); }} className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold text-base flex items-center justify-center select-none transition-colors">+</button>
                                                  <button onClick={(e) => { e.stopPropagation(); setEditingPriceId(null); }} className="text-gray-400 hover:text-gray-600 text-xs ml-0.5 select-none">✕</button>
                                                </div>
                                              ) : (
                                                <div className="flex items-center gap-1">
                                                  {apt.isBonus && <span className="text-[9px] font-black text-violet-600 bg-violet-50 border border-violet-200 rounded px-1 shrink-0" title="Precio con descuento bonus">%</span>}
                                                  <button
                                                    className="text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 md:py-1 rounded-lg border border-emerald-200 transition-colors"
                                                    onClick={(e) => { e.stopPropagation(); setEditingPriceId(apt.id); setEditingPriceValue(apt.price != null ? String(apt.price) : '0'); }}
                                                  >
                                                    {apt.price != null ? `${apt.price}€` : <span className="text-gray-400 font-normal">+ precio</span>}
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex items-center justify-between gap-1 mt-auto pt-1 border-t border-gray-50 overflow-hidden shrink-0">
                                              <div className="flex-1 min-w-0 overflow-hidden">
                                                <span className={`inline-block max-w-full truncate text-[10px] md:text-[8px] font-bold uppercase px-1 py-0 rounded border ${getServiceBadge(apt.service)}`}>{apt.service}</span>
                                              </div>
                                              <div className="flex shrink-0 items-center gap-0.5 text-[10px] sm:text-[11px] text-gray-400 font-bold ml-1"><Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3" /><span>{formatPhoneDisplay(apt.phone)}</span></div>
                                            </div>
                                          </div>
                                        )}
                                      </article>
                                    );

                                    currentMins = aptStartMins + (apt.durationMins || 30);
                                  });

                                  const finalGapMins = nextSlotMins - currentMins;
                                  if (finalGapMins >= 5 && currentMins < nextSlotMins) {
                                    const isFinalPast = currentFormattedDate < strToday || (currentFormattedDate === strToday && (currentMins + 30) < (new Date().getHours() * 60 + new Date().getMinutes()));
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

                    {/* Siesta / Mid-day Extra Section */}
                    {horarioInfo?.hasTarde && time === minsToTime((horarioInfo.cierreMañ ?? 0) - 30) && (
                      <div className={`grid ${gridColsClass} border-b-2 border-gray-100 bg-amber-50/10 min-h-[5rem] group/siesta`}>
                        <div className="bg-amber-50/50 border-r border-amber-100 flex flex-col items-center justify-center text-[8px] font-black uppercase text-amber-500 text-center leading-tight">
                          <span className="text-lg font-light">+</span>Extra<br/>Siesta
                        </div>
                        {visibleHairdressers.map(hd => {
                          const hdId = Object.entries(hairdresserMap).find(([k,v]) => v === hd)?.[0];
                          const siestaStartMins = horarioInfo?.cierreMañ ?? (14 * 60);
                          const siestaEndLimit   = horarioInfo?.aperTarde  ?? (17 * 60);
                          const isMidPast = currentFormattedDate < strToday || (currentFormattedDate === strToday && new Date().getHours() * 60 + new Date().getMinutes() >= siestaEndLimit);

                          const midApts = appointments.filter(a => a.date === currentFormattedDate && a.time === 'extra_mid' && a.hairdresser === hd);
                          const regularOverflowApts = appointments.filter(a => {
                             if (a.date !== currentFormattedDate || a.hairdresser !== hd || a.time === 'extra_mid' || a.time === 'extra') return false;
                             const startMins = timeToMins(a.time);
                             const endMins = startMins + (a.durationMins || 30);
                             return startMins < siestaStartMins && endMins > siestaStartMins;
                          });
                          
                          // 1. Calculamos SOLO el hueco del overflow real de la mañana
                          let overflowEndMins = siestaStartMins;
                          regularOverflowApts.forEach(a => {
                             const end = timeToMins(a.time, a.rawDate) + (a.durationMins || 30);
                             if (end > overflowEndMins) overflowEndMins = end;
                          });
                          if (overflowEndMins > siestaEndLimit) overflowEndMins = siestaEndLimit;
                          const overflowGapHeight = ((overflowEndMins - siestaStartMins) / 30) * SLOT_HEIGHT;

                          // 2. Calculamos el total de ocupación (incluyendo extras) para el botón de "Nueva Cita"
                          // Partimos siempre desde el cierre de mañana (siestaStartMins), no del overflow
                          let lastEndMins = siestaStartMins;
                          midApts.forEach(a => {
                             const end = timeToMins(a.time, a.rawDate) + (a.durationMins || 30);
                             if (end > lastEndMins) lastEndMins = end;
                          });
                          if (lastEndMins > siestaEndLimit) lastEndMins = siestaEndLimit;

                          return (
                            <div key={`mid-${hd}`} className="p-2 border-r border-amber-100/30 last:border-r-0 flex flex-col gap-2 min-h-[5rem]">
                              {overflowGapHeight > 0 && <div style={{ height: `${overflowGapHeight - 0.5}rem` }} className="w-full shrink-0" />}
                              
                              {midApts
                                .sort((a,b) => timeToMins(a.time, a.rawDate) - timeToMins(b.time, b.rawDate))
                                .map(apt => {
                                 const startTimeStr = apt.rawDate ? new Date(apt.rawDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                                 const endTimeStr = apt.rawDate ? new Date(new Date(apt.rawDate).getTime() + apt.durationMins * 60000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                                  const cardHeight = `${((apt.durationMins || 30) / 30) * SLOT_HEIGHT - 0.5}rem`;
                                  return (
                                    <article 
                                      key={apt.id} 
                                      onClick={(e) => { e.stopPropagation(); if (apt.status !== 'completed' && apt.status !== 'no-show') setSelectedAptId(selectedAptId === apt.id ? null : apt.id); }}
                                      className={`relative w-full ${apt.durationMins <= 15 ? 'p-1' : 'p-2.5'} rounded-xl border-2 shadow-sm transition-all cursor-pointer shrink-0 ${apt.status === 'completed' ? 'bg-green-50 border-green-300' : apt.status === 'no-show' ? 'bg-red-50 border-red-300' : 'bg-white border-amber-400 hover:border-amber-500'} ${selectedAptId === apt.id ? 'border-amber-600 ring-2 ring-amber-100 scale-[0.98]' : ''}`}
                                      style={{ height: cardHeight }}
                                    >
                                      {!(selectedAptId === apt.id || confirmCancelId === apt.id) && apt.status === 'pending' && (
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
                                          <button onClick={() => handleAttendance(apt.id, false)} className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center shadow-sm"><X className="w-4 h-4"/></button>
                                          <button onClick={() => handleAttendance(apt.id, true)} className="w-8 h-8 rounded-full bg-green-100 text-green-500 flex items-center justify-center shadow-sm"><Check className="w-4 h-4"/></button>
                                        </div>
                                      )}
                                      
                                      <div className="flex flex-col h-full min-h-0 gap-0 overflow-hidden py-0.5">
                                        <div className="flex items-center gap-1 w-full overflow-hidden shrink-0">
                                          <span title={apt.confirmado ? "Cita Confirmada" : "Pendiente de Confirmación"} className={`shrink-0 flex items-center justify-center p-[1px] rounded border ${apt.confirmado ? 'bg-green-100/80 text-green-600 border-green-300/50' : 'bg-amber-100/80 text-amber-600 border-amber-300/50'}`}>
                                            {apt.confirmado ? <Check className={`w-2.5 h-2.5 ${apt.durationMins <= 15 ? 'scale-75' : ''}`} strokeWidth={3}/> : <Clock className={`w-2.5 h-2.5 ${apt.durationMins <= 15 ? 'scale-75' : ''}`} strokeWidth={3}/>}
                                          </span>
                                          <h2 className={`${apt.durationMins <= 15 ? 'text-[9px]' : 'text-[10px]'} items-center font-bold leading-none truncate uppercase flex-1`} title={apt.client}>{apt.client}</h2>
                                          <div className={`${apt.durationMins <= 15 ? 'text-[7px]' : 'text-[8px]'} font-bold text-amber-600 bg-amber-50 px-1 rounded shrink-0 leading-tight`}>{startTimeStr}-{endTimeStr}</div>
                                        </div>
                                        {apt.durationMins > 15 && (
                                          <div className="shrink-0 mt-0.5">
                                            {editingPriceId === apt.id ? (
                                              <div className="flex items-center gap-1">
                                                <button onClick={(e) => { e.stopPropagation(); const v = Math.max(0, (parseFloat(editingPriceValue) || 0) - 1); handlePriceArrowChange(apt.id, v); }} className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold text-sm flex items-center justify-center select-none transition-colors">−</button>
                                                <span className="text-[10px] font-bold text-emerald-600 min-w-[2.5rem] text-center">{editingPriceValue !== '' ? `${editingPriceValue}€` : '0€'}</span>
                                                <button onClick={(e) => { e.stopPropagation(); const v = (parseFloat(editingPriceValue) || 0) + 1; handlePriceArrowChange(apt.id, v); }} className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold text-sm flex items-center justify-center select-none transition-colors">+</button>
                                                <button onClick={(e) => { e.stopPropagation(); setEditingPriceId(null); }} className="text-gray-400 hover:text-gray-600 text-[9px] ml-0.5 select-none">✕</button>
                                              </div>
                                            ) : (
                                              <button
                                                className="text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
                                                onClick={(e) => { e.stopPropagation(); setEditingPriceId(apt.id); setEditingPriceValue(apt.price != null ? String(apt.price) : '0'); }}
                                              >
                                                {apt.price != null ? `${apt.price}€` : <span className="text-gray-400 font-normal">+ precio</span>}
                                              </button>
                                            )}
                                          </div>
                                        )}
                                        <div className={`flex items-center justify-between gap-1 w-full overflow-hidden shrink-0 ${apt.durationMins <= 15 ? 'mt-0.5' : 'mt-auto'} pb-0.5`}>
                                          <div className="flex-1 min-w-0 overflow-hidden">
                                            <span className={`inline-block max-w-full truncate ${apt.durationMins <= 15 ? 'text-[8px] md:text-[6px]' : 'text-[9px] md:text-[7px]'} font-black uppercase px-1 py-0.5 rounded border border-gray-200 bg-gray-50 text-gray-700`} title={apt.service}>{apt.service}</span>
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0 ml-1">
                                            {apt.durationMins <= 15 && (editingPriceId === apt.id ? (
                                              <div className="flex items-center gap-0.5 shrink-0">
                                                <button onClick={(e) => { e.stopPropagation(); const v = Math.max(0, (parseFloat(editingPriceValue) || 0) - 1); handlePriceArrowChange(apt.id, v); }} className="text-emerald-600 hover:text-emerald-800 font-bold text-[9px] leading-none w-2.5 h-2.5 flex items-center justify-center select-none">−</button>
                                                <span className="text-[9px] md:text-[6px] font-bold text-emerald-600 min-w-[16px] text-center">{editingPriceValue !== '' ? `${editingPriceValue}€` : '0€'}</span>
                                                <button onClick={(e) => { e.stopPropagation(); const v = (parseFloat(editingPriceValue) || 0) + 1; handlePriceArrowChange(apt.id, v); }} className="text-emerald-600 hover:text-emerald-800 font-bold text-[9px] leading-none w-2.5 h-2.5 flex items-center justify-center select-none">+</button>
                                                <button onClick={(e) => { e.stopPropagation(); setEditingPriceId(null); }} className="text-gray-400 hover:text-gray-600 text-[9px] md:text-[6px] leading-none ml-0.5 select-none">✕</button>
                                              </div>
                                            ) : (
                                              <>
                                                {apt.isBonus && <span className="text-[8px] font-black text-violet-600 bg-violet-50 border border-violet-200 rounded px-0.5 shrink-0" title="Precio con descuento bonus">%</span>}
                                                <button className="text-[9px] md:text-[6px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0 rounded border border-emerald-200" onClick={(e) => { e.stopPropagation(); setEditingPriceId(apt.id); setEditingPriceValue(apt.price != null ? String(apt.price) : '0'); }}>
                                                  {apt.price != null ? `${apt.price}€` : '+€'}
                                                </button>
                                              </>
                                            ))}
                                            <div className={`flex items-center gap-0.5 ${apt.durationMins <= 15 ? 'text-[9px] md:text-[7px]' : 'text-[10px] md:text-[8px]'} text-gray-400 font-bold`}>
                                              <Phone className={`${apt.durationMins <= 15 ? 'w-2 h-2 md:w-1.5 md:h-1.5' : 'w-2.5 h-2.5 md:w-2 md:h-2'}`} />
                                              <span>{formatPhoneDisplay(apt.phone)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </article>
                                  );
                                })}
                              {!isMidPast && (
                                <button 
                                  onClick={() => setNewAptModal({ open: true, time: minsToTime(siestaStartMins), hairdresser: hd, hairdresserId: hdId ? Number(hdId) : null })}
                                  className="w-full py-2 rounded-xl border-2 border-dashed border-amber-200 text-amber-400 hover:border-amber-400 hover:bg-amber-50 transition-all flex flex-col items-center justify-center opacity-0 group-hover/siesta:opacity-100"
                                >
                                  <span className="text-lg font-light leading-none">+</span>
                                  <span className="text-[8px] font-bold uppercase tracking-tighter">Cita Siesta ({minsToTime(siestaStartMins)})</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    </React.Fragment>
                );
              })}

                  <div className={`grid ${gridColsClass} min-h-[6.5rem] border-t-4 border-double border-gray-200 bg-orange-50/20 group/row`}>
                    <div className="bg-orange-50/50 border-r border-orange-100 flex flex-col items-center justify-center text-[9px] font-black uppercase text-orange-400">
                      <span className="text-xl font-light">+</span>Fuera<br/>Hora
                    </div>
                    {visibleHairdressers.map(hd => {
                      const hdId = Object.entries(hairdresserMap).find(([k,v]) => v === hd)?.[0];
                      const isExtraPast = currentFormattedDate < strToday;
                      
                      const extraApts = appointments.filter(a => a.date === currentFormattedDate && a.time === 'extra' && a.hairdresser === hd);
                      // Continuo: cierreTarde tiene el cierre real aunque hasTarde=false
                      const extraStartMins = horarioInfo?.cierreTarde ?? horarioInfo?.cierreMañ ?? (21 * 60);

                      const regularExtraOverflowApts = appointments.filter(a => {
                         if (a.date !== currentFormattedDate || a.hairdresser !== hd || a.time === 'extra') return false;
                         const startMins = timeToMins(a.time, a.rawDate);
                         const endMins = startMins + (a.durationMins || 30);
                         return startMins < extraStartMins && endMins > extraStartMins;
                      });
                      
                      // 1. Calculamos SOLO el hueco del overflow real de la tarde/mañana (según el día)
                      let extraOverflowEndMins = extraStartMins;
                      regularExtraOverflowApts.forEach(a => {
                         const end = timeToMins(a.time, a.rawDate) + (a.durationMins || 30);
                         if (end > extraOverflowEndMins) extraOverflowEndMins = end;
                      });
                      const extraOverflowGapHeight = ((extraOverflowEndMins - extraStartMins) / 30) * SLOT_HEIGHT;

                      // 2. Calculamos el total de ocupación (incluyendo extras) para el botón de "Nueva Cita"
                      // Partimos siempre desde el cierre de tarde (o mañana si no hay tarde)
                      let lastExtraEndMins = extraStartMins;
                      extraApts.forEach(a => {
                         const end = timeToMins(a.time, a.rawDate) + (a.durationMins || 30);
                         if (end > lastExtraEndMins) lastExtraEndMins = end;
                      });

                      return (
                        <div key={`extra-${hd}`} className="p-2 border-r border-orange-100/50 last:border-r-0 flex flex-col gap-2 min-h-[7rem]">
                          {/* Spacer for overflow */}
                          {extraOverflowGapHeight > 0 && <div style={{ height: `${extraOverflowGapHeight - 0.5}rem` }} className="w-full shrink-0" />}

                              {extraApts
                                .sort((a,b) => timeToMins(a.time, a.rawDate) - timeToMins(b.time, b.rawDate))
                                .map(apt => {
                                 const startTimeStr = apt.rawDate ? new Date(apt.rawDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                                 const endTimeStr = apt.rawDate ? new Date(new Date(apt.rawDate).getTime() + apt.durationMins * 60000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                                 
                                 const cardHeight = `${((apt.durationMins || 30) / 30) * SLOT_HEIGHT - 0.5}rem`;
                                 return (
                                   <article 
                                     key={apt.id} 
                                     onClick={() => { if (apt.status !== 'completed' && apt.status !== 'no-show') setSelectedAptId(selectedAptId === apt.id ? null : apt.id); }}
                                     className={`relative w-full ${apt.durationMins <= 15 ? 'p-1' : 'p-2.5'} rounded-xl border-2 shadow-sm transition-all cursor-pointer shrink-0 ${apt.status === 'completed' ? 'bg-green-50 border-green-300' : apt.status === 'no-show' ? 'bg-red-50 border-red-300' : 'bg-white border-amber-400 hover:border-amber-500'} ${selectedAptId === apt.id ? 'border-amber-600 ring-2 ring-amber-100 scale-[0.98]' : ''}`}
                                     style={{ height: cardHeight }}
                                   >
                                     {!(selectedAptId === apt.id || confirmCancelId === apt.id) && apt.status === 'pending' && (
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
                                         <button onClick={() => handleAttendance(apt.id, false)} className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center shadow-sm"><X className="w-4 h-4"/></button>
                                         <button onClick={() => handleAttendance(apt.id, true)} className="w-8 h-8 rounded-full bg-green-100 text-green-500 flex items-center justify-center shadow-sm"><Check className="w-4 h-4"/></button>
                                       </div>
                                     )}

                                     <div className="flex flex-col h-full min-h-0 gap-0 overflow-hidden py-0.5">
                                       <div className="flex items-center gap-1 w-full overflow-hidden shrink-0">
                                         <span title={apt.confirmado ? "Cita Confirmada" : "Pendiente de Confirmación"} className={`shrink-0 flex items-center justify-center p-[1px] rounded border ${apt.confirmado ? 'bg-green-100/80 text-green-600 border-green-300/50' : 'bg-amber-100/80 text-amber-600 border-amber-300/50'}`}>
                                           {apt.confirmado ? <Check className={`w-2.5 h-2.5 ${apt.durationMins <= 15 ? 'scale-75' : ''}`} strokeWidth={3}/> : <Clock className={`w-2.5 h-2.5 ${apt.durationMins <= 15 ? 'scale-75' : ''}`} strokeWidth={3}/>}
                                         </span>
                                         <h2 className={`${apt.durationMins <= 15 ? 'text-[9px]' : 'text-[10px]'} font-bold leading-none truncate uppercase flex-1`} title={apt.client}>{apt.client}</h2>
                                         <div className={`${apt.durationMins <= 15 ? 'text-[7px]' : 'text-[8px]'} font-bold text-amber-600 bg-amber-50 px-1 rounded shrink-0 leading-tight`}>{startTimeStr}-{endTimeStr}</div>
                                       </div>
                                       {apt.durationMins > 15 && (
                                         <div className="shrink-0 mt-0.5">
                                           {editingPriceId === apt.id ? (
                                             <div className="flex items-center gap-1">
                                               <button onClick={(e) => { e.stopPropagation(); const v = Math.max(0, (parseFloat(editingPriceValue) || 0) - 1); handlePriceArrowChange(apt.id, v); }} className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold text-sm flex items-center justify-center select-none transition-colors">−</button>
                                               <span className="text-[10px] font-bold text-emerald-600 min-w-[2.5rem] text-center">{editingPriceValue !== '' ? `${editingPriceValue}€` : '0€'}</span>
                                               <button onClick={(e) => { e.stopPropagation(); const v = (parseFloat(editingPriceValue) || 0) + 1; handlePriceArrowChange(apt.id, v); }} className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold text-sm flex items-center justify-center select-none transition-colors">+</button>
                                               <button onClick={(e) => { e.stopPropagation(); setEditingPriceId(null); }} className="text-gray-400 hover:text-gray-600 text-[9px] ml-0.5 select-none">✕</button>
                                             </div>
                                           ) : (
                                             <button
                                               className="text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
                                               onClick={(e) => { e.stopPropagation(); setEditingPriceId(apt.id); setEditingPriceValue(apt.price != null ? String(apt.price) : '0'); }}
                                             >
                                               {apt.price != null ? `${apt.price}€` : <span className="text-gray-400 font-normal">+ precio</span>}
                                             </button>
                                           )}
                                         </div>
                                       )}
                                       <div className={`flex items-center justify-between gap-1 w-full overflow-hidden shrink-0 ${apt.durationMins <= 15 ? 'mt-0.5' : 'mt-auto'} pb-0.5`}>
                                         <div className="flex-1 min-w-0 overflow-hidden">
                                           <span className={`inline-block max-w-full truncate ${apt.durationMins <= 15 ? 'text-[8px] md:text-[6px]' : 'text-[9px] md:text-[7px]'} font-black uppercase px-1 py-0.5 rounded border border-gray-200 bg-gray-50 text-gray-700`} title={apt.service}>{apt.service}</span>
                                         </div>
                                         <div className="flex items-center gap-1 shrink-0 ml-1">
                                           {apt.durationMins <= 15 && (editingPriceId === apt.id ? (
                                             <div className="flex items-center gap-0.5 shrink-0">
                                               <button onClick={(e) => { e.stopPropagation(); const v = Math.max(0, (parseFloat(editingPriceValue) || 0) - 1); handlePriceArrowChange(apt.id, v); }} className="text-emerald-600 hover:text-emerald-800 font-bold text-[9px] leading-none w-2.5 h-2.5 flex items-center justify-center select-none">−</button>
                                               <span className="text-[9px] md:text-[6px] font-bold text-emerald-600 min-w-[16px] text-center">{editingPriceValue !== '' ? `${editingPriceValue}€` : '0€'}</span>
                                               <button onClick={(e) => { e.stopPropagation(); const v = (parseFloat(editingPriceValue) || 0) + 1; handlePriceArrowChange(apt.id, v); }} className="text-emerald-600 hover:text-emerald-800 font-bold text-[9px] leading-none w-2.5 h-2.5 flex items-center justify-center select-none">+</button>
                                               <button onClick={(e) => { e.stopPropagation(); setEditingPriceId(null); }} className="text-gray-400 hover:text-gray-600 text-[9px] md:text-[6px] leading-none ml-0.5 select-none">✕</button>
                                             </div>
                                           ) : (
                                             <button className="text-[9px] md:text-[6px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0 rounded border border-emerald-200" onClick={(e) => { e.stopPropagation(); setEditingPriceId(apt.id); setEditingPriceValue(apt.price != null ? String(apt.price) : '0'); }}>
                                               {apt.price != null ? `${apt.price}€` : '+€'}
                                             </button>
                                           ))}
                                           <div className={`flex items-center gap-0.5 ${apt.durationMins <= 15 ? 'text-[9px] md:text-[7px]' : 'text-[10px] md:text-[8px]'} text-gray-400 font-bold`}>
                                             <Phone className={`${apt.durationMins <= 15 ? 'w-2 h-2 md:w-1.5 md:h-1.5' : 'w-2.5 h-2.5 md:w-2 md:h-2'}`} />
                                             <span>{formatPhoneDisplay(apt.phone)}</span>
                                           </div>
                                         </div>
                                       </div>
                                     </div>
                                   </article>
                                 );
                               })}

                          {!isExtraPast && (
                            <button 
                              onClick={() => setNewAptModal({ open: true, time: minsToTime(extraStartMins), hairdresser: hd, hairdresserId: hdId ? Number(hdId) : null })}
                              className="w-full py-3 rounded-xl border-2 border-dashed border-amber-200 text-amber-400 hover:border-amber-400 hover:bg-amber-50 transition-all flex flex-col items-center justify-center gap-1 group"
                            >
                              <span className="text-xl font-light leading-none">+</span>
                              <span className="text-[9px] font-bold uppercase tracking-tighter">Cita Especial ({minsToTime(extraStartMins)})</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center gap-4 bg-gray-50/50">
                  {loadError ? (
                    <>
                      <CalendarIcon className="w-16 h-16 text-red-300 opacity-60" />
                      <p className="text-sm font-bold uppercase tracking-widest text-red-500">{loadError}</p>
                      <button
                        onClick={loadAgenda}
                        className="mt-1 px-5 py-2.5 bg-black text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-colors"
                      >
                        Reintentar
                      </button>
                    </>
                  ) : loading ? (
                    <p className="text-sm font-bold uppercase tracking-widest text-gray-400 animate-pulse">Cargando…</p>
                  ) : horarioData === null ? (
                    <>
                      <CalendarIcon className="w-16 h-16 opacity-20" />
                      <p className="text-sm font-bold uppercase tracking-widest text-gray-500">Sin horario configurado</p>
                      <button
                        onClick={() => setIsHorarioModalOpen(true)}
                        className="mt-1 px-5 py-2.5 bg-black text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-colors"
                      >
                        Configurar horario
                      </button>
                    </>
                  ) : (
                    <>
                      <CalendarIcon className="w-16 h-16 opacity-20" />
                      <p className="text-xl font-bold uppercase tracking-widest text-gray-500">Peluquería Cerrada</p>
                    </>
                  )}
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
        hairdresser={newAptModal.hairdresser} hairdresserId={newAptModal.hairdresserId} appointments={appointments}
      />
      {waitlistPopup.open && (
        <WaitlistPopup
          entries={waitlistPopup.entries}
          time={waitlistPopup.time}
          hairdresser={waitlistPopup.hairdresser}
          onClose={() => setWaitlistPopup({ open: false, entries: [], time: '', hairdresser: '' })}
          onRefresh={loadAgenda}
        />
      )}
      {isHorarioModalOpen && (
        <HorarioModal
          isOpen={isHorarioModalOpen}
          onClose={() => setIsHorarioModalOpen(false)}
          onSave={handleSaveHorario}
          horarioData={horarioData}
          currentDate={currentDate}
        />
      )}
    </div>
  );
}
