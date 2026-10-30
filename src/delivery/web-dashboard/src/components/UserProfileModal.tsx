import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  X,
  User,
  Shield,
  Key,
  AlertCircle,
  Sparkles,
  Server,
  Lock,
  Eye,
  EyeOff,
  Save,
  CheckCircle2
} from 'lucide-react';

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile, updatePassword } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Profile Form State
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [minecraftUsername, setMinecraftUsername] = useState(user?.minecraftUsername || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      await updateProfile({
        displayName: displayName.trim() || undefined,
        minecraftUsername: minecraftUsername.trim() || undefined
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Error al guardar el perfil');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(false);

    if (newPassword.length < 8) {
      setPassError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('Las contraseñas no coinciden');
      return;
    }

    setIsChangingPass(true);
    try {
      await updatePassword(currentPassword, newPassword);
      setPassSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccess(false), 4000);
    } catch (err: unknown) {
      setPassError(err instanceof Error ? err.message : 'Error al cambiar la contraseña');
    } finally {
      setIsChangingPass(false);
    }
  };

  const previewNick = minecraftUsername.trim() || user.username || 'MHF_Steve';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-nebula-900 border border-nebula-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-nebula-800 flex items-center justify-between bg-nebula-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-nebula-accent/15 border border-nebula-accent/30 flex items-center justify-center text-nebula-accent">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Perfil de Usuario y Personalización</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-nebula-800 text-nebula-accent border border-nebula-accent/30">
                  {user.role}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Personaliza tu skin de Minecraft, nombre visible y credenciales de acceso.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-nebula-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-4 px-6 border-b border-nebula-800 bg-nebula-900 text-xs">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'border-nebula-accent text-nebula-accent'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Identidad & Skin</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-3 font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'security'
                ? 'border-nebula-accent text-nebula-accent'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Seguridad & Contraseña</span>
            {user.mustChangePassword && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: 3D/2D Minecraft Skin Preview */}
              <div className="flex flex-col items-center justify-between bg-nebula-950/80 border border-nebula-800 rounded-xl p-4 text-center">
                <span className="text-[11px] font-mono text-slate-400 font-semibold mb-2">
                  Skin de Minecraft
                </span>

                <div className="w-36 h-48 bg-nebula-900/60 rounded-lg border border-nebula-800/80 flex items-center justify-center p-2 relative shadow-inner overflow-hidden">
                  <img
                    src={`https://crafatar.com/renders/body/${previewNick}?overlay=true&scale=3`}
                    alt={`Skin de ${previewNick}`}
                    onError={(e) => {
                      // Fallback to Steve on invalid nickname
                      (e.target as HTMLImageElement).src =
                        'https://crafatar.com/renders/body/MHF_Steve?overlay=true&scale=3';
                    }}
                    className="max-h-full object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,0.7)] hover:scale-105 transition-transform"
                  />
                </div>

                <div className="mt-3 text-center space-y-1">
                  <span className="text-xs font-mono font-bold text-white block">
                    {previewNick}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    Renderizado Crafatar API
                  </span>
                </div>
              </div>

              {/* Right Column: Profile Form */}
              <form onSubmit={handleSaveProfile} className="md:col-span-2 space-y-4">
                {profileSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>¡Perfil actualizado con éxito!</span>
                  </div>
                )}

                {profileError && (
                  <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Nombre de Cuenta (Username)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user.username}
                    className="w-full px-3 py-2 text-xs bg-nebula-950/50 border border-nebula-850 rounded-lg text-slate-400 font-mono cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-500">
                    El identificador único de cuenta no se puede modificar.
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Nombre Visible / Alias (Display Name)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Xavier Administrador"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-nebula-950 border border-nebula-750 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-nebula-accent transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Nickname de Minecraft (para Avatar y Skin)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. XavierAimacana o Notch"
                    value={minecraftUsername}
                    onChange={(e) => setMinecraftUsername(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-nebula-950 border border-nebula-750 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-nebula-accent transition-colors font-mono"
                  />
                  <span className="text-[10px] text-slate-500">
                    Ingresa cualquier nombre de usuario de Minecraft oficial para mostrar tu skin en la consola y cabecera.
                  </span>
                </div>

                {/* Permissions & Roles Summary */}
                <div className="p-3 rounded-xl bg-nebula-950 border border-nebula-800 text-xs text-slate-400 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-nebula-accent" />
                      Rol Asignado:
                    </span>
                    <span className="font-mono font-bold text-white">{user.role}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-nebula-cyber" />
                      Acceso a Servidores:
                    </span>
                    <span className="font-mono text-slate-300">
                      {user.role === 'ADMIN' || !user.allowedServers || user.allowedServers.includes('*')
                        ? 'Todos los servidores (*)'
                        : `${user.allowedServers.length} servidor(es) asignados`}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-4 py-2.5 rounded-lg bg-nebula-accent hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-nebula-accent/20 transition-all disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSavingProfile ? 'Guardando...' : 'Guardar Cambios de Perfil'}</span>
                </button>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="max-w-md mx-auto space-y-4">
              {user.mustChangePassword && (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-400" />
                    <span>Cambio de contraseña obligatorio</span>
                  </div>
                  <p className="text-[11px] text-amber-300/90 leading-relaxed">
                    Por seguridad empresarial, debes actualizar la contraseña predeterminada antes de continuar operando.
                  </p>
                </div>
              )}

              {passSuccess && (
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>¡Contraseña actualizada exitosamente!</span>
                </div>
              )}

              {passError && (
                <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{passError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Contraseña Actual
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pr-10 text-xs bg-nebula-950 border border-nebula-750 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-nebula-accent font-mono"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Nueva Contraseña (mínimo 8 caracteres)
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pr-10 text-xs bg-nebula-950 border border-nebula-750 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-nebula-accent font-mono"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs bg-nebula-950 border border-nebula-750 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-nebula-accent font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isChangingPass}
                className="w-full py-2.5 px-4 rounded-lg bg-nebula-accent hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-nebula-accent/20 transition-all disabled:opacity-50"
              >
                {isChangingPass ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span>{isChangingPass ? 'Actualizando...' : 'Actualizar Contraseña'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
