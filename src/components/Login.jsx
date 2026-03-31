import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Lock, Mail, Eye, EyeOff, LogIn, Clock, ShieldCheck } from 'lucide-react';
import logoUrl from '../assets/logo.png';

const Login = ({ session, isRecoveryMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [lastVisit, setLastVisit] = useState('');

  useEffect(() => {
    if (session && !isRecoveryMode) {
      const storedLastVisit = session.user.user_metadata?.ultimaVisita;
      setLastVisit(storedLastVisit || 'Primera vez');
      setShowPopup(true);
    }
  }, [session, isRecoveryMode]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError('Acceso denegado. Verifica tu email y contraseña.');
      }
    } catch (err) {
      setError('Error de conexión con el servidor de seguridad.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        setError('Error al actualizar: ' + updateError.message);
      }
      // Success will be detected by App.jsx onAuthStateChange
    } catch (err) {
      setError('Fallo inesperado al configurar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handleClosePopup = async () => {
    const now = new Date().toISOString();
    // No need to wait for metadata update to enter, but we trigger it
    await supabase.auth.updateUser({
      data: { ultimaVisita: now }
    });
    // We don't necessarily need a reload here if we use the session metadata,
    // but it ensures everything is in sync for this specific UI flow.
    window.location.reload();
  };

  if (isRecoveryMode) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-black fixed inset-0 overflow-hidden overscroll-none p-4 select-none touch-none">
        <div className="w-full max-w-lg z-10 animate-in zoom-in-95 duration-700 touch-auto">
           <div className="bg-black border border-white/5 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative">
             <div className="flex flex-col items-center mb-8 text-center">
               <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 ring-4 ring-blue-500/5">
                 <ShieldCheck className="w-12 h-12 text-blue-400" />
               </div>
               <h1 className="text-3xl font-black text-white uppercase tracking-[0.2em]">Nueva Contraseña</h1>
               <div className="h-1 w-16 bg-blue-500/30 mt-4 mx-auto" />
               <p className="text-gray-400 text-sm mt-6 font-medium leading-relaxed max-w-[280px]">
                 Configura tu acceso personal para Casablanca Barbershop
               </p>
             </div>
             
             <form onSubmit={handleUpdatePassword} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-5">Nueva Clave</label>
                  <div className="relative group/input">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 w-6 h-6 group-focus-within/input:text-blue-400 transition-colors" />
                    <input 
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-3xl py-5 pl-16 pr-6 text-white focus:border-blue-500/50 focus:bg-white/[0.07] outline-none font-bold text-lg tracking-widest"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-5">Confirmar Clave</label>
                  <div className="relative group/input">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 w-6 h-6 group-focus-within/input:text-blue-400 transition-colors" />
                    <input 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-3xl py-5 pl-16 pr-6 text-white focus:border-blue-500/50 focus:bg-white/[0.07] outline-none font-bold text-lg tracking-widest"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black p-5 rounded-2xl animate-in shake duration-300">
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-blue-600 py-6 rounded-3xl text-white font-black uppercase tracking-[0.3em] hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 scale-100 hover:scale-[1.02] active:scale-95"
                >
                  {loading ? 'Validando...' : 'Activar Cuenta'}
                </button>
             </form>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex items-center justify-center bg-black fixed inset-0 overflow-hidden overscroll-none p-4 select-none touch-none">
      <div className="w-full max-w-md z-10 animate-in fade-in slide-in-from-bottom-12 duration-1000 touch-auto">
        <div className="bg-black border border-white/5 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden group">
          
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-24 h-24 md:w-32 md:h-32 mb-6 relative">
              <img src={logoUrl} alt="Casablanca" className="w-full h-full object-contain relative" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-[0.25em] leading-tight" style={{ fontFamily: "'Aref Ruqaa', serif" }}>
              Casablanca
            </h1>
            <div className="h-[1px] w-8 bg-white/10 mt-6 mb-3 mx-auto" strokeWidth="2" />
            <p className="text-blue-400 font-black text-[9px] uppercase tracking-[0.3em] opacity-60">Management</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-5">Correo Electrónico</label>
              <div className="relative group/input">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-blue-400 transition-colors">
                  <Mail className="w-6 h-6" />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all font-bold placeholder:text-gray-600 placeholder:font-normal text-base"
                  placeholder="ejemplo@casablanca.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-5">Clave Maestra</label>
              <div className="relative group/input">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-blue-400 transition-colors">
                  <Lock className="w-6 h-6" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-14 pr-14 text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all font-bold placeholder:text-gray-600 placeholder:font-normal text-base tracking-widest outline-none"
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-2"
                >
                  {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black p-5 rounded-2xl animate-in shake duration-300 flex items-center gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl shadow-blue-600/20 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed group/btn overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000 skew-x-[-20deg]" />
              {loading ? (
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Acceder</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-gray-700 text-[8px] font-black uppercase tracking-[0.4em] opacity-40">
            Casablanca System v2.3 • Optimized view
          </p>
        </div>
      </div>

      {showPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overscroll-none touch-none">
          <div className="absolute inset-0 bg-black backdrop-blur-md animate-in fade-in duration-500" />
          <div className="relative w-full max-w-sm backdrop-blur-2xl bg-white/10 border border-white/20 rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-12 duration-700 touch-auto">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mb-8 shadow-inner ring-8 ring-blue-500/5">
                <Clock className="w-12 h-12 text-blue-400" />
              </div>
              <h2 className="text-3xl font-black text-white uppercase tracking-[0.2em] mb-6 leading-tight">¡Bienvenido de nuevo!</h2>
              <div className="space-y-6 mb-10">
                <p className="text-gray-400 text-sm font-bold uppercase tracking-widest opacity-80">
                  Tu última conexión registrada:
                </p>
                <div className="bg-white/[0.03] rounded-3xl p-6 border border-white/10 shadow-inner">
                  <span className="text-xl font-black text-blue-400 tracking-tight">
                    {lastVisit === 'Primera vez' ? '¡Es tu primera sesión!' : new Date(lastVisit).toLocaleDateString('es-ES', { 
                      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                    })}
                  </span>
                </div>
              </div>
              <button 
                onClick={handleClosePopup}
                className="w-full bg-white text-black font-black uppercase tracking-[0.2em] py-5 rounded-2xl hover:bg-blue-50 transition-all hover:shadow-2xl active:scale-95 shadow-lg"
              >
                ACCEDER AL SISTEMA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
