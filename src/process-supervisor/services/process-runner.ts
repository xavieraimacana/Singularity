import { spawn, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import treeKill from 'tree-kill';
import pidusage from 'pidusage';
import type { ServerInstance, ServerStatus } from '../../servers/models/server-instance.js';
import type {
  PlayerEvent,
  ProcessMetrics,
  ProcessState,
  StartProcessOptions
} from '../models/process-state.js';
import { ConsoleBuffer } from './console-buffer.js';
import { CrashAnalyzer } from '../crash-analyzer/crash-analyzer.js';

function killProcessTree(pid: number, signal: string = 'SIGTERM'): Promise<void> {
  return new Promise((resolve) => {
    treeKill(pid, signal, () => {
      resolve();
    });
  });
}

export class ProcessRunner extends EventEmitter {
  private readonly processes = new Map<string, ChildProcess>();
  private readonly states = new Map<string, ProcessState>();
  private readonly buffers = new Map<string, ConsoleBuffer>();
  private readonly crashAnalyzer: CrashAnalyzer;

  constructor(crashAnalyzer?: CrashAnalyzer) {
    super();
    this.crashAnalyzer = crashAnalyzer ?? new CrashAnalyzer();
  }

  detectPlayerEvent(logLine: string): PlayerEvent | null {
    const joinMatch = logLine.match(/\[.*(?:INFO|Server thread\/INFO)\]:\s*(\w+)\s+joined the game/i);
    if (joinMatch && joinMatch[1]) {
      return {
        type: 'join',
        username: joinMatch[1]
      };
    }

    const leaveMatch = logLine.match(/\[.*(?:INFO|Server thread\/INFO)\]:\s*(\w+)\s+left the game/i);
    if (leaveMatch && leaveMatch[1]) {
      return {
        type: 'leave',
        username: leaveMatch[1]
      };
    }

    return null;
  }

  async startProcess(
    instance: ServerInstance,
    options: StartProcessOptions
  ): Promise<ProcessState> {
    if (this.processes.has(instance.id)) {
      throw new Error(`El servidor '${instance.id}' ya tiene un proceso activo en ejecución.`);
    }

    const child = spawn(options.executable, options.args, {
      cwd: options.cwd,
      env: {
        ...process.env,
        ...options.env
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const pid = child.pid ?? 0;
    const now = new Date().toISOString();

    const state: ProcessState = {
      instanceId: instance.id,
      pid,
      status: 'starting',
      startedAt: now,
      exitCode: null
    };

    const buffer = new ConsoleBuffer(2000);
    this.processes.set(instance.id, child);
    this.states.set(instance.id, state);
    this.buffers.set(instance.id, buffer);

    this.emit('status-change', { instanceId: instance.id, status: 'starting' });

    // Handle stdout
    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString('utf8');
      buffer.push(text);

      const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
      for (const line of lines) {
        this.emit('console-line', { instanceId: instance.id, line });

        // Check if server is ready ("Done (X.Xs)!")
        if (/Done \(\d+\.\d+s\)!/i.test(line)) {
          state.status = 'online';
          this.emit('status-change', { instanceId: instance.id, status: 'online' });
        }

        // Check for player joins / leaves
        const playerEvent = this.detectPlayerEvent(line);
        if (playerEvent) {
          this.emit('player-event', { instanceId: instance.id, event: playerEvent });
        }

        // Check for crash patterns
        const diagnostic = this.crashAnalyzer.analyze(line);
        if (diagnostic) {
          this.emit('crash-detected', { instanceId: instance.id, diagnostic });
        }
      }
    });

    // Handle stderr
    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString('utf8');
      buffer.push(text);

      const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
      for (const line of lines) {
        this.emit('console-line', { instanceId: instance.id, line });

        const diagnostic = this.crashAnalyzer.analyze(line);
        if (diagnostic) {
          this.emit('crash-detected', { instanceId: instance.id, diagnostic });
        }
      }
    });

    // Handle process exit
    child.on('exit', (code) => {
      state.exitCode = code;
      state.status = code === 0 ? 'offline' : 'crashed';

      // Perform a final check of the whole buffer for crashes if exit was non-zero
      if (code !== 0) {
        const fullLogs = buffer.getLines().join('\n');
        const diagnostic = this.crashAnalyzer.analyze(fullLogs);
        if (diagnostic) {
          this.emit('crash-detected', { instanceId: instance.id, diagnostic });
        }
      }

      this.processes.delete(instance.id);
      this.emit('status-change', { instanceId: instance.id, status: state.status });
    });

    return state;
  }

  sendCommand(instanceId: string, command: string): void {
    const child = this.processes.get(instanceId);
    if (!child || !child.stdin || child.stdin.destroyed) {
      throw new Error(`El servidor '${instanceId}' no está activo para recibir comandos.`);
    }

    child.stdin.write(command.endsWith('\n') ? command : command + '\n');
  }

  async stopProcess(instanceId: string, gracefulTimeoutMs: number = 15000): Promise<void> {
    const child = this.processes.get(instanceId);
    const state = this.states.get(instanceId);

    if (!child || !state) {
      return;
    }

    state.status = 'stopping';
    this.emit('status-change', { instanceId, status: 'stopping' });

    // 1. Send graceful "/stop" command to stdin
    try {
      this.sendCommand(instanceId, 'stop');
    } catch {
      // Ignore if stdin is not available
    }

    // 2. Wait up to gracefulTimeoutMs for natural exit
    const hasExitedNaturally = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, gracefulTimeoutMs);

      child.once('exit', () => {
        clearTimeout(timeout);
        resolve(true);
      });
    });

    // 3. Force tree-kill if still running after timeout
    if (!hasExitedNaturally && child.pid) {
      await killProcessTree(child.pid, 'SIGKILL');
    }

    state.status = 'offline';
    this.processes.delete(instanceId);
    this.emit('status-change', { instanceId, status: 'offline' });
  }

  async getMetrics(instanceId: string): Promise<ProcessMetrics | null> {
    const child = this.processes.get(instanceId);
    if (!child || !child.pid) {
      return null;
    }

    try {
      const stats = await pidusage(child.pid);
      return {
        cpuPercent: Math.round(stats.cpu * 10) / 10,
        memoryBytes: stats.memory,
        uptimeSeconds: Math.round(stats.elapsed / 1000)
      };
    } catch {
      return null;
    }
  }

  getBuffer(instanceId: string): ConsoleBuffer | null {
    return this.buffers.get(instanceId) ?? null;
  }

  getState(instanceId: string): ProcessState | null {
    return this.states.get(instanceId) ?? null;
  }
}
