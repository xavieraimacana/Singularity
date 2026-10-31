import path from 'node:path';
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import type { JavaRuntime } from '../models/java-runtime.js';
import { inspectJavaBinary } from './java-detector.js';

const execFileAsync = promisify(execFile);

export function getAdoptiumDownloadUrl(
  majorVersion: number,
  platform: string = process.platform,
  arch: string = process.arch
): string {
  // Map platform
  const os = platform === 'win32' ? 'windows' : platform === 'darwin' ? 'mac' : 'linux';

  // Map architecture
  let mappedArch = 'x64';
  if (arch === 'arm64') {
    mappedArch = 'aarch64';
  } else if (arch === 'ia32') {
    mappedArch = 'x32';
  }

  return `https://api.adoptium.net/v3/binary/latest/${majorVersion}/ga/${os}/${mappedArch}/jdk/hotspot/normal/eclipse`;
}

export async function extractArchive(archivePath: string, targetDir: string): Promise<void> {
  await fs.mkdir(targetDir, { recursive: true });

  if (process.platform === 'win32') {
    // 1. Try Windows native tar.exe (available on Windows 10/11, bsdtar supports .zip without PowerShell dependency)
    try {
      await execFileAsync('tar.exe', ['-xf', archivePath, '-C', targetDir]);
      return;
    } catch {
      // 2. Fallback to PowerShell Expand-Archive with ExecutionPolicy Bypass
      await execFileAsync('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `Expand-Archive -LiteralPath '${archivePath.replace(/'/g, "''")}' -DestinationPath '${targetDir.replace(/'/g, "''")}' -Force`
      ]);
    }
  } else {
    // Linux/macOS extraction using tar
    await execFileAsync('tar', ['-xzf', archivePath, '-C', targetDir]);
  }
}

export async function downloadPortableJava(
  majorVersion: number,
  dataJavaDir: string = process.env['SINGULARITY_DATA_JAVA_DIR'] || path.join(process.cwd(), 'data', 'java'),
  onProgress?: (bytes: number) => void
): Promise<JavaRuntime> {
  const downloadUrl = getAdoptiumDownloadUrl(majorVersion);
  await fs.mkdir(dataJavaDir, { recursive: true });

  const tempArchive = path.join(
    dataJavaDir,
    `temp-jdk-${majorVersion}.${process.platform === 'win32' ? 'zip' : 'tar.gz'}`
  );
  const extractTargetDir = path.join(dataJavaDir, `jdk-${majorVersion}`);

  // Fetch binary
  const response = await fetch(downloadUrl);
  if (!response.ok || !response.body) {
    throw new Error(`Error al descargar Java ${majorVersion} desde Adoptium API (HTTP ${response.status})`);
  }

  // Stream to disk
  const fileStream = createWriteStream(tempArchive);
  await pipeline(Readable.fromWeb(response.body as WebReadableStream), fileStream);

  // Extract archive safely
  await extractArchive(tempArchive, extractTargetDir);

  // Clean temp archive
  try {
    await fs.unlink(tempArchive);
  } catch {
    // Ignore cleanup error
  }

  // Find the java binary inside extracted directory (usually nested in a subfolder like jdk-21.0.6+7)
  const entries = await fs.readdir(extractTargetDir, { withFileTypes: true });
  let javaExecutable = path.join(
    extractTargetDir,
    'bin',
    process.platform === 'win32' ? 'java.exe' : 'java'
  );

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const nestedBin = path.join(
        extractTargetDir,
        entry.name,
        'bin',
        process.platform === 'win32' ? 'java.exe' : 'java'
      );
      try {
        await fs.access(nestedBin);
        javaExecutable = nestedBin;
        break;
      } catch {
        // continue
      }
    }
  }

  const runtime = await inspectJavaBinary(javaExecutable);
  if (!runtime) {
    throw new Error(`No se pudo verificar el binario de Java descargado en ${javaExecutable}`);
  }

  return runtime;
}
