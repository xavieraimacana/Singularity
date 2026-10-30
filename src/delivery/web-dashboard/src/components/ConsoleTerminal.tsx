import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Send, Trash2, ArrowDownCircle, CornerDownLeft } from 'lucide-react';
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

  const [commandInput, setCommandInput] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // Quick Command Presets
  const quickCommands = [
    { label: '/help', cmd: 'help' },
    { label: '/list', cmd: 'list' },
    { label: '/tps', cmd: 'tps' },
    { label: '/save-all', cmd: 'save-all' },
    { label: '/stop', cmd: 'stop' }
  ];

  useEffect(() => {
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

    term.writeln('\x1b[36m[Singularity]\x1b[0m Conectando a la consola interactiva...');

    // Resize observer
    const handleResize = () => {
      try {
        fitAddon.fit();
      } catch {
        // ignore
      }
    };
    window.addEventListener('resize', handleResize);

    // Connect WebSocket
    const token = getAuthToken() || '';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/servers/${serverId}/console?token=${encodeURIComponent(token)}`;

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      term.writeln('\x1b[32m[Singularity]\x1b[0m Conexión WebSocket establecida con éxito.');
    };

    socket.onmessage = (event) => {
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
        // Raw text fallback
        term.writeln(event.data);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      term.writeln('\x1b[33m[Singularity]\x1b[0m Conexión cerrada.');
    };

    socket.onerror = () => {
      term.writeln('\x1b[31m[Singularity]\x1b[0m Error en el canal WebSocket.');
    };

    return () => {
      window.removeEventListener('resize', handleResize);
      socket.close();
      term.dispose();
    };
  }, [serverId, autoScroll, onCrashDetected, onStatusChange, onPlayerEvent]);

  const sendCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'command', command: trimmed }));
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
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-slate-300 font-semibold">Consola Interactiva</span>
          <span className="text-[10px] text-slate-500">
            {isOnline ? '(En ejecución)' : '(Servidor offline)'}
          </span>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Terminal View Container */}
      <div className="flex-1 p-3 min-h-[360px] bg-nebula-950 overflow-hidden">
        <div ref={terminalRef} className="h-full w-full" />
      </div>

      {/* Quick Commands & Input Bar */}
      <div className="p-3 border-t border-nebula-800 bg-nebula-900/95 space-y-2 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono">
          <span className="text-slate-500 text-[10px] mr-1">Rápidos:</span>
          {quickCommands.map((preset) => (
            <button
              key={preset.cmd}
              disabled={!isOnline}
              onClick={() => sendCommand(preset.cmd)}
              className="px-2 py-0.5 rounded bg-nebula-950 hover:bg-nebula-850 text-slate-300 hover:text-nebula-accent border border-nebula-800 transition-colors disabled:opacity-40"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="flex-1 relative flex items-center">
            <span className="absolute left-3 text-nebula-accent font-mono text-xs select-none">&gt;</span>
            <input
              type="text"
              disabled={!isOnline}
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder={isOnline ? 'Escribe un comando (/say hola, op <user>, time set day)...' : 'Inicia el servidor para enviar comandos'}
              className="w-full pl-7 pr-3 py-2 text-xs bg-nebula-950 border border-nebula-800 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-nebula-accent font-mono disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={!isOnline || !commandInput.trim()}
            className="px-3.5 py-2 bg-nebula-accent hover:bg-emerald-600 text-slate-950 font-semibold text-xs rounded-lg shadow-sm shadow-nebula-accent/20 transition-all flex items-center gap-1.5 disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Enviar</span>
            <CornerDownLeft className="w-3 h-3 opacity-60" />
          </button>
        </form>
      </div>
    </div>
  );
};
