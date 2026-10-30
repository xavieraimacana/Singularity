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

export class PaperMcProvider {
  readonly id = 'papermc';
  readonly name = 'PaperMC';
  readonly isEnabled = true;

  private readonly baseUrl = 'https://api.papermc.io/v2';

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
    if (!versionData.builds || versionData.builds.length === 0) {
      throw new Error(`No se encontraron builds disponibles para ${project} versión ${gameVersion}`);
    }

    const latestBuild = Math.max(...versionData.builds);

    const buildUrl = `${this.baseUrl}/projects/${project}/versions/${encodeURIComponent(gameVersion)}/builds/${latestBuild}`;
    const buildRes = await fetch(buildUrl, {
      headers: {
        'User-Agent': 'NebulaX-Singularity/0.1.0 (contact@nebulax.dev)'
      }
    });

    if (!buildRes.ok) {
      throw new Error(`Error al consultar build ${latestBuild} en PaperMC API (HTTP ${buildRes.status})`);
    }

    const buildData = (await buildRes.json()) as PaperBuildResponse;
    const fileName = buildData.downloads.application.name;
    const sha256 = buildData.downloads.application.sha256;

    const downloadUrl = `${this.baseUrl}/projects/${project}/versions/${encodeURIComponent(gameVersion)}/builds/${latestBuild}/downloads/${fileName}`;

    return {
      projectId: project,
      gameVersion,
      buildNumber: latestBuild,
      fileName,
      downloadUrl,
      sha256
    };
  }
}
