import path from 'node:path';
import fs from 'node:fs';
import type { ServerLifecycleService } from '../../servers/services/server-lifecycle.js';
import type { ProcessRunner } from '../../process-supervisor/services/process-runner.js';
import type { ProcessState, PlayerEvent } from '../../process-supervisor/models/process-state.js';
import type { ServerInstance, ServerStatus } from '../../servers/models/server-instance.js';
import { resolveCompatibleJavaExecutable } from '../../java-manager/index.js';

export interface TrayServerItem {
  id: string;
  name: string;
  port: number;
  gameVersion: string;
  loader: string;
  status: ServerStatus;
}

export class DesktopServerService {
  constructor(
    private readonly serverLifecycle: ServerLifecycleService,
    private readonly processRunner: ProcessRunner
  ) {}

  async getServers(): Promise<TrayServerItem[]> {
    try {
      const instances = await this.serverLifecycle.listInstances();
      return instances.map((inst) => {
        const state = this.processRunner.getState(inst.id);
        const status = state?.status || inst.status || 'offline';
        return {
          id: inst.id,
          name: inst.name,
          port: inst.port,
          gameVersion: inst.gameVersion,
          loader: inst.loader,
          status
        };
      });
    } catch (err) {
      console.error('[DesktopServerService] Error al listar instancias para el tray:', err);
      return [];
    }
  }

  async startServer(id: string): Promise<ProcessState> {
    const instance = await this.serverLifecycle.getInstance(id);
    if (!instance) {
      throw new Error(`Servidor con ID '${id}' no encontrado.`);
    }

    const instanceDir = this.serverLifecycle.getInstanceDir(instance.id);
    const jarPath = path.join(instanceDir, 'server.jar');

    if (!fs.existsSync(jarPath)) {
      throw new Error(
        `No se encontró 'server.jar' en el servidor '${instance.name}'. Asegúrate de haber instalado o subido el ejecutable.`
      );
    }

    const executable = await resolveCompatibleJavaExecutable(instance.gameVersion, instance.javaPath);
    const args = [...(instance.jvmArgs || ['-Xms1G', `-Xmx${instance.memoryMb}M`]), '-jar', jarPath, 'nogui'];

    const state = await this.processRunner.startProcess(instance, {
      executable,
      args,
      cwd: instanceDir
    });

    return state;
  }

  async stopServer(id: string): Promise<void> {
    const instance = await this.serverLifecycle.getInstance(id);
    if (!instance) {
      throw new Error(`Servidor con ID '${id}' no encontrado.`);
    }

    await this.processRunner.stopProcess(id);
  }

  async restartServer(id: string): Promise<ProcessState> {
    await this.stopServer(id);
    // Brief pause to ensure OS releases socket
    await new Promise((r) => setTimeout(r, 800));
    return this.startServer(id);
  }

  onStatusChange(callback: (info: { instanceId: string; name: string; status: ServerStatus }) => void): void {
    this.processRunner.on('status-change', async ({ instanceId, status }) => {
      try {
        const inst = await this.serverLifecycle.getInstance(instanceId);
        const name = inst?.name || instanceId;
        callback({ instanceId, name, status });
      } catch {
        callback({ instanceId, name: instanceId, status });
      }
    });
  }

  onCrashDetected(callback: (info: { instanceId: string; name: string; message: string; resolution?: string }) => void): void {
    this.processRunner.on('crash-detected', async ({ instanceId, diagnostic }) => {
      try {
        const inst = await this.serverLifecycle.getInstance(instanceId);
        const name = inst?.name || instanceId;
        const message = diagnostic?.rule?.message || 'Error crítico en el proceso de Minecraft';
        const resolution = diagnostic?.rule?.resolution;
        callback({ instanceId, name, message, resolution });
      } catch {
        callback({ instanceId, name: instanceId, message: 'Crash inesperado' });
      }
    });
  }

  onPlayerEvent(callback: (info: { instanceId: string; name: string; event: PlayerEvent }) => void): void {
    this.processRunner.on('player-event', async ({ instanceId, event }) => {
      try {
        const inst = await this.serverLifecycle.getInstance(instanceId);
        const name = inst?.name || instanceId;
        callback({ instanceId, name, event });
      } catch {
        callback({ instanceId, name: instanceId, event });
      }
    });
  }
}
