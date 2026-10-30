import type { ServerStatus } from '../../servers/models/server-instance.js';

export interface ProcessMetrics {
  readonly cpuPercent: number;
  readonly memoryBytes: number;
  readonly uptimeSeconds: number;
}

export interface ConnectedPlayer {
  readonly username: string;
  readonly uuid?: string;
  readonly joinedAt: string;
  readonly latencyMs?: number;
}

export interface PlayerEvent {
  readonly type: 'join' | 'leave';
  readonly username: string;
}

export interface ServerPingResult {
  readonly version: string;
  readonly protocol: number;
  readonly playersOnline: number;
  readonly playersMax: number;
  readonly players: { readonly id: string; readonly name: string }[];
  readonly description: string;
  readonly latencyMs: number;
}

export interface ProcessState {
  readonly instanceId: string;
  readonly pid: number;
  status: ServerStatus;
  readonly startedAt: string;
  exitCode: number | null;
}

export interface StartProcessOptions {
  readonly executable: string;
  readonly args: string[];
  readonly cwd: string;
  readonly env?: NodeJS.ProcessEnv;
}
