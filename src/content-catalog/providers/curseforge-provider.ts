import type { IContentProvider } from './content-provider.interface.js';
import type {
  CatalogItem,
  CatalogSearchQuery,
  CatalogSearchResult,
  ContentVersion,
  ProjectType
} from '../models/catalog-item.js';

interface CurseForgeModHit {
  id: number;
  name: string;
  slug: string;
  summary: string;
  downloadCount: number;
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

    const items: CatalogItem[] = data.data.map((mod) => ({
      id: String(mod.id),
      slug: mod.slug,
      title: mod.name,
      description: mod.summary,
      projectType: (query.projectType ?? 'mod') as ProjectType,
      categories: [],
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
    loader?: string
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

    return data.data.map((f) => ({
      id: String(f.id),
      projectId,
      name: f.displayName,
      versionNumber: String(f.id),
      gameVersions: f.gameVersions,
      loaders: [],
      fileName: f.fileName,
      downloadUrl: f.downloadUrl ?? '',
      size: f.fileLength,
      hashes: {
        sha1: f.hashes.find((h) => h.algo === 1)?.value
      },
      dependencies: []
    }));
  }
}
