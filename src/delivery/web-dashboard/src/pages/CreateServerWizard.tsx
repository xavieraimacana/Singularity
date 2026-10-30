import React, { useState, useEffect } from 'react';
import { X, Check, ChevronRight, ChevronLeft, Sparkles, Orbit } from 'lucide-react';
import { api } from '../services/api-client.js';
import type { ServerInstanceData } from '../components/ServerCard.js';

interface CreateServerWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (server: ServerInstanceData) => void;
}

interface JavaRuntimeInfo {
  id: string;
  majorVersion: number;
  versionString: string;
  path: string;
  vendor: string;
  isPortable: boolean;
}

export const CreateServerWizard: React.FC<CreateServerWizardProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('Nuevo Servidor');
  const [loader, setLoader] = useState<'paper' | 'purpur' | 'fabric' | 'vanilla'>('paper');
  const [gameVersion, setGameVersion] = useState('1.21.4');
  const [memoryMb, setMemoryMb] = useState(4096);
  const [port, setPort] = useState(25565);
  const [javaPath, setJavaPath] = useState<string>('');
  const [motd, setMotd] = useState('§aUn servidor administrado con §bSingularity');

  // Installed Java runtimes on host
  const [installedJavas, setInstalledJavas] = useState<JavaRuntimeInfo[]>([]);

  useEffect(() => {
    if (isOpen) {
      api.get<JavaRuntimeInfo[]>('/java/detect')
        .then((runtimes) => {
          setInstalledJavas(runtimes);
          if (runtimes.length > 0 && runtimes[0]) {
            setJavaPath(runtimes[0].path);
          }
        })
        .catch(() => {
          // ignore detection error
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Recommended Java major version based on gameVersion
  const getRecommendedJavaVersion = (mcVer: string): number => {
    const parts = mcVer.split('.').map((p) => parseInt(p, 10));
    const minor = parts[1] ?? 0;
    const patch = parts[2] ?? 0;

    if (minor > 20 || (minor === 20 && patch >= 5)) return 21;
    if (minor >= 18) return 17;
    if (minor === 17) return 16;
    return 8;
  };

  const recommendedJava = getRecommendedJavaVersion(gameVersion);

  const handleDeploy = async () => {
    setErrorMsg(null);
    setIsCreating(true);

    try {
      const created = await api.post<ServerInstanceData>('/servers', {
        name,
        loader,
        gameVersion,
        memoryMb,
        port,
        javaPath: javaPath || undefined,
        motd
      });

      onSuccess(created);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al crear servidor');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-nebula-900 border border-nebula-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
        {/* Wizard Header & Stepper */}
        <div className="px-6 py-4 border-b border-nebula-800 bg-nebula-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-nebula-accent/20 border border-nebula-accent/30 flex items-center justify-center text-nebula-accent">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Crear Instancia de Servidor</h2>
              <p className="text-[11px] text-slate-400">Paso {step} de 3</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-nebula-850 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Line */}
        <div className="grid grid-cols-3 h-1 bg-nebula-950">
          <div className={`h-full ${step >= 1 ? 'bg-nebula-accent' : 'bg-transparent'}`} />
          <div className={`h-full ${step >= 2 ? 'bg-nebula-accent' : 'bg-transparent'}`} />
          <div className={`h-full ${step >= 3 ? 'bg-nebula-accent' : 'bg-transparent'}`} />
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Step Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {/* STEP 1: Name and Loader */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Nombre de la Instancia
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Survival SMP"
                  className="w-full px-3 py-2 text-xs bg-nebula-950 border border-nebula-850 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-nebula-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-2">
                  Tipo de Software / Loader
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      id: 'paper' as const,
                      title: 'PaperMC',
                      desc: 'Recomendado. Rendimiento extremo, optimizaciones y plugins Bukkit/Spigot.'
                    },
                    {
                      id: 'purpur' as const,
                      title: 'Purpur',
                      desc: 'Fork de Paper con mayor personalización de mecánicas del juego.'
                    },
                    {
                      id: 'fabric' as const,
                      title: 'Fabric',
                      desc: 'Ligero y modular para mods del ecosistema Fabric y datapacks.'
                    },
                    {
                      id: 'vanilla' as const,
                      title: 'Vanilla Oficial',
                      desc: 'Servidor oficial de Mojang sin modificaciones ni plugins.'
                    }
                  ].map((item) => {
                    const isSelected = loader === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setLoader(item.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-nebula-accent/10 border-nebula-accent text-slate-100 shadow-md shadow-nebula-accent/5'
                            : 'bg-nebula-950/60 border-nebula-850 text-slate-400 hover:border-nebula-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold ${isSelected ? 'text-nebula-accent' : 'text-slate-200'}`}>
                            {item.title}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-nebula-accent" />}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Version and Java */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Versión de Minecraft
                </label>
                <select
                  value={gameVersion}
                  onChange={(e) => setGameVersion(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-nebula-950 border border-nebula-850 rounded-lg text-slate-100 focus:outline-none focus:border-nebula-accent"
                >
                  <option value="1.21.4">1.21.4 (Última versión oficial)</option>
                  <option value="1.21.1">1.21.1</option>
                  <option value="1.20.4">1.20.4</option>
                  <option value="1.20.1">1.20.1</option>
                  <option value="1.19.4">1.19.4</option>
                  <option value="1.16.5">1.16.5 (Nether Update)</option>
                  <option value="1.12.2">1.12.2 (Legacy Modding)</option>
                  <option value="1.8.8">1.8.8 (PvP Clásico)</option>
                </select>
              </div>

              {/* Automatic Java Requirement Badge */}
              <div className="p-3 rounded-xl bg-nebula-950/80 border border-nebula-800 text-xs">
                <div className="flex items-center justify-between text-slate-300 mb-1.5">
                  <span className="font-semibold">Runtime Java Requerido:</span>
                  <span className="font-mono text-nebula-cyber font-bold">
                    Java {recommendedJava}+
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Minecraft {gameVersion} requiere Java {recommendedJava} para inicializar correctamente sin errores de bytecode.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Runtime Java a Usar
                </label>
                {installedJavas.length === 0 ? (
                  <div className="p-2.5 rounded-lg bg-nebula-950 border border-nebula-850 text-xs text-slate-400">
                    Se usará el comando <code className="text-nebula-accent">java</code> del sistema (PATH).
                  </div>
                ) : (
                  <select
                    value={javaPath}
                    onChange={(e) => setJavaPath(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-nebula-950 border border-nebula-850 rounded-lg text-slate-100 focus:outline-none focus:border-nebula-accent font-mono"
                  >
                    {installedJavas.map((j) => (
                      <option key={j.id} value={j.path}>
                        Java {j.majorVersion} ({j.vendor}) - {j.path}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Memory & Port */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-2">
                  Memoria RAM Asignada (Xmx)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[
                    { label: '2 GB', mb: 2048 },
                    { label: '4 GB', mb: 4096 },
                    { label: '8 GB', mb: 8192 },
                    { label: '16 GB', mb: 16384 }
                  ].map((preset) => {
                    const isSelected = memoryMb === preset.mb;
                    return (
                      <button
                        key={preset.mb}
                        type="button"
                        onClick={() => setMemoryMb(preset.mb)}
                        className={`py-2 rounded-lg text-xs font-mono font-bold transition-all border ${
                          isSelected
                            ? 'bg-nebula-accent/20 border-nebula-accent text-nebula-accent shadow-sm'
                            : 'bg-nebula-950 border-nebula-850 text-slate-400 hover:text-slate-200 hover:border-nebula-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1024}
                    step={512}
                    value={memoryMb}
                    onChange={(e) => setMemoryMb(parseInt(e.target.value, 10) || 1024)}
                    className="w-28 px-3 py-1.5 text-xs bg-nebula-950 border border-nebula-850 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-nebula-accent"
                  />
                  <span className="text-xs text-slate-400">MB asignados</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Puerto del Servidor
                </label>
                <input
                  type="number"
                  required
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value, 10) || 25565)}
                  className="w-full px-3 py-1.5 text-xs bg-nebula-950 border border-nebula-850 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-nebula-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Mensaje del Día (MOTD)
                </label>
                <input
                  type="text"
                  value={motd}
                  onChange={(e) => setMotd(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-nebula-950 border border-nebula-850 rounded-lg text-slate-100 focus:outline-none focus:border-nebula-accent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="px-6 py-3.5 border-t border-nebula-800 bg-nebula-950 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Atrás</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as 2 | 3)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-nebula-accent hover:bg-emerald-600 text-slate-950 rounded-lg shadow-sm shadow-nebula-accent/20 transition-all"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isCreating}
              onClick={handleDeploy}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-nebula-accent hover:bg-emerald-600 text-slate-950 rounded-lg shadow-lg shadow-nebula-accent/20 transition-all disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <Orbit className="w-4 h-4 animate-spin" />
                  <span>Desplegando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Desplegar Instancia</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
