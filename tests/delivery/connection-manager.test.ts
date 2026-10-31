import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { ConnectionManager } from '../../src/delivery/desktop/connection-manager.js';

describe('Desktop ConnectionManager', () => {
  const testDir = path.resolve('data/test-connections');
  const testConfigPath = path.join(testDir, 'singularity-connections.json');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    if (existsSync(testConfigPath)) {
      await fs.unlink(testConfigPath);
    }
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('should initialize with default profiles if config does not exist', async () => {
    const manager = new ConnectionManager(testConfigPath);
    await manager.init();

    const profiles = manager.getProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(2);

    const vps = profiles.find((p) => p.id === 'nebulax-vps');
    const local = profiles.find((p) => p.id === 'local-embedded');

    expect(vps).toBeDefined();
    expect(vps?.url).toBe('https://singularity.nebulaxstudio.top');
    expect(vps?.sftpPort).toBe(2022);

    expect(local).toBeDefined();
    expect(local?.url).toBe('http://127.0.0.1:3000');

    expect(manager.getActiveProfile().id).toBe('nebulax-vps');
  });

  it('should switch active profile and persist', async () => {
    const manager = new ConnectionManager(testConfigPath);
    await manager.init();

    const switched = await manager.setActiveProfile('local-embedded');
    expect(switched.id).toBe('local-embedded');
    expect(manager.getActiveProfile().id).toBe('local-embedded');

    // Reload in fresh instance
    const reloaded = new ConnectionManager(testConfigPath);
    await reloaded.init();
    expect(reloaded.getActiveProfile().id).toBe('local-embedded');
  });

  it('should throw error when switching to non-existent profile', async () => {
    const manager = new ConnectionManager(testConfigPath);
    await manager.init();

    await expect(manager.setActiveProfile('non-existent')).rejects.toThrow(
      "Perfil de conexión 'non-existent' no encontrado"
    );
  });

  it('should add a custom connection profile', async () => {
    const manager = new ConnectionManager(testConfigPath);
    await manager.init();

    const saved = await manager.saveProfile({
      name: 'Servidor Amigos',
      type: 'remote',
      url: 'https://mc.amigos.xyz:8443/',
      sftpHost: 'mc.amigos.xyz',
      sftpPort: 2222
    });

    expect(saved.id).toBeDefined();
    expect(saved.url).toBe('https://mc.amigos.xyz:8443'); // Trailing slash cleaned
    expect(manager.getProfiles().some((p) => p.name === 'Servidor Amigos')).toBe(true);
  });

  it('should delete a custom profile but prevent deleting the last profile', async () => {
    const manager = new ConnectionManager(testConfigPath);
    await manager.init();

    const saved = await manager.saveProfile({
      name: 'Temporal',
      type: 'remote',
      url: 'https://temp.server.net'
    });

    const deleted = await manager.deleteProfile(saved.id);
    expect(deleted).toBe(true);
    expect(manager.getProfiles().some((p) => p.id === saved.id)).toBe(false);

    // Delete one more
    await manager.deleteProfile('local-embedded');
    expect(manager.getProfiles().length).toBe(1);

    // Cannot delete the only remaining profile
    await expect(manager.deleteProfile('nebulax-vps')).rejects.toThrow(
      'No puedes eliminar el único perfil de conexión restante'
    );
  });
});
