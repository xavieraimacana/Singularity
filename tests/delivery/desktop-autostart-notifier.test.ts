import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import { AutoStartManager } from '../../src/delivery/desktop/autostart-manager.js';
import { NativeNotifier, type DesktopNotificationConfig } from '../../src/delivery/desktop/native-notifier.js';

describe('Desktop Delivery > AutoStartManager', () => {
  let manager: AutoStartManager;

  beforeEach(() => {
    manager = new AutoStartManager();
  });

  it('should detect shouldStartHidden when --hidden flag is in process.argv', () => {
    expect(manager.shouldStartHidden(['node', 'singularity.js', '--hidden'])).toBe(true);
    expect(manager.shouldStartHidden(['node', 'singularity.js', '--minimized'])).toBe(true);
    expect(manager.shouldStartHidden(['node', 'singularity.js'])).toBe(false);
  });

  it('should safely return disabled settings in non-electron or mock test environments', () => {
    const settings = manager.getSettings();
    expect(settings).toHaveProperty('enabled');
    expect(settings).toHaveProperty('startHidden');
  });
});

describe('Desktop Delivery > NativeNotifier', () => {
  const testConfigPath = path.resolve('data/test-notifications.json');
  let notifier: NativeNotifier;

  beforeEach(async () => {
    try {
      await fs.rm(testConfigPath, { force: true });
    } catch {}
    notifier = new NativeNotifier(testConfigPath);
    await notifier.init();
  });

  afterEach(async () => {
    try {
      await fs.rm(testConfigPath, { force: true });
    } catch {}
  });

  it('should initialize with default configuration enabled for all categories', () => {
    const config = notifier.getConfig();
    expect(config.enabled).toBe(true);
    expect(config.serverStatus).toBe(true);
    expect(config.serverCrash).toBe(true);
    expect(config.playerEvents).toBe(true);
    expect(config.sound).toBe(true);
  });

  it('should persist configuration updates to disk', async () => {
    const updated = await notifier.updateConfig({
      playerEvents: false,
      sound: false
    });

    expect(updated.playerEvents).toBe(false);
    expect(updated.sound).toBe(false);

    // Create fresh instance pointing to same file to verify persistence
    const reloaded = new NativeNotifier(testConfigPath);
    await reloaded.init();
    expect(reloaded.getConfig().playerEvents).toBe(false);
    expect(reloaded.getConfig().sound).toBe(false);
    expect(reloaded.getConfig().serverStatus).toBe(true);
  });

  it('should suppress notifications when master enabled flag is false', async () => {
    await notifier.updateConfig({ enabled: false });

    const sent = notifier.notify({
      title: 'Test Title',
      body: 'Test Body',
      category: 'serverStatus'
    });

    expect(sent).toBe(false);
  });

  it('should suppress notifications for disabled categories', async () => {
    await notifier.updateConfig({ playerEvents: false });

    const sent = notifier.notify({
      title: '👤 Player joined',
      body: 'Player joined test server',
      category: 'playerEvents'
    });

    expect(sent).toBe(false);
  });
});
