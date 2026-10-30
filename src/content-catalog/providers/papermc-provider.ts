import type {
  CatalogItem,
  CatalogSearchQuery,
  CatalogSearchResult,
  ContentVersion
} from '../models/catalog-item.js';
import type { IContentProvider } from './content-provider.interface.js';

export interface PaperBuildArtifact {
  readonly projectId: string;
  readonly gameVersion: string;
  readonly buildNumber: number;
  readonly fileName: string;
  readonly downloadUrl: string;
  readonly sha256?: string;
}

interface PaperVersionResponse {
  project_id: string;
  project_name: string;
  version: string;
  builds: number[];
}

interface PaperBuildResponse {
  project_id: string;
  version: string;
  build: number;
  downloads: {
    application: {
      name: string;
      sha256: string;
    };
  };
}

export class PaperMcProvider implements IContentProvider {
  readonly id = 'papermc';
  readonly name = 'PaperMC';
  readonly isEnabled = true;

  private readonly baseUrl = 'https://api.papermc.io/v2';

  async search(query: CatalogSearchQuery): Promise<CatalogSearchResult> {
    const term = (query.query || 'paper').toLowerCase().trim();
    const projects: CatalogItem[] = [
      {
        id: 'paper',
        slug: 'paper',
        title: 'PaperMC Server',
        description: 'Servidor Minecraft de alto rendimiento y corrección de bugs del juego vanilla.',
        author: 'PaperMC',
        downloads: 25000000,
        projectType: 'modpack',
        categories: ['server', 'optimization'],
        providerId: 'papermc'
      },
      {
        id: 'velocity',
        slug: 'velocity',
        title: 'Velocity Proxy',
        description: 'Proxy moderno de próxima generación para redes de servidores Minecraft.',
        author: 'PaperMC',
        downloads: 8000000,
        projectType: 'modpack',
        categories: ['proxy'],
        providerId: 'papermc'
      }
    ];

    const filtered = projects.filter((p) => p.id.includes(term) || p.title.toLowerCase().includes(term));
    return {
      items: filtered,
      totalHits: filtered.length,
      offset: query.offset ?? 0,
      limit: query.limit ?? 20
    };
  }

  async getVersions(
    projectId: string,
    gameVersion?: string
  ): Promise<ContentVersion[]> {
    if (!gameVersion) {
      return [];
    }

    try {
      const artifact = await this.getLatestBuildArtifact(projectId, gameVersion);
      return [
        {
          id: String(artifact.buildNumber),
          projectId: artifact.projectId,
          name: `${artifact.projectId} build #${artifact.buildNumber}`,
          versionNumber: String(artifact.buildNumber),
          gameVersions: [artifact.gameVersion],
          loaders: ['paper'],
          fileName: artifact.fileName,
          downloadUrl: artifact.downloadUrl,
          size: 0,
          hashes: artifact.sha256 ? { sha256: artifact.sha256 } : {},
          dependencies: []
        }
      ];
    } catch {
      return [];
    }
  }

  async getLatestBuildArtifact(
    project: 'paper' | 'purpur' | 'velocity' | string = 'paper',
    gameVersion: string
  ): Promise<PaperBuildArtifact> {
    const versionUrl = `${this.baseUrl}/projects/${project}/versions/${encodeURIComponent(gameVersion)}`;

    const versionRes = await fetch(versionUrl, {
      headers: {
        'User-Agent': 'NebulaX-Singularity/0.1.0 (contact@nebulax.dev)'
      }
    });

    if (!versionRes.ok) {
      throw new Error(
        `Error al consultar versión ${gameVersion} de ${project} en PaperMC API (HTTP ${versionRes.status})`
      );
    }

    const versionData = (await versionRes.json()) as PaperVersionResponse;
    const latestBuild = versionData.builds[versionData.builds.length - 1];

    if (!latestBuild) {
      throw new Error(`No se encontraron builds disponibles para ${project} versión ${gameVersion}`);
    }

    const buildUrl = `${versionUrl}/builds/${latestBuild}`;
    const buildRes = await fetch(buildUrl, {
      headers: {
        'User-Agent': 'NebulaX-Singularity/0.1.0 (contact@nebulax.dev)'
      }
    });

    if (!buildRes.ok) {
      throw new Error(`Error al obtener detalles del build ${latestBuild} para ${project}`);
    }

    const buildData = (await buildRes.json()) as PaperBuildResponse;
    const appDownload = buildData.downloads.application;

    return {
      projectId: project,
      gameVersion,
      buildNumber: latestBuild,
      fileName: appDownload.name,
      downloadUrl: `${buildUrl}/downloads/${appDownload.name}`,
      sha256: appDownload.sha256
    };
  }
}
