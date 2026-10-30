import React, { useState } from 'react';
import { Play, Square, RotateCw, Trash2, Cpu, HardDrive, Terminal } from 'lucide-react';
import { api } from '../services/api-client.js';

export interface ServerInstanceData {
  id: string;
  name: string;
  loader: 'vanilla' | 'paper' | 'purpur' | 'fabric' | 'forge' | 'neoforge' | 'spigot' | 'quilt';
  gameVersion: string;
  memoryMb: number;
  port: number;
  status: 'offline' | 'starting' | 'online' | 'stopping' | 'crashed';
  eulaAccepted: boolean;
  autoRestart: boolean;
  createdAt: string;
  pid?: number | null;
}

interface ServerCardProps {
  server: ServerInstanceData;
  onRefresh: () => void;
  onSelect: (server: ServerInstanceData) => void;
}

export const ServerCard: React.FC<ServerCardProps> = ({ server, onRefresh, onSelect }) => {
  const [isActing, setIsActing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleStart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsActing(true);
    try {
      await api.post(`/servers/${server.id}/start`);
      onRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al iniciar servidor');
    } finally {
      setIsActing(false);
    }
  };

  const handleStop = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsActing(true);
    try {
      await api.post(`/servers/${server.id}/stop`);
      onRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al detener servidor');
    } finally {
      setIsActing(false);
    }
  };

  const handleRestart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsActing(true);
    try {
      await api.post(`/servers/${server.id}/restart`);
      onRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al reiniciar servidor');
    } finally {
      setIsActing(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`¿Estás seguro de eliminar el servidor "${server.name}"? Esta acción borrará los archivos de disco.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.delete(`/servers/${server.id}`);
      onRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar servidor');
    } finally {
      setIsDeleting(false);
    }
  };

  const statusConfig = {
    online: {
      label: 'ONLINE',
      bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-400 animate-pulse'
    },
    starting: {
      label: 'INICIANDO',
      bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      dot: 'bg-amber-400 animate-ping'
    },
    stopping: {
      label: 'DETENIENDO',
      bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      dot: 'bg-orange-400'
    },
    crashed: {
      label: 'CRASHED',
      bg: 'bg-red-500/10 text-red-400 border-red-500/30',
      dot: 'bg-red-400 animate-bounce'
    },
    offline: {
      label: 'OFFLINE',
      bg: 'bg-slate-800 text-slate-400 border-slate-700',
      dot: 'bg-slate-500'
    }
  }[server.status] ?? {
    label: server.status.toUpperCase(),
    bg: 'bg-slate-800 text-slate-400 border-slate-700',
    dot: 'bg-slate-500'
  };

  const loaderBadgeColor = {
    paper: 'text-nebula-cyber bg-nebula-cyber/10 border-nebula-cyber/30',
    purpur: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    fabric: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    forge: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    neoforge: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    spigot: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    quilt: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    vanilla: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
  }[server.loader] ?? 'text-slate-400 bg-slate-800 border-slate-700';

  return (
    <div
      onClick={() => onSelect(server)}
      className="group bg-nebula-900 border border-nebula-800 hover:border-nebula-700 rounded-xl p-4 shadow-md hover:shadow-xl transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
    >
      {/* Top Row: Name, Loader, Status */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-slate-100 group-hover:text-nebula-accent transition-colors truncate">
              {server.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${loaderBadgeColor}`}>
                {server.loader.toUpperCase()} {server.gameVersion}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                :{server.port}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider border ${statusConfig.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
            <span>{statusConfig.label}</span>
          </div>
        </div>

        {/* Specs Badges */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-nebula-850 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5 bg-nebula-950/60 p-2 rounded-lg border border-nebula-800/40">
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            <span>{server.memoryMb >= 1024 ? `${(server.memoryMb / 1024).toFixed(1)} GB` : `${server.memoryMb} MB`}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-nebula-950/60 p-2 rounded-lg border border-nebula-800/40">
            <Cpu className="w-3.5 h-3.5 text-slate-500" />
            <span>PID: {server.pid ? server.pid : '---'}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-3 border-t border-nebula-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {server.status === 'online' ? (
            <>
              <button
                disabled={isActing}
                onClick={handleStop}
                title="Detener servidor (/stop)"
                className="p-1.5 rounded-lg bg-orange-950/40 hover:bg-orange-900/60 text-orange-400 border border-orange-500/30 transition-colors disabled:opacity-50"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={isActing}
                onClick={handleRestart}
                title="Reiniciar servidor"
                className="p-1.5 rounded-lg bg-nebula-850 hover:bg-nebula-800 text-slate-300 border border-nebula-700 transition-colors disabled:opacity-50"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              disabled={isActing}
              onClick={handleStart}
              title="Iniciar servidor"
              className="px-3 py-1.5 rounded-lg bg-nebula-accent/20 hover:bg-nebula-accent/30 text-nebula-accent border border-nebula-accent/40 font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Iniciar</span>
            </button>
          )}

          <button
            onClick={() => onSelect(server)}
            title="Abrir consola e inspección"
            className="p-1.5 rounded-lg bg-nebula-850 hover:bg-nebula-800 text-slate-300 border border-nebula-700 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          disabled={isDeleting || server.status === 'online'}
          onClick={handleDelete}
          title={server.status === 'online' ? 'Detén el servidor antes de eliminarlo' : 'Eliminar instancia'}
          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors disabled:opacity-30"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
