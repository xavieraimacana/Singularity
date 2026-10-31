import type { IContentProvider } from './content-provider.interface.js';
import type {
  CatalogItem,
  CatalogSearchQuery,
  CatalogSearchResult,
  ContentVersion,
  ProjectType
} from '../models/catalog-item.js';

interface CurseForgeCategory {
  id: number;
  name: string;
  slug: string;
}

interface CurseForgeModHit {
  id: number;
  name: string;
  slug: string;
  summary: string;
  downloadCount: number;
  classId?: number;
  categories?: CurseForgeCategory[];
  logo?: {
    url: string;
  };
  authors?: { name: string }[];
}

export class CurseForgeProvider implements IContentProvider {
  readonly id = 'curseforge';
  readonly name = 'CurseForge';

  private readonly baseUrl = 'https://api.curseforge.com/v1';

  constructor(private readonly apiKey: string | undefined = process.env.CURSEFORGE_API_KEY) {}

  get isEnabled(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async search(query: CatalogSearchQuery): Promise<CatalogSearchResult> {
    if (!this.isEnabled) {
      return {
        items: [],
        totalHits: 0,
        offset: 0,
        limit: 0
      };
    }

    const params = new URLSearchParams();
    params.set('gameId', '432'); // Minecraft Game ID
    params.set('searchFilter', query.query);
    params.set('pageSize', String(query.limit ?? 20));
    params.set('index', String(query.offset ?? 0));

    // CurseForge classIds: 6 = Mods, 4471 = Modpacks, 5 = Bukkit Plugins, 6945 = Datapacks
    if (query.projectType === 'modpack') {
      params.set('classId', '4471');
    } else if (query.projectType === 'plugin') {
      params.set('classId', '5');
    } else if (query.projectType === 'datapack') {
      params.set('classId', '6945');
    } else if (query.projectType === 'mod') {
      params.set('classId', '6');
    }

    if (query.gameVersion) {
      params.set('gameVersion', query.gameVersion);
    }

    const res = await fetch(`${this.baseUrl}/mods/search?${params.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'x-api-key': this.apiKey!
      }
    });

    if (!res.ok) {
      throw new Error(`Error al consultar CurseForge API (HTTP ${res.status})`);
    }

    const data = (await res.json()) as {
      data: CurseForgeModHit[];
      pagination: { totalCount: number };
    };

    const resolveProjectType = (hit: CurseForgeModHit): ProjectType => {
      if (hit.classId === 4471) return 'modpack';
      if (hit.classId === 5) return 'plugin';
      if (hit.classId === 6945) return 'datapack';
      if (hit.classId === 6) return 'mod';
      return (query.projectType ?? 'mod') as ProjectType;
    };

    const items: CatalogItem[] = data.data.map((mod) => ({
      id: String(mod.id),
      slug: mod.slug,
      title: mod.name,
      description: mod.summary,
      projectType: resolveProjectType(mod),
      categories: mod.categories?.map((c) => c.name) ?? [],
      downloads: mod.downloadCount,
      iconUrl: mod.logo?.url,
      author: mod.authors?.[0]?.name ?? 'CurseForge Author',
      providerId: this.id
    }));

    return {
      items,
      totalHits: data.pagination.totalCount,
      offset: query.offset ?? 0,
      limit: query.limit ?? 20
    };
  }

  async getVersions(
    projectId: string,
    gameVersion?: string,
    _loader?: string
  ): Promise<ContentVersion[]> {
    if (!this.isEnabled) {
      return [];
    }

    const url = `${this.baseUrl}/mods/${encodeURIComponent(projectId)}/files`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'x-api-key': this.apiKey!
      }
    });

    if (!res.ok) {
      throw new Error(`Error al obtener versiones de CurseForge para ${projectId} (HTTP ${res.status})`);
    }

    interface CurseForgeFile {
      id: number;
      modId: number;
      displayName: string;
      fileName: string;
      fileLength: number;
      downloadUrl: string | null;
      gameVersions: string[];
      hashes: { value: string; algo: number }[];
    }

    const data = (await res.json()) as { data: CurseForgeFile[] };
    let files = data.data ?? [];

    // Sort descending by file id (latest uploads first)
    files.sort((a, b) => b.id - a.id);

    // Optional gameVersion filter with graceful fallback
    if (gameVersion) {
      const matching = files.filter((f) => f.gameVersions?.includes(gameVersion));
      if (matching.length > 0) {
        files = matching;
      }
    }

    return files.map((f) => {
      // CurseForge Edge CDN fallback if direct downloadUrl is null
      const downloadUrl =
        f.downloadUrl ||
        `https://edge.forgecdn.net/files/${Math.floor(f.id / 1000)}/${f.id % 1000}/${encodeURIComponent(f.fileName)}`;

      return {
        id: String(f.id),
        projectId,
        name: f.displayName,
        versionNumber: String(f.id),
        gameVersions: f.gameVersions ?? [],
        loaders: [],
        fileName: f.fileName,
        downloadUrl,
        size: f.fileLength,
        hashes: {
          sha1: f.hashes?.find((h) => h.algo === 1)?.value
        },
        dependencies: []
      };
    });
  }
}
