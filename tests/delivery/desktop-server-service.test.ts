import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ServerLifecycleService } from '../../src/servers/services/server-lifecycle.js';
import { ProcessRunner } from '../../src/process-supervisor/services/process-runner.js';
import { DesktopServerService } from '../../src/delivery/desktop/desktop-server-service.js';

describe('Desktop Delivery > DesktopServerService & Tray Integration', () => {
  const testDir = path.resolve('data/test-tray-servers');
  let lifecycle: ServerLifecycleService;
  let runner: ProcessRunner;
  let service: DesktopServerService;

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    lifecycle = new ServerLifecycleService(testDir);
    runner = new ProcessRunner();
    service = new DesktopServerService(lifecycle, runner);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('should list instances with their offline status initially', async () => {
    await lifecycle.createInstance({
      name: 'Lobby Server',
      loader: 'paper',
      gameVersion: '1.20.4',
      port: 25565
    });

    const servers = await service.getServers();
    expect(servers.length).toBe(1);
    expect(servers[0]?.name).toBe('Lobby Server');
    expect(servers[0]?.status).toBe('offline');
    expect(servers[0]?.port).toBe(25565);
  });

  it('should reject startServer if server.jar is missing', async () => {
    const inst = await lifecycle.createInstance({
      name: 'Survival Server',
      loader: 'vanilla',
      gameVersion: '1.21.1'
    });

    await expect(service.startServer(inst.id)).rejects.toThrow(
      "No se encontró 'server.jar' en el servidor 'Survival Server'"
    );
  });

  it('should trigger onStatusChange listener when process runner emits status-change', async () => {
    const inst = await lifecycle.createInstance({
      name: 'Test Server',
      loader: 'paper',
      gameVersion: '1.20.4'
    });

    const statusSpy = vi.fn();
    service.onStatusChange(statusSpy);

    // Emit event on runner
    runner.emit('status-change', { instanceId: inst.id, status: 'online' });

    // Wait a tick for async lookup
    await new Promise((r) => setTimeout(r, 50));

    expect(statusSpy).toHaveBeenCalledWith({
      instanceId: inst.id,
      name: 'Test Server',
      status: 'online'
    });
  });

  it('should trigger onCrashDetected listener when process runner emits crash-detected', async () => {
    const inst = await lifecycle.createInstance({
      name: 'Crash Test Server',
      loader: 'paper',
      gameVersion: '1.20.4'
    });

    const crashSpy = vi.fn();
    service.onCrashDetected(crashSpy);

    runner.emit('crash-detected', {
      instanceId: inst.id,
      diagnostic: {
        rule: {
          message: 'Error de memoria insuficiente (OutOfMemoryError)',
          resolution: 'Aumenta la memoria RAM asignada en la configuración'
        }
      }
    });

    await new Promise((r) => setTimeout(r, 50));

    expect(crashSpy).toHaveBeenCalledWith({
      instanceId: inst.id,
      name: 'Crash Test Server',
      message: 'Error de memoria insuficiente (OutOfMemoryError)',
      resolution: 'Aumenta la memoria RAM asignada en la configuración'
    });
  });

  it('should trigger onPlayerEvent listener when process runner emits player-event', async () => {
    const inst = await lifecycle.createInstance({
      name: 'SMP World',
      loader: 'paper',
      gameVersion: '1.20.4'
    });

    const playerSpy = vi.fn();
    service.onPlayerEvent(playerSpy);

    runner.emit('player-event', {
      instanceId: inst.id,
      event: {
        type: 'join',
        username: 'Steve'
      }
    });

    await new Promise((r) => setTimeout(r, 50));

    expect(playerSpy).toHaveBeenCalledWith({
      instanceId: inst.id,
      name: 'SMP World',
      event: {
        type: 'join',
        username: 'Steve'
      }
    });
  });
});
