import React, { useState } from 'react';
import {
  Settings,
  Terminal,
  Server,
  Shield,
  Key,
  Copy,
  CheckCircle2,
  Monitor,
  Code2,
  LogOut,
  Save
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface SettingsPageProps {
  onOpenProfileModal: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onOpenProfileModal }) => {
  const { user, logout } = useAuth();

  // Terminal Preferences (Stored in localStorage)
  const [fontSize, setFontSize] = useState<number>(() => {
    return parseInt(localStorage.getItem('singularity_term_fontsize') || '13', 10);
  });
  const [fontFamily, setFontFamily] = useState<string>(() => {
    return localStorage.getItem('singularity_term_font') || 'JetBrains Mono';
  });
  const [scrollback, setScrollback] = useState<number>(() => {
    return parseInt(localStorage.getItem('singularity_term_scrollback') || '3000', 10);
  });
  const [autoScroll, setAutoScroll] = useState<boolean>(() => {
    return localStorage.getItem('singularity_term_autoscroll') !== 'false';
  });

  // IDE preference
  const [preferredIde, setPreferredIde] = useState<string>(() => {
    return localStorage.getItem('singularity_preferred_ide') || 'antigravity';
  });

  const [savedFeedback, setSavedFeedback] = useState(false);
  const [copiedSftp, setCopiedSftp] = useState(false);

  const isDesktop = typeof window !== 'undefined' && Boolean((window as any).singularityDesktop?.isElectron);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('singularity_term_fontsize', fontSize.toString());
    localStorage.setItem('singularity_term_font', fontFamily);
    localStorage.setItem('singularity_term_scrollback', scrollback.toString());
    localStorage.setItem('singularity_term_autoscroll', autoScroll.toString());
    localStorage.setItem('singularity_preferred_ide', preferredIde);

    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3000);
  };

  const copySftpCommand = () => {
    const cmd = `sftp -P 2022 ${user?.username || 'admin'}@127.0.0.1`;
    navigator.clipboard.writeText(cmd);
    setCopiedSftp(true);
    setTimeout(() => setCopiedSftp(false), 2500);
  };

  return (
    <div className="space-y-6 animate-fade-in select-none max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-nebula-accent" />
            <span>Configuración & Preferencias del Sistema</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Parámetros de telemetría, puente de IDE, consola interactiva y entorno operativo de NebulaX Studio.
          </p>
        </div>

        {savedFeedback && (
          <div className="px-3.5 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>¡Preferencias guardadas!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Settings & Preferences Form */}
        <div className="md:col-span-2 space-y-6">
          {/* Terminal & Console Preferences */}
          <form onSubmit={handleSavePreferences} className="bg-nebula-900 border border-nebula-800 rounded-2xl p-5 shadow-md space-y-4">
            <div className="flex items-center gap-2 border-b border-nebula-800/80 pb-3">
              <Terminal className="w-4 h-4 text-nebula-cyber" />
              <h2 className="text-sm font-bold text-white">Consola de Minecraft & Logs (xterm.js)</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Tipografía de Terminal
                </label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-nebula-950 border border-nebula-800 rounded-lg text-slate-100 focus:outline-none focus:border-nebula-accent font-mono"
                >
                  <option value="JetBrains Mono">JetBrains Mono (Oficial)</option>
                  <option value="Fira Code">Fira Code</option>
                  <option value="Consolas">Consolas</option>
                  <option value="Courier New">Courier New</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Tamaño de Fuente ({fontSize}px)
                </label>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-xs bg-nebula-950 border border-nebula-800 rounded-lg text-slate-100 focus:outline-none focus:border-nebula-accent font-mono"
                >
                  <option value={11}>11px (Compacto)</option>
                  <option value={12}>12px (Equilibrado)</option>
                  <option value={13}>13px (Predeterminado)</option>
                  <option value={14}>14px (Grande)</option>
                  <option value={16}>16px (Accesible)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Buffer de Historial (Scrollback)
                </label>
                <select
                  value={scrollback}
                  onChange={(e) => setScrollback(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-xs bg-nebula-950 border border-nebula-800 rounded-lg text-slate-100 focus:outline-none focus:border-nebula-accent font-mono"
                >
                  <option value={1000}>1,000 líneas</option>
                  <option value={3000}>3,000 líneas (Predeterminado)</option>
                  <option value={5000}>5,000 líneas</option>
                  <option value={10000}>10,000 líneas (Alto consumo)</option>
                </select>
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-nebula-950 border border-nebula-800 cursor-pointer hover:border-nebula-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="rounded bg-nebula-900 border-nebula-700 text-nebula-accent focus:ring-0"
                  />
                  <span className="text-xs text-slate-300 font-medium">Auto-scroll hacia los nuevos logs</span>
                </label>
              </div>
            </div>

            {/* IDE Preference */}
            <div className="pt-3 border-t border-nebula-800/80 space-y-2">
              <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-nebula-purple" />
                IDE Predeterminado para Edición Rápida
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'antigravity', label: 'Antigravity IDE', desc: 'Google AGY' },
                  { id: 'vscode', label: 'VS Code', desc: 'Microsoft' },
                  { id: 'cursor', label: 'Cursor', desc: 'AI Code Editor' },
                  { id: 'explorer', label: 'Explorador', desc: 'Archivos Host' }
                ].map((ide) => (
                  <button
                    key={ide.id}
                    type="button"
                    onClick={() => setPreferredIde(ide.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      preferredIde === ide.id
                        ? 'bg-nebula-purple/15 border-nebula-purple text-white shadow-sm'
                        : 'bg-nebula-950 border-nebula-850 text-slate-400 hover:border-nebula-700'
                    }`}
                  >
                    <span className="block text-xs font-bold font-mono">{ide.label}</span>
                    <span className="block text-[10px] text-slate-500 font-sans mt-0.5">{ide.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-nebula-accent hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-2 shadow-md shadow-nebula-accent/20 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Preferencias de Interfaz</span>
            </button>
          </form>

          {/* Micro-Server SFTP Information Tile */}
          <div className="bg-nebula-900 border border-nebula-800 rounded-2xl p-5 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-nebula-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-nebula-accent" />
                <h2 className="text-sm font-bold text-white">Micro-Servidor SFTP Embebido (:2022)</h2>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                ACTIVO
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Permite conectarse a cualquier instancia de Minecraft desde FileZilla, Cyberduck, VS Code o Antigravity IDE con tu usuario y contraseña de Singularity.
            </p>

            <div className="p-3 rounded-xl bg-nebula-950 border border-nebula-850 font-mono text-xs flex items-center justify-between">
              <span className="text-slate-300">
                sftp -P 2022 {user?.username || 'admin'}@127.0.0.1
              </span>
              <button
                type="button"
                onClick={copySftpCommand}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-nebula-800 transition-colors"
                title="Copiar comando de conexión"
              >
                {copiedSftp ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): System Telemetry & Identity Card */}
        <div className="space-y-6">
          {/* User Identity & Profile Quick Trigger */}
          <div className="bg-nebula-900 border border-nebula-800 rounded-2xl p-5 shadow-md space-y-4">
            <div className="flex items-center gap-2 border-b border-nebula-800/80 pb-3">
              <Shield className="w-4 h-4 text-nebula-accent" />
              <h2 className="text-sm font-bold text-white">Sesión Activa</h2>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Usuario:</span>
                <span className="font-mono font-bold text-white">{user?.username}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Nombre Visible:</span>
                <span className="text-slate-200">{user?.displayName || 'Sin alias'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Rol Asignado:</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-nebula-800 text-nebula-accent border border-nebula-accent/30 font-bold">
                  {user?.role}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-nebula-800/80 space-y-2">
              <button
                type="button"
                onClick={onOpenProfileModal}
                className="w-full py-2 px-3 rounded-lg bg-nebula-950 hover:bg-nebula-850 border border-nebula-800 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-colors"
              >
                <Key className="w-3.5 h-3.5 text-nebula-accent" />
                <span>Personalizar Perfil & Clave</span>
              </button>

              <button
                type="button"
                onClick={logout}
                className="w-full py-2 px-3 rounded-lg bg-rose-950/30 hover:bg-rose-950/60 border border-rose-500/30 text-xs font-semibold text-rose-300 flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>

          {/* Node & Architecture Info */}
          <div className="bg-nebula-900 border border-nebula-800 rounded-2xl p-5 shadow-md space-y-3">
            <div className="flex items-center gap-2 border-b border-nebula-800/80 pb-3">
              <Monitor className="w-4 h-4 text-nebula-cyber" />
              <h2 className="text-sm font-bold text-white">Entorno de Ejecución</h2>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Modo:</span>
                <span className="text-nebula-accent font-bold">
                  {isDesktop ? 'Electron Desktop' : 'Web & Headless API'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Core Port:</span>
                <span className="text-white">:3000 (HTTP/WS)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">SFTP Port:</span>
                <span className="text-nebula-cyber font-bold">:2022</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Directorio Servidores:</span>
                <span className="text-slate-300 text-[11px] truncate max-w-[140px]" title="data/servers">
                  data/servers
                </span>
              </div>
            </div>
          </div>

          {/* About NebulaX Studio */}
          <div className="p-4 rounded-2xl bg-nebula-950/60 border border-nebula-800 text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <img src="/favicon.svg" alt="Singularity" className="w-5 h-5 object-contain" />
              <span className="text-xs font-bold text-white tracking-wider font-mono">SINGULARITY</span>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-nebula-800 text-nebula-accent border border-nebula-accent/30">
                v0.1.0-alpha
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Un producto oficial de <strong>NebulaX Studio</strong> & <strong>Xavier Aimacaña</strong>.
            </p>
            <span className="text-[10px] text-slate-500 font-mono block">
              Bajo Licencia MIT (Open Source 2026)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
