import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Clock, Scissors, User, ChevronUp, ChevronDown } from 'lucide-react';
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
    }
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
      if (h * 60 + m < currentMins) {
         setError("La hora de inicio no puede ser en el pasado.");
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100 bg-gray-50">
          <div>
            <h2 className="text-base font-extrabold uppercase tracking-wider leading-none">Nueva Cita</h2>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">
              {hairdresser} · {slotDate} · {slotTime}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors leading-none flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-[10px] font-bold shadow-sm animate-in zoom-in-95 duration-200">
              ⚠ {error}
            </div>
          )}
          {/* Client Search / Create */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
              <User className="w-3 h-3 inline mr-1" />
              Cliente
            </label>
            
            {selectedClient ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <div>
                  <p className="font-bold text-sm">{selectedClient.nombreCliente}</p>
                  <p className="text-xs text-gray-500">{selectedClient.telefono}</p>
                </div>
                <button 
                  onClick={() => { setSelectedClient(null); setSearchQuery(''); setIsAddingNewClient(false); }}
                  className="text-xs font-bold text-red-500 hover:text-red-700 uppercase"
                >
                  Cambiar
                </button>
              </div>
            ) : isAddingNewClient ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-gray-500">Nuevo Cliente</span>
                  <button onClick={() => setIsAddingNewClient(false)} className="text-xs font-bold text-gray-400 hover:text-black uppercase underline">Cancelar</button>
                </div>
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
                />
                <input
                  type="text"
                  placeholder="Teléfono"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
                />
                <button
                  onClick={handleCreateClient}
                  disabled={!newClientName || !newClientPhone || creatingClient}
                  className="w-full py-2 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors shadow-sm"
                >
                  {creatingClient ? 'Creando...' : 'Confirmar Nuevo'}
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all">
                  <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Buscar cliente por nombre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent outline-none text-sm font-medium w-full"
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto">
                    {searchResults.map(c => (
                      <button
                        key={c.idCliente}
                        onClick={() => { setSelectedClient(c); setSearchResults([]); }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <p className="font-bold text-sm">{c.nombreCliente}</p>
                        <p className="text-xs text-gray-400">{c.telefono}</p>
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery.length >= 2 && searchResults.length === 0 && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                    <p className="text-xs text-blue-700 font-medium">No se encontró el cliente.</p>
                    <button 
                      onClick={() => { setIsAddingNewClient(true); setNewClientName(searchQuery); }}
                      className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-tight rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Añadir Nuevo
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Time Pickers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                <Clock className="w-3.5 h-3.5 inline mr-1.5" />
                Inicio
              </label>
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <span className="text-lg font-bold flex-1 text-center">{startTime}</span>
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => setStartTime(adjustTime(startTime, 5))} className="p-0.5 hover:bg-gray-200 rounded transition-colors">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => setStartTime(adjustTime(startTime, -5))} className="p-0.5 hover:bg-gray-200 rounded transition-colors">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                <Clock className="w-3.5 h-3.5 inline mr-1.5" />
                Fin
              </label>
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <span className="text-lg font-bold flex-1 text-center">{endTime}</span>
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => setEndTime(adjustTime(endTime, 5))} className="p-0.5 hover:bg-gray-200 rounded transition-colors">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEndTime(adjustTime(endTime, -5))} className="p-0.5 hover:bg-gray-200 rounded transition-colors">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Cut Type Selector */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
              <Scissors className="w-3 h-3 inline mr-1" />
              Servicio
            </label>
            <div className="grid grid-cols-1 gap-2">
              {cutTypes.map(ct => (
                <button
                  key={ct.idCorte}
                  onClick={() => setSelectedCut(ct)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all duration-200 text-left ${
                    selectedCut?.idCorte === ct.idCorte 
                      ? 'border-black bg-black text-white shadow-md' 
                      : 'border-gray-200 bg-white hover:border-gray-400'
                  }`}
                >
                  <div>
                    <p className="font-bold text-sm">{ct.nombreCorte}</p>
                    <p className={`text-xs ${selectedCut?.idCorte === ct.idCorte ? 'text-gray-300' : 'text-gray-400'}`}>
                      {ct.duracionCorteMins} min
                    </p>
                  </div>
                  <span className={`text-lg font-extrabold ${selectedCut?.idCorte === ct.idCorte ? 'text-white' : 'text-black'}`}>
                    {ct.precioCorte}€
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={handleSubmit}
            disabled={!selectedClient || !selectedCut || saving}
            className="w-full py-3.5 bg-black text-white font-bold uppercase tracking-widest text-sm rounded-xl transition-all duration-200 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            {saving ? 'Guardando...' : 'Reservar Cita'}
          </button>
        </div>
      </div>
    </div>
  );
}
