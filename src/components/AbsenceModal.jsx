import React, { useState, useRef, useEffect } from 'react';
import { X, CalendarX, Calendar } from 'lucide-react';

const timeOptions = [];
for (let h = 10; h <= 21; h++) {
  const hour = h.toString().padStart(2, '0');
  timeOptions.push(`${hour}:00`);
  if (h !== 21) timeOptions.push(`${hour}:30`);
}

export default function AbsenceModal({ isOpen, onClose, onAddAbsence, hairdressers, absences = [], appointments = [] }) {
  const [selectedHairdresser, setSelectedHairdresser] = useState('');
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const [error, setError] = useState('');

  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'dd/mm/aaaa';
    const [yyyy, mm, dd] = dateString.split('-');
    return `${dd}/${mm}/${yyyy}`;
  };

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [startTime, setStartTime] = useState(timeOptions[0]);
  const [endTime, setEndTime] = useState(timeOptions[0]);

  // Limpiar errores cuando cambia la selección
  useEffect(() => {
    if (error) setError('');
  }, [selectedHairdresser, startDate, endDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedHairdresser || !startDate || !endDate) {
      setError('Por favor, selecciona un peluquero y las fechas de la ausencia.');
      return;
    }

    // Validar si ya hay una ausencia
    const hasAbsence = absences.some(abs => 
      abs.hairdresser === selectedHairdresser &&
      !abs.cancelada &&
      abs.startDate <= endDate &&
      abs.endDate >= startDate
    );

    if (hasAbsence) {
      setError(`Ya existe una ausencia activa para ${selectedHairdresser} en esas fechas.`);
      return;
    }

    // Validar si hay citas
    const hasAppointment = appointments.some(apt => 
      apt.hairdresser === selectedHairdresser &&
      !apt.cancelada &&
      apt.date >= startDate &&
      apt.date <= endDate
    );

    if (hasAppointment) {
      setError(`${selectedHairdresser} tiene citas programadas en esas fechas. Cancela o reubica sus citas primero.`);
      return;
    }
    
    setError('');

    onAddAbsence({
      id: Date.now(),
      hairdresser: selectedHairdresser,
      startDate,
      endDate,
      isAllDay,
      startTime: isAllDay ? null : startTime,
      endTime: isAllDay ? null : endTime
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/30 transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <CalendarX className="w-4 h-4 text-gray-800" />
            <h2 className="text-base font-bold uppercase tracking-tight text-gray-900 leading-none">Registrar Ausencia</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-200 rounded-full transition-colors flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-[10px] font-bold shadow-sm">
              ⚠ {error}
            </div>
          )}
          {/* Peluquero */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Peluquero</label>
            <select 
              required
              value={selectedHairdresser}
              onChange={(e) => setSelectedHairdresser(e.target.value)}
              className="w-full border-2 border-gray-100 rounded-xl p-3 outline-none focus:border-black transition-colors font-medium bg-white cursor-pointer"
            >
              <option value="" disabled>Selecciona un peluquero...</option>
              {hairdressers.map(hd => <option key={hd} value={hd}>{hd}</option>)}
            </select>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Desde Día</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { try { startDateRef.current?.showPicker(); } catch(err) {} }}
                  className="w-full border-2 border-gray-100 rounded-xl p-3 outline-none focus-within:border-black transition-colors font-medium text-left flex justify-between items-center bg-white hover:bg-gray-50 cursor-pointer"
                >
                  <span className={startDate ? 'text-black' : 'text-gray-400'}>{formatDisplayDate(startDate)}</span>
                  <Calendar className="w-4 h-4 text-gray-400" />
                </button>
                <input 
                  ref={startDateRef}
                  type="date" 
                  required
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (endDate && e.target.value > endDate) {
                      setEndDate(e.target.value);
                    }
                  }}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Hasta Día</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { try { endDateRef.current?.showPicker(); } catch(err) {} }}
                  className="w-full border-2 border-gray-100 rounded-xl p-3 outline-none focus-within:border-black transition-colors font-medium text-left flex justify-between items-center bg-white hover:bg-gray-50 cursor-pointer"
                >
                  <span className={endDate ? 'text-black' : 'text-gray-400'}>{formatDisplayDate(endDate)}</span>
                  <Calendar className="w-4 h-4 text-gray-400" />
                </button>
                <input 
                  ref={endDateRef}
                  type="date" 
                  required
                  min={startDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Todo el día checkbox */}
          <label className="flex items-center gap-3 cursor-pointer group p-2 border-2 border-transparent hover:border-gray-50 rounded-xl transition-colors">
            <div className="relative flex items-center justify-center w-5 h-5 border-2 border-gray-300 rounded overflow-hidden group-hover:border-black transition-colors">
              <input 
                type="checkbox" 
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="sr-only"
              />
              {isAllDay && <div className="w-full h-full bg-black flex items-center justify-center">
                 <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
              </div>}
            </div>
            <span className="text-sm font-bold text-gray-800">Fuera todo el día</span>
          </label>

          {/* Horas Dropdowns */}
          <div className={`grid grid-cols-2 gap-4 transition-all duration-300 overflow-hidden ${isAllDay ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-24 opacity-100'}`}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Hora Inicio</label>
              <select 
                required={!isAllDay}
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  if (startDate && startDate === endDate && e.target.value >= endTime) {
                    const idx = timeOptions.indexOf(e.target.value);
                    if (idx !== -1 && idx < timeOptions.length - 1) {
                      setEndTime(timeOptions[idx + 1]);
                    }
                  }
                }}
                className="w-full border-2 border-gray-100 rounded-xl p-3 outline-none focus:border-black transition-colors font-medium bg-white"
              >
                {timeOptions.map(time => <option key={`start-${time}`} value={time}>{time}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Hora Fin</label>
              <select 
                required={!isAllDay}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border-2 border-gray-100 rounded-xl p-3 outline-none focus:border-black transition-colors font-medium bg-white"
              >
                {timeOptions.map(time => (
                  <option 
                    key={`end-${time}`} 
                    value={time}
                    disabled={startDate && endDate && startDate === endDate && time <= startTime}
                  >
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Acciones */}
          <div className="pt-2 flex gap-3">
             <button type="button" onClick={onClose} className="flex-1 py-3 px-4 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
               Cancelar
             </button>
             <button type="submit" className="flex-1 py-3 px-4 font-bold text-white bg-black hover:bg-slate-900 rounded-xl transition-all shadow-[0_4px_14px_0_rgba(0,0,0,0.2)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.23)] hover:-translate-y-0.5">
               Confirmar
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
