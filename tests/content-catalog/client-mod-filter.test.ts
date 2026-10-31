import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import {
  isClientOnlyMod,
  pruneClientOnlyMods
} from '../../src/content-catalog/services/client-mod-filter.js';

describe('client-mod-filter', () => {
  const testDir = path.join(process.cwd(), 'data', 'test-client-filter');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  describe('isClientOnlyMod', () => {
    it('should identify popular client-only rendering and audio mods', () => {
      expect(isClientOnlyMod('sodium-fabric-mc1.20.4-0.5.8.jar')).toBe(true);
      expect(isClientOnlyMod('iris-mc1.20.4-1.6.17.jar')).toBe(true);
      expect(isClientOnlyMod('AmbientSounds_v5.3.9_mc1.20.4.jar')).toBe(true);
      expect(isClientOnlyMod('entityculling-fabric-1.6.4-mc1.20.4.jar')).toBe(true);
      expect(isClientOnlyMod('optifine_1.20.4_hd_u_i7.jar')).toBe(true);
      expect(isClientOnlyMod('soundphysics-fabric-1.20.4-1.3.1.jar')).toBe(true);
      expect(isClientOnlyMod('presencefootsteps-1.20.4-1.9.1.jar')).toBe(true);
      expect(isClientOnlyMod('modmenu-9.0.0.jar')).toBe(true);
      expect(isClientOnlyMod('controlling-forge-1.20.1-12.0.2.jar')).toBe(true);
      expect(isClientOnlyMod('sodium')).toBe(true);
    });

    it('should NOT flag server-compatible mods and plugins', () => {
      expect(isClientOnlyMod('fabric-api-0.92.0+1.20.4.jar')).toBe(false);
      expect(isClientOnlyMod('create-1.20.1-0.5.1.f.jar')).toBe(false);
      expect(isClientOnlyMod('jei-1.20.1-forge-15.3.0.4.jar')).toBe(false);
      expect(isClientOnlyMod('auraskills-2.4.0.jar')).toBe(false);
      expect(isClientOnlyMod('EssentialsX-2.20.1.jar')).toBe(false);
      expect(isClientOnlyMod('LuckPerms-Bukkit-5.4.102.jar')).toBe(false);
      expect(isClientOnlyMod('viaversion.jar')).toBe(false);
    });
  });

  describe('pruneClientOnlyMods', () => {
    it('should scan directory, delete client-only JARs, and retain server JARs', async () => {
      // Create test files
      await fs.writeFile(path.join(testDir, 'fabric-api-0.92.0.jar'), 'dummy');
      await fs.writeFile(path.join(testDir, 'create-1.20.1.jar'), 'dummy');
      await fs.writeFile(path.join(testDir, 'sodium-fabric-0.5.8.jar'), 'dummy');
      await fs.writeFile(path.join(testDir, 'iris-1.6.17.jar'), 'dummy');
      await fs.writeFile(path.join(testDir, 'config.txt'), 'not-a-jar');

      const pruned = await pruneClientOnlyMods(testDir);

      expect(pruned).toContain('sodium-fabric-0.5.8.jar');
      expect(pruned).toContain('iris-1.6.17.jar');
      expect(pruned.length).toBe(2);

      const remainingFiles = await fs.readdir(testDir);
      expect(remainingFiles).toContain('fabric-api-0.92.0.jar');
      expect(remainingFiles).toContain('create-1.20.1.jar');
      expect(remainingFiles).toContain('config.txt');
      expect(remainingFiles).not.toContain('sodium-fabric-0.5.8.jar');
      expect(remainingFiles).not.toContain('iris-1.6.17.jar');
    });
  });
});
