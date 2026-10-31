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
import { isClientOnlyMod, pruneClientOnlyMods } from './client-mod-filter.js';
import { extractZip } from './zip-extractor.js';

const PLUGIN_LOADERS = new Set(['paper', 'purpur', 'spigot', 'bukkit']);

export class ContentInstallerService {
  constructor(private readonly dataDir: string = path.join(process.cwd(), 'data', 'servers')) {}

  private getInstanceDir(instanceId: string): string {
    return path.join(this.dataDir, instanceId);
  }

  private getManifestPath(instanceId: string): string {
    return path.join(this.getInstanceDir(instanceId), 'singularity-manifest.json');
  }

  private async getInstanceLoader(instanceId: string): Promise<string | null> {
    try {
      const metaPath = path.join(this.getInstanceDir(instanceId), 'singularity-instance.json');
      const raw = await fs.readFile(metaPath, 'utf8');
      const data = JSON.parse(raw) as { loader?: string };
      return data.loader ? data.loader.toLowerCase() : null;
    } catch {
      return null;
    }
  }

  /**
   * Computes the target subfolder considering both projectType and the server instance engine.
   * On Paper/Purpur/Spigot servers, mods do not exist; all executable jars belong in plugins/.
   */
  getSubfolder(projectType: ProjectType, serverLoader?: string | null): string {
    if (serverLoader && PLUGIN_LOADERS.has(serverLoader.toLowerCase())) {
      if (projectType === 'datapack') {
        return 'datapacks';
      }
      // Any mod or plugin JAR installed on a Paper/Purpur/Spigot server must go to plugins/
      return 'plugins';
    }

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
    const serverLoader = await this.getInstanceLoader(request.instanceId);
    const isPluginEngine = Boolean(serverLoader && PLUGIN_LOADERS.has(serverLoader));

    // 1. Client-only mod prevention for dedicated servers
    const isModOnModEngine = !isPluginEngine && (request.projectType === 'mod' || !request.projectType);
    if (!request.force && isModOnModEngine) {
      if (isClientOnlyMod(request.fileName) || isClientOnlyMod(request.projectId)) {
        throw new Error(
          `El mod '${request.fileName}' es exclusivo de cliente (gráficos, sonido o interfaz) y no puede ejecutarse en un servidor dedicado porque causaría un crash al iniciar.`
        );
      }
    }

    // 2. Modpack / ZIP Archive extraction workflow
    const isModpack = request.projectType === 'modpack' || request.fileName.toLowerCase().endsWith('.zip');
    if (isModpack) {
      return this.installModpack(instanceDir, request);
    }

    // 3. Single JAR / Datapack file installation workflow
    const subfolder = this.getSubfolder(request.projectType, serverLoader);
    const destinationDir = path.join(instanceDir, subfolder);
    await fs.mkdir(destinationDir, { recursive: true });

    const finalPath = path.join(destinationDir, request.fileName);
    const tempPath = path.join(destinationDir, `temp-${Date.now()}-${request.fileName}`);

    // Download content stream
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

    // If destination was forced to plugins/ due to Paper engine, record effective type
    const effectiveProjectType = subfolder === 'plugins' ? 'plugin' : request.projectType;

    const installedItem: InstalledItem = {
      id: `${request.providerId}-${request.projectId}`,
      projectId: request.projectId,
      providerId: request.providerId,
      projectType: effectiveProjectType,
      versionId: request.versionId,
      versionNumber: request.versionNumber,
      fileName: request.fileName,
      destinationFolder: subfolder,
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

  private async installModpack(
    instanceDir: string,
    request: InstallContentRequest
  ): Promise<InstalledItem> {
    await fs.mkdir(instanceDir, { recursive: true });

    const tempArchive = path.join(instanceDir, `temp-modpack-${Date.now()}.zip`);
    const tempExtractDir = path.join(instanceDir, `temp-unpack-${Date.now()}`);

    // Download archive
    const res = await fetch(request.downloadUrl);
    if (!res.ok || !res.body) {
      throw new Error(
        `Error al descargar modpack ${request.fileName} desde ${request.downloadUrl} (HTTP ${res.status})`
      );
    }

    const fileStream = createWriteStream(tempArchive);
    await pipeline(Readable.fromWeb(res.body as WebReadableStream), fileStream);

    try {
      // Extract ZIP using system extractor
      await extractZip(tempArchive, tempExtractDir);

      // Check for 'overrides' directory (standard CurseForge / Modrinth format)
      const overridesDir = path.join(tempExtractDir, 'overrides');
      const hasOverrides = await fs.access(overridesDir).then(() => true).catch(() => false);

      if (hasOverrides) {
        await fs.cp(overridesDir, instanceDir, { recursive: true, force: true });
      } else {
        // Direct root extraction (server pack format)
        const entries = await fs.readdir(tempExtractDir, { withFileTypes: true });
        for (const entry of entries) {
          // Do not overwrite singularity metadata
          if (entry.name === 'singularity-instance.json' || entry.name === 'singularity-manifest.json') {
            continue;
          }
          await fs.cp(path.join(tempExtractDir, entry.name), path.join(instanceDir, entry.name), {
            recursive: true,
            force: true
          });
        }
      }

      // Prune client-only mods from mods/ folder
      const modsDir = path.join(instanceDir, 'mods');
      const prunedMods = await pruneClientOnlyMods(modsDir);

      const installedItem: InstalledItem = {
        id: `${request.providerId}-${request.projectId}`,
        projectId: request.projectId,
        providerId: request.providerId,
        projectType: 'modpack',
        versionId: request.versionId,
        versionNumber: request.versionNumber,
        fileName: request.fileName,
        destinationFolder: '',
        prunedClientMods: prunedMods,
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
    } finally {
      // Cleanup temp files
      await fs.rm(tempArchive, { force: true }).catch(() => {});
      await fs.rm(tempExtractDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  async uninstall(instanceId: string, projectId: string): Promise<void> {
    const manifest = await this.getManifest(instanceId);
    const itemToUninstall = manifest.installedItems.find((item) => item.projectId === projectId);

    if (!itemToUninstall) {
      return;
    }

    const serverLoader = await this.getInstanceLoader(instanceId);
    const subfolder = itemToUninstall.destinationFolder ?? this.getSubfolder(itemToUninstall.projectType, serverLoader);
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
