import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { shell } from 'electron';

export interface IdeInfo {
  id: 'antigravity' | 'vscode' | 'cursor' | 'explorer';
  name: string;
  command: string;
  isAvailable: boolean;
}

export class IdeBridge {
  private readonly defaultServersDir: string;

  constructor(serversDir?: string) {
    this.defaultServersDir = path.resolve(serversDir || process.env['SINGULARITY_SERVERS_DIR'] || 'data/servers');
  }

  /**
   * Resolves the target directory for a given server instance ID or relative path.
   * Confines resolution strictly within the servers directory to prevent arbitrary directory opening.
   */
  resolveInstancePath(serverIdOrPath: string): string {
    if (!serverIdOrPath || typeof serverIdOrPath !== 'string') {
      return this.defaultServersDir;
    }

    if (serverIdOrPath.includes('\0')) {
      throw new Error('Acceso denegado: Carácter nulo detectado.');
    }

    const cleanRelative = serverIdOrPath.trim().replace(/^(\/|\\)+/, '');
    const resolved = path.isAbsolute(serverIdOrPath)
      ? path.resolve(serverIdOrPath)
      : path.resolve(this.defaultServersDir, cleanRelative);

    const isExact = resolved === this.defaultServersDir;
    const isInside = resolved.startsWith(this.defaultServersDir + path.sep);

    if (!isExact && !isInside) {
      throw new Error('Acceso denegado: Intento de escape del directorio de servidores.');
    }

    return resolved;
  }

  /**
   * Checks if a command executable exists in system PATH with a non-blocking timeout.
   */
  async checkCommandExists(command: string, timeoutMs: number = 1500): Promise<boolean> {
    const isWindows = process.platform === 'win32';
    const checkTool = isWindows ? 'where.exe' : 'which';

    return new Promise((resolve) => {
      try {
        const proc = spawn(checkTool, [command], { stdio: 'ignore' });
        const timer = setTimeout(() => {
          try {
            proc.kill();
          } catch {
            // Ignore kill error
          }
          resolve(false);
        }, timeoutMs);

        proc.on('close', (code) => {
          clearTimeout(timer);
          resolve(code === 0);
        });

        proc.on('error', () => {
          clearTimeout(timer);
          resolve(false);
        });
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Returns list of detected IDEs on the host machine.
   * Runs checks concurrently via Promise.all for high performance.
   */
  async getAvailableIdes(): Promise<IdeInfo[]> {
    const [hasAgy, hasAntigravity, hasCode, hasCursor] = await Promise.all([
      this.checkCommandExists('agy'),
      this.checkCommandExists('antigravity'),
      this.checkCommandExists('code'),
      this.checkCommandExists('cursor')
    ]);

    return [
      {
        id: 'antigravity',
        name: 'Antigravity IDE',
        command: hasAntigravity ? 'antigravity' : hasAgy ? 'agy' : 'antigravity',
        isAvailable: hasAntigravity || hasAgy
      },
      {
        id: 'vscode',
        name: 'Visual Studio Code',
        command: 'code',
        isAvailable: hasCode
      },
      {
        id: 'cursor',
        name: 'Cursor',
        command: 'cursor',
        isAvailable: hasCursor
      },
      {
        id: 'explorer',
        name: process.platform === 'darwin' ? 'Finder' : 'Explorador de Archivos',
        command: 'explorer',
        isAvailable: true
      }
    ];
  }

  /**
   * Opens the Minecraft server directory in the chosen or best-available IDE.
   */
  async openInIde(
    serverIdOrPath: string,
    preferredIde: 'antigravity' | 'vscode' | 'cursor' | 'explorer' = 'antigravity'
  ): Promise<{ success: boolean; ideUsed: string; error?: string }> {
    const targetDir = this.resolveInstancePath(serverIdOrPath);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const ides = await this.getAvailableIdes();
    const antigravity = ides.find((i) => i.id === 'antigravity');
    const vscode = ides.find((i) => i.id === 'vscode');
    const cursor = ides.find((i) => i.id === 'cursor');

    // 1. Explicit preference match
    if (preferredIde === 'antigravity' && antigravity?.isAvailable) {
      const opened = await this.spawnIdeProcess(antigravity.command, [targetDir]);
      if (opened) return { success: true, ideUsed: 'Antigravity IDE' };
    }

    if (preferredIde === 'vscode' && vscode?.isAvailable) {
      const opened = await this.spawnIdeProcess(vscode.command, [targetDir]);
      if (opened) return { success: true, ideUsed: 'Visual Studio Code' };
    }

    if (preferredIde === 'cursor' && cursor?.isAvailable) {
      const opened = await this.spawnIdeProcess(cursor.command, [targetDir]);
      if (opened) return { success: true, ideUsed: 'Cursor' };
    }

    // 2. Fallback to any detected code editor
    if (antigravity?.isAvailable) {
      const opened = await this.spawnIdeProcess(antigravity.command, [targetDir]);
      if (opened) return { success: true, ideUsed: 'Antigravity IDE' };
    }

    if (vscode?.isAvailable) {
      const opened = await this.spawnIdeProcess(vscode.command, [targetDir]);
      if (opened) return { success: true, ideUsed: 'Visual Studio Code' };
    }

    if (cursor?.isAvailable) {
      const opened = await this.spawnIdeProcess(cursor.command, [targetDir]);
      if (opened) return { success: true, ideUsed: 'Cursor' };
    }

    // 3. Fallback: OS Native Explorer/Finder
    try {
      const errorMsg = await shell.openPath(targetDir);
      if (!errorMsg) {
        return { success: true, ideUsed: 'Explorador de Archivos' };
      }
      return { success: false, ideUsed: 'none', error: errorMsg };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido al abrir explorador';
      return { success: false, ideUsed: 'none', error: message };
    }
  }

  private async spawnIdeProcess(command: string, args: string[]): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const proc = spawn(command, args, {
          detached: true,
          stdio: 'ignore',
          windowsHide: true
        });

        proc.unref();

        proc.on('error', () => {
          resolve(false);
        });

        // If it hasn't errored immediately, consider spawned
        setTimeout(() => {
          resolve(true);
        }, 300);
      } catch {
        resolve(false);
      }
    });
  }
}
