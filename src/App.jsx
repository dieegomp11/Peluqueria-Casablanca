import React, { useState } from 'react';
import { Calendar, Users } from 'lucide-react';
import Agenda from './components/Agenda';
import Clients from './components/Clients';
import logoUrl from './assets/logo.png';

function App() {
  const [activeTab, setActiveTab] = useState('agenda');

  return (
    <div className="flex h-screen w-full bg-[#fcfcfc] overflow-hidden">
      {/* Sidebar Navigation */}
      <nav className="w-20 sm:w-24 bg-black flex flex-col items-center py-8 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.1)] z-50">
        <div className="w-16 h-16 flex items-center justify-center mb-10">
          <img src={logoUrl} alt="Casablanca" className="w-full h-full object-contain" />
        </div>
        
        <div className="flex flex-col gap-6 w-full px-4">
          <button 
            onClick={() => setActiveTab('agenda')}
            className={`w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all duration-300 ${activeTab === 'agenda' ? 'bg-white text-black shadow-lg scale-105' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
          >
            <Calendar className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Agenda</span>
          </button>

          <button 
            onClick={() => setActiveTab('clients')}
            className={`w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all duration-300 ${activeTab === 'clients' ? 'bg-white text-black shadow-lg scale-105' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
          >
            <Users className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Clientes</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 relative h-full overflow-hidden">
        {activeTab === 'agenda' ? <Agenda /> : <Clients />}
      </div>
    </div>
  );
}

export default App;
