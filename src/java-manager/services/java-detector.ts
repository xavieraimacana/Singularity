import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { JavaRuntime } from '../models/java-runtime.js';

const execFileAsync = promisify(execFile);

export function parseJavaVersionOutput(output: string): {
  majorVersion: number;
  versionString: string;
  vendor: string;
} | null {
  // Regex to extract version string from "java version ..." or "openjdk version ..."
  const versionMatch = output.match(/(?:openjdk|java) version "((\d+)(?:\.(\d+))?(?:\.([\d_]+))?.*)"/i);
  if (!versionMatch || !versionMatch[1]) {
    return null;
  }

  const rawVersion = versionMatch[1];
  let majorVersion = parseInt(versionMatch[2] ?? '0', 10);

  // Legacy Java 8 format: 1.8.0_xxx
  if (majorVersion === 1 && versionMatch[3]) {
    majorVersion = parseInt(versionMatch[3], 10);
  }

  // Detect vendor
  let vendor = 'OpenJDK';
  if (/Temurin|Adoptium/i.test(output)) {
    vendor = 'Eclipse Temurin';
  } else if (/Oracle/i.test(output)) {
    vendor = 'Oracle';
  } else if (/Microsoft/i.test(output)) {
    vendor = 'Microsoft';
  } else if (/Zulu|Azul/i.test(output)) {
    vendor = 'Azul Zulu';
  } else if (/Corretto|Amazon/i.test(output)) {
    vendor = 'Amazon Corretto';
  } else if (/GraalVM/i.test(output)) {
    vendor = 'GraalVM';
  }

  return {
    majorVersion,
    versionString: rawVersion,
    vendor
  };
}

export async function inspectJavaBinary(executablePath: string): Promise<JavaRuntime | null> {
  try {
    const { stderr, stdout } = await execFileAsync(executablePath, ['-version']);
    const output = (stderr || stdout).toString();
    const parsed = parseJavaVersionOutput(output);

    if (!parsed) {
      return null;
    }

    const isPortable = executablePath.includes(path.join('data', 'java')) || executablePath.includes('data/java');

    return {
      id: `java-${parsed.majorVersion}-${path.basename(path.dirname(executablePath))}`,
      majorVersion: parsed.majorVersion,
      versionString: parsed.versionString,
      path: path.resolve(executablePath),
      vendor: parsed.vendor,
      isPortable
    };
  } catch {
    return null;
  }
}

export async function detectSystemRuntimes(
  dataJavaDir: string = path.join(process.cwd(), 'data', 'java')
): Promise<JavaRuntime[]> {
  const candidatePaths = new Set<string>();

  // 1. JAVA_HOME
  if (process.env.JAVA_HOME) {
    const javaBin = path.join(
      process.env.JAVA_HOME,
      'bin',
      process.platform === 'win32' ? 'java.exe' : 'java'
    );
    candidatePaths.add(javaBin);
  }

  // 2. PATH (current default java)
  candidatePaths.add(process.platform === 'win32' ? 'java.exe' : 'java');

  // 3. Portable data/java directory
  try {
    const portableEntries = await fs.readdir(dataJavaDir, { withFileTypes: true });
    for (const entry of portableEntries) {
      if (entry.isDirectory()) {
        const bin = path.join(
          dataJavaDir,
          entry.name,
          'bin',
          process.platform === 'win32' ? 'java.exe' : 'java'
        );
        candidatePaths.add(bin);
      }
    }
  } catch {
    // Ignore if data/java doesn't exist yet
  }

  // 4. Windows Standard Directories
  if (process.platform === 'win32') {
    const programFilesDirs = [
      process.env['ProgramFiles'],
      process.env['ProgramFiles(x86)'],
      process.env['LOCALAPPDATA']
    ].filter(Boolean) as string[];

    const vendors = ['Java', 'Eclipse Adoptium', 'Microsoft', 'BellSoft', 'Zulu'];

    for (const base of programFilesDirs) {
      for (const vendor of vendors) {
        const vendorDir = path.join(base, vendor);
        try {
          const subdirs = await fs.readdir(vendorDir, { withFileTypes: true });
          for (const sub of subdirs) {
            if (sub.isDirectory()) {
              candidatePaths.add(path.join(vendorDir, sub.name, 'bin', 'java.exe'));
            }
          }
        } catch {
          // Skip missing vendor folders
        }
      }
    }
  } else {
    // 5. Linux Standard Directories
    const linuxJvmDir = '/usr/lib/jvm';
    try {
      const entries = await fs.readdir(linuxJvmDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          candidatePaths.add(path.join(linuxJvmDir, entry.name, 'bin', 'java'));
        }
      }
    } catch {
      // Skip if /usr/lib/jvm does not exist
    }
  }

  // Inspect all candidates and deduplicate by canonical path
  const results: JavaRuntime[] = [];
  const seenPaths = new Set<string>();

  for (const candidate of candidatePaths) {
    const runtime = await inspectJavaBinary(candidate);
    if (runtime && !seenPaths.has(runtime.path)) {
      seenPaths.add(runtime.path);
      results.push(runtime);
    }
  }

  return results.sort((a, b) => b.majorVersion - a.majorVersion);
}
