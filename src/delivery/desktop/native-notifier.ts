import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { app, Notification, type Tray, type BrowserWindow } from 'electron';

export interface DesktopNotificationConfig {
  enabled: boolean;
  serverStatus: boolean;
  serverCrash: boolean;
  playerEvents: boolean;
  sound: boolean;
}

export const DEFAULT_NOTIFICATION_CONFIG: DesktopNotificationConfig = {
  enabled: true,
  serverStatus: true,
  serverCrash: true,
  playerEvents: true,
  sound: true
};

export interface NotificationOptions {
  title: string;
  body: string;
  iconType?: 'info' | 'warning' | 'error' | 'success';
  category?: 'serverStatus' | 'serverCrash' | 'playerEvents' | 'general';
  silent?: boolean;
  onClick?: () => void;
}

export class NativeNotifier {
  private config: DesktopNotificationConfig = { ...DEFAULT_NOTIFICATION_CONFIG };
  private readonly configPath: string;
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow | null = null;
  private iconPath: string | null = null;

  constructor(customConfigPath?: string) {
    if (customConfigPath) {
      this.configPath = customConfigPath;
    } else {
      try {
        const userData = app?.getPath ? app.getPath('userData') : path.join(process.cwd(), 'data');
        this.configPath = path.join(userData, 'singularity-notifications.json');
      } catch {
        this.configPath = path.join(process.cwd(), 'data', 'singularity-notifications.json');
      }
    }
  }

  async init(options?: { tray?: Tray; mainWindow?: BrowserWindow; iconPath?: string }): Promise<void> {
    if (options?.tray) this.tray = options.tray;
    if (options?.mainWindow) this.mainWindow = options.mainWindow;
    if (options?.iconPath) this.iconPath = options.iconPath;

    try {
      if (existsSync(this.configPath)) {
        const raw = await fs.readFile(this.configPath, 'utf8');
        const parsed = JSON.parse(raw);
        this.config = { ...DEFAULT_NOTIFICATION_CONFIG, ...parsed };
      }
    } catch {
      // Use defaults if load fails
    }
  }

  setWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  setTray(tray: Tray): void {
    this.tray = tray;
  }

  setIconPath(iconPath: string): void {
    this.iconPath = iconPath;
  }

  getConfig(): DesktopNotificationConfig {
    return { ...this.config };
  }

  async updateConfig(updates: Partial<DesktopNotificationConfig>): Promise<DesktopNotificationConfig> {
    this.config = { ...this.config, ...updates };
    try {
      await fs.mkdir(path.dirname(this.configPath), { recursive: true });
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
    } catch (err) {
      console.error('[NativeNotifier] Error al guardar configuración de notificaciones:', err);
    }
    return this.getConfig();
  }

  notify(options: NotificationOptions): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const category = options.category || 'general';
    if (category === 'serverStatus' && !this.config.serverStatus) return false;
    if (category === 'serverCrash' && !this.config.serverCrash) return false;
    if (category === 'playerEvents' && !this.config.playerEvents) return false;

    const shouldBeSilent = options.silent ?? !this.config.sound;

    // Check if Electron native notifications are supported in this environment
    const isSupported = typeof Notification !== 'undefined' && typeof Notification.isSupported === 'function' && Notification.isSupported();

    if (isSupported) {
      try {
        const notification = new Notification({
          title: options.title,
          body: options.body,
          icon: this.iconPath || undefined,
          silent: shouldBeSilent
        });

        notification.on('click', () => {
          if (options.onClick) {
            options.onClick();
          } else if (this.mainWindow) {
            if (this.mainWindow.isMinimized()) this.mainWindow.restore();
            this.mainWindow.show();
            this.mainWindow.focus();
          }
        });

        notification.show();
        return true;
      } catch (err) {
        console.warn('[NativeNotifier] Error al mostrar Notification nativa, usando fallback de tray:', err);
      }
    }

    // Fallback: Windows Tray Balloon
    if (this.tray && process.platform === 'win32') {
      try {
        const iconType = options.iconType === 'error' ? 'error' : options.iconType === 'warning' ? 'warning' : 'info';
        this.tray.displayBalloon({
          title: options.title,
          content: options.body,
          iconType
        });
        return true;
      } catch {
        // Ignore fallback error
      }
    }

    return false;
  }
}
