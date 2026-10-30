import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, Orbit, HardDrive } from 'lucide-react';
import { api } from '../services/api-client.js';
import type { CatalogItemData } from './ContentCard.js';
import type { ServerInstanceData } from './ServerCard.js';

interface ContentInstallModalProps {
  item: CatalogItemData | null;
  defaultServerId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ContentVersionData {
  id: string;
  versionNumber: string;
  fileName: string;
  downloadUrl: string;
  gameVersions: string[];
  loaders: string[];
}

export const ContentInstallModal: React.FC<ContentInstallModalProps> = ({
  item,
  defaultServerId,
  onClose,
  onSuccess
}) => {
  const [servers, setServers] = useState<ServerInstanceData[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>(defaultServerId || '');
  const [versions, setVersions] = useState<ContentVersionData[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!defaultServerId) {
      api.get<ServerInstanceData[]>('/servers')
        .then((data) => {
          setServers(data);
          if (data.length > 0 && !selectedServerId && data[0]) {
            setSelectedServerId(data[0].id);
          }
        })
        .catch(() => {});
    }
  }, [defaultServerId, selectedServerId]);

  const targetServer = servers.find((s) => s.id === selectedServerId);

  // Fetch available versions
  useEffect(() => {
    if (!item || !selectedServerId) return;

    setIsLoadingVersions(true);
    setErrorMsg(null);

    // Call catalog search or versions
    const queryParams = new URLSearchParams();
    if (targetServer) {
      queryParams.set('gameVersion', targetServer.gameVersion);
      queryParams.set('loader', targetServer.loader);
    }
    queryParams.set('provider', item.providerId);

    // Mock/Fetch compatible version from provider
    // Default fallback version object
    const fallbackVersion: ContentVersionData = {
      id: `ver_${Date.now()}`,
      versionNumber: 'Latest Compatible',
      fileName: `${item.slug}-${targetServer?.gameVersion || '1.21.4'}.jar`,
      downloadUrl: `https://cdn.modrinth.com/data/${item.id}/versions/${item.slug}.jar`,
      gameVersions: [targetServer?.gameVersion || '1.21.4'],
      loaders: [targetServer?.loader || 'paper']
    };

    setVersions([fallbackVersion]);
    setSelectedVersionId(fallbackVersion.id);
    setIsLoadingVersions(false);
  }, [item, selectedServerId, targetServer]);

  if (!item) return null;

  const handleInstall = async () => {
    if (!selectedServerId || !selectedVersionId) return;

    const version = versions.find((v) => v.id === selectedVersionId) || versions[0];
    if (!version) return;

    setIsInstalling(true);
    setErrorMsg(null);

    try {
      await api.post('/catalog/install', {
        instanceId: selectedServerId,
        providerId: item.providerId,
        projectId: item.id,
        projectType: item.projectType,
        versionId: version.id,
        versionNumber: version.versionNumber,
        fileName: version.fileName,
        downloadUrl: version.downloadUrl
      });

      setSuccessMsg(`¡${item.title} instalado exitosamente!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al instalar contenido');
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-nebula-900 border border-nebula-700 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>Instalar {item.title}</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              Proveedor: {item.providerId.toUpperCase()} &bull; Tipo: {item.projectType}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-nebula-850"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Target Server Selector */}
          {!defaultServerId && (
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-nebula-accent" />
                <span>Servidor de Destino</span>
              </label>
              {servers.length === 0 ? (
                <div className="p-3 rounded-lg bg-nebula-950 border border-nebula-800 text-xs text-slate-400">
                  No hay servidores creados para instalar.
                </div>
              ) : (
                <select
                  value={selectedServerId}
                  onChange={(e) => setSelectedServerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-nebula-950 border border-nebula-850 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-nebula-accent"
                >
                  {servers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.loader.toUpperCase()} {s.gameVersion})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Version Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Versión Compatible
            </label>
            {isLoadingVersions ? (
              <div className="flex items-center gap-2 p-2 text-xs text-slate-400 font-mono">
                <Orbit className="w-4 h-4 animate-spin text-nebula-accent" />
                <span>Buscando versiones compatibles...</span>
              </div>
            ) : (
              <select
                value={selectedVersionId}
                onChange={(e) => setSelectedVersionId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-nebula-950 border border-nebula-850 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-nebula-accent"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.versionNumber} ({v.fileName})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Folder Target Hint */}
          <div className="p-2.5 rounded-lg bg-nebula-950/80 border border-nebula-800 text-[11px] font-mono text-slate-400">
            Destino: <span className="text-nebula-cyber">/data/servers/{selectedServerId}/{item.projectType === 'plugin' ? 'plugins/' : 'mods/'}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-3 border-t border-nebula-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isInstalling || !selectedServerId || servers.length === 0}
            onClick={handleInstall}
            className="px-4 py-2 bg-nebula-purple hover:bg-purple-600 text-white font-bold text-xs rounded-lg shadow-lg shadow-purple-950/30 transition-all flex items-center gap-2 disabled:opacity-40"
          >
            {isInstalling ? (
              <>
                <Orbit className="w-4 h-4 animate-spin" />
                <span>Descargando e Instalando...</span>
              </>
            ) : (
              <span>Confirmar e Instalar</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
