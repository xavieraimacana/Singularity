import { app } from 'electron';

export interface AutoStartSettings {
  enabled: boolean;
  startHidden: boolean;
}

export class AutoStartManager {
  isSupported(): boolean {
    return process.platform === 'win32' || process.platform === 'darwin';
  }

  getSettings(): AutoStartSettings {
    if (!this.isSupported() || !app?.getLoginItemSettings) {
      return { enabled: false, startHidden: false };
    }

    try {
      const settings = app.getLoginItemSettings() as any;
      const hasHiddenArg = Array.isArray(settings?.args) && settings.args.includes('--hidden');
      return {
        enabled: Boolean(settings?.openAtLogin),
        startHidden: Boolean(settings?.openAsHidden || hasHiddenArg)
      };
    } catch {
      return { enabled: false, startHidden: false };
    }
  }

  setSettings(enabled: boolean, startHidden: boolean = false): AutoStartSettings {
    if (!this.isSupported() || !app?.setLoginItemSettings) {
      return { enabled: false, startHidden: false };
    }

    try {
      const args = startHidden ? ['--hidden'] : [];
      app.setLoginItemSettings({
        openAtLogin: enabled,
        openAsHidden: startHidden,
        args
      });
      return this.getSettings();
    } catch (err) {
      console.error('[AutoStartManager] Error al configurar arranque con el sistema:', err);
      return this.getSettings();
    }
  }

  shouldStartHidden(argv: string[] = process.argv): boolean {
    if (argv.includes('--hidden') || argv.includes('--minimized')) {
      return true;
    }
    if (this.isSupported() && app?.getLoginItemSettings) {
      try {
        const settings = app.getLoginItemSettings();
        if (settings.wasOpenedAsHidden) {
          return true;
        }
      } catch {
        // Ignore detection errors in headless / mocked contexts
      }
    }
    return false;
  }
}
