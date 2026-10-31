import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ServerLifecycleService } from '../../src/servers/services/server-lifecycle.js';
import { BackupService } from '../../src/backups/services/backup-service.js';

describe('Backups Domain > BackupService', () => {
  const testDir = path.resolve('data/test-backups-suite');
  let lifecycle: ServerLifecycleService;
  let service: BackupService;
  let instanceId: string;

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    lifecycle = new ServerLifecycleService(testDir);
    service = new BackupService(lifecycle);

    const inst = await lifecycle.createInstance({
      name: 'World Test',
      loader: 'paper',
      gameVersion: '1.20.4'
    });
    instanceId = inst.id;

    // Create a dummy file in the server directory
    const instanceDir = lifecycle.getInstanceDir(instanceId);
    await fs.writeFile(path.join(instanceDir, 'test-file.txt'), 'Hello Minecraft Backup World', 'utf8');
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  it('should create a tar.gz backup and list it', async () => {
    const backup = await service.createBackup(instanceId, {
      comment: 'Initial automated backup'
    });

    expect(backup.id).toBeDefined();
    expect(backup.serverId).toBe(instanceId);
    expect(backup.filename.endsWith('.tar.gz')).toBe(true);
    expect(backup.comment).toBe('Initial automated backup');
    expect(backup.sizeBytes).toBeGreaterThan(0);

    const list = await service.listBackups(instanceId);
    expect(list.length).toBe(1);
    expect(list[0]?.id).toBe(backup.id);
  });

  it('should restore a backup over instance directory', async () => {
    const backup = await service.createBackup(instanceId);
    const instanceDir = lifecycle.getInstanceDir(instanceId);

    // Modify file
    const targetFile = path.join(instanceDir, 'test-file.txt');
    await fs.writeFile(targetFile, 'Modified content that should be overwritten', 'utf8');

    // Restore
    await service.restoreBackup(instanceId, backup.id);

    const content = await fs.readFile(targetFile, 'utf8');
    expect(content).toBe('Hello Minecraft Backup World');
  });

  it('should delete a backup from disk and manifest', async () => {
    const backup = await service.createBackup(instanceId);
    let list = await service.listBackups(instanceId);
    expect(list.length).toBe(1);

    const deleted = await service.deleteBackup(instanceId, backup.id);
    expect(deleted).toBe(true);

    list = await service.listBackups(instanceId);
    expect(list.length).toBe(0);
  });
});
