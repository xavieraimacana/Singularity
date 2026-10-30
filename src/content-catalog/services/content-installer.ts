import path from 'node:path';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import type {
  InstallContentRequest,
  InstalledItem,
  InstanceManifest,
  ProjectType
} from '../models/catalog-item.js';

export class ContentInstallerService {
  constructor(private readonly dataDir: string = path.join(process.cwd(), 'data', 'servers')) {}

  private getInstanceDir(instanceId: string): string {
    return path.join(this.dataDir, instanceId);
  }

  private getManifestPath(instanceId: string): string {
    return path.join(this.getInstanceDir(instanceId), 'singularity-manifest.json');
  }

  private getSubfolder(projectType: ProjectType): string {
    switch (projectType) {
      case 'mod':
        return 'mods';
      case 'plugin':
        return 'plugins';
      case 'datapack':
        return 'datapacks';
      case 'modpack':
        return '';
      default:
        return 'mods';
    }
  }

  async getManifest(instanceId: string): Promise<InstanceManifest> {
    const manifestPath = this.getManifestPath(instanceId);
    try {
      const raw = await fs.readFile(manifestPath, 'utf8');
      return JSON.parse(raw) as InstanceManifest;
    } catch {
      return {
        instanceId,
        installedItems: [],
        updatedAt: new Date().toISOString()
      };
    }
  }

  async saveManifest(manifest: InstanceManifest): Promise<void> {
    const manifestPath = this.getManifestPath(manifest.instanceId);
    await fs.mkdir(path.dirname(manifestPath), { recursive: true });
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  }

  async install(request: InstallContentRequest): Promise<InstalledItem> {
    const instanceDir = this.getInstanceDir(request.instanceId);
    const subfolder = this.getSubfolder(request.projectType);
    const destinationDir = path.join(instanceDir, subfolder);

    await fs.mkdir(destinationDir, { recursive: true });

    const finalPath = path.join(destinationDir, request.fileName);
    const tempPath = path.join(destinationDir, `temp-${Date.now()}-${request.fileName}`);

    // Download
    const res = await fetch(request.downloadUrl);
    if (!res.ok || !res.body) {
      throw new Error(
        `Error al descargar ${request.fileName} desde ${request.downloadUrl} (HTTP ${res.status})`
      );
    }

    // Write file atomically
    const fileStream = createWriteStream(tempPath);
    await pipeline(Readable.fromWeb(res.body as WebReadableStream), fileStream);
    await fs.rename(tempPath, finalPath);

    const installedItem: InstalledItem = {
      id: `${request.providerId}-${request.projectId}`,
      projectId: request.projectId,
      providerId: request.providerId,
      projectType: request.projectType,
      versionId: request.versionId,
      versionNumber: request.versionNumber,
      fileName: request.fileName,
      installedAt: new Date().toISOString()
    };

    // Update manifest
    const manifest = await this.getManifest(request.instanceId);
    const filtered = manifest.installedItems.filter(
      (item) => item.projectId !== request.projectId
    );
    filtered.push(installedItem);

    await this.saveManifest({
      instanceId: request.instanceId,
      installedItems: filtered,
      updatedAt: new Date().toISOString()
    });

    return installedItem;
  }

  async uninstall(instanceId: string, projectId: string): Promise<void> {
    const manifest = await this.getManifest(instanceId);
    const itemToUninstall = manifest.installedItems.find((item) => item.projectId === projectId);

    if (!itemToUninstall) {
      return;
    }

    const subfolder = this.getSubfolder(itemToUninstall.projectType);
    const filePath = path.join(this.getInstanceDir(instanceId), subfolder, itemToUninstall.fileName);

    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore if already deleted from disk
    }

    const updatedItems = manifest.installedItems.filter((item) => item.projectId !== projectId);
    await this.saveManifest({
      instanceId,
      installedItems: updatedItems,
      updatedAt: new Date().toISOString()
    });
  }
}
