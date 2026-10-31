import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, Orbit, HardDrive, ShieldAlert, FolderCheck } from 'lucide-react';
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

const CLIENT_ONLY_PATTERNS = [
  /^sodium/i,
  /^rubidium/i,
  /^embeddium/i,
  /^iris/i,
  /^oculus/i,
  /^indium/i,
  /^optifine/i,
  /^optifabric/i,
  /^entityculling/i,
  /^entity-culling/i,
  /^ambientsounds/i,
  /^soundphysics/i,
  /^sound-physics/i,
  /^presencefootsteps/i,
  /^presence-footsteps/i,
  /^dynamicsurroundings/i,
  /^lambdynamiclights/i,
  /^continuity/i,
  /^betterf3/i,
  /^modmenu/i,
  /^controlify/i,
  /^controllable/i,
  /^notenoughanimations/i,
  /^not-enough-animations/i,
  /^blur/i,
  /^customsplashscreen/i,
  /^reeses/i,
  /^sodiumextra/i,
  /^sodium-extra/i,
  /^immediatelyfast/i,
  /^waveycapes/i,
  /^3dskinlayers/i,
  /^skinlayers/i,
  /^bobby/i,
  /^distanthorizons/i,
  /^distant-horizons/i,
  /^zoomify/i,
  /^ok-zoomer/i,
  /^logical-zoom/i,
  /^fallingleaves/i,
  /^visuality/i,
  /^clearskies/i,
  /^chat-heads/i,
  /^chatheads/i,
  /^shulkerboxtooltip/i,
  /^controlling/i,
  /^citresewn/i,
  /^cit-resewn/i,
  /^enhancedblockentities/i,
  /^cullleaves/i,
  /^fabricskyboxes/i,
  /^mousetweaks/i
];

function isClientOnly(raw: string): boolean {
  if (!raw) return false;
  const name = raw.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[_+.]+/g, '-');
  return CLIENT_ONLY_PATTERNS.some((p) => p.test(name));
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

  // Load servers
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
    if (targetServer) {
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
          setErrorMsg('No se encontraron versiones disponibles para este contenido y servidor.');
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
  }, [item, selectedServerId, targetServer?.gameVersion, targetServer?.loader]);

  if (!item) return null;

  const selectedVersion = versions.find((v) => v.id === selectedVersionId) || versions[0];

  // Client-only mod check
  const isClientMod =
    !isPluginServer &&
    (item.projectType === 'mod' || !item.projectType) &&
    (isClientOnly(item.slug) || isClientOnly(item.title) || (selectedVersion ? isClientOnly(selectedVersion.fileName) : false));

  // Determine smart target subfolder
  const targetSubfolder = isPluginServer || item.projectType === 'plugin'
    ? 'plugins'
    : item.projectType === 'datapack'
    ? 'datapacks'
    : item.projectType === 'modpack'
    ? ''
    : 'mods';

  const handleInstall = async () => {
    if (!selectedServerId || !selectedVersion) return;

    setIsInstalling(true);
    setErrorMsg(null);

    try {
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
              Proveedor: {item.providerId.toUpperCase()} &bull; Tipo:{' '}
              {isPluginServer ? 'PLUGIN' : item.projectType.toUpperCase()}
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

        {/* Client-Only Mod Warning */}
        {isClientMod && (
          <div className="mb-4 p-3 rounded-lg bg-amber-950/60 border border-amber-500/50 text-amber-200 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-amber-300">Mod exclusivo de cliente:</span>{' '}
              Este mod (gráficos, interfaz o shaders) solo funciona en tu launcher de cliente. Instalarlo en un servidor dedicado provocará un fallo (crash) crítico al iniciar.
            </div>
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
              Versión Disponible ({versions.length})
            </label>
            {isLoadingVersions ? (
              <div className="flex items-center gap-2 p-2 text-xs text-slate-400 font-mono">
                <Orbit className="w-4 h-4 animate-spin text-nebula-accent" />
                <span>Consultando versiones en {item.providerId.toUpperCase()}...</span>
              </div>
            ) : versions.length === 0 ? (
              <div className="p-2.5 rounded-lg bg-nebula-950 border border-nebula-800 text-xs text-slate-500 font-mono">
                Sin archivos compatibles con la versión actual del servidor.
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
              !selectedServerId ||
              servers.length === 0 ||
              versions.length === 0 ||
              isClientMod
            }
            onClick={handleInstall}
            className="px-4 py-2 bg-nebula-purple hover:bg-purple-600 text-white font-bold text-xs rounded-lg shadow-lg shadow-purple-950/30 transition-all flex items-center gap-2 disabled:opacity-40"
          >
            {isInstalling ? (
              <>
                <Orbit className="w-4 h-4 animate-spin" />
                <span>Descargando e Instalando...</span>
              </>
            ) : isClientMod ? (
              <span>Mod de Cliente Incompatible</span>
            ) : (
              <span>Confirmar e Instalar</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
