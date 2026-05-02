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
  const [newClientPhonePrefix, setNewClientPhonePrefix] = useState('34');
  const [creatingClient, setCreatingClient] = useState(false);
  const [error, setError] = useState('');
  const searchRef = useRef(null);
  const scrollYRef = useRef(0);

  // iOS keyboard fix: save scroll position before input focus, restore after blur
  const handleFocus = () => {
    scrollYRef.current = window.scrollY;
  };

  const handleBlur = () => {
    // Small timeout to let iOS finish its keyboard animation
    setTimeout(() => {
      window.scrollTo(0, scrollYRef.current);
      // Force a layout recalculation
      document.documentElement.style.transform = 'translateZ(0)';
      requestAnimationFrame(() => {
        document.documentElement.style.transform = '';
      });
    }, 100);
  };

  // Body lock when modal opens - using scrollY trick instead of position:fixed
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100%';

      return () => {
        document.body.style.overflow = '';
        document.body.style.height = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Clean validation errors when user corrects the relevant fields.
  // Intentionally excludes startTime/endTime so save errors persist while the user adjusts time to retry.
  useEffect(() => {
    if (error) setError('');
  }, [selectedClient, selectedCut]);

  // Load cut types on mount
  useEffect(() => {
    async function fetchCutTypes() {
      const { data, error } = await supabase.from('Tipo Corte').select('*');
      if (error) { setError('No se pudieron cargar los servicios. Cierra y vuelve a intentarlo.'); return; }
      if (data) {
        setCutTypes(data);
        if (data.length > 0) {
          setSelectedCut(data[0]);
          const end = addMinutes(slotTime || '10:00', data[0].duracionCorteMins || 30);
          setEndTime(end);
        }
      }
    }
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
      setNewClientPhonePrefix('34');
      setError('');
    }
  }, [isOpen, slotTime]);

  useEffect(() => {
    if (selectedCut && startTime) {
      setEndTime(addMinutes(startTime, selectedCut.duracionCorteMins || 30));
    }
  }, [selectedCut, startTime]);



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
    if (!current || !current.includes(':')) current = '10:00';
    const [h, m] = current.split(':').map(Number);
    let total = h * 60 + m + delta;
    if (total < 0) total = 0;
    if (total > 1435) total = 1435;
    const nh = Math.floor(total / 60);
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  }

  function timeToMins(t) {
    if (!t || !t.includes(':')) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  function minsToTimeStr(mins) {
    const safe = Math.max(0, Math.min(1435, mins));
    return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
  }

  async function handleCreateClient() {
    if (!newClientName && !newClientPhone) { setError('Nombre y teléfono son obligatorios.'); return; }
    if (!newClientName) { setError('El nombre es obligatorio.'); return; }
    if (!newClientPhone) { setError('El teléfono es obligatorio.'); return; }
    setCreatingClient(true);
    const telefonoFinal = newClientPhonePrefix + newClientPhone.replace(/\D/g, '');
    const { data, error: createError } = await supabase.from('Cliente').insert({ nombreCliente: newClientName, telefono: telefonoFinal }).select().single();
    setCreatingClient(false);
    if (createError) { setError('No se pudo registrar el cliente. Inténtalo de nuevo.'); return; }
    if (data) { setSelectedClient(data); setIsAddingNewClient(false); }
  }

  async function handleSubmit() {
    if (!selectedClient || !selectedCut) return;
    const now = new Date();
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    if (slotDate < todayStr) { setError("No se pueden crear citas en días pasados."); return; }
    
    setError('');
    setSaving(true);

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
      confirmado: false
    });

    setSaving(false);
    if (!insertError) {
      onCreated();
      onClose();
    } else {
      setError('No se pudo guardar la cita. Inténtalo de nuevo.');
    }
  }

  const relevantApts = (appointments || []).filter(a => a.date === slotDate && a.hairdresser === hairdresser);
  const startMinsNum = timeToMins(startTime);
  const endMinsNum = timeToMins(endTime);
  const conflictApt = endTime ? relevantApts.find(a => {
    const aptS = timeToMins(a.time);
    const aptE = aptS + (a.durationMins || 30);
    return startMinsNum < aptE && endMinsNum > aptS;
  }) : null;

  const isDirtyForm = !!selectedClient || (isAddingNewClient && (newClientName || newClientPhone));
  const handleBackdropClose = () => {
    if (isDirtyForm && !window.confirm('Tienes datos sin guardar. ¿Cerrar sin guardar?')) return;
    onClose();
  };

  const submitDisabledReason = !selectedClient ? 'Selecciona un cliente' :
    !selectedCut ? 'Selecciona un servicio' :
    !!conflictApt ? `Conflicto con ${conflictApt.client} a las ${conflictApt.time}` :
    undefined;

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        // Critical for iOS: use this instead of height:100%/100vh
        height: '-webkit-fill-available',
      }}
    >
      {/* Backdrop */}
      <div 
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', transition: 'opacity 300ms' }}
        onClick={handleBackdropClose}
      />
      
      {/* Modal Card */}
      <div 
        className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-500 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
          <div>
            <h2 className="text-base font-black uppercase tracking-tight text-black leading-none">Nueva Cita</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
              {hairdresser} · {slotDate ? new Date(slotDate + 'T12:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) : ''} · {slotTime}
            </p>
          </div>
          <button onClick={handleBackdropClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Inputs Section */}
        <div className="p-6 flex flex-col gap-5 border-b border-gray-100 bg-white shrink-0">
          {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest leading-none">⚠ {error}</div>}
          {conflictApt && <div className="p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl text-[10px] font-black uppercase tracking-widest leading-none">⚠ Conflicto con {conflictApt.client} a las {conflictApt.time}</div>}
          
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2.5 block ml-1">Cliente</label>
            {selectedClient ? (
              <div className="flex items-center justify-between bg-gray-50 rounded-[1.5rem] px-5 py-4">
                <div className="min-w-0">
                  <p className="font-black text-sm text-black truncate uppercase tracking-tight">{selectedClient.nombreCliente}</p>
                  <p className="text-xs font-bold text-gray-400">{selectedClient.telefono}</p>
                </div>
                <button onClick={() => { setSelectedClient(null); setSearchQuery(''); setSearchResults([]); }} className="text-[10px] font-black text-red-500 uppercase tracking-widest underline ml-4">Cambiar</button>
              </div>
            ) : isAddingNewClient ? (
              <div className="bg-gray-50 rounded-[1.5rem] p-5 flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Nombre"
                  value={newClientName}
                  onChange={e => setNewClientName(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  maxLength={100}
                  className="bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none border-2 border-transparent focus:border-black transition-all"
                />
                <div className="relative w-full">
                  <select
                    value={newClientPhonePrefix}
                    onChange={e => setNewClientPhonePrefix(e.target.value)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-transparent text-sm font-bold outline-none text-gray-500 cursor-pointer z-10"
                  >
                    <option value="34">🇪🇸 +34</option>
                    <option value="212">🇲🇦 +212</option>
                    <option value="44">🇬🇧 +44</option>
                    <option value="33">🇫🇷 +33</option>
                    <option value="351">🇵🇹 +351</option>
                    <option value="40">🇷🇴 +40</option>
                    <option value="39">🇮🇹 +39</option>
                    <option value="49">🇩🇪 +49</option>
                  </select>
                  <input
                    type="tel"
                    placeholder="Teléfono"
                    value={newClientPhone}
                    onChange={e => setNewClientPhone(e.target.value.replace(/\D/g, ''))}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    maxLength={12}
                    className="w-full bg-white rounded-xl pl-24 pr-4 py-3 text-sm font-bold outline-none border-2 border-transparent focus:border-black transition-all"
                  />
                </div>
                <div className="flex gap-2">
                   <button onClick={handleCreateClient} disabled={creatingClient} className="flex-1 py-4 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-60">{creatingClient ? 'Creando...' : 'Crear'}</button>
                   <button onClick={() => setIsAddingNewClient(false)} className="px-4 py-4 bg-gray-200 text-gray-600 rounded-xl hover:bg-gray-300 transition-colors flex items-center justify-center"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center bg-gray-50 rounded-[1.5rem] px-5 py-4 focus-within:bg-white focus-within:ring-2 focus-within:ring-black transition-all">
                  <Search className="w-5 h-5 text-gray-400 mr-3" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    maxLength={100}
                    className="bg-transparent outline-none text-sm font-bold text-black w-full"
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-[1.5rem] shadow-2xl z-50 max-h-40 overflow-y-auto">
                    {searchResults.map(c => (
                      <button key={c.idCliente} onClick={() => setSelectedClient(c)} className="w-full text-left px-5 py-4 hover:bg-gray-50 border-b border-gray-50">
                        <p className="font-black text-sm uppercase">{c.nombreCliente}</p>
                        <p className="text-xs font-bold text-gray-400">{c.telefono}</p>
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery.length === 1 && (
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 ml-2">Escribe al menos 2 letras</p>
                )}
                {searchQuery.length >= 2 && searchResults.length === 0 && (
                  <button onClick={() => { setIsAddingNewClient(true); setNewClientName(searchQuery); }} className="mt-3 w-full p-4 bg-blue-50 text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest">+ Registrar "{searchQuery}"</button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2.5 block ml-1">Inicio</label>
              <div className="flex items-center bg-gray-50 rounded-[1.5rem] px-4 py-3">
                <span className="font-black text-sm text-black flex-1 text-center">{startTime}</span>
                <div className="flex flex-col">
                  <button onClick={() => setStartTime(adjustTime(startTime, 5))} className="p-2 hover:text-black transition-colors"><ChevronUp className="w-4 h-4 text-gray-500" /></button>
                  <button onClick={() => setStartTime(adjustTime(startTime, -5))} className="p-2 hover:text-black transition-colors"><ChevronDown className="w-4 h-4 text-gray-500" /></button>
                </div>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2.5 block ml-1">Fin</label>
              <div className="flex items-center bg-gray-50 rounded-[1.5rem] px-4 py-3">
                <span className="font-black text-sm text-black flex-1 text-center">{endTime}</span>
                <div className="flex flex-col">
                  <button onClick={() => setEndTime(adjustTime(endTime, 5))} className="p-2 hover:text-black transition-colors"><ChevronUp className="w-4 h-4 text-gray-500" /></button>
                  <button onClick={() => setEndTime(adjustTime(endTime, -5))} className="p-2 hover:text-black transition-colors"><ChevronDown className="w-4 h-4 text-gray-500" /></button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Services Section */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/20 modal-scroll-container touch-auto overscroll-contain">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 block ml-1 leading-none">
            <Scissors className="w-3 h-3 inline mr-1" /> Servicio
          </label>
          <div className="grid grid-cols-1 gap-2.5">
            {cutTypes.map(ct => (
              <button
                key={ct.idCorte}
                onClick={() => setSelectedCut(ct)}
                className={`flex items-center justify-between px-5 py-5 rounded-[1.5rem] border-2 transition-all text-left ${
                  selectedCut?.idCorte === ct.idCorte 
                    ? 'border-black bg-black text-white shadow-xl scale-[1.02]' 
                    : 'border-white bg-white hover:border-gray-100'
                }`}
              >
                <div className="min-w-0 pr-4">
                  <p className="font-black text-xs uppercase truncate leading-none mb-1">{ct.nombreCorte}</p>
                  <p className={`text-[10px] font-bold ${selectedCut?.idCorte === ct.idCorte ? 'text-white/60' : 'text-gray-400'}`}>
                    {ct.duracionCorteMins} min
                  </p>
                </div>
                <span className="text-sm font-black shrink-0">{ct.precioCorte}€</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-6 border-t border-gray-100 bg-gray-50 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={!selectedClient || !selectedCut || saving || !!conflictApt}
            title={submitDisabledReason}
            className="w-full py-5 bg-black text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-[1.5rem] transition-all hover:bg-zinc-800 disabled:bg-gray-200 disabled:text-gray-400 shadow-2xl active:scale-95"
          >
            {saving ? 'Guardando...' : 'Reservar Cita'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
