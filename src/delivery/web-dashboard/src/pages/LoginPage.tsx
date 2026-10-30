import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Server,
  Sparkles,
  Check,
  KeyRound
} from 'lucide-react';

export interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
  isLoading?: boolean;
  initialError?: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  isLoading = false,
  initialError = null
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  // Real-time backend health status
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      const start = performance.now();
      try {
        const res = await fetch('/api/health');
        if (res.ok && isMounted) {
          const end = performance.now();
          setLatency(Math.round(end - start));
          setServerStatus('online');
        } else if (isMounted) {
          setServerStatus('offline');
        }
      } catch {
        if (isMounted) setServerStatus('offline');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor ingresa usuario y contraseña');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onLogin(username.trim(), password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al autenticar credenciales');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDefaultCredentials = () => {
    setUsername('admin');
    setPassword('singularity');
    setAutoFilled(true);
    setError(null);
    setTimeout(() => setAutoFilled(false), 2500);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-nebula-950 px-4 py-8 relative overflow-hidden select-none font-sans">
      {/* Dynamic Starfield & Nebula Glowing Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),rgba(6,182,212,0.06),transparent)] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] bg-gradient-to-tr from-nebula-accent/10 via-nebula-cyber/15 to-nebula-purple/10 rounded-full blur-[100px] pointer-events-none animate-pulse duration-[8000ms]" />
      
      {/* Subtle Aerospace Coordinate Grid */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
          backgroundSize: '28px 28px'
        }}
      />

      {/* Main Glassmorphic HUD Container */}
      <div className="w-full max-w-md relative z-10">
        {/* Top Floating Telemetry Status Banner */}
        <div className="mb-4 flex items-center justify-between text-[11px] font-mono px-3 py-1.5 rounded-full bg-nebula-900/90 border border-nebula-800/80 backdrop-blur-md shadow-lg text-slate-400">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                serverStatus === 'online' ? 'bg-emerald-400' : serverStatus === 'checking' ? 'bg-amber-400' : 'bg-rose-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                serverStatus === 'online' ? 'bg-emerald-500' : serverStatus === 'checking' ? 'bg-amber-500' : 'bg-rose-500'
              }`} />
            </span>
            <span className="font-semibold uppercase tracking-wider text-slate-300">
              {serverStatus === 'online' ? 'Singularity Core Online' : serverStatus === 'checking' ? 'Sondeando Core...' : 'Core Desconectado'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-slate-400">
            {latency !== null && (
              <span className="text-nebula-cyber font-semibold">{latency}ms</span>
            )}
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">v0.1.0-alpha</span>
          </div>
        </div>

        {/* Central Authentication Card with Sci-Fi HUD Corners */}
        <div className="bg-nebula-900/85 backdrop-blur-2xl border border-nebula-750/70 rounded-2xl p-7 shadow-2xl shadow-black/80 relative overflow-hidden">
          {/* Subtle Accent Glow Line at Card Top */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-nebula-accent/80 to-transparent" />

          {/* Top Aerospace Brackets (Emil Kowalski Craft Detail) */}
          <div className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-nebula-accent/40 rounded-tl pointer-events-none" />
          <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-nebula-accent/40 rounded-tr pointer-events-none" />

          {/* Singularity Branding & Logo */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-3.5 group cursor-default">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-nebula-950 via-nebula-900 to-nebula-800 border-2 border-nebula-700/80 flex items-center justify-center shadow-xl shadow-nebula-accent/10 relative transition-transform duration-300 group-hover:scale-105">
                {/* Rotating cosmic ring */}
                <div className="absolute inset-0 rounded-2xl border border-nebula-accent/30 animate-[spin_12s_linear_infinite]" />
                <img src="/favicon.svg" alt="Singularity" className="w-10 h-10 object-contain drop-shadow group-hover:scale-105 transition-transform" />
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-nebula-950 border border-nebula-700 shadow">
                <Sparkles className="w-3 h-3 text-nebula-cyber" />
              </div>
            </div>

            <div className="space-y-0.5">
              <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
                <span>SINGULARITY</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-nebula-accent/15 text-nebula-accent border border-nebula-accent/30">
                  CLI & WEB
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Mission Control Suite para Servidores Minecraft
              </p>
            </div>
          </div>

          {/* Error Alert Box */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold block text-rose-200">Error de autenticación</span>
                <span className="text-[11px] leading-relaxed opacity-90">{error}</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div className="space-y-1.5">
              <label 
                htmlFor="login-username" 
                className="block text-[11px] font-mono uppercase font-semibold text-slate-300 tracking-wider"
              >
                Identificador de Usuario
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-nebula-accent transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-nebula-950/90 border border-nebula-750 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-nebula-accent focus:ring-2 focus:ring-nebula-accent/20 transition-all font-mono"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="login-password" 
                  className="block text-[11px] font-mono uppercase font-semibold text-slate-300 tracking-wider"
                >
                  Contraseña Maestra
                </label>
              </div>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-nebula-accent transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-nebula-950/90 border border-nebula-750 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-nebula-accent focus:ring-2 focus:ring-nebula-accent/20 transition-all font-mono"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick Demo Credentials Autofill Pill */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={fillDefaultCredentials}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-nebula-950/60 hover:bg-nebula-850 border border-nebula-800 text-[11px] text-slate-400 hover:text-slate-200 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-mono">
                  <KeyRound className="w-3.5 h-3.5 text-nebula-accent group-hover:scale-110 transition-transform" />
                  <span>Predeterminado:</span>
                  <span className="text-slate-300 font-semibold">admin</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-slate-300 font-semibold">singularity</span>
                </div>
                <span className="text-[10px] text-nebula-accent font-semibold flex items-center gap-1">
                  {autoFilled ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Rellenado</span>
                    </>
                  ) : (
                    <span>Autocompletar</span>
                  )}
                </span>
              </button>
            </div>

            {/* Submit Button with High-Quality Spring Feel */}
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting || isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Autenticando en Singularity Core...</span>
                </>
              ) : (
                <>
                  <span>Entrar a Mission Control</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Architecture & Security Highlights */}
          <div className="mt-6 pt-5 border-t border-nebula-800/80 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Scrypt + JWT Blindado</span>
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <Server className="w-3.5 h-3.5 text-nebula-cyber shrink-0" />
              <span className="truncate">SFTP Puerto 2022</span>
            </div>
          </div>
        </div>

        {/* Studio Signature Footer */}
        <div className="mt-4 text-center space-y-1">
          <p className="text-[11px] font-mono text-slate-500">
            NEBULAX STUDIO &bull; CRAFTY + SINGULARITY FUSION &bull; SCREAMING ARCHITECTURE
          </p>
          <p className="text-[10px] text-slate-600">
            Diseñado para servidores 24/7 en Oracle Cloud, VPS y Docker
          </p>
        </div>
      </div>
    </div>
  );
};
