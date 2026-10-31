import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Orbit,
  HardDrive,
  ShieldAlert,
  FolderCheck,
  Sparkles,
  Layers,
  Cpu
} from 'lucide-react';
import { api } from '../services/api-client.js';
import { isClientOnlyMod } from '../utils/client-mod-filter.js';
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

  // Deployment Mode: 'new_server' or 'existing_server'
  const isModpack = item?.projectType === 'modpack';
  const [installMode, setInstallMode] = useState<'new_server' | 'existing_server'>('existing_server');

  // New Server Form States
  const [newServerName, setNewServerName] = useState('');
  const [newServerLoader, setNewServerLoader] = useState<'fabric' | 'forge' | 'neoforge' | 'paper' | 'purpur' | 'spigot' | 'vanilla'>('fabric');
  const [newServerGameVersion, setNewServerGameVersion] = useState('1.20.1');
  const [newServerMemoryMb, setNewServerMemoryMb] = useState(6144);
  const [newServerPort, setNewServerPort] = useState(25565);
  const [deployStep, setDeployStep] = useState<string | null>(null);

  // Load servers and set defaults
  useEffect(() => {
    api.get<ServerInstanceData[]>('/servers')
      .then((data) => {
        setServers(data || []);
        if (defaultServerId) {
          setSelectedServerId(defaultServerId);
        } else if (data && data.length > 0 && !selectedServerId && data[0]) {
          setSelectedServerId(data[0].id);
        }
      })
      .catch(() => {});
  }, [defaultServerId, selectedServerId]);

  // Set default mode when item is opened
  useEffect(() => {
    if (item) {
      if (item.projectType === 'modpack') {
        setInstallMode('new_server');
        setNewServerName(item.title);
      } else {
        setInstallMode('existing_server');
      }
    }
  }, [item]);

  const targetServer = servers.find((s) => s.id === selectedServerId);
  const isPluginServer = Boolean(
    targetServer && ['paper', 'purpur', 'spigot', 'bukkit'].includes(targetServer.loader.toLowerCase())
  );

  // Fetch real available versions from backend
  useEffect(() => {
    if (!item) return;

    setIsLoadingVersions(true);
    setErrorMsg(null);

    const queryParams = new URLSearchParams();
    if (installMode === 'existing_server' && targetServer) {
      queryParams.set('gameVersion', targetServer.gameVersion);
      queryParams.set('loader', targetServer.loader);
    }

    api.get<ContentVersionData[]>(
      `/catalog/versions/${item.providerId}/${encodeURIComponent(item.id)}?${queryParams.toString()}`
    )
      .then((data) => {
        if (data && data.length > 0) {
          setVersions(data);
          setSelectedVersionId(data[0].id);
        } else {
          setVersions([]);
          setSelectedVersionId('');
          setErrorMsg('No se encontraron versiones disponibles para este contenido.');
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Error al obtener versiones de contenido';
        setErrorMsg(msg);
        setVersions([]);
      })
      .finally(() => {
        setIsLoadingVersions(false);
      });
  }, [item, installMode, selectedServerId, targetServer?.gameVersion, targetServer?.loader]);

  const selectedVersion = versions.find((v) => v.id === selectedVersionId) || versions[0];

  // Auto-detect Loader & GameVersion from the chosen Modpack Version
  useEffect(() => {
    if (selectedVersion) {
      if (selectedVersion.loaders && selectedVersion.loaders.length > 0) {
        const found = selectedVersion.loaders.find((l) =>
          ['fabric', 'forge', 'neoforge', 'paper', 'purpur', 'spigot', 'quilt', 'vanilla'].includes(l.toLowerCase())
        );
        if (found) {
          const l = found.toLowerCase();
          setNewServerLoader(l === 'quilt' ? 'fabric' : (l as any));
        }
      }

      if (selectedVersion.gameVersions && selectedVersion.gameVersions.length > 0) {
        const foundMc = selectedVersion.gameVersions.find((v) => /^\d+\.\d+(\.\d+)?$/.test(v));
        if (foundMc) {
          setNewServerGameVersion(foundMc);
        }
      }
    }
  }, [selectedVersion]);

  if (!item) return null;

  // Client-only mod check
  const isClientMod =
    installMode === 'existing_server' &&
    !isPluginServer &&
    (item.projectType === 'mod' || !item.projectType) &&
    (isClientOnlyMod(item.slug) || isClientOnlyMod(item.title) || (selectedVersion ? isClientOnlyMod(selectedVersion.fileName) : false));

  // Determine smart target subfolder
  const targetSubfolder = isPluginServer || item.projectType === 'plugin'
    ? 'plugins'
    : item.projectType === 'datapack'
    ? 'datapacks'
    : item.projectType === 'modpack'
    ? ''
    : 'mods';

  const handleInstall = async () => {
    if (!selectedVersion) return;

    setIsInstalling(true);
    setErrorMsg(null);

    try {
      if (installMode === 'new_server') {
        // Step 1: Create fresh server instance
        setDeployStep('Creando instancia del servidor...');
        const newServer = await api.post<ServerInstanceData>('/servers', {
          name: newServerName.trim() || item.title,
          loader: newServerLoader,
          gameVersion: newServerGameVersion,
          memoryMb: newServerMemoryMb,
          port: newServerPort
        });

        // Step 2: Download & extract modpack
        setDeployStep('Descargando y extrayendo modpack (omitiendo mods de cliente)...');
        await api.post('/catalog/install', {
          instanceId: newServer.id,
          providerId: item.providerId,
          projectId: item.id,
          projectType: 'modpack',
          versionId: selectedVersion.id,
          versionNumber: selectedVersion.versionNumber,
          fileName: selectedVersion.fileName,
          downloadUrl: selectedVersion.downloadUrl
        });

        setSuccessMsg(`¡Servidor "${newServer.name}" creado y modpack desplegado exitosamente!`);
      } else {
        // Install in existing server
        if (!selectedServerId) {
          setErrorMsg('Selecciona un servidor de destino');
          setIsInstalling(false);
          return;
        }

        await api.post('/catalog/install', {
          instanceId: selectedServerId,
          providerId: item.providerId,
          projectId: item.id,
          projectType: isPluginServer ? 'plugin' : item.projectType,
          versionId: selectedVersion.id,
          versionNumber: selectedVersion.versionNumber,
          fileName: selectedVersion.fileName,
          downloadUrl: selectedVersion.downloadUrl
        });

        setSuccessMsg(`¡${item.title} instalado exitosamente en ${targetSubfolder || 'directorio raíz'}!`);
      }

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al procesar la instalación');
    } finally {
      setIsInstalling(false);
      setDeployStep(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-nebula-900 border border-nebula-700 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>{isModpack ? 'Desplegar Modpack' : 'Instalar Contenido'}</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              {item.title} &bull; {item.providerId.toUpperCase()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-nebula-850"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Install Mode Switcher Tabs */}
        <div className="flex p-1 rounded-xl bg-nebula-950 border border-nebula-800 mb-4 text-xs font-mono">
          <button
            type="button"
            onClick={() => setInstallMode('new_server')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              installMode === 'new_server'
                ? 'bg-nebula-purple text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-nebula-accent" />
            <span>Crear Servidor Completo</span>
          </button>
          <button
            type="button"
            onClick={() => setInstallMode('existing_server')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              installMode === 'existing_server'
                ? 'bg-nebula-800 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            <span>Instalar en Existente</span>
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

        {/* Client-Only Mod Warning */}
        {isClientMod && (
          <div className="mb-4 p-3 rounded-lg bg-amber-950/60 border border-amber-500/50 text-amber-200 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-amber-300">Mod exclusivo de cliente:</span>{' '}
              Este mod es solo para el cliente de Minecraft. En un servidor dedicado provocará un fallo (crash) crítico.
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Version Selector (Common) */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Versión del {isModpack ? 'Modpack' : 'Contenido'} ({versions.length})
            </label>
            {isLoadingVersions ? (
              <div className="flex items-center gap-2 p-2 text-xs text-slate-400 font-mono">
                <Orbit className="w-4 h-4 animate-spin text-nebula-accent" />
                <span>Consultando versiones en {item.providerId.toUpperCase()}...</span>
              </div>
            ) : versions.length === 0 ? (
              <div className="p-2.5 rounded-lg bg-nebula-950 border border-nebula-800 text-xs text-slate-500 font-mono">
                Sin archivos compatibles disponibles.
              </div>
            ) : (
              <select
                value={selectedVersionId}
                onChange={(e) => setSelectedVersionId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-nebula-950 border border-nebula-850 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-nebula-accent"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.versionNumber} &mdash; {v.fileName}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* MODE: NEW SERVER DEPLOYMENT */}
          {installMode === 'new_server' && (
            <div className="p-4 rounded-xl bg-nebula-950 border border-nebula-800 space-y-3.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-nebula-accent">
                <Layers className="w-4 h-4" />
                <span>Parámetros del Nuevo Servidor</span>
              </div>

              {/* Server Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Nombre del Servidor
                </label>
                <input
                  type="text"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="Ej. Mi Servidor Cobblemon"
                  className="w-full px-3 py-1.5 text-xs bg-nebula-900 border border-nebula-850 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-nebula-accent"
                />
              </div>

              {/* Loader & Game Version Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Motor (Loader)
                  </label>
                  <select
                    value={newServerLoader}
                    onChange={(e) => setNewServerLoader(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs bg-nebula-900 border border-nebula-850 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-nebula-accent"
                  >
                    <option value="fabric">Fabric</option>
                    <option value="forge">Forge</option>
                    <option value="neoforge">NeoForge</option>
                    <option value="paper">Paper (Plugins)</option>
                    <option value="purpur">Purpur</option>
                    <option value="spigot">Spigot</option>
                    <option value="vanilla">Vanilla</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Versión de Minecraft
                  </label>
                  <input
                    type="text"
                    value={newServerGameVersion}
                    onChange={(e) => setNewServerGameVersion(e.target.value)}
                    placeholder="1.20.1"
                    className="w-full px-3 py-1.5 text-xs bg-nebula-900 border border-nebula-850 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-nebula-accent"
                  />
                </div>
              </div>

              {/* RAM Memory Presets */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-nebula-accent" />
                  <span>Memoria RAM Asignada ({newServerMemoryMb} MB)</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '4 GB', val: 4096 },
                    { label: '6 GB', val: 6144 },
                    { label: '8 GB', val: 8192 },
                    { label: '12 GB', val: 12288 }
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setNewServerMemoryMb(preset.val)}
                      className={`py-1.5 px-2 text-xs font-mono rounded-lg border transition-all ${
                        newServerMemoryMb === preset.val
                          ? 'bg-nebula-purple text-white font-bold border-purple-400 shadow-sm'
                          : 'bg-nebula-900 text-slate-400 border-nebula-850 hover:border-nebula-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Network Port */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Puerto del Servidor (TCP & UDP)
                </label>
                <input
                  type="number"
                  value={newServerPort}
                  onChange={(e) => setNewServerPort(parseInt(e.target.value, 10) || 25565)}
                  className="w-full px-3 py-1.5 text-xs bg-nebula-900 border border-nebula-850 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-nebula-accent"
                />
              </div>
            </div>
          )}

          {/* MODE: EXISTING SERVER */}
          {installMode === 'existing_server' && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-nebula-accent" />
                  <span>Servidor de Destino</span>
                </label>
                {servers.length === 0 ? (
                  <div className="p-3 rounded-lg bg-nebula-950 border border-nebula-800 text-xs text-slate-400">
                    No hay servidores creados para instalar. Usa la pestaña "Crear Servidor Completo".
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

              {/* Folder Target Hint */}
              <div className="p-2.5 rounded-lg bg-nebula-950/80 border border-nebula-800 text-[11px] font-mono text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5">
                  <FolderCheck className="w-3.5 h-3.5 text-nebula-cyber shrink-0" />
                  <span>
                    Destino:{' '}
                    <span className="text-nebula-cyber">
                      /data/servers/{selectedServerId || '...'}
                      {targetSubfolder ? `/${targetSubfolder}/` : '/'}
                    </span>
                  </span>
                </div>
                {isPluginServer && (
                  <p className="text-[10px] text-amber-400/90 font-sans leading-tight">
                    ℹ️ Servidor {targetServer?.loader.toUpperCase()}: se instalará automáticamente en <code>plugins/</code>.
                  </p>
                )}
              </div>
            </div>
          )}
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
            disabled={
              isInstalling ||
              versions.length === 0 ||
              isClientMod ||
              (installMode === 'existing_server' && (!selectedServerId || servers.length === 0))
            }
            onClick={handleInstall}
            className={`px-4 py-2 font-bold text-xs rounded-lg shadow-lg transition-all flex items-center gap-2 disabled:opacity-40 text-white ${
              installMode === 'new_server'
                ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-950/40'
                : 'bg-nebula-purple hover:bg-purple-600 shadow-purple-950/30'
            }`}
          >
            {isInstalling ? (
              <>
                <Orbit className="w-4 h-4 animate-spin" />
                <span>{deployStep || 'Procesando...'}</span>
              </>
            ) : isClientMod ? (
              <span>Mod de Cliente Incompatible</span>
            ) : installMode === 'new_server' ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Crear Servidor y Desplegar</span>
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
