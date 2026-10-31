import React from 'react';
import { Download, Package, Box, Layers, Database, ShieldAlert } from 'lucide-react';

export interface CatalogItemData {
  id: string;
  slug: string;
  title: string;
  description: string;
  projectType: 'mod' | 'plugin' | 'modpack' | 'datapack';
  categories: string[];
  downloads: number;
  iconUrl?: string;
  author: string;
  providerId: string;
}

interface ContentCardProps {
  item: CatalogItemData;
  onInstall: (item: CatalogItemData) => void;
  isInstalled?: boolean;
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
  /^zoomify/i,
  /^ok-zoomer/i,
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

export const ContentCard: React.FC<ContentCardProps> = ({
  item,
  onInstall,
  isInstalled = false
}) => {
  const formatDownloads = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
    return String(num);
  };

  const isClientMod = isClientOnly(item.slug) || isClientOnly(item.title);
  const isPlugin =
    item.projectType === 'plugin' ||
    (item.projectType === 'mod' &&
      item.categories?.some((c) => ['spigot', 'paper', 'purpur', 'bukkit'].includes(c.toLowerCase())));

  const effectiveType = isPlugin ? 'plugin' : item.projectType;

  const typeConfig = {
    mod: { label: 'MOD', icon: Box, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
    plugin: { label: 'PLUGIN', icon: Package, color: 'text-nebula-cyber bg-nebula-cyber/10 border-nebula-cyber/30' },
    modpack: { label: 'MODPACK / PACK', icon: Layers, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
    datapack: { label: 'DATAPACK', icon: Database, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' }
  }[effectiveType] ?? {
    label: effectiveType.toUpperCase(),
    icon: Box,
    color: 'text-slate-400 bg-slate-800 border-slate-700'
  };

  const TypeIcon = typeConfig.icon;

  return (
    <div className="bg-nebula-900 border border-nebula-800 hover:border-nebula-700 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group">
      <div>
        {/* Header: Icon + Title + Type Badge */}
        <div className="flex items-start gap-3 mb-2.5">
          {item.iconUrl ? (
            <img
              src={item.iconUrl}
              alt={item.title}
              className="w-10 h-10 rounded-lg object-cover bg-nebula-950 border border-nebula-800 shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-nebula-950 border border-nebula-800 flex items-center justify-center text-nebula-purple shrink-0">
              <TypeIcon className="w-5 h-5" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-100 group-hover:text-nebula-accent transition-colors truncate">
                {item.title}
              </h4>
              <div className="flex items-center gap-1 shrink-0">
                {isClientMod && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-300 bg-amber-500/10 flex items-center gap-0.5">
                    <ShieldAlert className="w-2.5 h-2.5 text-amber-400" />
                    <span>CLIENTE</span>
                  </span>
                )}
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${typeConfig.color}`}>
                  {typeConfig.label}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
              por <span className="text-slate-300 font-semibold">{item.author}</span>
            </span>
          </div>
        </div>

        {/* Summary Description */}
        <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 mb-3">
          {item.description}
        </p>

        {/* Categories / Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {item.categories.slice(0, 3).map((cat) => (
            <span
              key={cat}
              className="text-[9px] px-1.5 py-0.5 rounded bg-nebula-950 text-slate-400 border border-nebula-850 font-mono"
            >
              #{cat}
            </span>
          ))}
        </div>
      </div>

      {/* Footer: Downloads Counter + 1-Click Install Button */}
      <div className="pt-3 border-t border-nebula-850 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
          <Download className="w-3 h-3 text-slate-500" />
          <span>{formatDownloads(item.downloads)} descargas</span>
        </div>

        <button
          onClick={() => onInstall(item)}
          disabled={isInstalled}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm ${
            isInstalled
              ? 'bg-nebula-850 text-slate-500 border border-nebula-700 cursor-default'
              : isClientMod
              ? 'bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 border border-amber-500/30'
              : 'bg-nebula-purple/20 hover:bg-nebula-purple/30 text-purple-300 border border-purple-500/40 hover:text-white shadow-purple-950/20'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isInstalled ? 'Instalado' : isClientMod ? 'Solo Cliente' : '1-Clic Install'}</span>
        </button>
      </div>
    </div>
  );
};
