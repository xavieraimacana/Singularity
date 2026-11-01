import path from 'node:path';
import fs from 'node:fs';
import {
  Tray,
  Menu,
  nativeImage,
  type NativeImage,
  type BrowserWindow,
  type MenuItemConstructorOptions,
  shell
} from 'electron';
import type { IdeBridge } from './ide-bridge.js';
import type { ConnectionManager } from './connection-manager.js';
import type { DesktopServerService, TrayServerItem } from './desktop-server-service.js';
import type { NativeNotifier } from './native-notifier.js';
import type { AutoStartManager } from './autostart-manager.js';

export interface TrayManagerOptions {
  mainWindow: BrowserWindow;
  ideBridge: IdeBridge;
  serversDir: string;
  onQuit: () => void;
  connectionManager?: ConnectionManager;
  onSwitchConnection?: (id: string) => Promise<void>;
  desktopServerService?: DesktopServerService;
  nativeNotifier?: NativeNotifier;
  autoStartManager?: AutoStartManager;
}

export class TrayManager {
  private tray: Tray | null = null;
  private readonly mainWindow: BrowserWindow;
  private readonly ideBridge: IdeBridge;
  private readonly serversDir: string;
  private readonly onQuit: () => void;
  private readonly connectionManager?: ConnectionManager;
  private readonly onSwitchConnection?: (id: string) => Promise<void>;
  private readonly desktopServerService?: DesktopServerService;
  private readonly nativeNotifier?: NativeNotifier;
  private readonly autoStartManager?: AutoStartManager;

  private cachedServers: TrayServerItem[] = [];
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor(options: TrayManagerOptions) {
    this.mainWindow = options.mainWindow;
    this.ideBridge = options.ideBridge;
    this.serversDir = options.serversDir;
    this.onQuit = options.onQuit;
    this.connectionManager = options.connectionManager;
    this.onSwitchConnection = options.onSwitchConnection;
    this.desktopServerService = options.desktopServerService;
    this.nativeNotifier = options.nativeNotifier;
    this.autoStartManager = options.autoStartManager;
  }

  getTray(): Tray | null {
    return this.tray;
  }

  private createTrayIcon(): NativeImage {
    // Check multiple candidate locations for tray-icon.png or icon.png
    const candidates = [
      path.join(__dirname, 'assets', 'tray-icon.png'),
      path.join(__dirname, 'assets', 'icon.png'),
      path.join(process.cwd(), 'src', 'delivery', 'desktop', 'assets', 'tray-icon.png'),
      path.join(process.cwd(), 'src', 'delivery', 'desktop', 'assets', 'icon.png'),
      path.join(process.cwd(), 'resources', 'icon.png')
    ];
    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        return nativeImage.createFromPath(cand);
      }
    }

    // 16x16 RGBA buffer fallback (Cyan/Emerald cube)
    const size = 16;
    const buffer = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const offset = (y * size + x) * 4;
        const isBorder = x === 0 || x === size - 1 || y === 0 || y === size - 1;
        const isCenter = x >= 4 && x <= 11 && y >= 4 && y <= 11;

        if (isCenter) {
          buffer[offset] = 16;
          buffer[offset + 1] = 185;
          buffer[offset + 2] = 129;
          buffer[offset + 3] = 255;
        } else if (!isBorder) {
          buffer[offset] = 6;
          buffer[offset + 1] = 182;
          buffer[offset + 2] = 212;
          buffer[offset + 3] = 255;
        }
      }
    }

    return nativeImage.createFromBuffer(buffer, { width: size, height: size });
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'online':
        return '🟢';
      case 'starting':
      case 'stopping':
        return '🟡';
      case 'crashed':
        return '🔴';
      default:
        return '⚫';
    }
  }

  private async refreshServers(): Promise<void> {
    if (!this.desktopServerService) return;
    try {
      this.cachedServers = await this.desktopServerService.getServers();
      this.updateMenu();
    } catch {
      // Ignore refresh error
    }
  }

  private buildContextMenu(): Menu {
    const activeProfile = this.connectionManager?.getActiveProfile();
    const profiles = this.connectionManager?.getProfiles() || [];

    // 1. Connection switcher submenu
    const connectionSubmenu: MenuItemConstructorOptions[] = profiles.map((p) => {
      const isCurrent = p.id === activeProfile?.id;
      return {
        label: `${isCurrent ? '✓ ' : '   '}${p.name} (${p.type === 'local' ? 'Local PC' : 'Nube VPS'})`,
        type: 'normal' as const,
        enabled: !isCurrent,
        click: async () => {
          if (this.onSwitchConnection) {
            await this.onSwitchConnection(p.id);
            this.updateMenu();
          }
        }
      };
    });

    if (connectionSubmenu.length > 0) {
      connectionSubmenu.push({ type: 'separator' });
      connectionSubmenu.push({
        label: '⚙️ Gestionar Conexiones...',
        click: () => {
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      });
    }

    // 2. Servers interactive submenu
    const serverMenuItems: MenuItemConstructorOptions[] = [];
    if (this.cachedServers.length === 0) {
      serverMenuItems.push({
        label: 'Sin servidores instalados',
        enabled: false
      });
      serverMenuItems.push({
        label: '➕ Crear Servidor en Dashboard',
        click: () => {
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      });
    } else {
      for (const server of this.cachedServers) {
        const emoji = this.getStatusEmoji(server.status);
        const serverSubmenu: MenuItemConstructorOptions[] = [
          {
            label: `Estado: ${server.status.toUpperCase()} (${server.loader} ${server.gameVersion})`,
            enabled: false
          },
          {
            label: `Puerto: :${server.port}`,
            enabled: false
          },
          { type: 'separator' }
        ];

        if (server.status === 'offline' || server.status === 'crashed') {
          serverSubmenu.push({
            label: '▶️ Iniciar Servidor',
            click: async () => {
              if (this.desktopServerService) {
                try {
                  await this.desktopServerService.startServer(server.id);
                  await this.refreshServers();
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : 'Error desconocido';
                  this.showNotification('Error al iniciar', msg, 'error');
                }
              }
            }
          });
        }

        if (server.status === 'online') {
          serverSubmenu.push({
            label: '⏹ Detener Servidor (/stop)',
            click: async () => {
              if (this.desktopServerService) {
                try {
                  await this.desktopServerService.stopServer(server.id);
                  await this.refreshServers();
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : 'Error desconocido';
                  this.showNotification('Error al detener', msg, 'error');
                }
              }
            }
          });
          serverSubmenu.push({
            label: '🔄 Reiniciar Servidor',
            click: async () => {
              if (this.desktopServerService) {
                try {
                  await this.desktopServerService.restartServer(server.id);
                  await this.refreshServers();
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : 'Error desconocido';
                  this.showNotification('Error al reiniciar', msg, 'error');
                }
              }
            }
          });
        }

        serverSubmenu.push({ type: 'separator' });
        serverSubmenu.push({
          label: '📂 Abrir Carpeta de Instancia',
          click: () => {
            const p = path.join(this.serversDir, server.id);
            shell.openPath(p);
          }
        });
        serverSubmenu.push({
          label: '💻 Abrir en Antigravity IDE',
          click: async () => {
            const p = path.join(this.serversDir, server.id);
            const activeProfile = this.connectionManager?.getActiveProfile();
            await this.ideBridge.openInIde(p, 'antigravity', {
              isRemote: activeProfile?.type === 'remote',
              sftpHost: activeProfile?.sftpHost || '157.137.223.54',
              sftpPort: activeProfile?.sftpPort || 2022,
              username: 'admin',
              serverName: server.name
            });
          }
        });

        serverMenuItems.push({
          label: `${emoji} ${server.name} (:${server.port})`,
          submenu: serverSubmenu
        });
      }

      // Batch actions
      if (this.cachedServers.length > 1) {
        serverMenuItems.push({ type: 'separator' });
        const anyOffline = this.cachedServers.some((s) => s.status === 'offline' || s.status === 'crashed');
        const anyOnline = this.cachedServers.some((s) => s.status === 'online');

        if (anyOffline) {
          serverMenuItems.push({
            label: '▶️ Iniciar Todos los Servidores',
            click: async () => {
              for (const s of this.cachedServers) {
                if (s.status === 'offline' && this.desktopServerService) {
                  this.desktopServerService.startServer(s.id).catch(() => {});
                }
              }
              await this.refreshServers();
            }
          });
        }
        if (anyOnline) {
          serverMenuItems.push({
            label: '⏹ Detener Todos los Servidores',
            click: async () => {
              for (const s of this.cachedServers) {
                if (s.status === 'online' && this.desktopServerService) {
                  this.desktopServerService.stopServer(s.id).catch(() => {});
                }
              }
              await this.refreshServers();
            }
          });
        }
      }
    }

    const activeLabel = activeProfile ? `📡 ${activeProfile.name}` : '🌌 Singularity';
    const autoStartSettings = this.autoStartManager?.getSettings();
    const notifConfig = this.nativeNotifier?.getConfig();

    return Menu.buildFromTemplate([
      {
        label: '🌌 Singularity Mission Control',
        enabled: false
      },
      {
        label: activeLabel,
        enabled: false
      },
      { type: 'separator' },
      {
        label: `🎮 Servidores Minecraft (${this.cachedServers.length})`,
        submenu: serverMenuItems
      },
      {
        label: '🌐 Cambiar Entorno / Servidor',
        submenu: connectionSubmenu.length > 0 ? connectionSubmenu : undefined
      },
      { type: 'separator' },
      {
        label: '🖥️ Mostrar Panel Principal',
        click: () => {
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      },
      {
        label: '📥 Ocultar a la Bandeja',
        click: () => {
          this.mainWindow.hide();
        }
      },
      { type: 'separator' },
      {
        label: '⚙️ Configuración del Sistema',
        submenu: [
          {
            label: '🚀 Iniciar con Windows',
            type: 'checkbox',
            checked: autoStartSettings?.enabled ?? false,
            click: (menuItem) => {
              const current = this.autoStartManager?.getSettings();
              this.autoStartManager?.setSettings(menuItem.checked, current?.startHidden ?? false);
              this.updateMenu();
            }
          },
          {
            label: '📥 Iniciar Oculto en Bandeja',
            type: 'checkbox',
            checked: autoStartSettings?.startHidden ?? false,
            enabled: autoStartSettings?.enabled ?? false,
            click: (menuItem) => {
              const current = this.autoStartManager?.getSettings();
              this.autoStartManager?.setSettings(current?.enabled ?? true, menuItem.checked);
              this.updateMenu();
            }
          },
          { type: 'separator' },
          {
            label: '🔔 Notificaciones Nativas',
            type: 'checkbox',
            checked: notifConfig?.enabled ?? true,
            click: async (menuItem) => {
              await this.nativeNotifier?.updateConfig({ enabled: menuItem.checked });
              this.updateMenu();
            }
          }
        ]
      },
      { type: 'separator' },
      {
        label: '📂 Abrir Carpeta de Servidores',
        click: () => {
          shell.openPath(this.serversDir);
        }
      },
      {
        label: '💻 Abrir en Antigravity IDE',
        click: async () => {
          await this.ideBridge.openInIde(this.serversDir, 'antigravity');
        }
      },
      { type: 'separator' },
      {
        label: '❌ Salir de Singularity',
        click: () => {
          this.onQuit();
        }
      }
    ]);
  }

  updateMenu(): void {
    if (this.tray) {
      this.tray.setContextMenu(this.buildContextMenu());
    }
  }

  init(): void {
    const icon = this.createTrayIcon();
    this.tray = new Tray(icon);
    this.tray.setToolTip('🌌 Singularity - Minecraft Server Mission Control');
    this.updateMenu();

    // Setup event listeners on desktop server service
    if (this.desktopServerService) {
      this.desktopServerService.onStatusChange(({ name, status }) => {
        if (status === 'online') {
          this.showNotification('🟢 Servidor en Línea', `El servidor "${name}" inició correctamente y está listo.`, 'info', 'serverStatus');
        } else if (status === 'crashed') {
          this.showNotification('🔴 Alerta de Crash', `El servidor "${name}" se detuvo de forma inesperada.`, 'error', 'serverCrash');
        }
        this.refreshServers().catch(() => {});
      });

      this.desktopServerService.onCrashDetected(({ name, message, resolution }) => {
        const detail = resolution ? `${message}\nSolución: ${resolution}` : message;
        this.showNotification(`⚠️ Crash Detectado en "${name}"`, detail, 'warning', 'serverCrash');
      });

      this.desktopServerService.onPlayerEvent(({ name, event }) => {
        const isJoin = event.type === 'join';
        const title = isJoin ? `👤 Jugador Conectado` : `👋 Jugador Desconectado`;
        const body = `${event.username} ${isJoin ? 'se unió a' : 'abandonó'} "${name}"`;
        this.showNotification(title, body, 'info', 'playerEvents');
      });

      // Initial servers fetch and 5-second polling loop
      this.refreshServers().catch(() => {});
      this.refreshTimer = setInterval(() => {
        this.refreshServers().catch(() => {});
      }, 5000);
    }

    this.tray.on('click', () => {
      if (this.mainWindow.isVisible()) {
        if (this.mainWindow.isFocused()) {
          this.mainWindow.hide();
        } else {
          this.mainWindow.focus();
        }
      } else {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });
  }

  showNotification(
    title: string,
    content: string,
    iconType: 'info' | 'warning' | 'error' = 'info',
    category: 'serverStatus' | 'serverCrash' | 'playerEvents' | 'general' = 'general'
  ): void {
    if (this.nativeNotifier) {
      this.nativeNotifier.notify({
        title,
        body: content,
        iconType,
        category
      });
    } else if (this.tray && process.platform === 'win32') {
      this.tray.displayBalloon({
        title,
        content,
        iconType
      });
    }
  }

  showBalloon(title: string, content: string, iconType: 'info' | 'warning' | 'error' = 'info'): void {
    this.showNotification(title, content, iconType, 'general');
  }

  destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
