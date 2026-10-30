import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Play,
  Square,
  RotateCw,
  Terminal as TerminalIcon,
  Sliders,
  Package,
  HardDrive
} from 'lucide-react';
import { api } from '../services/api-client.js';
import type { ServerInstanceData } from '../components/ServerCard.js';
import { ConsoleTerminal } from '../components/ConsoleTerminal.js';
import { PlayerManager, type PlayerData } from '../components/PlayerManager.js';
import { CrashAlertBanner, type CrashDiagnosticData } from '../components/CrashAlertBanner.js';
import { InstalledContentList } from '../components/InstalledContentList.js';
import { PropertiesEditor } from '../components/PropertiesEditor.js';

interface ServerDetailPageProps {
  serverId: string;
  onBack: () => void;
  onNavigateToCatalog?: () => void;
}

export const ServerDetailPage: React.FC<ServerDetailPageProps> = ({
  serverId,
  onBack,
  onNavigateToCatalog
}) => {
  const [server, setServer] = useState<ServerInstanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'console' | 'properties' | 'content'>('console');
  const [activeCrash, setActiveCrash] = useState<CrashDiagnosticData | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [players, setPlayers] = useState<PlayerData[]>([]);

  const fetchServerDetails = useCallback(async () => {
    try {
      const data = await api.get<ServerInstanceData & { players?: PlayerData[] }>(`/servers/${serverId}`);
      setServer(data);
      if (Array.isArray(data.players)) {
        setPlayers(data.players);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    fetchServerDetails();
    const interval = setInterval(fetchServerDetails, 3000);
    return () => clearInterval(interval);
  }, [fetchServerDetails]);

  if (isLoading || !server) {
    return (
      <div className="py-20 text-center text-xs font-mono text-slate-500">
        Cargando detalles de la instancia {serverId}...
      </div>
    );
  }

  const isOnline = server.status === 'online';

  const handleStart = async () => {
    setIsActing(true);
    try {
      await api.post(`/servers/${server.id}/start`);
      fetchServerDetails();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al iniciar servidor');
    } finally {
      setIsActing(false);
    }
  };

  const handleStop = async () => {
    setIsActing(true);
    try {
      await api.post(`/servers/${server.id}/stop`);
      fetchServerDetails();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al detener servidor');
    } finally {
      setIsActing(false);
    }
  };

  const handleRestart = async () => {
    setIsActing(true);
    try {
      await api.post(`/servers/${server.id}/restart`);
      fetchServerDetails();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al reiniciar servidor');
    } finally {
      setIsActing(false);
    }
  };

  const statusConfig = {
    online: { label: 'ONLINE', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    starting: { label: 'INICIANDO', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    stopping: { label: 'DETENIENDO', bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
    crashed: { label: 'CRASHED', bg: 'bg-red-500/10 text-red-400 border-red-500/30' },
    offline: { label: 'OFFLINE', bg: 'bg-slate-800 text-slate-400 border-slate-700' }
  }[server.status] ?? { label: server.status.toUpperCase(), bg: 'bg-slate-800 text-slate-400 border-slate-700' };

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-5.5rem)]">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-nebula-900 border border-nebula-800 text-slate-400 hover:text-slate-100 hover:bg-nebula-850 transition-colors"
            title="Volver a Mission Control"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-slate-100">{server.name}</h1>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${statusConfig.bg}`}>
                {statusConfig.label}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs font-mono text-slate-400">
              <span className="text-nebula-cyber font-semibold">{server.loader.toUpperCase()} {server.gameVersion}</span>
              <span>&bull;</span>
              <span>Puerto: {server.port}</span>
              <span>&bull;</span>
              <span>RAM: {server.memoryMb} MB</span>
              {server.pid && <span>&bull; PID: {server.pid}</span>}
            </div>
          </div>
        </div>

        {/* Server Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {isOnline ? (
            <>
              <button
                disabled={isActing}
                onClick={handleStop}
                className="px-3.5 py-2 rounded-lg bg-orange-950/40 hover:bg-orange-900/60 text-orange-400 border border-orange-500/30 font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Detener (/stop)</span>
              </button>
              <button
                disabled={isActing}
                onClick={handleRestart}
                className="px-3.5 py-2 rounded-lg bg-nebula-850 hover:bg-nebula-800 text-slate-200 border border-nebula-700 font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Reiniciar</span>
              </button>
            </>
          ) : (
            <button
              disabled={isActing}
              onClick={handleStart}
              className="px-4 py-2 rounded-lg bg-nebula-accent hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-nebula-accent/20 transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Iniciar Servidor</span>
            </button>
          )}
        </div>
      </div>

      {/* Crash Alert Banner */}
      {activeCrash && (
        <CrashAlertBanner
          diagnostic={activeCrash}
          onDismiss={() => setActiveCrash(null)}
          onAction={(code) => {
            if (code === 'OUT_OF_MEMORY') {
              setActiveTab('properties');
            }
          }}
        />
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-nebula-800 shrink-0 text-xs">
        {[
          { id: 'console' as const, label: 'Consola y Jugadores', icon: TerminalIcon },
          { id: 'properties' as const, label: 'server.properties', icon: Sliders },
          { id: 'content' as const, label: 'Mods y Plugins', icon: Package }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 transition-all ${
                isActive
                  ? 'border-nebula-accent text-nebula-accent font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'console' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
            {/* Main Interactive Terminal View (3 Cols) */}
            <div className="lg:col-span-3 h-full">
              <ConsoleTerminal
                serverId={server.id}
                isOnline={isOnline}
                onCrashDetected={(diag) => setActiveCrash(diag)}
                onStatusChange={(status) => {
                  setServer((prev) => (prev ? { ...prev, status: status as ServerInstanceData['status'] } : prev));
                }}
                onPlayerEvent={(event: unknown) => {
                  const ev = event as { type: string; username: string };
                  if (ev.type === 'join') {
                    setPlayers((prev) => [...prev.filter((p) => p.username !== ev.username), { username: ev.username, joinedAt: new Date().toISOString() }]);
                  } else if (ev.type === 'leave') {
                    setPlayers((prev) => prev.filter((p) => p.username !== ev.username));
                  }
                }}
              />
            </div>

            {/* Right Side Player Manager & Stats (1 Col) */}
            <div className="h-full flex flex-col gap-4">
              <div className="flex-1 min-h-0">
                <PlayerManager
                  serverId={server.id}
                  isOnline={isOnline}
                  players={players}
                  onPlayerActionSent={() => fetchServerDetails()}
                />
              </div>

              {/* Quick Info Box */}
              <div className="bg-nebula-900 border border-nebula-800 rounded-xl p-3 text-xs text-slate-400 space-y-1.5 shrink-0">
                <div className="flex items-center gap-2 text-slate-300 font-semibold mb-1">
                  <HardDrive className="w-3.5 h-3.5 text-nebula-cyber" />
                  <span>Almacenamiento Local</span>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span>Instancia:</span>
                  <span className="text-slate-300">{server.id}</span>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span>EULA Mojang:</span>
                  <span className="text-emerald-400 font-semibold">Aceptado</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'properties' && (
          <div className="h-full overflow-y-auto pr-1">
            <PropertiesEditor
              serverId={server.id}
              serverName={server.name}
              onSaved={() => fetchServerDetails()}
            />
          </div>
        )}

        {activeTab === 'content' && (
          <div className="h-full overflow-y-auto">
            <InstalledContentList
              serverId={server.id}
              onExploreCatalog={() => onNavigateToCatalog?.()}
            />
          </div>
        )}
      </div>
    </div>
  );
};
