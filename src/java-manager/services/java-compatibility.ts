import type { JavaRuntime, JavaRequirement } from '../models/java-runtime.js';

interface ParsedMcVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

export function parseMcVersion(version: string): ParsedMcVersion {
  const parts = version.replace(/[^0-9.]/g, '').split('.').map((p) => parseInt(p, 10) || 0);
  return {
    major: parts[0] ?? 1,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0
  };
}

export function getJavaRequirement(mcVersion: string): JavaRequirement {
  const v = parseMcVersion(mcVersion);

  // Minecraft 1.20.5 and newer requires Java 21+
  if (v.minor > 20 || (v.minor === 20 && v.patch >= 5)) {
    return {
      minMajorVersion: 21,
      recommendedMajorVersion: 21
    };
  }

  // Minecraft 1.17 to 1.20.4 requires Java 17+
  if (v.minor >= 17) {
    return {
      minMajorVersion: 17,
      recommendedMajorVersion: 17
    };
  }

  // Minecraft 1.16.5 and older defaults to Java 8
  return {
    minMajorVersion: 8,
    recommendedMajorVersion: 8,
    maxMajorVersion: 16
  };
}

export function isRuntimeCompatible(runtime: JavaRuntime, mcVersion: string): boolean {
  const req = getJavaRequirement(mcVersion);

  if (runtime.majorVersion < req.minMajorVersion) {
    return false;
  }

  if (req.maxMajorVersion && runtime.majorVersion > req.maxMajorVersion) {
    return false;
  }

  return true;
}

export function selectBestRuntime(runtimes: JavaRuntime[], mcVersion: string): JavaRuntime | null {
  const req = getJavaRequirement(mcVersion);
  const compatible = runtimes.filter((r) => isRuntimeCompatible(r, mcVersion));

  if (compatible.length === 0) {
    return null;
  }

  // Prefer exact match with recommended version
  const exact = compatible.find((r) => r.majorVersion === req.recommendedMajorVersion);
  if (exact) {
    return exact;
  }

  // Sort by closest major version to recommended
  return [...compatible].sort((a, b) => {
    const diffA = Math.abs(a.majorVersion - req.recommendedMajorVersion);
    const diffB = Math.abs(b.majorVersion - req.recommendedMajorVersion);
    return diffA - diffB;
  })[0] ?? null;
}
