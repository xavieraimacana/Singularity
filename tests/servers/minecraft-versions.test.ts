import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MinecraftVersionsService,
  getRecommendedJavaForVersion
} from '../../src/servers/services/minecraft-versions.js';

describe('MinecraftVersionsService', () => {
  let service: MinecraftVersionsService;

  beforeEach(() => {
    service = new MinecraftVersionsService();
  });

  describe('getRecommendedJavaForVersion', () => {
    it('should assign Java 25 for 26.x calendar versioning', () => {
      expect(getRecommendedJavaForVersion('26.3')).toBe(25);
      expect(getRecommendedJavaForVersion('26.2')).toBe(25);
      expect(getRecommendedJavaForVersion('26.1')).toBe(25);
      expect(getRecommendedJavaForVersion('26.1.2')).toBe(25);
    });

    it('should assign Java 21 LTS for 1.20.5+ and 1.21.x', () => {
      expect(getRecommendedJavaForVersion('1.21.4')).toBe(21);
      expect(getRecommendedJavaForVersion('1.21.1')).toBe(21);
      expect(getRecommendedJavaForVersion('1.20.6')).toBe(21);
      expect(getRecommendedJavaForVersion('1.20.5')).toBe(21);
    });

    it('should assign Java 17 LTS for 1.18.x to 1.20.4', () => {
      expect(getRecommendedJavaForVersion('1.20.4')).toBe(17);
      expect(getRecommendedJavaForVersion('1.20.1')).toBe(17);
      expect(getRecommendedJavaForVersion('1.19.4')).toBe(17);
      expect(getRecommendedJavaForVersion('1.18.2')).toBe(17);
    });

    it('should assign Java 16 for 1.17.x', () => {
      expect(getRecommendedJavaForVersion('1.17.1')).toBe(16);
      expect(getRecommendedJavaForVersion('1.17')).toBe(16);
    });

    it('should assign Java 8 LTS for 1.16.5 and older vintage versions', () => {
      expect(getRecommendedJavaForVersion('1.16.5')).toBe(8);
      expect(getRecommendedJavaForVersion('1.12.2')).toBe(8);
      expect(getRecommendedJavaForVersion('1.8.8')).toBe(8);
      expect(getRecommendedJavaForVersion('1.7.10')).toBe(8);
    });
  });

  describe('getVersions', () => {
    it('should return releases list containing 26.3 and historical releases', async () => {
      const result = await service.getVersions({ includeSnapshots: false });
      expect(result.versions.length).toBeGreaterThan(0);
      
      const releaseIds = result.versions.map((v) => v.id);
      expect(releaseIds).toContain('26.3');
      expect(releaseIds).toContain('1.21.4');
      expect(releaseIds).toContain('1.20.1');
      expect(releaseIds).toContain('1.12.2');

      // Should not contain snapshots when flag is false
      const snapshots = result.versions.filter((v) => v.type === 'snapshot');
      expect(snapshots.length).toBe(0);
    });

    it('should include snapshots when includeSnapshots is true', async () => {
      const result = await service.getVersions({ includeSnapshots: true });
      const hasSnapshots = result.versions.some((v) => v.type === 'snapshot');
      expect(hasSnapshots).toBe(true);
    });

    it('should fall back to internal release list when fetch fails', async () => {
      // Mock global fetch to reject
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      try {
        const freshService = new MinecraftVersionsService();
        const result = await freshService.getVersions({ includeSnapshots: false });

        expect(result.versions.length).toBeGreaterThan(0);
        expect(result.versions.map((v) => v.id)).toContain('26.3');
        expect(result.latest.release).toBe('26.3');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('resolveServerJarUrl', () => {
    it('should resolve Purpur direct download URL', async () => {
      const url = await service.resolveServerJarUrl('1.21.4', 'purpur');
      expect(url).toBe('https://api.purpurmc.org/v2/purpur/1.21.4/latest/download');
    });

    it('should return null for unsupported direct download loader like forge without jar', async () => {
      const url = await service.resolveServerJarUrl('1.20.1', 'forge');
      expect(url).toBeNull();
    });
  });
});
