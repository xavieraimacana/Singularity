import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ContentInstallerService } from '../../src/content-catalog/services/content-installer.js';
import type { InstallContentRequest } from '../../src/content-catalog/models/catalog-item.js';

function createMockStream(content: Buffer): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(content);
      controller.close();
    }
  });
}

describe('ContentInstallerService', () => {
  const testServersDir = path.join(process.cwd(), 'data', 'test-catalog-servers');
  const instanceId = 'srv_test_installer';
  const instanceDir = path.join(testServersDir, instanceId);

  let installer: ContentInstallerService;

  beforeEach(async () => {
    await fs.mkdir(path.join(instanceDir, 'mods'), { recursive: true });
    await fs.mkdir(path.join(instanceDir, 'plugins'), { recursive: true });
    await fs.mkdir(path.join(instanceDir, 'datapacks'), { recursive: true });

    installer = new ContentInstallerService(testServersDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(testServersDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup
    }
  });

  it('should install a mod into mods/ folder and record it in singularity-manifest.json', async () => {
    const mockFileContent = Buffer.from('mock-jar-content');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: createMockStream(mockFileContent)
    } as unknown as Response);

    const request: InstallContentRequest = {
      instanceId,
      providerId: 'modrinth',
      projectId: 'AANobbMI',
      projectType: 'mod',
      versionId: 'ver_01',
      versionNumber: '0.6.0',
      fileName: 'sodium-fabric-0.6.0.jar',
      downloadUrl: 'https://example.com/sodium-fabric-0.6.0.jar',
      hashes: {
        sha1: 'test-sha1'
      }
    };

    const installed = await installer.install(request);

    expect(installed.fileName).toBe('sodium-fabric-0.6.0.jar');
    expect(installed.projectType).toBe('mod');

    // Check file on disk
    const targetFile = path.join(instanceDir, 'mods', 'sodium-fabric-0.6.0.jar');
    const exists = await fs
      .access(targetFile)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);

    // Check manifest
    const manifest = await installer.getManifest(instanceId);
    expect(manifest.installedItems.length).toBe(1);
    expect(manifest.installedItems[0]?.fileName).toBe('sodium-fabric-0.6.0.jar');
  });

  it('should uninstall an item, delete its file and remove from manifest', async () => {
    const mockFileContent = Buffer.from('mock-plugin-content');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: createMockStream(mockFileContent)
    } as unknown as Response);

    const request: InstallContentRequest = {
      instanceId,
      providerId: 'modrinth',
      projectId: 'plugin_01',
      projectType: 'plugin',
      versionId: 'v1',
      versionNumber: '1.0.0',
      fileName: 'viaversion.jar',
      downloadUrl: 'https://example.com/viaversion.jar'
    };

    await installer.install(request);
    let manifest = await installer.getManifest(instanceId);
    expect(manifest.installedItems.length).toBe(1);

    // Uninstall
    await installer.uninstall(instanceId, 'plugin_01');
    manifest = await installer.getManifest(instanceId);
    expect(manifest.installedItems.length).toBe(0);

    const fileStillExists = await fs
      .access(path.join(instanceDir, 'plugins', 'viaversion.jar'))
      .then(() => true)
      .catch(() => false);
    expect(fileStillExists).toBe(false);
  });
});
