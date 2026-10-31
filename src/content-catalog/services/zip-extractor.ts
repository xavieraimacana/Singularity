import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';

const execFileAsync = promisify(execFile);

/**
 * Extracts a ZIP archive safely into a destination directory using native system tools.
 */
export async function extractZip(archivePath: string, targetDir: string): Promise<void> {
  await fs.mkdir(targetDir, { recursive: true });

  if (process.platform === 'win32') {
    try {
      // Modern Windows (10/11) includes bsdtar which handles .zip natively
      await execFileAsync('tar', ['-xf', archivePath, '-C', targetDir]);
    } catch {
      // Fallback to PowerShell Expand-Archive
      await execFileAsync('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Expand-Archive -LiteralPath '${archivePath}' -DestinationPath '${targetDir}' -Force`
      ]);
    }
  } else {
    // Linux / macOS: Try unzip first (standard for .zip), fallback to tar
    try {
      await execFileAsync('unzip', ['-o', archivePath, '-d', targetDir]);
    } catch {
      await execFileAsync('tar', ['-xf', archivePath, '-C', targetDir]);
    }
  }
}
