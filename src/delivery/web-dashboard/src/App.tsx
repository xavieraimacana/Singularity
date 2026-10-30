import React, { useState } from 'react';
import { useAuth } from './context/AuthContext.js';
import { Header } from './components/Header.js';
import { Sidebar, type NavTab } from './components/Sidebar.js';
import { CommandPalette } from './components/CommandPalette.js';
import { Dashboard } from './pages/Dashboard.js';
import type { ServerInstanceData } from './components/ServerCard.js';
import {
  Orbit,
  Lock,
  Terminal,
  Cpu,
  Package,
  AlertTriangle,
  CheckCircle2,
  Copy
} from 'lucide-react';

export const App: React.FC = () => {
  const { user, token, isLoading, login, updatePassword, logout } = useAuth();

  // Navigation State
  const [currentTab, setCurrentTab] = useState<NavTab>('servers');

  // Modals
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSftpModalOpen, setIsSftpModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);

  // Selected Server for Detail View (Task 11)
  const [_selectedServer, setSelectedServer] = useState<ServerInstanceData | null>(null);

  // Login Form State
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password Change Form State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState(false);

  // Copy feedback
  const [copiedSftp, setCopiedSftp] = useState(false);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-nebula-950 text-slate-400 gap-3">
        <Orbit className="w-8 h-8 text-nebula-accent animate-spin" />
        <span className="text-xs font-mono tracking-widest text-slate-500 uppercase">
          Cargando Singularity...
        </span>
      </div>
    );
  }

  // 1. Unauthenticated Login Screen
  if (!token || !user) {
    const handleLoginSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError(null);
      setIsSubmitting(true);
      try {
        await login(usernameInput, passwordInput);
      } catch (err: unknown) {
        setLoginError(err instanceof Error ? err.message : 'Error al iniciar sesión');
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="h-screen w-screen flex items-center justify-center bg-nebula-950 px-4 relative overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-nebula-accent/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-sm bg-nebula-900 border border-nebula-800 rounded-2xl shadow-2xl p-6 z-10">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-nebula-accent/20 to-nebula-cyber/30 border border-nebula-accent/40 flex items-center justify-center text-nebula-accent shadow-lg shadow-nebula-accent/10 mb-3">
              <Orbit className="w-7 h-7" />
            </div>
            <h1 className="text-lg font-bold text-slate-100">Singularity</h1>
            <p className="text-xs text-slate-400 mt-1">
              Mission Control Suite para Servidores Minecraft
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-2.5 rounded-lg bg-red-950/50 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Usuario
              </label>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="admin"
                className="w-full px-3 py-2 text-xs bg-nebula-950 border border-nebula-850 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-nebula-accent transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-xs bg-nebula-950 border border-nebula-850 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-nebula-accent transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-nebula-accent hover:bg-emerald-600 text-slate-950 font-semibold text-xs rounded-lg shadow-lg shadow-nebula-accent/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Iniciando...' : 'Iniciar Sesión'}</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-nebula-800/80 text-center text-[10px] text-slate-500 font-mono">
            NEBULAX STUDIO &bull; CRAFTY + PRISM UNIFIED
          </div>
        </div>
      </div>
    );
  }

  // 2. Main Authenticated Application Layout
  return (
    <div className="h-screen w-screen flex flex-col bg-nebula-950 overflow-hidden">
      {/* Top Header */}
      <Header
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenSftpModal={() => setIsSftpModalOpen(true)}
      />

      {/* Main Workspace (Sidebar + Content Area) */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          serverCount={0}
        />

        <main className="flex-1 overflow-y-auto p-6 bg-nebula-950/70">
          {/* First Login Mandatory Password Change Warning */}
          {user.mustChangePassword && (
            <div className="mb-6 p-4 rounded-xl bg-nebula-warning/10 border border-nebula-warning/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-nebula-warning shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-nebula-warning">
                    Cambio de contraseña requerido
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Estás usando las credenciales por defecto. Por seguridad de tu servidor, debes actualizar tu contraseña.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="px-3 py-1.5 text-xs font-medium bg-nebula-warning text-slate-950 rounded-lg hover:bg-amber-400 transition-colors shadow-sm"
              >
                Actualizar ahora
              </button>
            </div>
          )}

          {/* Tab Views */}
          {currentTab === 'servers' && (
            <Dashboard
              onSelectServer={(srv) => {
                setSelectedServer(srv);
              }}
              onOpenWizard={() => setIsCreateWizardOpen(true)}
              isWizardOpen={isCreateWizardOpen}
              onCloseWizard={() => setIsCreateWizardOpen(false)}
            />
          )}

          {currentTab === 'catalog' && (
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-1">
                <Package className="w-5 h-5 text-nebula-purple" />
                Catálogo Unificado Prism
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Instala mods de Modrinth, plugins y modpacks oficiales en 1-clic con resolución de compatibilidad.
              </p>
              <div className="p-8 border border-nebula-800 rounded-xl bg-nebula-900/30 text-xs text-slate-400">
                Módulo activo: Modrinth v2 API + PaperMC v2 API conectados.
              </div>
            </div>
          )}

          {currentTab === 'java' && (
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-1">
                <Cpu className="w-5 h-5 text-nebula-cyber" />
                Gestor de Runtimes Java
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Detección inteligente de Java 8 a 25 y descargas portables de Eclipse Temurin (Adoptium).
              </p>
              <div className="p-8 border border-nebula-800 rounded-xl bg-nebula-900/30 text-xs text-slate-400">
                Detección de runtimes del host activa.
              </div>
            </div>
          )}

          {currentTab === 'settings' && (
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-1">
                Configuración & Seguridad
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Administración de credenciales, roles RBAC y configuración global.
              </p>
              <div className="p-6 border border-nebula-800 rounded-xl bg-nebula-900/30 max-w-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">Contraseña de acceso</span>
                    <span className="text-[11px] text-slate-400">Actualizar tu contraseña personal</span>
                  </div>
                  <button
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="px-3 py-1.5 text-xs bg-nebula-800 hover:bg-nebula-700 text-slate-200 rounded-lg transition-colors border border-nebula-700"
                  >
                    Cambiar
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={setCurrentTab}
        onOpenCreateWizard={() => {
          setIsCreateWizardOpen(true);
        }}
        onOpenSftpModal={() => setIsSftpModalOpen(true)}
        onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
        onLogout={logout}
      />

      {/* SFTP Guide Modal for Antigravity IDE */}
      {isSftpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-nebula-900 border border-nebula-700 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-2.5 text-nebula-cyber font-bold text-sm mb-2">
              <Terminal className="w-5 h-5" />
              <span>Conexión SFTP Directa (Antigravity IDE)</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Singularity incluye un servidor SFTP nativo en el puerto 2022. Conéctalo desde Antigravity IDE o VS Code para editar archivos en vivo con latencia cero.
            </p>

            <div className="bg-nebula-950 p-3 rounded-xl border border-nebula-800 font-mono text-xs space-y-2 mb-4">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Host:</span>
                <span>localhost / IP del VPS</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Puerto SFTP:</span>
                <span className="text-nebula-accent font-semibold">2022</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Usuario:</span>
                <span>{user.username}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500">Raíz de Servidores:</span>
                <span className="text-slate-400">/data/servers</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`sftp://${user.username}@localhost:2022`);
                  setCopiedSftp(true);
                  setTimeout(() => setCopiedSftp(false), 2000);
                }}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                {copiedSftp ? <CheckCircle2 className="w-3.5 h-3.5 text-nebula-accent" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSftp ? '¡Copiado!' : 'Copiar URI SFTP'}</span>
              </button>
              <button
                onClick={() => setIsSftpModalOpen(false)}
                className="px-4 py-1.5 bg-nebula-800 hover:bg-nebula-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-nebula-900 border border-nebula-700 rounded-2xl shadow-2xl p-6">
            <h3 className="text-sm font-bold text-slate-100 mb-1">
              Actualizar Contraseña
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Ingresa tu contraseña actual y la nueva contraseña (mínimo 8 caracteres).
            </p>

            {passError && (
              <div className="mb-4 p-2 rounded-lg bg-red-950/50 border border-red-500/30 text-red-300 text-xs">
                {passError}
              </div>
            )}

            {passSuccess ? (
              <div className="py-4 text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 text-nebula-accent mx-auto" />
                <p className="text-xs text-slate-200 font-medium">
                  Contraseña actualizada exitosamente.
                </p>
                <button
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setPassSuccess(false);
                  }}
                  className="px-4 py-1.5 bg-nebula-accent text-slate-950 text-xs font-semibold rounded-lg"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setPassError(null);
                  if (newPass !== confirmPass) {
                    setPassError('Las contraseñas no coinciden');
                    return;
                  }
                  if (newPass.length < 8) {
                    setPassError('La nueva contraseña debe tener al menos 8 caracteres');
                    return;
                  }
                  try {
                    await updatePassword(currentPass, newPass);
                    setPassSuccess(true);
                  } catch (err: unknown) {
                    setPassError(err instanceof Error ? err.message : 'Error al cambiar contraseña');
                  }
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">Contraseña Actual</label>
                  <input
                    type="password"
                    required
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-nebula-950 border border-nebula-800 rounded-lg text-slate-100 focus:outline-none focus:border-nebula-accent"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">Nueva Contraseña</label>
                  <input
                    type="password"
                    required
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-nebula-950 border border-nebula-800 rounded-lg text-slate-100 focus:outline-none focus:border-nebula-accent"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">Confirmar Nueva Contraseña</label>
                  <input
                    type="password"
                    required
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-nebula-950 border border-nebula-800 rounded-lg text-slate-100 focus:outline-none focus:border-nebula-accent"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-nebula-accent hover:bg-emerald-600 text-slate-950 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
