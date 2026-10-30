import type { ServerLoader } from '../models/server-instance.js';

export interface MinecraftVersionItem {
  id: string;
  name: string;
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha';
  releaseTime: string;
  recommendedJava: number;
  isLatestRelease: boolean;
  isLatestSnapshot: boolean;
  url?: string;
}

export interface VersionManifestResponse {
  latest: {
    release: string;
    snapshot: string;
  };
  versions: MinecraftVersionItem[];
}

interface RawMojangVersion {
  id: string;
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha';
  url: string;
  time: string;
  releaseTime: string;
  sha1?: string;
  complianceLevel?: number;
}

interface RawMojangManifest {
  latest: {
    release: string;
    snapshot: string;
  };
  versions: RawMojangVersion[];
}

/**
 * Embedded fallback list of prominent and modern Minecraft releases
 * Used in offline environments or if Mojang meta servers are temporarily unreachable.
 */
const FALLBACK_RELEASES = [
  '26.3',
  '26.2',
  '26.1.2',
  '26.1.1',
  '26.1',
  '1.21.11',
  '1.21.10',
  '1.21.9',
  '1.21.8',
  '1.21.7',
  '1.21.6',
  '1.21.5',
  '1.21.4',
  '1.21.3',
  '1.21.2',
  '1.21.1',
  '1.21',
  '1.20.6',
  '1.20.5',
  '1.20.4',
  '1.20.3',
  '1.20.2',
  '1.20.1',
  '1.20',
  '1.19.4',
  '1.19.3',
  '1.19.2',
  '1.19.1',
  '1.19',
  '1.18.2',
  '1.18.1',
  '1.18',
  '1.17.1',
  '1.17',
  '1.16.5',
  '1.16.4',
  '1.16.3',
  '1.16.2',
  '1.16.1',
  '1.16',
  '1.15.2',
  '1.14.4',
  '1.13.2',
  '1.12.2',
  '1.11.2',
  '1.10.2',
  '1.9.4',
  '1.8.9',
  '1.8.8',
  '1.7.10'
];

/**
 * Calculates recommended Java runtime version for a given Minecraft release/version string.
 */
export function getRecommendedJavaForVersion(versionStr: string): number {
  if (!versionStr) return 21;

  const clean = versionStr.trim();

  // Calendar versioning (2026+: 26.x, 27.x, etc.)
  const firstPart = parseInt(clean.split('.')[0] ?? '0', 10);
  if (firstPart >= 26) {
    return 25;
  }
  if (firstPart >= 22) {
    return 21;
  }

  // Classic semantic 1.x versioning
  const parts = clean.split('.').map((p) => parseInt(p, 10));
  const minor = parts[1] ?? 0;
  const patch = parts[2] ?? 0;

  if (minor > 20 || (minor === 20 && patch >= 5)) {
    return 21;
  }
  if (minor >= 18) {
    return 17;
  }
  if (minor === 17) {
    return 16;
  }
  return 8;
}

export class MinecraftVersionsService {
  private cachedManifest: RawMojangManifest | null = null;
  private lastFetchedAt = 0;
  private readonly cacheTtlMs = 1000 * 60 * 60; // 1 hour

  /**
   * Fetches the official Mojang version manifest with caching and graceful offline fallback.
   */
  async getRawManifest(): Promise<RawMojangManifest> {
    const now = Date.now();
    if (this.cachedManifest && now - this.lastFetchedAt < this.cacheTtlMs) {
      return this.cachedManifest;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json', {
        headers: {
          'User-Agent': 'NebulaX-Singularity/0.1.0 (contact@nebulax.dev)'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Mojang API responded with status ${res.status}`);
      }

      const data = (await res.json()) as RawMojangManifest;
      this.cachedManifest = data;
      this.lastFetchedAt = now;
      return data;
    } catch {
      // Fallback in case of offline or DNS failure
      const fallbackManifest: RawMojangManifest = {
        latest: {
          release: '26.3',
          snapshot: '26.4-snapshot-6'
        },
        versions: FALLBACK_RELEASES.map((id) => ({
          id,
          type: 'release',
          url: '',
          time: new Date().toISOString(),
          releaseTime: new Date().toISOString()
        }))
      };

      return fallbackManifest;
    }
  }

  /**
   * Returns a filtered and enriched list of Minecraft versions for UI consumption.
   */
  async getVersions(options?: {
    includeSnapshots?: boolean;
    search?: string;
    limit?: number;
  }): Promise<VersionManifestResponse> {
    const manifest = await this.getRawManifest();
    const includeSnapshots = options?.includeSnapshots ?? false;
    const search = options?.search?.toLowerCase().trim();

    let rawList = manifest.versions;

    if (!includeSnapshots) {
      rawList = rawList.filter((v) => v.type === 'release');
    }

    if (search) {
      rawList = rawList.filter((v) => v.id.toLowerCase().includes(search));
    }

    if (options?.limit && options.limit > 0) {
      rawList = rawList.slice(0, options.limit);
    }

    const versions: MinecraftVersionItem[] = rawList.map((v) => {
      const isLatestRelease = v.id === manifest.latest.release;
      const isLatestSnapshot = v.id === manifest.latest.snapshot;
      const recommendedJava = getRecommendedJavaForVersion(v.id);

      let name = v.id;
      if (isLatestRelease) {
        name = `${v.id} (Última versión oficial)`;
      } else if (isLatestSnapshot) {
        name = `${v.id} (Último Snapshot)`;
      }

      return {
        id: v.id,
        name,
        type: v.type,
        releaseTime: v.releaseTime,
        recommendedJava,
        isLatestRelease,
        isLatestSnapshot,
        url: v.url
      };
    });

    return {
      latest: manifest.latest,
      versions
    };
  }

  /**
   * Resolves the direct download URL for server.jar of a specific version and loader.
   * Supports Vanilla, PaperMC (Fill v3 API), PurpurMC, Fabric, and Quilt.
   */
  async resolveServerJarUrl(gameVersion: string, loader: ServerLoader): Promise<string | null> {
    if (loader === 'vanilla') {
      try {
        const manifest = await this.getRawManifest();
        const matched = manifest.versions.find((v) => v.id === gameVersion);
        if (matched?.url) {
          const detailRes = await fetch(matched.url, {
            headers: { 'User-Agent': 'NebulaX-Singularity/0.1.0' }
          });
          if (detailRes.ok) {
            const detail = (await detailRes.json()) as { downloads?: { server?: { url?: string } } };
            if (detail?.downloads?.server?.url) {
              return detail.downloads.server.url;
            }
          }
        }
      } catch {
        return null;
      }
    }

    if (loader === 'paper') {
      try {
        const url = `https://fill.papermc.io/v3/projects/paper/versions/${encodeURIComponent(gameVersion)}/builds`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'NebulaX-Singularity/0.1.0' }
        });
        if (res.ok) {
          const builds = (await res.json()) as Array<{
            downloads?: {
              'server:default'?: { url?: string };
              application?: { url?: string };
            };
          }>;
          if (Array.isArray(builds) && builds.length > 0) {
            const latest = builds[0];
            const download = latest?.downloads?.['server:default'] || latest?.downloads?.application;
            if (download?.url) {
              return download.url;
            }
          }
        }
      } catch {
        return null;
      }
    }

    if (loader === 'purpur') {
      return `https://api.purpurmc.org/v2/purpur/${encodeURIComponent(gameVersion)}/latest/download`;
    }

    if (loader === 'spigot') {
      try {
        const url = `https://download.getbukkit.org/spigot/spigot-${encodeURIComponent(gameVersion)}.jar`;
        const res = await fetch(url, {
          method: 'HEAD',
          headers: { 'User-Agent': 'NebulaX-Singularity/0.1.0' }
        });
        if (res.ok) {
          return url;
        }
      } catch {
        return null;
      }
    }

    if (loader === 'fabric') {
      try {
        const url = `https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(gameVersion)}`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'NebulaX-Singularity/0.1.0' }
        });
        if (res.ok) {
          const loaders = (await res.json()) as Array<{ loader?: { version?: string } }>;
          if (Array.isArray(loaders) && loaders.length > 0 && loaders[0]?.loader?.version) {
            const loaderVersion = loaders[0].loader.version;
            return `https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(gameVersion)}/${encodeURIComponent(loaderVersion)}/1.0.1/server/jar`;
          }
        }
      } catch {
        return null;
      }
    }

    if (loader === 'quilt') {
      try {
        const url = `https://meta.quiltmc.org/v3/versions/loader/${encodeURIComponent(gameVersion)}`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'NebulaX-Singularity/0.1.0' }
        });
        if (res.ok) {
          const loaders = (await res.json()) as Array<{ loader?: { version?: string } }>;
          if (Array.isArray(loaders) && loaders.length > 0 && loaders[0]?.loader?.version) {
            const loaderVersion = loaders[0].loader.version;
            return `https://meta.quiltmc.org/v3/versions/loader/${encodeURIComponent(gameVersion)}/${encodeURIComponent(loaderVersion)}/0.2.2/server/jar`;
          }
        }
      } catch {
        return null;
      }
    }

    return null;
  }
}

export const minecraftVersionsService = new MinecraftVersionsService();
