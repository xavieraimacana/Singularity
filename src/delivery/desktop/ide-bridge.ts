import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { shell } from 'electron';

export interface IdeInfo {
  id: 'antigravity' | 'vscode' | 'explorer';
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
   */
  resolveInstancePath(serverIdOrPath: string): string {
    if (path.isAbsolute(serverIdOrPath) && fs.existsSync(serverIdOrPath)) {
      return serverIdOrPath;
    }
    return path.join(this.defaultServersDir, serverIdOrPath);
  }

  /**
   * Checks if a command executable exists in system PATH.
   */
  async checkCommandExists(command: string): Promise<boolean> {
    const isWindows = process.platform === 'win32';
    const checkTool = isWindows ? 'where.exe' : 'which';

    return new Promise((resolve) => {
      try {
        const proc = spawn(checkTool, [command], { stdio: 'ignore' });
        proc.on('close', (code) => {
          resolve(code === 0);
        });
        proc.on('error', () => {
          resolve(false);
        });
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Returns list of detected IDEs on the host machine.
   */
  async getAvailableIdes(): Promise<IdeInfo[]> {
    const hasAgy = await this.checkCommandExists('agy');
    const hasAntigravity = await this.checkCommandExists('antigravity');
    const hasCode = await this.checkCommandExists('code');

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
    preferredIde: 'antigravity' | 'vscode' | 'explorer' = 'antigravity'
  ): Promise<{ success: boolean; ideUsed: string; error?: string }> {
    const targetDir = this.resolveInstancePath(serverIdOrPath);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const ides = await this.getAvailableIdes();
    const antigravity = ides.find((i) => i.id === 'antigravity');
    const vscode = ides.find((i) => i.id === 'vscode');

    // 1. Try Antigravity IDE if preferred or available
    if (preferredIde === 'antigravity' && antigravity?.isAvailable) {
      const opened = await this.spawnIdeProcess(antigravity.command, [targetDir]);
      if (opened) {
        return { success: true, ideUsed: 'Antigravity IDE' };
      }
    }

    // 2. Try VS Code if preferred or fallback
    if ((preferredIde === 'vscode' || preferredIde === 'antigravity') && vscode?.isAvailable) {
      const opened = await this.spawnIdeProcess(vscode.command, [targetDir]);
      if (opened) {
        return { success: true, ideUsed: 'Visual Studio Code' };
      }
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
