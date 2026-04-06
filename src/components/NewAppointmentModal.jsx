import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Clock, Scissors, User, ChevronUp, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabaseClient';

export default function NewAppointmentModal({ isOpen, onClose, onCreated, slotTime, slotDate, hairdresser, hairdresserId, appointments = [], absences = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [cutTypes, setCutTypes] = useState([]);
  const [selectedCut, setSelectedCut] = useState(null);
  const [startTime, setStartTime] = useState(slotTime || '10:00');
  const [endTime, setEndTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [isAddingNewClient, setIsAddingNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);
  const [error, setError] = useState('');
  const [vvHeight, setVvHeight] = useState(window.innerHeight);
  const [vvOffset, setVvOffset] = useState(0);
  const searchRef = useRef(null);

  // Limpiar errores
  useEffect(() => {
    if (error) setError('');
  }, [startTime, endTime, selectedClient, selectedCut, isOpen]);

  // Load cut types on mount
  useEffect(() => {
    async function fetchCutTypes() {
      const { data } = await supabase.from('Tipo Corte').select('*');
      if (data) {
        setCutTypes(data);
        if (data.length > 0) {
          setSelectedCut(data[0]);
          // Auto-compute end time based on first cut type duration
          const end = addMinutes(slotTime || '10:00', data[0].duracionCorteMins || 30);
          setEndTime(end);
        }
      }
    }
    
    let rafId;

    if (isOpen) {
      fetchCutTypes();
      setStartTime(slotTime || '10:00');
      setSelectedClient(null);
      setSearchQuery('');
      setSearchResults([]);
      setSaving(false);
      setIsAddingNewClient(false);
      setNewClientName('');
      setNewClientPhone('');
      setError('');
      window.scrollTo(0, 0);
      
      if (window.visualViewport) {
        setVvHeight(window.visualViewport.height);
        setVvOffset(window.visualViewport.offsetTop);
      }

      // Aggressive Scroll Lock Loop (Ultimate fix for keyboard-induced jump)
      const forceScrollReset = () => {
        if (window.scrollY !== 0 || window.scrollX !== 0) {
          window.scrollTo(0, 0);
        }
        rafId = requestAnimationFrame(forceScrollReset);
      };
      rafId = requestAnimationFrame(forceScrollReset);
    }

    const handleViewport = () => {
      if (window.visualViewport) {
        setVvHeight(window.visualViewport.height);
        setVvOffset(window.visualViewport.offsetTop);
      }
      window.scrollTo(0, 0);
    };

    if (isOpen) {
      document.addEventListener('focusin', () => window.scrollTo(0, 0));
      document.addEventListener('focusout', () => window.scrollTo(0, 0));
      window.visualViewport?.addEventListener('resize', handleViewport);
      window.visualViewport?.addEventListener('scroll', handleViewport);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('focusin', () => window.scrollTo(0, 0));
      document.removeEventListener('focusout', () => window.scrollTo(0, 0));
      window.visualViewport?.removeEventListener('resize', handleViewport);
      window.visualViewport?.removeEventListener('scroll', handleViewport);
      window.scrollTo(0, 0);
    };
  }, [isOpen, slotTime]);

  // When selected cut changes, auto-adjust end time based on service duration
  useEffect(() => {
    if (selectedCut && startTime) {
      setEndTime(addMinutes(startTime, selectedCut.duracionCorteMins || 30));
    }
  }, [selectedCut, startTime]);

  // Search clients when query changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2 && !isAddingNewClient) {
        const { data } = await supabase
          .from('Cliente')
          .select('*')
          .ilike('nombreCliente', `%${searchQuery}%`)
          .limit(6);
        setSearchResults(data || []);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isAddingNewClient]);

  function addMinutes(timeStr, mins) {
    const [h, m] = timeStr.split(':').map(Number);
    const total = h * 60 + m + mins;
    const nh = Math.floor(total / 60);
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  }

  function adjustTime(current, delta) {
    // Si current no tiene formato correcto, usar valor por defecto
    if (!current || !current.includes(':')) current = '10:00';
    
    const [h, m] = current.split(':').map(Number);
    let total = h * 60 + m + delta;
    if (total < 0) total = 0;
    if (total > 23 * 60 + 55) total = 23 * 60 + 55;
    const nh = Math.floor(total / 60);
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  }

  async function handleCreateClient() {
    if (!newClientName || !newClientPhone) return;
    setCreatingClient(true);
    const { data, err } = await supabase
      .from('Cliente')
      .insert({ nombreCliente: newClientName, telefono: newClientPhone })
      .select()
      .single();
    
    setCreatingClient(false);
    if (data && !err) {
      setSelectedClient(data);
      setIsAddingNewClient(false);
    }
  }

  async function handleSubmit() {
    if (!selectedClient || !selectedCut) return;

    // Prevent past date/time
    const now = new Date();
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    if (slotDate < todayStr) {
      setError("No se pueden crear citas en días pasados.");
      return;
    }
    if (slotDate === todayStr) {
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const [h, m] = startTime.split(':').map(Number);
      // Allow start time to be in the past, but not more than 30 mins ago (the slot duration)
      if (h * 60 + m < currentMins - 30) {
         setError("La hora de inicio no puede ser anterior al slot actual.");
         return;
      }
    }

    // Prevent overlapping citas
    const newStartMins = startTime.split(':').map(Number).reduce((h,m) => h*60+m);
    const newEndMins = endTime.split(':').map(Number).reduce((h,m) => h*60+m);
    
    const hasOverlap = appointments.some(apt => {
      if (apt.date !== slotDate || apt.hairdresser !== hairdresser || apt.status === 'cancelled') return false;
      const aptStart = apt.time.split(':').map(Number).reduce((h,m) => h*60+m);
      const aptEnd = aptStart + (apt.durationMins || 30);
      return newStartMins < aptEnd && newEndMins > aptStart;
    });

    if (hasOverlap) {
      setError(`Ya existe otra cita para ${hairdresser} en el horario de ${startTime} a ${endTime}.`);
      return;
    }
    
    const hasAbsence = absences.some(abs => {
      if (abs.hairdresser !== hairdresser || abs.cancelada) return false;
      return slotDate >= abs.startDate && slotDate <= abs.endDate;
    });

    if (hasAbsence) {
      setError(`${hairdresser} tiene registrada una ausencia para este día y no puede aceptar citas.`);
      return;
    }

    setError('');
    setSaving(true);

    // Convert local time to proper ISO with offset handling DST
    const getOffsetString = (date, time) => {
      const d = new Date(`${date}T${time}:00`);
      const offsetMins = -d.getTimezoneOffset();
      const sign = offsetMins >= 0 ? '+' : '-';
      const h = String(Math.floor(Math.abs(offsetMins) / 60)).padStart(2, '0');
      const m = String(Math.abs(offsetMins) % 60).padStart(2, '0');
      return `${sign}${h}:${m}`;
    };

    const fechaInicio = `${slotDate}T${startTime}:00${getOffsetString(slotDate, startTime)}`;
    const fechaFin = `${slotDate}T${endTime}:00${getOffsetString(slotDate, endTime)}`;

    const { error: insertError } = await supabase.from('Citas').insert({
      cliente: selectedClient.idCliente,
      peluquero: hairdresserId,
      corte: selectedCut.idCorte,
      precio: selectedCut.precioCorte,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      confirmado: false,
      asistencia: null
    });

    setSaving(false);
    if (!insertError) {
      onCreated();
      onClose();
    }
  }

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden touch-none"
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      <div 
        className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-500 touch-auto"
        style={{ 
          maxHeight: `${vvHeight * 0.85}px`,
          transform: `translateY(${vvOffset}px)`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
          <div>
            <h2 className="text-base font-black uppercase tracking-tight text-black leading-none">Nueva Cita</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
              {hairdresser} · {slotDate} · {slotTime}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Static Section: Client & Time (Fixed at top) */}
        <div className="p-6 flex flex-col gap-5 flex-shrink-0 border-b border-gray-100 bg-white z-10">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm animate-in zoom-in-95 duration-200">
              ⚠ {error}
            </div>
          )}
          
          {/* Client select - Static */}
          <div className="flex-shrink-0">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2.5 block ml-1 leading-none">Cliente</label>
            {selectedClient ? (
              <div className="flex items-center justify-between bg-gray-50 border-2 border-transparent rounded-[1.5rem] px-5 py-4">
                <div className="min-w-0">
                  <p className="font-black text-sm text-black truncate uppercase tracking-tight">{selectedClient.nombreCliente}</p>
                  <p className="text-xs font-bold text-gray-400">{selectedClient.telefono}</p>
                </div>
                <button 
                  onClick={() => { setSelectedClient(null); setSearchQuery(''); setIsAddingNewClient(false); }}
                  className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest ml-4 underline"
                >
                  Cambiar
                </button>
              </div>
            ) : isAddingNewClient ? (
              <div className="bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] p-5 flex flex-col gap-4 shadow-inner">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nuevo Cliente</span>
                  <button onClick={() => setIsAddingNewClient(false)} className="text-[10px] font-black text-gray-400 underline">Cancelar</button>
                </div>
                <input
                  type="text"
                  placeholder="Nombre"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  onFocus={() => window.scrollTo(0,0)}
                  className="bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-black transition-all"
                />
                <input
                  type="text"
                  placeholder="Teléfono"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  onFocus={() => window.scrollTo(0,0)}
                  className="bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-black transition-all"
                />
                <button
                  onClick={handleCreateClient}
                  disabled={!newClientName || !newClientPhone || creatingClient}
                  className="w-full py-4 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 disabled:bg-gray-200 transition-all font-bold"
                >
                  {creatingClient ? 'Creando...' : 'Confirmar Registro'}
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center bg-gray-50 border-2 border-transparent rounded-[1.5rem] px-5 py-4 focus-within:border-black focus-within:bg-white transition-all">
                  <Search className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                  <input
                    ref={searchRef}
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    placeholder="Buscar cliente..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => window.scrollTo(0,0)}
                    className="bg-transparent outline-none text-sm font-bold text-black w-full"
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-100 rounded-[1.5rem] shadow-2xl z-50 max-h-40 overflow-y-auto custom-scrollbar">
                    {searchResults.map(c => (
                      <button
                        key={c.idCliente}
                        onClick={() => { setSelectedClient(c); setSearchResults([]); }}
                        className="w-full text-left px-5 py-4 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                      >
                        <p className="font-black text-sm text-black uppercase tracking-tight">{c.nombreCliente}</p>
                        <p className="text-xs font-bold text-gray-400">{c.telefono}</p>
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery.length >= 2 && searchResults.length === 0 && (
                  <button 
                    onClick={() => { setIsAddingNewClient(true); setNewClientName(searchQuery); }}
                    className="mt-3 w-full p-4 bg-blue-50 border-2 border-dashed border-blue-200 text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                  >
                    + Registrar "{searchQuery}"
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Time Picker - Static */}
          <div className="grid grid-cols-2 gap-4 flex-shrink-0">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2.5 block ml-1 leading-none">Inicio</label>
              <div className="flex items-center gap-2 bg-gray-50 border-2 border-transparent rounded-[1.5rem] px-4 py-3">
                <span className="font-black text-sm text-black flex-1 text-center">{startTime}</span>
                <div className="flex flex-col gap-1">
                  <button onClick={() => setStartTime(adjustTime(startTime, 5))} className="hover:text-black text-gray-300">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => setStartTime(adjustTime(startTime, -5))} className="hover:text-black text-gray-300">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2.5 block ml-1 leading-none">Fin</label>
              <div className="flex items-center gap-2 bg-gray-50 border-2 border-transparent rounded-[1.5rem] px-4 py-3">
                <span className="font-black text-sm text-black flex-1 text-center">{endTime}</span>
                <div className="flex flex-col gap-1">
                  <button onClick={() => setEndTime(adjustTime(endTime, 5))} className="hover:text-black text-gray-300">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEndTime(adjustTime(endTime, -5))} className="hover:text-black text-gray-300">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Section: Services list only */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/20 custom-scrollbar overscroll-contain modal-scroll-container touch-auto">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block ml-1 leading-none">
            <Scissors className="w-3 h-3 inline mr-1" />
            Servicio
          </label>
          <div className="grid grid-cols-1 gap-2.5">
            {cutTypes.map(ct => (
              <button
                key={ct.idCorte}
                onClick={() => setSelectedCut(ct)}
                className={`flex items-center justify-between px-5 py-5 rounded-[1.5rem] border-2 transition-all duration-200 text-left ${
                  selectedCut?.idCorte === ct.idCorte 
                    ? 'border-black bg-black text-white shadow-xl scale-[1.02]' 
                    : 'border-white bg-white hover:border-gray-100 hover:shadow-sm'
                }`}
              >
                <div className="min-w-0 pr-4">
                  <p className="font-black text-xs uppercase truncate leading-none mb-1">{ct.nombreCorte}</p>
                  <p className={`text-[10px] font-bold ${selectedCut?.idCorte === ct.idCorte ? 'text-white/60' : 'text-gray-400'}`}>
                    {ct.duracionCorteMins} min
                  </p>
                </div>
                <span className={`text-sm font-black shrink-0 ${selectedCut?.idCorte === ct.idCorte ? 'text-white' : 'text-black'}`}>
                  {ct.precioCorte}€
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="px-6 py-6 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <button
            onClick={handleSubmit}
            disabled={!selectedClient || !selectedCut || saving}
            className="w-full py-5 bg-black text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-[1.5rem] transition-all hover:bg-zinc-800 disabled:bg-gray-200 disabled:text-gray-400 shadow-2xl shadow-black/10 active:scale-95"
          >
            {saving ? 'Guardando...' : 'Reservar Cita'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
