import type { IContentProvider } from './content-provider.interface.js';
import type {
  CatalogItem,
  CatalogSearchQuery,
  CatalogSearchResult,
  ContentVersion,
  ProjectType,
  VersionDependency
} from '../models/catalog-item.js';

interface ModrinthSearchHit {
  project_id: string;
  slug: string;
  title: string;
  description: string;
  categories: string[];
  project_type: string;
  downloads: number;
  icon_url: string | null;
  author: string;
}

interface ModrinthVersionFile {
  url: string;
  filename: string;
  primary: boolean;
  size: number;
  hashes: {
    sha1?: string;
    sha512?: string;
  };
}

interface ModrinthVersionDependency {
  project_id: string | null;
  version_id: string | null;
  dependency_type: 'required' | 'optional' | 'incompatible';
}

interface ModrinthVersionResponse {
  id: string;
  project_id: string;
  name: string;
  version_number: string;
  game_versions: string[];
  loaders: string[];
  files: ModrinthVersionFile[];
  dependencies: ModrinthVersionDependency[];
}

export class ModrinthProvider implements IContentProvider {
  readonly id = 'modrinth';
  readonly name = 'Modrinth';
  readonly isEnabled = true;

  private readonly baseUrl = 'https://api.modrinth.com/v2';

  async search(query: CatalogSearchQuery): Promise<CatalogSearchResult> {
    const params = new URLSearchParams();
    params.set('query', query.query);
    params.set('limit', String(query.limit ?? 20));
    params.set('offset', String(query.offset ?? 0));

    // Construct facets
    const facets: string[][] = [];

    if (query.projectType) {
      facets.push([`project_type:${query.projectType}`]);
    }

    if (query.loader) {
      facets.push([`categories:${query.loader.toLowerCase()}`]);
    }

    if (query.gameVersion) {
      facets.push([`versions:${query.gameVersion}`]);
    }

    if (facets.length > 0) {
      params.set('facets', JSON.stringify(facets));
    }

    const res = await fetch(`${this.baseUrl}/search?${params.toString()}`, {
      headers: {
        'User-Agent': 'NebulaX-Singularity/0.1.0 (contact@nebulax.dev)'
      }
    });

    if (!res.ok) {
      throw new Error(`Error al consultar Modrinth API (HTTP ${res.status})`);
    }

    const data = (await res.json()) as { hits: ModrinthSearchHit[]; total_hits: number };

    const items: CatalogItem[] = data.hits.map((hit) => ({
      id: hit.project_id,
      slug: hit.slug,
      title: hit.title,
      description: hit.description,
      projectType: (hit.project_type ?? 'mod') as ProjectType,
      categories: hit.categories ?? [],
      downloads: hit.downloads ?? 0,
      iconUrl: hit.icon_url ?? undefined,
      author: hit.author,
      providerId: this.id
    }));

    return {
      items,
      totalHits: data.total_hits,
      offset: query.offset ?? 0,
      limit: query.limit ?? 20
    };
  }

  async getVersions(
    projectId: string,
    gameVersion?: string,
    loader?: string
  ): Promise<ContentVersion[]> {
    const params = new URLSearchParams();
    if (gameVersion) {
      params.set('game_versions', JSON.stringify([gameVersion]));
    }
    if (loader) {
      params.set('loaders', JSON.stringify([loader.toLowerCase()]));
    }

    const url = `${this.baseUrl}/project/${encodeURIComponent(projectId)}/version?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'NebulaX-Singularity/0.1.0 (contact@nebulax.dev)'
      }
    });

    if (!res.ok) {
      throw new Error(`Error al obtener versiones de Modrinth para ${projectId} (HTTP ${res.status})`);
    }

    const versions = (await res.json()) as ModrinthVersionResponse[];

    return versions.map((v) => {
      const primaryFile = v.files.find((f) => f.primary) ?? v.files[0];

      const dependencies: VersionDependency[] = (v.dependencies ?? [])
        .filter((d) => d.project_id !== null)
        .map((d) => ({
          projectId: d.project_id!,
          versionId: d.version_id ?? undefined,
          dependencyType: d.dependency_type
        }));

      return {
        id: v.id,
        projectId: v.project_id,
        name: v.name,
        versionNumber: v.version_number,
        gameVersions: v.game_versions,
        loaders: v.loaders,
        fileName: primaryFile?.filename ?? `${v.name}.jar`,
        downloadUrl: primaryFile?.url ?? '',
        size: primaryFile?.size ?? 0,
        hashes: {
          sha1: primaryFile?.hashes.sha1,
          sha512: primaryFile?.hashes.sha512
        },
        dependencies
      };
    });
  }
}
