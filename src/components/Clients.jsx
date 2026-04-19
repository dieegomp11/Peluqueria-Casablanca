import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Phone, History, CalendarDays, BarChart, X, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Clients() {
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [clientsData, setClientsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [fetchKey, setFetchKey] = useState(0);

  const ITEMS_PER_PAGE = 16;

  useEffect(() => {
    async function fetchClients() {
      try {
      const [{ data: clients, error }, { data: citas }, { data: cortes }] = await Promise.all([
        supabase.from('Cliente').select('*').order('nombreCliente', { ascending: true }),
        supabase.from('Citas').select('cliente, fechaInicio, corte, asistencia, cancelada').eq('cancelada', false),
        supabase.from('Tipo Corte').select('idCorte, nombreCorte')
      ]);

      if (error) throw error;

      if (clients) {
        const now = new Date();
        const currMonth = now.getMonth();
        const currYear = now.getFullYear();

        const mapped = clients.map(c => {
          let vMonth = 0;
          let vYear = 0;
          
          const cortesMap = {};
          if (cortes) {
            cortes.forEach(c => cortesMap[c.idCorte] = c.nombreCorte);
          }
          
          let misUltimas5 = [];
          if (citas) {
            const misCitas = citas.filter(apt => apt.cliente === c.idCliente && apt.fechaInicio);
            misUltimas5 = [...misCitas].sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio)).slice(0, 5).map(apt => ({
              ...apt,
              serviceName: cortesMap[apt.corte] || 'Servicio'
            }));
            
            misCitas.filter(apt => apt.asistencia === true).forEach(apt => {
              const d = new Date(apt.fechaInicio);
              if (d.getFullYear() === currYear) {
                vYear++;
                if (d.getMonth() === currMonth) {
                  vMonth++;
                }
              }
            });
          }

          return {
            id: c.idCliente,
            name: c.nombreCliente || 'Sin nombre',
            phone: c.telefono || 'Sin teléfono',
            lastVisit: c.ultimaVisita || null,
            visitsMonth: vMonth,
            visitsYear: vYear,
            historial: misUltimas5
          };
        });
        setClientsData(mapped);
      }
      } catch (err) {
        console.error('Error loading clients:', err);
        setLoadError('No se pudieron cargar los clientes.');
      } finally {
        setLoading(false);
      }
    }
    fetchClients();
  }, [fetchKey]);

  // Reset pagination when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchName, searchPhone]);

  // Filter logic: match name AND phone
  const filteredClients = useMemo(() => {
    return clientsData.filter(c => {
      const matchName = !searchName || c.name.toLowerCase().includes(searchName.toLowerCase());
      const matchPhone = !searchPhone || c.phone.replace(/\s+/g, '').includes(searchPhone.replace(/\s+/g, ''));
      return matchName && matchPhone;
    });
  }, [searchName, searchPhone, clientsData]);

  const formatPhoneDisplay = (phone) => {
    if (!phone) return '';
    const digits = phone.replace(/[\s\-().+]/g, '');
    return digits.length > 9 ? digits.slice(-9) : phone.trim();
  };

  // Devuelve el número en formato E.164 (+34XXXXXXXXX) para el href tel:
  const formatPhoneTel = (phone) => {
    if (!phone) return '';
    const digits = phone.replace(/[\s\-().+]/g, '');
    if (digits.length === 9) return `+34${digits}`;           // 697123456 → +34697123456
    if (digits.startsWith('34') && digits.length === 11) return `+${digits}`; // 34697... → +34697...
    if (digits.startsWith('0034')) return `+${digits.slice(4)}`; // 0034... → +34...
    return phone.startsWith('+') ? phone.replace(/\s/g, '') : `+${digits}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca';
    const [yyyy, mm, dd] = dateString.split('T')[0].split('-');
    return `${dd}/${mm}/${yyyy}`;
  };

  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="h-full bg-[#fcfcfc] text-black font-sans relative overflow-x-hidden flex flex-col">
      {/* Background Pattern */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='none' stroke='%23000' stroke-width='1.5'/%3E%3Cpath d='M15 15l30 30M15 45l30-30' stroke='%23000' stroke-width='1.5'/%3E%3C/svg%3E")`,
          backgroundSize: '80px 80px'
        }}
      />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 pb-4 pt-14 sm:p-6 lg:p-8 relative z-10 flex flex-col min-h-0">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end gap-3 sm:gap-6 lg:gap-8 mb-4 sm:mb-6 border-b-2 border-black pb-3 sm:pb-4 shrink-0">
          <div className="shrink-0">
            <h1 className="text-3xl sm:text-5xl font-bold tracking-normal leading-none mb-1 text-black" style={{ fontFamily: "'Aref Ruqaa', serif" }}>
              Listado de Clientes
            </h1>
          </div>

          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-end gap-3 sm:gap-4 lg:pb-1 lg:ml-8">
            <div className="flex-1 flex items-center gap-3 bg-white border-2 border-gray-100 focus-within:border-black rounded-xl shadow-sm transition-colors px-4">
              <User className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Buscar nombre..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                maxLength={100}
                className="w-full py-2.5 outline-none font-medium placeholder:text-gray-400 text-sm bg-transparent"
              />
            </div>
            <div className="flex-1 flex items-center gap-3 bg-white border-2 border-gray-100 focus-within:border-black rounded-xl shadow-sm transition-colors px-4">
              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Buscar teléfono..."
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                maxLength={20}
                className="w-full py-2.5 outline-none font-medium placeholder:text-gray-400 text-sm bg-transparent"
              />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <section className="flex-1 overflow-y-auto custom-scrollbar modal-scroll-container relative pr-1 flex flex-col min-h-0">
          {filteredClients.length > 0 ? (
            <div className="flex flex-col min-h-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pb-4">
                {paginatedClients.map(client => (
                <article 
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className="bg-white rounded-xl py-3 px-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-black transition-all duration-200 cursor-pointer flex justify-between items-center group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center font-bold text-sm sm:text-base text-black uppercase shrink-0 group-hover:bg-black group-hover:text-white group-hover:border-black transition-colors">
                      {client.name.substring(0, 2)}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-8 flex-1 min-w-0 pt-0.5">
                      <h2 className="text-[14px] sm:text-[15px] font-extrabold truncate text-gray-900 leading-none flex-1 min-w-0" title={client.name}>
                        {client.name}
                      </h2>
                      <a
                        href={`tel:${formatPhoneTel(client.phone)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex flex-row flex-nowrap items-center justify-center gap-2 text-gray-600 bg-gray-50 hover:bg-gray-100 hover:text-black transition-colors py-1.5 px-2 sm:px-4 rounded-xl border border-gray-100 shrink-0"
                        title="Llamar al cliente"
                      >
                        <Phone className="w-4 h-4 shrink-0 -mt-[1px]" />
                        <span className="hidden sm:inline text-[14px] font-bold tracking-widest leading-none pt-[1px] whitespace-nowrap">{formatPhoneDisplay(client.phone)}</span>
                      </a>
                    </div>
                  </div>
                  
                  <div className="shrink-0 text-gray-300 group-hover:text-black transition-colors pl-4">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </article>
              ))}
              </div>
              
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-6 py-4 shrink-0">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage(prev => prev - 1);
                      document.querySelector('.custom-scrollbar').scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="p-2.5 rounded-xl bg-white border-2 border-gray-100 hover:border-black hover:bg-gray-50 disabled:opacity-30 disabled:hover:border-gray-100 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    <ChevronLeft className="w-5 h-5 text-black" />
                  </button>
                  <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                    Página <span className="text-black">{currentPage}</span> de {totalPages}
                  </span>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage(prev => prev + 1);
                      document.querySelector('.custom-scrollbar').scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="p-2.5 rounded-xl bg-white border-2 border-gray-100 hover:border-black hover:bg-gray-50 disabled:opacity-30 disabled:hover:border-gray-100 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    <ChevronRight className="w-5 h-5 text-black" />
                  </button>
                </div>
              )}
            </div>
          ) : loading ? (
            <div className="w-full h-64 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
              <p className="text-sm font-bold uppercase tracking-widest text-gray-400 animate-pulse">Cargando…</p>
            </div>
          ) : loadError ? (
            <div className="w-full h-64 flex flex-col items-center justify-center gap-3">
              <Search className="w-12 h-12 text-red-300 opacity-60" />
              <p className="text-sm font-bold uppercase tracking-widest text-red-500">{loadError}</p>
              <button
                onClick={() => { setLoadError(null); setLoading(true); setFetchKey(k => k + 1); }}
                className="px-5 py-2.5 bg-black text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : clientsData.length === 0 ? (
            <div className="w-full h-64 flex flex-col items-center justify-center gap-3">
              <Search className="w-12 h-12 opacity-20" />
              <p className="text-sm font-bold uppercase tracking-widest text-gray-500">Sin clientes registrados</p>
              <p className="text-xs text-gray-400 font-medium">Los clientes se crean al agendar una cita</p>
            </div>
          ) : (
            <div className="w-full h-64 flex flex-col items-center justify-center gap-3">
              <Search className="w-12 h-12 opacity-20" />
              <p className="text-sm font-bold uppercase tracking-widest text-gray-500">Sin resultados</p>
              <p className="text-xs text-gray-400 font-medium">Prueba con otro nombre o teléfono</p>
            </div>
          )}
        </section>
      </main>

      {/* Stats Modal (AbsenceModal Style) */}
      {selectedClient && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/30 transition-opacity"
          onClick={() => setSelectedClient(null)}
          style={{ zIndex: 9999 }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 cursor-default flex flex-col max-h-[90dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <User className="w-5 h-5 text-gray-800 shrink-0" />
                <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight text-gray-900 truncate" title={selectedClient.name}>
                  {selectedClient.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="p-2 text-gray-400 hover:text-black hover:bg-gray-200 rounded-full transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto modal-scroll-container">
              {/* Phone Line */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Teléfono</label>
                <div className="w-full border-2 border-gray-100 rounded-xl p-3 flex justify-between items-center bg-white transition-colors">
                  <span className="font-medium text-black">{formatPhoneDisplay(selectedClient.phone)}</span>
                  <a 
                    href={`tel:${formatPhoneTel(selectedClient.phone)}`}
                    className="p-2 bg-black text-white rounded-lg hover:bg-slate-900 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                    title="Llamar"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Última visita */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Última Visita</label>
                <div className="w-full border-2 border-gray-100 rounded-xl p-3 pr-4 flex justify-between items-center bg-gray-50">
                  <div className="flex items-center gap-2 text-gray-500">
                    <History className="w-4 h-4" />
                    <span className="font-medium text-sm">Fecha Registrada</span>
                  </div>
                  <span className="font-bold text-black">{formatDate(selectedClient.lastVisit)}</span>
                </div>
              </div>

              {/* Visitas Grid (Like Date fields in AbsenceModal) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Visitas Mes</label>
                  <div className="w-full border-2 border-gray-100 rounded-xl p-3 focus-within:border-black transition-colors font-medium bg-white flex items-center justify-between">
                    <span className="font-black text-xl text-black">{selectedClient.visitsMonth}</span>
                    <BarChart className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Visitas Año</label>
                  <div className="w-full border-2 border-gray-100 rounded-xl p-3 focus-within:border-black transition-colors font-medium bg-white flex items-center justify-between">
                    <span className="font-black text-xl text-black">{selectedClient.visitsYear}</span>
                    <CalendarDays className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
              {/* Historial of 5 last visits */}
              {selectedClient.historial && selectedClient.historial.length > 0 && (
                <div className="pt-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Últimos 5 Servicios</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedClient.historial.map((apt, idx) => {
                      const d = new Date(apt.fechaInicio);
                      const isAssisted = apt.asistencia === true;
                      const isNoShow = apt.asistencia === false;
                      const isPending = apt.asistencia === null;
                      return (
                        <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border ${isAssisted ? 'bg-green-50/50 border-green-100' : isNoShow ? 'bg-red-50/50 border-red-100' : 'bg-gray-50/50 border-gray-100'}`}>
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black uppercase text-gray-800">{apt.serviceName}</span>
                            <span className="text-[9px] font-bold uppercase text-gray-400">{formatDate(apt.fechaInicio)}</span>
                          </div>
                          <div className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${isAssisted ? 'bg-green-100 text-green-700' : isNoShow ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-500'}`}>
                            {isAssisted ? 'Asistió' : isNoShow ? 'No Vino' : 'Pendiente'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
