import React, { useState, useEffect, useCallback } from 'react';
import { Server, Plus, HardDrive, Activity, RotateCw } from 'lucide-react';
import { api } from '../services/api-client.js';
import { ServerCard, type ServerInstanceData } from '../components/ServerCard.js';
import { CreateServerWizard } from './CreateServerWizard.js';

interface DashboardProps {
  onSelectServer: (server: ServerInstanceData) => void;
  onOpenWizard: () => void;
  isWizardOpen: boolean;
  onCloseWizard: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onSelectServer,
  onOpenWizard,
  isWizardOpen,
  onCloseWizard
}) => {
  const [servers, setServers] = useState<ServerInstanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchServers = useCallback(async (quiet = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      const data = await api.get<ServerInstanceData[]>('/servers');
      setServers(data);
    } catch {
      // ignore transient polling errors
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();

    // Live status polling every 3 seconds
    const interval = setInterval(() => {
      fetchServers(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchServers]);

  // Aggregate Metrics
  const onlineCount = servers.filter((s) => s.status === 'online').length;
  const startingCount = servers.filter((s) => s.status === 'starting').length;
  const totalMemoryAllocatedMb = servers.reduce((acc, s) => acc + s.memoryMb, 0);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Server className="w-6 h-6 text-nebula-accent" />
            <span>Mission Control</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Panel de control y monitorización de instancias de Minecraft
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchServers()}
            className="p-2 rounded-lg bg-nebula-900 border border-nebula-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refrescar lista"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onOpenWizard}
            className="flex items-center gap-2 px-4 py-2 bg-nebula-accent hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-nebula-accent/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Servidor</span>
          </button>
        </div>
      </div>

      {/* Aggregate Metrics Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Active Servers */}
        <div className="bg-nebula-900/90 border border-nebula-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400">Servidores Activos</span>
            <div className="text-2xl font-bold font-mono text-slate-100 mt-1 flex items-baseline gap-2">
              <span className="text-nebula-accent">{onlineCount}</span>
              <span className="text-xs text-slate-500">/ {servers.length} total</span>
            </div>
            {startingCount > 0 && (
              <span className="text-[10px] text-amber-400 font-mono mt-0.5 block">
                {startingCount} iniciando...
              </span>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-nebula-accent/10 border border-nebula-accent/20 flex items-center justify-center text-nebula-accent">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Total RAM Assigned */}
        <div className="bg-nebula-900/90 border border-nebula-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400">Memoria RAM Reservada</span>
            <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
              {(totalMemoryAllocatedMb / 1024).toFixed(1)} <span className="text-xs text-slate-500 font-sans font-normal">GB</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
              {totalMemoryAllocatedMb} MB en instancias
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-nebula-cyber/10 border border-nebula-cyber/20 flex items-center justify-center text-nebula-cyber">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>

        {/* SFTP Status */}
        <div className="bg-nebula-900/90 border border-nebula-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-400">Servicio SFTP Embebido</span>
            <div className="text-base font-bold font-mono text-emerald-400 mt-1">
              Activo :2022
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Listo para Antigravity IDE
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-nebula-purple/10 border border-nebula-purple/20 flex items-center justify-center text-nebula-purple font-mono font-bold text-xs">
            SFTP
          </div>
        </div>
      </div>

      {/* Servers Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-xs text-slate-500 font-mono">
          Cargando instancias de servidor...
        </div>
      ) : servers.length === 0 ? (
        <div className="border border-dashed border-nebula-800 rounded-2xl p-12 text-center bg-nebula-900/40">
          <Server className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-200">
            No tienes servidores desplegados
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Crea tu primera instancia de Minecraft (PaperMC, Purpur, Fabric o Vanilla) con nuestro asistente guiado.
          </p>
          <button
            onClick={onOpenWizard}
            className="px-4 py-2 bg-nebula-accent text-slate-950 text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-all shadow-lg shadow-nebula-accent/20"
          >
            Abrir Asistente de Creación
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servers.map((srv) => (
            <ServerCard
              key={srv.id}
              server={srv}
              onRefresh={() => fetchServers(true)}
              onSelect={onSelectServer}
            />
          ))}
        </div>
      )}

      {/* Creation Wizard Modal */}
      <CreateServerWizard
        isOpen={isWizardOpen}
        onClose={onCloseWizard}
        onSuccess={() => {
          fetchServers();
        }}
      />
    </div>
  );
};
