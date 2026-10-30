import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Search, LogOut, Shield, Terminal, Key } from 'lucide-react';

interface HeaderProps {
  onOpenCommandPalette: () => void;
  onOpenSftpModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCommandPalette, onOpenSftpModal }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-14 border-b border-nebula-800 bg-nebula-900/90 backdrop-blur-md px-4 flex items-center justify-between z-20">
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
          title="SFTP Port 2022 para Antigravity IDE"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>SFTP :2022</span>
        </button>

        {user && (
          <div className="flex items-center gap-2 pl-3 border-l border-nebula-800">
            <div className="flex flex-col text-right">
              <span className="text-xs font-medium text-slate-200">{user.username}</span>
              <span className="text-[10px] font-mono font-semibold tracking-wider text-nebula-accent flex items-center justify-end gap-1">
                <Shield className="w-2.5 h-2.5" />
                {user.role}
              </span>
            </div>

            {user.mustChangePassword && (
              <span
                className="p-1 rounded bg-nebula-warning/10 text-nebula-warning border border-nebula-warning/30"
                title="Debe cambiar su contraseña inicial"
              >
                <Key className="w-3.5 h-3.5" />
              </span>
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
