import { useState, useEffect } from 'react';
import { Lock, Mail, Eye, EyeOff, LogIn } from 'lucide-react';
import logoUrl from '../assets/logo.jpeg';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vvHeight, setVvHeight] = useState('100dvh');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(null);
  const [lockCountdown, setLockCountdown] = useState(0);

  useEffect(() => {
    if (!lockUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockUntil(null);
        setLoginAttempts(0);
        setLockCountdown(0);
        clearInterval(interval);
      } else {
        setLockCountdown(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockUntil]);

  useEffect(() => {
    const handleViewport = () => {
      if (window.visualViewport) setVvHeight(`${window.visualViewport.height}px`);
      window.scrollTo(0, 0);
    };
    const handleBlur = () => { window.scrollTo(0, 0); handleViewport(); };
    window.visualViewport?.addEventListener('resize', handleViewport);
    window.visualViewport?.addEventListener('scroll', handleViewport);
    window.addEventListener('blur', handleBlur, true);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewport);
      window.visualViewport?.removeEventListener('scroll', handleViewport);
      window.removeEventListener('blur', handleBlur, true);
    };
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();

    if (lockUntil && Date.now() < lockUntil) {
      setError(`Demasiados intentos. Espera ${lockCountdown}s antes de intentarlo de nuevo.`);
      return;
    }

    setLoading(true);
    setError('');

    const users = JSON.parse(import.meta.env.VITE_APP_USERS || '[]');
    const match = users.find(u => u.email === email && u.password === password);

    if (match) {
      localStorage.setItem('casablanca_auth', 'true');
      localStorage.setItem('casablanca_user', match.email);
      onLogin(match.email);
    } else {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      if (newAttempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_MS;
        setLockUntil(until);
        setLockCountdown(Math.ceil(LOCKOUT_MS / 1000));
        setError('Demasiados intentos fallidos. Espera 60s.');
      } else {
        setError(`Acceso denegado. Verifica tu email y contraseña. (${newAttempts}/${MAX_ATTEMPTS})`);
      }
      setLoading(false);
    }
  };

  return (
    <div
      className="w-full flex items-center justify-center bg-black fixed inset-0 overflow-hidden overscroll-none p-4 select-none touch-none"
      style={{ height: vvHeight }}
    >
      <div className="w-full max-w-md z-10 animate-in fade-in slide-in-from-bottom-12 duration-1000 touch-auto">
        <div className="bg-black border border-white/5 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden group">

          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-24 h-24 md:w-32 md:h-32 mb-6 relative">
              <img src={logoUrl} alt="Casablanca" className="w-full h-full object-contain relative" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-[0.25em] leading-tight" style={{ fontFamily: "'Aref Ruqaa', serif" }}>
              Casablanca
            </h1>
            <div className="h-[1px] w-8 bg-white/10 mt-6 mb-3 mx-auto" />
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
                  type={showPassword ? 'text' : 'password'}
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
              disabled={loading || !!lockUntil}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl shadow-blue-600/20 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed group/btn overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000 skew-x-[-20deg]" />
              {loading ? (
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : lockUntil ? (
                <span>Bloqueado {lockCountdown}s</span>
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
    </div>
  );
};

export default Login;
