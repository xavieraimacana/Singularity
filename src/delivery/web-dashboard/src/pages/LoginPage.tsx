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
  KeyRound,
  Cloud,
  Monitor
} from 'lucide-react';
import { ConnectionSwitcherModal } from '../components/ConnectionSwitcherModal.js';
import type { ServerConnectionProfile } from '../types/desktop.js';

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

  // Connection management & modal state
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [activeProfile, setActiveProfile] = useState<ServerConnectionProfile | null>(null);

  // Real-time backend health status
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.singularityDesktop?.getActiveConnection) {
      window.singularityDesktop.getActiveConnection().then(setActiveProfile).catch(() => {});
    }
  }, []);

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
        <div className="mb-3 flex items-center justify-between text-[11px] font-mono px-3 py-1.5 rounded-full bg-nebula-900/90 border border-nebula-800/80 backdrop-blur-md shadow-lg text-slate-400">
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

        {/* Server Target & Switcher Widget */}
        <div className="mb-4 flex items-center justify-between text-xs px-3.5 py-2 rounded-xl bg-nebula-900/90 border border-nebula-800 backdrop-blur-md shadow-md">
          <div className="flex items-center gap-2 text-slate-300">
            {activeProfile?.type === 'local' ? (
              <Monitor className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Cloud className="w-4 h-4 text-cyan-400 shrink-0" />
            )}
            <span className="text-[11px] font-mono text-slate-400">Servidor:</span>
            <span className="font-semibold text-slate-200">
              {activeProfile?.name || (typeof window !== 'undefined' && window.location.hostname !== '127.0.0.1' ? 'NebulaX Cloud VPS' : 'Local PC')}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsConnectionModalOpen(true)}
            className="text-[11px] font-mono font-semibold text-nebula-cyber hover:text-cyan-300 transition-colors flex items-center gap-1 hover:underline"
          >
            <span>Cambiar</span>
            <ArrowRight className="w-3 h-3" />
          </button>
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
            
            <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
              <span>SINGULARITY</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-nebula-accent/20 text-nebula-accent border border-nebula-accent/40 font-mono font-semibold">
                MISSION CONTROL
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xs font-mono">
              Centro de Mando Aeroespacial para Servidores Minecraft 24/7
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="flex-1 font-medium">{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Operador / Usuario</span>
                <span className="text-[10px] text-slate-500 lowercase font-sans">credencial de acceso</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-10 pr-3 py-2.5 bg-nebula-950/80 border border-nebula-800 rounded-xl text-slate-100 text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-nebula-accent focus:ring-1 focus:ring-nebula-accent transition-all shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Contraseña Maestra</span>
                <span className="text-[10px] text-slate-500 lowercase font-sans">clave de seguridad</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-nebula-950/80 border border-nebula-800 rounded-xl text-slate-100 text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-nebula-accent focus:ring-1 focus:ring-nebula-accent transition-all shadow-inner"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick Fill Default Button for Fresh Deployments */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={fillDefaultCredentials}
                className="text-[11px] font-mono text-slate-500 hover:text-nebula-accent transition-colors flex items-center gap-1 group"
                title="Llenar con credenciales por defecto (admin / singularity)"
              >
                {autoFilled ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Credenciales aplicadas</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5 text-slate-500 group-hover:text-nebula-accent" />
                    <span>Usar clave inicial (admin / singularity)</span>
                  </>
                )}
              </button>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-nebula-accent via-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              {isSubmitting || isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Autenticando Operador...</span>
                </>
              ) : (
                <>
                  <span>Ingresar a la Consola Central</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Security Features Badge */}
          <div className="mt-6 pt-5 border-t border-nebula-800/80 grid grid-cols-2 gap-3 text-[10px] font-mono text-slate-400">
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

      {/* Connection Switcher Modal */}
      <ConnectionSwitcherModal
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        onSwitched={(p) => setActiveProfile(p)}
      />
    </div>
  );
};
