import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync, createReadStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { BackupEntry, CreateBackupOptions } from '../models/backup-entry.js';
import type { ServerLifecycleService } from '../../servers/services/server-lifecycle.js';
import type { ProcessRunner } from '../../process-supervisor/services/process-runner.js';

export class BackupService {
  constructor(
    private readonly serverLifecycle: ServerLifecycleService,
    private readonly processRunner?: ProcessRunner
  ) {}

  private getBackupsDir(serverId: string): string {
    const instanceDir = this.serverLifecycle.getInstanceDir(serverId);
    return path.join(instanceDir, 'backups');
  }

  private getManifestPath(serverId: string): string {
    return path.join(this.getBackupsDir(serverId), 'singularity-backups.json');
  }

  private async readManifest(serverId: string): Promise<Record<string, BackupEntry>> {
    const manifestPath = this.getManifestPath(serverId);
    if (!existsSync(manifestPath)) {
      return {};
    }
    try {
      const raw = await fs.readFile(manifestPath, 'utf8');
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  private async writeManifest(serverId: string, entries: Record<string, BackupEntry>): Promise<void> {
    const manifestPath = this.getManifestPath(serverId);
    await fs.writeFile(manifestPath, JSON.stringify(entries, null, 2), 'utf8');
  }

  async listBackups(serverId: string): Promise<BackupEntry[]> {
    const backupsDir = this.getBackupsDir(serverId);
    await fs.mkdir(backupsDir, { recursive: true });

    const manifest = await this.readManifest(serverId);
    const files = await fs.readdir(backupsDir);
    const result: BackupEntry[] = [];

    for (const file of files) {
      if (file === 'singularity-backups.json') continue;
      if (!file.endsWith('.tar.gz') && !file.endsWith('.zip')) continue;

      const filePath = path.join(backupsDir, file);
      const stat = await fs.stat(filePath);

      // Match with manifest or generate default entry
      const existing = Object.values(manifest).find((m) => m.filename === file);
      if (existing) {
        result.push({
          ...existing,
          sizeBytes: stat.size
        });
      } else {
        const id = `bkp_${file.replace(/[^a-zA-Z0-9]/g, '_')}`;
        result.push({
          id,
          serverId,
          filename: file,
          sizeBytes: stat.size,
          createdAt: stat.birthtime.toISOString(),
          format: file.endsWith('.zip') ? 'zip' : 'tar.gz'
        });
      }
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createBackup(serverId: string, options: CreateBackupOptions = {}): Promise<BackupEntry> {
    const instance = await this.serverLifecycle.getInstance(serverId);
    if (!instance) {
      throw new Error(`Servidor con ID '${serverId}' no encontrado.`);
    }

    const instanceDir = this.serverLifecycle.getInstanceDir(serverId);
    const backupsDir = this.getBackupsDir(serverId);
    await fs.mkdir(backupsDir, { recursive: true });

    const id = `bkp_${randomUUID().slice(0, 8)}`;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeServerName = instance.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeServerName}_${timestamp}.tar.gz`;
    const targetFile = path.join(backupsDir, filename);

    // Execute tar compression
    // Exclude backups folder itself to avoid recursive inclusion
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('tar', ['-czf', targetFile, '--exclude=backups', '.'], {
        cwd: instanceDir,
        stdio: 'ignore'
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Fallo al empaquetar backup con código ${code}`));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Error al invocar tar: ${err.message}`));
      });
    });

    const stat = await fs.stat(targetFile);
    const entry: BackupEntry = {
      id,
      serverId,
      filename,
      sizeBytes: stat.size,
      createdAt: new Date().toISOString(),
      comment: options.comment,
      format: 'tar.gz'
    };

    const manifest = await this.readManifest(serverId);
    manifest[id] = entry;
    await this.writeManifest(serverId, manifest);

    return entry;
  }

  async restoreBackup(serverId: string, backupId: string): Promise<void> {
    // Check if server is running
    if (this.processRunner) {
      const state = this.processRunner.getState(serverId);
      if (state && state.status !== 'offline' && state.status !== 'crashed') {
        throw new Error('No se puede restaurar un backup mientras el servidor esté en línea. Detén el servidor primero.');
      }
    }

    const instanceDir = this.serverLifecycle.getInstanceDir(serverId);
    const backups = await this.listBackups(serverId);
    const backup = backups.find((b) => b.id === backupId || b.filename === backupId);

    if (!backup) {
      throw new Error(`Backup con identificador '${backupId}' no encontrado.`);
    }

    const backupFile = path.join(this.getBackupsDir(serverId), backup.filename);
    if (!existsSync(backupFile)) {
      throw new Error(`Archivo físico de backup '${backup.filename}' no existe en disco.`);
    }

    // Extract archive over instanceDir
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('tar', ['-xzf', backupFile, '-C', instanceDir], {
        cwd: instanceDir,
        stdio: 'ignore'
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Fallo al restaurar backup con código de salida ${code}`));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Error al descomprimir archivo: ${err.message}`));
      });
    });
  }

  async deleteBackup(serverId: string, backupId: string): Promise<boolean> {
    const backups = await this.listBackups(serverId);
    const backup = backups.find((b) => b.id === backupId || b.filename === backupId);

    if (!backup) {
      return false;
    }

    const backupFile = path.join(this.getBackupsDir(serverId), backup.filename);
    try {
      if (existsSync(backupFile)) {
        await fs.unlink(backupFile);
      }
    } catch {
      // Ignore if file was already gone
    }

    const manifest = await this.readManifest(serverId);
    delete manifest[backup.id];
    await this.writeManifest(serverId, manifest);

    return true;
  }

  getBackupFilePath(serverId: string, backupId: string): string {
    const backupsDir = this.getBackupsDir(serverId);
    // Find matching filename or backupId
    return path.join(backupsDir, backupId);
  }
}
