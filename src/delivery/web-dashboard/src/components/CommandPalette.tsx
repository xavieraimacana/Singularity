import React, { useState, useEffect } from 'react';
import { Search, Plus, Package, Cpu, Terminal, Key, LogOut } from 'lucide-react';
import type { NavTab } from './Sidebar.js';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavTab) => void;
  onOpenCreateWizard: () => void;
  onOpenSftpModal: () => void;
  onOpenPasswordModal: () => void;
  onLogout: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenCreateWizard,
  onOpenSftpModal,
  onOpenPasswordModal,
  onLogout
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClose(); // toggle
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      id: 'create-server',
      label: 'Crear nuevo servidor Minecraft',
      icon: Plus,
      category: 'Servidores',
      action: () => {
        onOpenCreateWizard();
        onClose();
      }
    },
    {
      id: 'nav-servers',
      label: 'Ir a Mission Control (Servidores)',
      icon: Terminal,
      category: 'Navegación',
      action: () => {
        onNavigate('servers');
        onClose();
      }
    },
    {
      id: 'nav-catalog',
      label: 'Explorar Catálogo Prism (Mods / Plugins / Paper)',
      icon: Package,
      category: 'Navegación',
      action: () => {
        onNavigate('catalog');
        onClose();
      }
    },
    {
      id: 'nav-java',
      label: 'Gestionar Runtimes de Java (Adoptium)',
      icon: Cpu,
      category: 'Navegación',
      action: () => {
        onNavigate('java');
        onClose();
      }
    },
    {
      id: 'sftp-info',
      label: 'Conectar vía SFTP en Antigravity IDE (Puerto 2022)',
      icon: Terminal,
      category: 'Herramientas',
      action: () => {
        onOpenSftpModal();
        onClose();
      }
    },
    {
      id: 'change-pass',
      label: 'Cambiar contraseña de acceso',
      icon: Key,
      category: 'Seguridad',
      action: () => {
        onOpenPasswordModal();
        onClose();
      }
    },
    {
      id: 'logout',
      label: 'Cerrar sesión en Singularity',
      icon: LogOut,
      category: 'Seguridad',
      action: () => {
        onLogout();
        onClose();
      }
    }
  ];

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 p-4">
      <div className="w-full max-w-lg bg-nebula-900 border border-nebula-700/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-nebula-800 bg-nebula-950">
          <Search className="w-4 h-4 text-nebula-accent shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe un comando o busca una acción..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-nebula-850 text-slate-400 rounded border border-nebula-700">
            ESC
          </kbd>
        </div>

        {/* Action List */}
        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No se encontraron acciones para "{query}"
            </div>
          ) : (
            filtered.map((act) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.id}
                  onClick={act.action}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-nebula-800 transition-colors text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-nebula-accent transition-colors" />
                    <span>{act.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-400">
                    {act.category}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
