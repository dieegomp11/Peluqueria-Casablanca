import React, { useState, useEffect } from 'react';
import { Calendar, Users, LogOut, AlertTriangle, X, Scissors, Menu } from 'lucide-react';
// import { supabase } from './lib/supabaseClient'; // AUTH DESACTIVADO TEMPORALMENTE
import Agenda from './components/Agenda';
import Clients from './components/Clients';
import Services from './components/Services';
import Dashboard from './components/Dashboard';
// import Login from './components/Login'; // AUTH DESACTIVADO TEMPORALMENTE
import logoUrl from './assets/logo.jpeg';
import { BarChart3 } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('agenda');
  const [session] = useState(true); // AUTH DESACTIVADO TEMPORALMENTE
  const [isRecovering] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  // iOS Viewport fix for 'white gap'
  useEffect(() => {
    const setVh = () => {
      document.documentElement.style.setProperty(
        '--vh', `${window.innerHeight * 0.01}px`
      );
    };
    setVh();
    window.addEventListener('resize', setVh);
    return () => window.removeEventListener('resize', setVh);
  }, []);

  useEffect(() => {
    // AUTH DESACTIVADO TEMPORALMENTE

    // Ultimate Scroll Lock: Prevent touchmove on anything except the agenda grid or modal scroll
    const preventDefault = (e) => {
      // Whitelist the agenda grid, modal scroll area, icons, and any fixed-position modals/overlays
      const isScrollGrid = e.target.closest('.agenda-scroll-container');
      const isScrollModal = e.target.closest('.modal-scroll-container');
      const isDashboardScroll = e.target.closest('.dashboard-scroll-container');
      const isIcon = e.target.closest('.lucide');
      
      // If we're inside a whitelisted scrollable area, don't prevent default
      if (isScrollGrid || isScrollModal || isDashboardScroll || isIcon) return;
      
      // Check if it's a fixed element (like the modal backdrop) - usually we don't want to scroll background
      const isFixed = window.getComputedStyle(e.target).position === 'fixed' || e.target.closest('[style*="position: fixed"]');
      if (isFixed && !isScrollModal) return; 

      // If we're not inside a whitelisted area, block the scroll
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventDefault, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventDefault);
    };
  }, []);

  // Control dynamic body background for tablet consistency
  useEffect(() => {
    if (!session) {
      document.body.style.backgroundColor = '#000000';
    } else {
      document.body.style.backgroundColor = '#fcfcfc';
    }
  }, [session]);

  const handleLogout = async () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    // await supabase.auth.signOut(); // AUTH DESACTIVADO TEMPORALMENTE
    setShowLogoutConfirm(false);
  };

  // If we are in recovery mode, show the recovery UI even if there is a session
  if (isRecovering) {
    return <Login session={session} isRecoveryMode={true} />;
  }

  if (!session) {
    return <Login session={session} isRecoveryMode={false} />;
  }

  return (
    <div
      className="flex w-full bg-[#fcfcfc] overflow-hidden fixed inset-0 overscroll-none select-none touch-none items-stretch"
      style={{ height: 'calc(var(--vh, 1vh) * 100)', minHeight: '100dvh' }}
    >

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="sm:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <nav className={`
        fixed sm:relative inset-y-0 left-0 z-50
        h-full min-h-full
        w-64 sm:w-24
        bg-black flex flex-col items-center py-6 sm:py-8 shrink-0
        shadow-[4px_0_24px_rgba(0,0,0,0.15)]
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}
        overflow-y-auto
      `}>
        {/* Close button — only on mobile */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="sm:hidden absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 flex items-center justify-center mb-10">
          <img src={logoUrl} alt="Casablanca" className="w-full h-full object-contain" />
        </div>

        <div className="flex flex-col gap-4 sm:gap-6 w-full px-4">
          <button
            onClick={() => handleTabChange('agenda')}
            className={`w-full py-3 sm:aspect-square rounded-2xl flex flex-row sm:flex-col items-center justify-start sm:justify-center gap-3 sm:gap-1.5 px-4 sm:px-0 transition-all duration-300 ${activeTab === 'agenda' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
          >
            <Calendar className="w-6 h-6 shrink-0" />
            <span className="text-sm sm:text-[10px] font-bold uppercase tracking-wider">Agenda</span>
          </button>

          <button
            onClick={() => handleTabChange('clients')}
            className={`w-full py-3 sm:aspect-square rounded-2xl flex flex-row sm:flex-col items-center justify-start sm:justify-center gap-3 sm:gap-1.5 px-4 sm:px-0 transition-all duration-300 ${activeTab === 'clients' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
          >
            <Users className="w-6 h-6 shrink-0" />
            <span className="text-sm sm:text-[10px] font-bold uppercase tracking-wider">Clientes</span>
          </button>

          <button
            onClick={() => handleTabChange('services')}
            className={`w-full py-3 sm:aspect-square rounded-2xl flex flex-row sm:flex-col items-center justify-start sm:justify-center gap-3 sm:gap-1.5 px-4 sm:px-0 transition-all duration-300 ${activeTab === 'services' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
          >
            <Scissors className="w-6 h-6 shrink-0" />
            <span className="text-sm sm:text-[10px] font-bold uppercase tracking-wider">Servicios</span>
          </button>

          <button
            onClick={() => handleTabChange('dashboard')}
            className={`w-full py-3 sm:aspect-square rounded-2xl flex flex-row sm:flex-col items-center justify-start sm:justify-center gap-3 sm:gap-1.5 px-4 sm:px-0 transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
          >
            <BarChart3 className="w-6 h-6 shrink-0" />
            <span className="text-sm sm:text-[10px] font-bold uppercase tracking-wider">KPIs</span>
          </button>
        </div>

        <div className="mt-auto w-full px-4 pt-10">
          <button
            onClick={handleLogout}
            className="w-full py-3 sm:aspect-square rounded-2xl flex flex-row sm:flex-col items-center justify-start sm:justify-center gap-3 sm:gap-1.5 px-4 sm:px-0 transition-all duration-300 text-gray-400 hover:text-red-500 hover:bg-red-500/10"
          >
            <LogOut className="w-6 h-6 shrink-0" />
            <span className="text-sm sm:text-[10px] font-bold uppercase tracking-wider">Salir</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 relative h-full min-h-full overflow-hidden touch-auto bg-[#fcfcfc]">
        {/* Hamburger button — only on mobile */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="sm:hidden absolute top-3 left-3 z-30 w-9 h-9 bg-black rounded-xl flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
        >
          <Menu className="w-4 h-4" />
        </button>
        {activeTab === 'agenda' ? <Agenda /> : activeTab === 'clients' ? <Clients /> : activeTab === 'services' ? <Services /> : <Dashboard />}
      </div>
      {/* Custom Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-500" onClick={() => setShowLogoutConfirm(false)} />
          <div className="relative w-full max-w-sm bg-black border border-white/10 rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-12 duration-500">
            <button 
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute right-6 top-6 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-8 ring-8 ring-red-500/5">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-3xl font-black text-white uppercase tracking-[0.1em] mb-4">¿Cerrar Sesión?</h2>
              <p className="text-gray-400 text-sm font-bold uppercase tracking-widest opacity-80 mb-10 leading-relaxed">
                Estás a punto de salir del sistema de gestión Casablanca.
              </p>
              
              <div className="grid grid-cols-2 gap-4 w-full">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-[0.1em] py-5 rounded-2xl transition-all active:scale-95 border border-white/5"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmLogout}
                  className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-[0.1em] py-5 rounded-2xl shadow-xl shadow-red-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <LogOut className="w-5 h-5" />
                  Salir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
