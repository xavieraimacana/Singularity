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

export interface TrayManagerOptions {
  mainWindow: BrowserWindow;
  ideBridge: IdeBridge;
  serversDir: string;
  onQuit: () => void;
  connectionManager?: ConnectionManager;
  onSwitchConnection?: (id: string) => Promise<void>;
  desktopServerService?: DesktopServerService;
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
          buffer[offset + 3] = 200;
        } else {
          buffer[offset + 3] = 0;
        }
      }
    }

    return nativeImage.createFromBuffer(buffer, { width: size, height: size });
  }

  async refreshServers(): Promise<void> {
    if (this.desktopServerService) {
      try {
        this.cachedServers = await this.desktopServerService.getServers();
      } catch {
        // Keep previous state if query fails temporarily
      }
    }
    this.updateMenu();
  }

  buildContextMenu(): Menu {
    const profiles = this.connectionManager?.getProfiles() || [];
    const activeProfile = this.connectionManager?.getActiveProfile();

    // 1. Connection Submenu
    const connectionSubmenu: MenuItemConstructorOptions[] = profiles.map((p) => ({
      label: `${p.name} (${p.type === 'remote' ? '☁️ Remoto' : '💻 Local'})`,
      type: 'radio' as const,
      checked: p.id === activeProfile?.id,
      click: async () => {
        if (this.onSwitchConnection && p.id !== activeProfile?.id) {
          await this.onSwitchConnection(p.id);
          this.updateMenu();
        }
      }
    }));

    // 2. Server List & Actions Submenu
    const serverMenuItems: MenuItemConstructorOptions[] = [];
    if (this.cachedServers.length === 0) {
      serverMenuItems.push({
        label: 'Sin servidores creados (Usa el Panel)',
        enabled: false
      });
    } else {
      for (const srv of this.cachedServers) {
        const isOnline = srv.status === 'online';
        const isTransitioning = srv.status === 'starting' || srv.status === 'stopping';
        const statusEmoji = isOnline
          ? '🟢'
          : srv.status === 'crashed'
          ? '🔴'
          : isTransitioning
          ? '🟡'
          : '⚫';

        const srvSubmenu: MenuItemConstructorOptions[] = [
          {
            label: `${srv.name} (v${srv.gameVersion} • Port ${srv.port})`,
            enabled: false
          },
          {
            label: `Estado: ${srv.status.toUpperCase()}`,
            enabled: false
          },
          { type: 'separator' }
        ];

        if (isOnline) {
          srvSubmenu.push({
            label: '⏹ Detener Servidor (/stop)',
            click: async () => {
              if (this.desktopServerService) {
                try {
                  await this.desktopServerService.stopServer(srv.id);
                  this.showBalloon('Deteniendo Servidor', `Deteniendo servidor "${srv.name}"...`);
                  await this.refreshServers();
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : 'Error al detener';
                  this.showBalloon('Error', msg, 'error');
                }
              }
            }
          });
          srvSubmenu.push({
            label: '🔄 Reiniciar Servidor',
            click: async () => {
              if (this.desktopServerService) {
                try {
                  this.showBalloon('Reiniciando', `Reiniciando servidor "${srv.name}"...`);
                  await this.desktopServerService.restartServer(srv.id);
                  await this.refreshServers();
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : 'Error al reiniciar';
                  this.showBalloon('Error', msg, 'error');
                }
              }
            }
          });
        } else {
          srvSubmenu.push({
            label: '▶️ Iniciar Servidor',
            enabled: !isTransitioning,
            click: async () => {
              if (this.desktopServerService) {
                try {
                  this.showBalloon('Iniciando Servidor', `Iniciando servidor "${srv.name}" en puerto ${srv.port}...`);
                  await this.desktopServerService.startServer(srv.id);
                  await this.refreshServers();
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : 'Error al iniciar';
                  this.showBalloon('Error al Iniciar', msg, 'error');
                }
              }
            }
          });
        }

        srvSubmenu.push({ type: 'separator' });
        srvSubmenu.push({
          label: '💻 Abrir en Antigravity IDE',
          click: async () => {
            const instPath = path.join(this.serversDir, srv.id);
            await this.ideBridge.openInIde(instPath, 'antigravity');
          }
        });
        srvSubmenu.push({
          label: '📁 Abrir Carpeta de Archivos',
          click: () => {
            const instPath = path.join(this.serversDir, srv.id);
            shell.openPath(instPath);
          }
        });

        serverMenuItems.push({
          label: `${statusEmoji} ${srv.name} (:${srv.port})`,
          submenu: srvSubmenu
        });
      }

      // Quick batch actions for multiple servers
      if (this.cachedServers.length > 1) {
        const anyOffline = this.cachedServers.some((s) => s.status !== 'online');
        const anyOnline = this.cachedServers.some((s) => s.status === 'online');

        serverMenuItems.push({ type: 'separator' });
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
          this.showBalloon('🟢 Servidor en Línea', `El servidor "${name}" inició correctamente y está listo.`);
        } else if (status === 'crashed') {
          this.showBalloon('🔴 Alerta de Crash', `El servidor "${name}" se detuvo de forma inesperada.`, 'error');
        }
        this.refreshServers().catch(() => {});
      });

      this.desktopServerService.onCrashDetected(({ name, message, resolution }) => {
        const detail = resolution ? `${message}\nSolución sugerida: ${resolution}` : message;
        this.showBalloon(`⚠️ Crash Detectado en "${name}"`, detail, 'warning');
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

  showBalloon(title: string, content: string, iconType: 'info' | 'warning' | 'error' = 'info'): void {
    if (this.tray && process.platform === 'win32') {
      this.tray.displayBalloon({
        title,
        content,
        iconType
      });
    }
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
