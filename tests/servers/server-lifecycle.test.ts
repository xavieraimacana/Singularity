import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import { isPortAvailable, findAvailablePort } from '../../src/servers/services/port-allocator.js';
import { ServerLifecycleService } from '../../src/servers/services/server-lifecycle.js';
import type { CreateServerInstanceOptions } from '../../src/servers/models/server-instance.js';

describe('PortAllocator', () => {
  it('should verify standard ports and find available port', async () => {
    const isAvail = await isPortAvailable(25565);
    expect(typeof isAvail).toBe('boolean');

    const allocated = await findAvailablePort(29990);
    expect(allocated).toBeGreaterThanOrEqual(29990);
  });
});

describe('ServerLifecycleService', () => {
  const testDataDir = path.join(process.cwd(), 'data', 'test-servers');
  let lifecycleService: ServerLifecycleService;

  beforeEach(async () => {
    await fs.mkdir(testDataDir, { recursive: true });
    lifecycleService = new ServerLifecycleService(testDataDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('should create server instance directory, eula.txt, server.properties and metadata', async () => {
    const options: CreateServerInstanceOptions = {
      name: 'Survival SMP',
      loader: 'paper',
      gameVersion: '1.21.4',
      memoryMb: 4096,
      port: 25565
    };

    const instance = await lifecycleService.createInstance(options);

    expect(instance.id).toBeDefined();
    expect(instance.name).toBe('Survival SMP');
    expect(instance.loader).toBe('paper');
    expect(instance.gameVersion).toBe('1.21.4');
    expect(instance.port).toBe(25565);
    expect(instance.eulaAccepted).toBe(true);

    // Verify files on disk
    const instanceDir = path.join(testDataDir, instance.id);
    const eulaContent = await fs.readFile(path.join(instanceDir, 'eula.txt'), 'utf8');
    expect(eulaContent).toContain('eula=true');

    const propsContent = await fs.readFile(path.join(instanceDir, 'server.properties'), 'utf8');
    expect(propsContent).toContain('server-port=25565');
    expect(propsContent).toContain('motd=Survival SMP');

    const metaContent = await fs.readFile(path.join(instanceDir, 'singularity-instance.json'), 'utf8');
    const parsedMeta = JSON.parse(metaContent);
    expect(parsedMeta.name).toBe('Survival SMP');
  });

  it('should list instances and retrieve instance by ID', async () => {
    const inst1 = await lifecycleService.createInstance({
      name: 'Server 1',
      loader: 'vanilla',
      gameVersion: '1.20.4',
      memoryMb: 2048
    });

    const inst2 = await lifecycleService.createInstance({
      name: 'Server 2',
      loader: 'fabric',
      gameVersion: '1.21.1',
      memoryMb: 4096
    });

    const allInstances = await lifecycleService.listInstances();
    expect(allInstances.length).toBe(2);

    const found = await lifecycleService.getInstance(inst1.id);
    expect(found?.name).toBe('Server 1');
  });

  it('should delete instance and remove its files', async () => {
    const inst = await lifecycleService.createInstance({
      name: 'Server to Delete',
      loader: 'paper',
      gameVersion: '1.21.4',
      memoryMb: 2048
    });

    await lifecycleService.deleteInstance(inst.id);
    const found = await lifecycleService.getInstance(inst.id);
    expect(found).toBeNull();
  });
});
