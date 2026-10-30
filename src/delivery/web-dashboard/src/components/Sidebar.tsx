import React from 'react';
import { Server, Package, Cpu, Settings, Users } from 'lucide-react';

export type NavTab = 'servers' | 'catalog' | 'java' | 'users' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  serverCount: number;
  isAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, serverCount, isAdmin = true }) => {
  const navItems = [
    {
      id: 'servers' as NavTab,
      label: 'Servidores Activos',
      icon: Server,
      badge: serverCount > 0 ? `${serverCount}` : undefined
    },
    {
      id: 'catalog' as NavTab,
      label: 'Catálogo de Contenido',
      icon: Package,
      badge: 'Modrinth'
    },
    {
      id: 'java' as NavTab,
      label: 'Java Runtimes',
      icon: Cpu
    },
    ...(isAdmin
      ? [
          {
            id: 'users' as NavTab,
            label: 'Cuentas & Accesos',
            icon: Users,
            badge: 'RBAC'
          }
        ]
      : []),
    {
      id: 'settings' as NavTab,
      label: 'Configuración',
      icon: Settings
    }
  ];

  return (
    <aside className="w-60 border-r border-nebula-800 bg-nebula-900/95 flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="h-14 px-4 flex items-center gap-2.5 border-b border-nebula-800">
          <div className="w-8 h-8 rounded-lg bg-nebula-950 border border-nebula-accent/40 flex items-center justify-center p-1 shadow-sm shadow-nebula-accent/20">
            <img src="/favicon.svg" alt="Singularity" className="w-5 h-5 object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-slate-100 flex items-center gap-1.5 text-sm">
              Singularity
              <span className="text-[9px] font-mono font-semibold px-1 py-0.2 rounded bg-nebula-800 text-nebula-accent border border-nebula-accent/30">
                v0.1
              </span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono tracking-wider">NEBULAX STUDIO</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-nebula-800/90 text-nebula-accent border border-nebula-accent/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-nebula-850 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-nebula-accent' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                      isActive
                        ? 'bg-nebula-accent/20 text-nebula-accent'
                        : 'bg-nebula-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status */}
      <div className="p-3 border-t border-nebula-800/80 bg-nebula-950/40">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-nebula-accent animate-pulse" />
            <span className="font-mono text-slate-300">Core Node</span>
          </span>
          <span className="font-mono text-slate-500">:3000</span>
        </div>
      </div>
    </aside>
  );
};
