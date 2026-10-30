import React, { useState, useEffect, useCallback } from 'react';
import { Search, Package, Orbit, RotateCw } from 'lucide-react';
import { api } from '../services/api-client.js';
import { ContentCard, type CatalogItemData } from '../components/ContentCard.js';
import { ContentInstallModal } from '../components/ContentInstallModal.js';

interface SearchResponse {
  items: CatalogItemData[];
  totalHits: number;
}

export const CatalogExplorer: React.FC = () => {
  const [query, setQuery] = useState('');
  const [projectType, setProjectType] = useState<'all' | 'mod' | 'plugin' | 'modpack' | 'datapack'>('all');
  const [provider, setProvider] = useState<'modrinth' | 'papermc'>('modrinth');

  const [items, setItems] = useState<CatalogItemData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected item for 1-Click install modal
  const [itemToInstall, setItemToInstall] = useState<CatalogItemData | null>(null);

  const performSearch = useCallback(async (searchQuery: string, type: string, prov: string) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('query', searchQuery.trim());
      if (type !== 'all') params.set('projectType', type);
      params.set('provider', prov);

      const res = await api.get<SearchResponse>(`/catalog/search?${params.toString()}`);
      setItems(res.items || []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al buscar en el catálogo');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query, projectType, provider);
    }, 400);

    return () => clearTimeout(timer);
  }, [query, projectType, provider, performSearch]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Package className="w-6 h-6 text-nebula-purple" />
            <span>Catálogo Unificado Prism</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Explora e instala mods de Modrinth, plugins Paper/Spigot y modpacks en 1-clic
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Provider Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-nebula-900 border border-nebula-800 text-xs font-mono">
            <button
              onClick={() => setProvider('modrinth')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                provider === 'modrinth'
                  ? 'bg-nebula-purple text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Modrinth v2
            </button>
            <button
              onClick={() => setProvider('papermc')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                provider === 'papermc'
                  ? 'bg-nebula-cyber text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              PaperMC
            </button>
          </div>

          <button
            onClick={() => performSearch(query, projectType, provider)}
            className="p-2 rounded-lg bg-nebula-900 border border-nebula-800 text-slate-400 hover:text-slate-200"
            title="Refrescar catálogo"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Input Bar & Type Filter Tabs */}
      <div className="space-y-3">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-nebula-purple absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre (ej. Sodium, ViaVersion, EssentialsX, Paper, FerriteCore)..."
            className="w-full pl-10 pr-4 py-2.5 bg-nebula-900 border border-nebula-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-nebula-purple transition-colors shadow-inner"
          />
        </div>

        {/* Project Type Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
          {[
            { id: 'all' as const, label: 'Todos' },
            { id: 'mod' as const, label: 'Mods' },
            { id: 'plugin' as const, label: 'Plugins' },
            { id: 'modpack' as const, label: 'Modpacks' },
            { id: 'datapack' as const, label: 'Datapacks' }
          ].map((type) => {
            const isSelected = projectType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setProjectType(type.id)}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-nebula-800 text-nebula-purple font-bold border-nebula-purple/50 shadow-sm'
                    : 'bg-nebula-950/80 text-slate-400 border-nebula-850 hover:text-slate-200 hover:border-nebula-700'
                }`}
              >
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Results Grid */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs font-mono">
          <Orbit className="w-7 h-7 text-nebula-purple animate-spin" />
          <span>Buscando en {provider === 'modrinth' ? 'Modrinth' : 'PaperMC'}...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-nebula-800 rounded-2xl bg-nebula-900/40 p-8">
          <Package className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-300">
            No se encontraron elementos
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Prueba a buscar con otro término o selecciona un tipo diferente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <ContentCard
              key={`${item.providerId}-${item.id}`}
              item={item}
              onInstall={(it) => setItemToInstall(it)}
            />
          ))}
        </div>
      )}

      {/* 1-Click Install Modal */}
      <ContentInstallModal
        item={itemToInstall}
        onClose={() => setItemToInstall(null)}
        onSuccess={() => {
          // Success callback
        }}
      />
    </div>
  );
};
