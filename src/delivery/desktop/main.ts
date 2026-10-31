import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { buildServer } from '../http/server.js';
import { SftpServer } from '../sftp/index.js';
import { IdeBridge } from './ide-bridge.js';
import { TrayManager } from './tray.js';
import { ConnectionManager, type ServerConnectionProfile } from './connection-manager.js';
import { DesktopServerService } from './desktop-server-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let trayManager: TrayManager | null = null;
let sftpServer: SftpServer | null = null;
let fastifyApp: any = null;
let desktopServerService: DesktopServerService | null = null;
let isQuitting = false;
let isEmbeddedRunning = false;

const HTTP_PORT = parseInt(process.env['PORT'] || '3000', 10);
const HTTP_HOST = '127.0.0.1';
const SFTP_PORT = parseInt(process.env['SINGULARITY_SFTP_PORT'] || '2022', 10);
const SERVERS_DIR = path.resolve(process.env['SINGULARITY_SERVERS_DIR'] || 'data/servers');

const ideBridge = new IdeBridge(SERVERS_DIR);
const connectionManager = new ConnectionManager();

// Single instance lock to prevent duplicate servers
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

async function startEmbeddedServices(): Promise<void> {
  if (isEmbeddedRunning) return;

  try {
    // Start Fastify HTTP & WebSocket server
    fastifyApp = await buildServer({
      serversDir: SERVERS_DIR
    });

    try {
      await fastifyApp.listen({ port: HTTP_PORT, host: HTTP_HOST });
    } catch (err: any) {
      if (err.code !== 'EADDRINUSE') {
        throw err;
      }
      // Port already in use (e.g. background dev server running), connect to existing
    }

    // Start SFTP micro-server
    const authService = fastifyApp.authService;
    if (authService) {
      sftpServer = new SftpServer({
        authService,
        port: SFTP_PORT,
        host: '127.0.0.1',
        rootDir: SERVERS_DIR
      });
      try {
        await sftpServer.start();
      } catch {
        // Suppress port conflict if background instance is running
      }
    }

    // Initialize Desktop Server Service for real-time tray & notifications
    const serverLifecycle = fastifyApp.serverLifecycle;
    const processRunner = fastifyApp.processRunner;
    if (serverLifecycle && processRunner) {
      desktopServerService = new DesktopServerService(serverLifecycle, processRunner);
    }

    isEmbeddedRunning = true;
  } catch (err) {
    console.error('[Desktop Main] Error iniciando servicios embebidos:', err);
  }
}

function createMainWindow(): BrowserWindow {
  const iconCandidates = [
    ...(process.platform === 'win32'
      ? [
          path.join(__dirname, 'assets', 'icon.ico'),
          path.join(process.cwd(), 'src', 'delivery', 'desktop', 'assets', 'icon.ico')
        ]
      : []),
    path.join(__dirname, 'assets', 'icon.png'),
    path.join(process.cwd(), 'src', 'delivery', 'desktop', 'assets', 'icon.png'),
    path.join(process.cwd(), 'resources', 'icon.png')
  ];
  const appIcon = iconCandidates.find(p => fs.existsSync(p));

  const win = new BrowserWindow({
    icon: appIcon,
    width: 1320,
    height: 860,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: '#090d16',
    title: 'Singularity - Minecraft Server Mission Control',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Load URL based on active profile
  const activeProfile = connectionManager.getActiveProfile();
  win.loadURL(activeProfile.url);

  // Fallback if remote VPS is temporarily unreachable
  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    // Ignore aborts (e.g. during manual redirect or navigation cancel)
    if (errorCode === -3) return;

    console.warn(`[Desktop Main] Error al cargar URL (${errorCode}: ${errorDescription}): ${validatedURL}`);

    // If remote connection failed, offer to switch to local or retry
    if (activeProfile.type === 'remote') {
      const response = dialog.showMessageBoxSync(win, {
        type: 'warning',
        title: 'Servidor Remoto No Disponible',
        message: `No se pudo conectar a "${activeProfile.name}" (${activeProfile.url}).\n\n¿Deseas cambiar a tu Servidor Local en este equipo?`,
        buttons: ['Cambiar a Local (PC)', 'Reintentar', 'Cerrar'],
        defaultId: 0,
        cancelId: 2
      });

      if (response === 0) {
        connectionManager.setActiveProfile('local-embedded').then((localProfile) => {
          startEmbeddedServices().then(() => {
            win.loadURL(localProfile.url);
            trayManager?.updateMenu();
          });
        });
      } else if (response === 1) {
        win.loadURL(activeProfile.url);
      }
    }
  });

  // Close to tray behavior
  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win.hide();
      trayManager?.showBalloon(
        'Singularity en Segundo Plano',
        'Singularity sigue activo en la bandeja del sistema para mantener tus servidores Minecraft en línea 24/7.'
      );
    }
  });

  return win;
}

function registerIpcHandlers(): void {
  ipcMain.handle('singularity:open-ide', async (_event, args: { serverId: string; ide?: string }) => {
    const pref = (args.ide || 'antigravity') as 'antigravity' | 'vscode' | 'explorer';
    return ideBridge.openInIde(args.serverId, pref);
  });

  ipcMain.handle('singularity:open-folder', async (_event, args: { targetPath?: string }) => {
    const p = ideBridge.resolveInstancePath(args.targetPath || '');
    const err = await shell.openPath(p);
    return !err;
  });

  ipcMain.handle('singularity:get-ides', async () => {
    return ideBridge.getAvailableIdes();
  });

  ipcMain.handle('singularity:get-sftp-info', async () => {
    const active = connectionManager.getActiveProfile();
    return {
      host: active.sftpHost || '127.0.0.1',
      port: active.sftpPort || SFTP_PORT
    };
  });

  ipcMain.on('singularity:minimize-to-tray', () => {
    mainWindow?.hide();
  });

  ipcMain.handle(
    'singularity:show-notification',
    async (_event, args: { title: string; body: string; type?: 'info' | 'warning' | 'error' }) => {
      trayManager?.showBalloon(args.title, args.body, args.type || 'info');
      return true;
    }
  );

  // Connection Manager IPC Handlers
  ipcMain.handle('singularity:get-connections', async () => {
    return connectionManager.getProfiles();
  });

  ipcMain.handle('singularity:get-active-connection', async () => {
    return connectionManager.getActiveProfile();
  });

  ipcMain.handle(
    'singularity:switch-connection',
    async (_event, args: { id: string }) => {
      try {
        const profile = await connectionManager.setActiveProfile(args.id);
        if (profile.type === 'local') {
          await startEmbeddedServices();
        }
        if (mainWindow) {
          mainWindow.loadURL(profile.url);
        }
        trayManager?.updateMenu();
        return { success: true, profile };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error desconocido al cambiar de servidor';
        return { success: false, profile: connectionManager.getActiveProfile(), error: message };
      }
    }
  );

  ipcMain.handle(
    'singularity:save-connection',
    async (_event, args: { profile: Omit<ServerConnectionProfile, 'id'> & { id?: string } }) => {
      const saved = await connectionManager.saveProfile(args.profile);
      trayManager?.updateMenu();
      return saved;
    }
  );

  ipcMain.handle('singularity:delete-connection', async (_event, args: { id: string }) => {
    const ok = await connectionManager.deleteProfile(args.id);
    trayManager?.updateMenu();
    return ok;
  });

  ipcMain.handle('singularity:test-connection', async (_event, args: { url: string }) => {
    return connectionManager.testConnection(args.url);
  });
}

app.whenReady().then(async () => {
  await connectionManager.init();

  // Always prepare embedded services in background so switching is instant
  await startEmbeddedServices();

  mainWindow = createMainWindow();

  trayManager = new TrayManager({
    mainWindow,
    ideBridge,
    serversDir: SERVERS_DIR,
    connectionManager,
    desktopServerService: desktopServerService || undefined,
    onSwitchConnection: async (id) => {
      const profile = await connectionManager.setActiveProfile(id);
      if (profile.type === 'local') {
        await startEmbeddedServices();
      }
      if (mainWindow) {
        mainWindow.loadURL(profile.url);
      }
    },
    onQuit: () => {
      isQuitting = true;
      app.quit();
    }
  });
  trayManager.init();

  registerIpcHandlers();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow();
  } else {
    mainWindow?.show();
    mainWindow?.focus();
  }
});

app.on('before-quit', async () => {
  isQuitting = true;
  if (trayManager) {
    trayManager.destroy();
  }
  if (sftpServer) {
    await sftpServer.stop();
  }
  if (fastifyApp) {
    await fastifyApp.close();
  }
});
