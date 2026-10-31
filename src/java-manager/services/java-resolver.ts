import fs from 'node:fs';
import { inspectJavaBinary, detectSystemRuntimes } from './java-detector.js';
import { isRuntimeCompatible, selectBestRuntime } from './java-compatibility.js';

/**
 * Resolves a compatible Java runtime executable path for a given Minecraft game version.
 * If the configured path is valid and compatible, it is preserved.
 * Otherwise, scans system runtimes for the best match (e.g. Java 21 for 1.20.5+, Java 17 for 1.18-1.20.4, Java 8 for 1.12-).
 */
export async function resolveCompatibleJavaExecutable(
  gameVersion: string,
  configuredPath?: string
): Promise<string> {
  const defaultFallback = process.platform === 'win32' ? 'java.exe' : 'java';
  const candidate = configuredPath?.trim();

  let currentRuntime = null;
  if (candidate && candidate !== 'java' && candidate !== 'java.exe' && fs.existsSync(candidate)) {
    currentRuntime = await inspectJavaBinary(candidate);
  } else {
    currentRuntime = await inspectJavaBinary(defaultFallback);
  }

  if (!currentRuntime || !isRuntimeCompatible(currentRuntime, gameVersion)) {
    try {
      const runtimes = await detectSystemRuntimes();
      const best = selectBestRuntime(runtimes, gameVersion);
      if (best) {
        return best.path;
      }
    } catch {
      // Fall back to candidate or default system java
    }
  }

  return candidate && candidate.length > 0 ? candidate : defaultFallback;
}
