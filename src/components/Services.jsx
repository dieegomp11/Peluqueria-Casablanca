import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Scissors, Plus, Edit2, Trash2, X, AlertTriangle, Save, Clock, Coins, Minus } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deletingService, setDeletingService] = useState(null);
  const inputRef = useRef(null);

  const [formData, setFormData] = useState({
    nombreCorte: '',
    precioCorte: 10,
    duracionCorteMins: 30
  });

  useEffect(() => { fetchServices(); }, []);

  useEffect(() => {
    if (isModalOpen && !editingService && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [isModalOpen]);

  async function fetchServices() {
    setLoading(true);
    const { data } = await supabase
      .from('Tipo Corte')
      .select('*')
      .order('nombreCorte', { ascending: true });
    if (data) setServices(data);
    setLoading(false);
  }

  const handleOpenAddModal = () => {
    setEditingService(null);
    setFormData({ nombreCorte: '', precioCorte: 10, duracionCorteMins: 30 });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (service) => {
    setEditingService(service);
    setFormData({
      nombreCorte: service.nombreCorte,
      precioCorte: service.precioCorte,
      duracionCorteMins: service.duracionCorteMins
    });
    setIsModalOpen(true);
  };

  const handleOpenDeleteConfirm = (service) => {
    setDeletingService(service);
    setIsDeleteConfirmOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = editingService
      ? { precioCorte: parseFloat(formData.precioCorte), duracionCorteMins: parseInt(formData.duracionCorteMins) }
      : { nombreCorte: formData.nombreCorte, precioCorte: parseFloat(formData.precioCorte), duracionCorteMins: parseInt(formData.duracionCorteMins) };

    if (editingService) {
      const { error } = await supabase.from('Tipo Corte').update(payload).eq('idCorte', editingService.idCorte);
      if (error) console.error(error);
    } else {
      const { error } = await supabase.from('Tipo Corte').insert([payload]);
      if (error) console.error(error);
    }
    setIsModalOpen(false);
    fetchServices();
  };

  const handleDelete = async () => {
    if (!deletingService) return;
    const { error } = await supabase.from('Tipo Corte').delete().eq('idCorte', deletingService.idCorte);
    if (error) console.error(error);
    setIsDeleteConfirmOpen(false);
    setDeletingService(null);
    fetchServices();
  };

  const stepPrice = (delta) =>
    setFormData(prev => ({ ...prev, precioCorte: Math.max(0, parseFloat(prev.precioCorte || 0) + delta) }));

  const stepDuration = (delta) =>
    setFormData(prev => ({ ...prev, duracionCorteMins: Math.max(5, parseInt(prev.duracionCorteMins || 5) + delta) }));

  return (
    <div className="h-full bg-[#fcfcfc] text-black font-sans relative overflow-x-hidden flex flex-col">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='none' stroke='%23000' stroke-width='1.5'/%3E%3Cpath d='M15 15l30 30M15 45l30-30' stroke='%23000' stroke-width='1.5'/%3E%3C/svg%3E")`,
          backgroundSize: '80px 80px'
        }}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 relative z-10 flex flex-col h-full">
        <header className="flex flex-col lg:flex-row lg:items-end gap-6 lg:gap-8 mb-6 border-b-2 border-black pb-4 shrink-0">
          <div className="shrink-0">
            <h1 className="text-5xl font-bold tracking-normal leading-none mb-1 text-black" style={{ fontFamily: "'Aref Ruqaa', serif" }}>
              Servicios
            </h1>
          </div>
          <div className="flex-1 flex justify-end">
            <button
              onClick={handleOpenAddModal}
              className="bg-black text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all shadow-xl shadow-black/10 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Nuevo Servicio
            </button>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto custom-scrollbar relative pr-2">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="h-48 bg-gray-100 rounded-3xl" />
              ))}
            </div>
          ) : services.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-12">
              {services.map(service => (
                <article
                  key={service.idCorte}
                  className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-2xl hover:border-black/5 transition-all duration-500 group relative flex flex-col overflow-hidden"
                >
                  {/* Decorative */}
                  <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500">
                    <Scissors className="w-32 h-32 rotate-12" />
                  </div>

                  {/* Name */}
                  <h2 className="text-2xl font-black text-gray-900 leading-tight pr-10 uppercase tracking-tight">
                    {service.nombreCorte}
                  </h2>

                  <div className="flex-1" />

                  {/* Price + Duration near the buttons */}
                  <div className="flex items-center justify-between mt-6 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                        <Coins className="w-3.5 h-3.5 text-black" />
                      </div>
                      <span className="text-2xl font-black text-black">{service.precioCorte}€</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      <span className="font-bold uppercase tracking-widest text-xs text-gray-500">{service.duracionCorteMins} min</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-gray-50">
                    <button
                      onClick={() => handleOpenEditModal(service)}
                      className="flex-1 bg-gray-50 hover:bg-black hover:text-white text-gray-900 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-3 h-3" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleOpenDeleteConfirm(service)}
                      className="w-12 bg-gray-50 hover:bg-red-50 text-red-500 py-3 rounded-xl font-bold transition-all flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="w-full h-96 flex flex-col items-center justify-center text-gray-400 gap-4">
              <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center mb-2">
                <Scissors className="w-10 h-10 opacity-20" />
              </div>
              <p className="text-sm font-black uppercase tracking-[0.3em] text-gray-400">No hay servicios registrados</p>
              <button
                onClick={handleOpenAddModal}
                className="mt-4 text-black border-b-2 border-black pb-1 font-bold uppercase tracking-widest text-xs hover:opacity-50 transition-opacity"
              >
                Crear el primer servicio
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Add/Edit Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-500" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-12 duration-500 overflow-hidden">
            <button onClick={() => setIsModalOpen(false)} className="absolute right-8 top-8 text-gray-400 hover:text-black transition-colors">
              <X className="w-6 h-6" />
            </button>

            <div className="mb-8">
              <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mb-5 shadow-xl shadow-black/20">
                <Scissors className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-black text-black uppercase tracking-tight mb-1">
                {editingService ? editingService.nombreCorte : 'Nuevo Servicio'}
              </h2>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                {editingService ? 'Ajusta precio y duración' : 'Configura el nuevo servicio'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nombre — solo en modo crear */}
              {!editingService && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 ml-1">Nombre del Servicio</label>
                  <input
                    ref={inputRef}
                    required
                    type="text"
                    placeholder="Ej: Corte Degradado"
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-black focus:bg-white rounded-2xl p-4 outline-none font-bold text-gray-900 transition-all"
                    value={formData.nombreCorte}
                    onChange={e => setFormData({ ...formData, nombreCorte: e.target.value })}
                  />
                </div>
              )}

              {/* Precio stepper */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 ml-1">Precio</label>
                <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-2 py-2 gap-2">
                  <button
                    type="button"
                    onClick={() => stepPrice(-0.5)}
                    className="w-11 h-11 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:bg-black hover:text-white transition-all active:scale-95 shrink-0"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-black tabular-nums">{parseFloat(formData.precioCorte).toFixed(2)}</span>
                    <span className="text-lg font-black text-gray-400">€</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => stepPrice(0.5)}
                    className="w-11 h-11 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:bg-black hover:text-white transition-all active:scale-95 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Duración stepper */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 ml-1">Duración</label>
                <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-2 py-2 gap-2">
                  <button
                    type="button"
                    onClick={() => stepDuration(-5)}
                    className="w-11 h-11 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:bg-black hover:text-white transition-all active:scale-95 shrink-0"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-black tabular-nums">{formData.duracionCorteMins}</span>
                    <span className="text-lg font-black text-gray-400">min</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => stepDuration(5)}
                    className="w-11 h-11 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:bg-black hover:text-white transition-all active:scale-95 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-black text-white py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all shadow-2xl shadow-black/20 mt-2 active:scale-[0.98]"
              >
                <Save className="w-5 h-5" />
                {editingService ? 'Guardar Cambios' : 'Crear Servicio'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-500" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="relative w-full max-w-sm bg-black border border-white/10 rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-12 duration-500">
            <button onClick={() => setIsDeleteConfirmOpen(false)} className="absolute right-6 top-6 text-gray-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-8 ring-8 ring-red-500/5">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-3xl font-black text-white uppercase tracking-[0.1em] mb-4">¿Eliminar Servicio?</h2>
              <p className="text-gray-400 text-sm font-bold uppercase tracking-widest opacity-80 mb-10 leading-relaxed">
                Estás a punto de borrar <span className="text-white">"{deletingService?.nombreCorte}"</span>. Esta acción no se puede deshacer.
              </p>
              <div className="grid grid-cols-2 gap-4 w-full">
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-[0.1em] py-5 rounded-2xl transition-all active:scale-95 border border-white/5"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-[0.1em] py-5 rounded-2xl shadow-xl shadow-red-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
