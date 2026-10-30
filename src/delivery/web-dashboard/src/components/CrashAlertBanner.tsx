import React from 'react';
import { AlertOctagon, Wrench, X } from 'lucide-react';

export interface CrashDiagnosticData {
  code: string;
  reason: string;
  suggestedFix: string;
  detectedAt?: string;
}

interface CrashAlertBannerProps {
  diagnostic: CrashDiagnosticData;
  onDismiss: () => void;
  onAction?: (actionCode: string) => void;
}

export const CrashAlertBanner: React.FC<CrashAlertBannerProps> = ({
  diagnostic,
  onDismiss,
  onAction
}) => {
  return (
    <div className="mb-4 p-4 rounded-xl bg-red-950/60 border border-red-500/50 shadow-lg text-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-red-500/20 text-red-400 shrink-0 mt-0.5">
          <AlertOctagon className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold font-mono tracking-wide text-red-400 uppercase">
              {diagnostic.code}
            </h4>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-900/60 text-red-200 font-mono">
              Diagnóstico Inteligente
            </span>
          </div>
          <p className="text-xs text-slate-200 mt-1 font-medium leading-relaxed">
            {diagnostic.reason}
          </p>
          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] mt-1 font-mono">
            <Wrench className="w-3 h-3 shrink-0" />
            <span>Solución: {diagnostic.suggestedFix}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
        {onAction && (
          <button
            onClick={() => onAction(diagnostic.code)}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Resolver
          </button>
        )}
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-red-900/30 transition-colors"
          title="Cerrar aviso"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
