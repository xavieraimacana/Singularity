import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Search, LogOut, Shield, Terminal, Key } from 'lucide-react';

interface HeaderProps {
  onOpenCommandPalette: () => void;
  onOpenSftpModal: () => void;
  onOpenProfileModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCommandPalette,
  onOpenSftpModal,
  onOpenProfileModal
}) => {
  const { user, logout } = useAuth();
  const skinNick = user?.minecraftUsername || user?.username || 'MHF_Steve';

  return (
    <header className="h-14 border-b border-nebula-800 bg-nebula-900/90 backdrop-blur-md px-4 flex items-center justify-between z-20 select-none">
      {/* Left: Quick search & Command Palette Trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 bg-nebula-950 border border-nebula-800 rounded-lg hover:border-nebula-700 hover:text-slate-200 transition-all shadow-inner"
        >
          <Search className="w-3.5 h-3.5 text-nebula-accent" />
          <span>Buscar servidor, mods o comandos...</span>
          <kbd className="ml-4 px-1.5 py-0.5 text-[10px] font-mono bg-nebula-850 text-slate-400 rounded border border-nebula-700">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right: SFTP, IDE status & User Info */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSftpModal}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium text-nebula-cyber bg-nebula-cyber/10 border border-nebula-cyber/30 rounded-lg hover:bg-nebula-cyber/20 transition-all"
          title="Micro-servidor SFTP Port 2022 para Antigravity IDE"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>SFTP :2022</span>
        </button>

        {user && (
          <div className="flex items-center gap-2.5 pl-3 border-l border-nebula-800">
            {/* Interactive User Profile Trigger */}
            <button
              onClick={onOpenProfileModal}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-nebula-850 border border-transparent hover:border-nebula-750 transition-all text-left group"
              title="Ver mi perfil y personalizar avatar de Minecraft"
            >
              <div className="w-7 h-7 rounded-md bg-nebula-950 border border-nebula-800 flex items-center justify-center overflow-hidden shrink-0 shadow">
                <img
                  src={`https://crafatar.com/avatars/${skinNick}?size=28&overlay=true`}
                  alt={user.username}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://crafatar.com/avatars/MHF_Steve?size=28&overlay=true';
                  }}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                />
              </div>

              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-200 group-hover:text-nebula-accent transition-colors leading-tight">
                  {user.displayName || user.username}
                </span>
                <span className="text-[10px] font-mono font-semibold tracking-wider text-nebula-accent flex items-center justify-end gap-1">
                  <Shield className="w-2.5 h-2.5" />
                  {user.role}
                </span>
              </div>
            </button>

            {user.mustChangePassword && (
              <button
                onClick={onOpenProfileModal}
                className="p-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                title="Debes cambiar tu contraseña inicial"
              >
                <Key className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-nebula-800 transition-all"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
