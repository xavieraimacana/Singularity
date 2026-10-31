import path from 'node:path';
import fs from 'node:fs';
import { Tray, Menu, nativeImage, type NativeImage, type BrowserWindow, shell } from 'electron';
import type { IdeBridge } from './ide-bridge.js';
import type { ConnectionManager } from './connection-manager.js';

export interface TrayManagerOptions {
  mainWindow: BrowserWindow;
  ideBridge: IdeBridge;
  serversDir: string;
  onQuit: () => void;
  connectionManager?: ConnectionManager;
  onSwitchConnection?: (id: string) => Promise<void>;
}

export class TrayManager {
  private tray: Tray | null = null;
  private readonly mainWindow: BrowserWindow;
  private readonly ideBridge: IdeBridge;
  private readonly serversDir: string;
  private readonly onQuit: () => void;
  private readonly connectionManager?: ConnectionManager;
  private readonly onSwitchConnection?: (id: string) => Promise<void>;

  constructor(options: TrayManagerOptions) {
    this.mainWindow = options.mainWindow;
    this.ideBridge = options.ideBridge;
    this.serversDir = options.serversDir;
    this.onQuit = options.onQuit;
    this.connectionManager = options.connectionManager;
    this.onSwitchConnection = options.onSwitchConnection;
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

    // 16x16 RGBA buffer representing a cyan/emerald glowing Singularity cube
    const size = 16;
    const buffer = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const offset = (y * size + x) * 4;
        const isBorder = x === 0 || x === size - 1 || y === 0 || y === size - 1;
        const isCenter = x >= 4 && x <= 11 && y >= 4 && y <= 11;

        if (isCenter) {
          // Emerald accent (#10b981)
          buffer[offset] = 16;     // R
          buffer[offset + 1] = 185; // G
          buffer[offset + 2] = 129; // B
          buffer[offset + 3] = 255; // A
        } else if (!isBorder) {
          // Cyber blue (#06b6d4)
          buffer[offset] = 6;       // R
          buffer[offset + 1] = 182; // G
          buffer[offset + 2] = 212; // B
          buffer[offset + 3] = 200; // A
        } else {
          // Transparent border
          buffer[offset + 3] = 0;
        }
      }
    }

    return nativeImage.createFromBuffer(buffer, { width: size, height: size });
  }

  buildContextMenu(): Menu {
    const profiles = this.connectionManager?.getProfiles() || [];
    const activeProfile = this.connectionManager?.getActiveProfile();

    const connectionSubmenu = profiles.map((p) => ({
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

    const activeLabel = activeProfile ? `📡 ${activeProfile.name}` : '🌌 Singularity';

    return Menu.buildFromTemplate([
      {
        label: 'Singularity Mission Control',
        enabled: false
      },
      {
        label: activeLabel,
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'Cambiar Entorno / Servidor',
        submenu: connectionSubmenu.length > 0 ? connectionSubmenu : undefined
      },
      { type: 'separator' },
      {
        label: 'Mostrar Panel Principal',
        click: () => {
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      },
      {
        label: 'Ocultar a la Bandeja',
        click: () => {
          this.mainWindow.hide();
        }
      },
      { type: 'separator' },
      {
        label: 'Abrir Carpeta de Servidores',
        click: () => {
          shell.openPath(this.serversDir);
        }
      },
      {
        label: 'Abrir en Antigravity IDE',
        click: async () => {
          await this.ideBridge.openInIde(this.serversDir, 'antigravity');
        }
      },
      { type: 'separator' },
      {
        label: 'Salir de Singularity',
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

  showBalloon(title: string, content: string): void {
    if (this.tray && process.platform === 'win32') {
      this.tray.displayBalloon({
        title,
        content,
        iconType: 'info'
      });
    }
  }

  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
