import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { buildServer } from '../http/server.js';
import { SftpServer } from '../sftp/index.js';
import { IdeBridge } from './ide-bridge.js';
import { TrayManager } from './tray.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let trayManager: TrayManager | null = null;
let sftpServer: SftpServer | null = null;
let fastifyApp: any = null;
let isQuitting = false;

const HTTP_PORT = parseInt(process.env['PORT'] || '3000', 10);
const HTTP_HOST = '127.0.0.1';
const SFTP_PORT = parseInt(process.env['SINGULARITY_SFTP_PORT'] || '2022', 10);
const SERVERS_DIR = path.resolve(process.env['SINGULARITY_SERVERS_DIR'] || 'data/servers');

const ideBridge = new IdeBridge(SERVERS_DIR);

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
}

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
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

  // Load local web dashboard
  const appUrl = `http://${HTTP_HOST}:${HTTP_PORT}`;
  win.loadURL(appUrl);

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
    return {
      host: '127.0.0.1',
      port: SFTP_PORT
    };
  });

  ipcMain.on('singularity:minimize-to-tray', () => {
    mainWindow?.hide();
  });
}

app.whenReady().then(async () => {
  await startEmbeddedServices();

  mainWindow = createMainWindow();

  trayManager = new TrayManager({
    mainWindow,
    ideBridge,
    serversDir: SERVERS_DIR,
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
