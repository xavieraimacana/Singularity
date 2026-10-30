import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Trash2, ArrowDownCircle, CornerDownLeft, RotateCw, AlertTriangle } from 'lucide-react';
import { getAuthToken } from '../services/api-client.js';
import type { CrashDiagnosticData } from './CrashAlertBanner.js';

interface ConsoleTerminalProps {
  serverId: string;
  isOnline: boolean;
  onCrashDetected?: (diagnostic: CrashDiagnosticData) => void;
  onStatusChange?: (status: string) => void;
  onPlayerEvent?: (event: unknown) => void;
}

export const ConsoleTerminal: React.FC<ConsoleTerminalProps> = ({
  serverId,
  isOnline,
  onCrashDetected,
  onStatusChange,
  onPlayerEvent
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);

  const [commandInput, setCommandInput] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [proxyWarning, setProxyWarning] = useState(false);

  // Quick Command Presets
  const quickCommands = [
    { label: '/help', cmd: 'help' },
    { label: '/list', cmd: 'list' },
    { label: '/tps', cmd: 'tps' },
    { label: '/save-all', cmd: 'save-all' },
    { label: '/stop', cmd: 'stop' }
  ];

  const connectWebSocket = useCallback((useAlternatePath = false) => {
    if (!isMountedRef.current) return;
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch {
        // ignore
      }
      socketRef.current = null;
    }

    const term = termInstance.current;
    const token = getAuthToken() || '';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const basePath = useAlternatePath ? '/api/ws/servers' : '/ws/servers';
    const wsUrl = `${protocol}//${window.location.host}${basePath}/${serverId}/console?token=${encodeURIComponent(token)}`;

    setIsReconnecting(true);
    if (term) {
      term.writeln(`\x1b[36m[Singularity]\x1b[0m Conectando a canal WebSocket (${basePath})...`);
    }

    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        if (!isMountedRef.current) return;
        setIsConnected(true);
        setIsReconnecting(false);
        setProxyWarning(false);
        retryCountRef.current = 0;
        if (term) {
          term.writeln('\x1b[32m[Singularity]\x1b[0m Conexión WebSocket establecida con éxito.');
        }
      };

      socket.onmessage = (event) => {
        if (!isMountedRef.current || !term) return;
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'history' && Array.isArray(msg.lines)) {
            term.clear();
            for (const line of msg.lines) {
              term.writeln(line);
            }
            if (autoScroll) term.scrollToBottom();
          } else if (msg.type === 'log' && typeof msg.line === 'string') {
            term.writeln(msg.line);
            if (autoScroll) term.scrollToBottom();
          } else if (msg.type === 'status' && typeof msg.status === 'string') {
            onStatusChange?.(msg.status);
          } else if (msg.type === 'crash' && msg.diagnostic) {
            onCrashDetected?.(msg.diagnostic as CrashDiagnosticData);
          } else if (msg.type === 'player-event' && msg.data) {
            onPlayerEvent?.(msg.data);
          }
        } catch {
          term.writeln(event.data);
        }
      };

      socket.onclose = (ev) => {
        if (!isMountedRef.current) return;
        setIsConnected(false);
        setIsReconnecting(false);

        if (term) {
          term.writeln(`\x1b[33m[Singularity]\x1b[0m Conexión cerrada (código: ${ev.code || 1006}).`);
        }

        // If closed abnormally without ever succeeding, try alternate path or retry
        if (ev.code === 1006 || ev.code === 1008) {
          if (!useAlternatePath && retryCountRef.current === 0) {
            retryCountRef.current++;
            if (term) {
              term.writeln('\x1b[33m[Singularity]\x1b[0m Reintentando mediante ruta alternativa /api/ws/...');
            }
            setTimeout(() => {
              if (isMountedRef.current) connectWebSocket(true);
            }, 1000);
          } else {
            setProxyWarning(true);
            if (term) {
              term.writeln('\x1b[31m[Singularity Alerta]\x1b[0m No se pudo completar el handshake WebSocket.');
              term.writeln('\x1b[33m[Singularity]\x1b[0m Si utilizas Nginx, Coolify o Cloudflare, verifica que el proxy inverso tenga habilitado WebSocket:');
              term.writeln('\x1b[90m  proxy_http_version 1.1;\x1b[0m');
              term.writeln('\x1b[90m  proxy_set_header Upgrade $http_upgrade;\x1b[0m');
              term.writeln('\x1b[90m  proxy_set_header Connection "upgrade";\x1b[0m');
            }
          }
        }
      };

      socket.onerror = () => {
        if (!isMountedRef.current) return;
        setIsConnected(false);
      };
    } catch (err: unknown) {
      if (term) {
        term.writeln(`\x1b[31m[Singularity Error]\x1b[0m ${err instanceof Error ? err.message : 'Error al instanciar socket'}`);
      }
    }
  }, [serverId, autoScroll, onCrashDetected, onStatusChange, onPlayerEvent]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!terminalRef.current) return;

    // Initialize xterm
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace',
      fontSize: 12,
      lineHeight: 1.25,
      theme: {
        background: '#090b10',
        foreground: '#e2e8f0',
        cursor: '#10b981',
        selectionBackground: '#1e293b',
        black: '#151b26',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#8b5cf6',
        cyan: '#06b6d4',
        white: '#f8fafc',
        brightBlack: '#475569',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#a78bfa',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff'
      },
      convertEol: true
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    termInstance.current = term;
    fitAddonRef.current = fitAddon;

    const handleResize = () => {
      try {
        fitAddon.fit();
      } catch {
        // ignore
      }
    };
    window.addEventListener('resize', handleResize);

    // Initial WebSocket connect
    retryCountRef.current = 0;
    connectWebSocket(false);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('resize', handleResize);
      if (socketRef.current) {
        socketRef.current.close();
      }
      term.dispose();
    };
  }, [connectWebSocket]);

  const sendCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'command', command: trimmed }));
    } else {
      termInstance.current?.writeln(`\x1b[31m[Error]\x1b[0m No se puede enviar comando: Consola desconectada.`);
    }

    setCommandInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendCommand(commandInput);
  };

  return (
    <div className="flex flex-col h-full bg-nebula-950 border border-nebula-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Console Action Bar */}
      <div className="h-10 px-4 border-b border-nebula-800/80 bg-nebula-900/90 flex items-center justify-between text-xs font-mono shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : isReconnecting ? 'bg-amber-400 animate-spin' : 'bg-red-500'}`} />
          <span className="text-slate-300 font-semibold">Consola Interactiva</span>
          <span className="text-[10px] text-slate-500">
            {isConnected ? '(En vivo)' : isOnline ? '(Servidor online - Socket desconectado)' : '(Servidor offline)'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isConnected && (
            <button
              onClick={() => {
                retryCountRef.current = 0;
                connectWebSocket(false);
              }}
              disabled={isReconnecting}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-nebula-800 hover:bg-nebula-750 text-nebula-cyber border border-nebula-700 transition-colors disabled:opacity-50"
              title="Reconectar WebSocket"
            >
              <RotateCw className={`w-3 h-3 ${isReconnecting ? 'animate-spin' : ''}`} />
              <span>Reconectar</span>
            </button>
          )}

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition-colors ${
              autoScroll
                ? 'bg-nebula-accent/20 border-nebula-accent/40 text-nebula-accent font-semibold'
                : 'bg-nebula-950 border-nebula-800 text-slate-400'
            }`}
            title="Auto-scroll"
          >
            <ArrowDownCircle className="w-3 h-3" />
            <span>Auto-scroll</span>
          </button>

          <button
            onClick={() => termInstance.current?.clear()}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-nebula-800 transition-colors"
            title="Limpiar pantalla"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {proxyWarning && (
        <div className="px-4 py-2 bg-amber-950/60 border-b border-amber-500/30 text-amber-200 text-[11px] font-mono flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Proxy Inverso detectado: Si el canal en vivo no conecta, añade <code>Upgrade $http_upgrade</code> en la configuración de Nginx / Cloudflare.
            </span>
          </div>
          <button
            onClick={() => {
              retryCountRef.current = 0;
              connectWebSocket(false);
            }}
            className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded text-amber-300 font-bold shrink-0"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Interactive xterm Container */}
      <div className="flex-1 p-3 min-h-0 bg-[#090b10] overflow-hidden">
        <div ref={terminalRef} className="w-full h-full" />
      </div>

      {/* Quick Command Suggestions Chips */}
      <div className="px-3 py-1.5 border-t border-nebula-850 bg-nebula-950 flex items-center gap-1.5 overflow-x-auto shrink-0 text-xs font-mono">
        <span className="text-[10px] text-slate-500 mr-1 select-none">Rápido:</span>
        {quickCommands.map((item) => (
          <button
            key={item.cmd}
            type="button"
            onClick={() => sendCommand(item.cmd)}
            className="px-2 py-0.5 rounded bg-nebula-900 border border-nebula-800 hover:border-nebula-700 hover:text-nebula-accent text-slate-400 text-[11px] transition-colors"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Console Input Bar */}
      <form onSubmit={handleSubmit} className="p-2 border-t border-nebula-800 bg-nebula-900/95 flex items-center gap-2 shrink-0">
        <div className="relative flex-1 flex items-center">
          <span className="absolute left-3 text-nebula-accent font-mono text-xs select-none">❯</span>
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="Escribe un comando de Minecraft (ej. op Steve, time set day, whitelist add Alex)..."
            className="w-full pl-7 pr-3 py-1.5 bg-nebula-950 border border-nebula-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-nebula-accent transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={!commandInput.trim()}
          className="px-3.5 py-1.5 bg-nebula-accent hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-40"
        >
          <span>Enviar</span>
          <CornerDownLeft className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
