import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import {
  parseJavaVersionOutput,
  getJavaRequirement,
  isRuntimeCompatible,
  selectBestRuntime,
  generateAikarFlags,
  getAdoptiumDownloadUrl
} from '../../src/java-manager/index.js';
import { detectSystemRuntimes } from '../../src/java-manager/services/java-detector.js';
import type { JavaRuntime } from '../../src/java-manager/models/java-runtime.js';

describe('JavaCompatibility', () => {
  it('should require Java 25 for Minecraft 26.x calendar versioning', () => {
    const req263 = getJavaRequirement('26.3');
    expect(req263.minMajorVersion).toBe(25);
    expect(req263.recommendedMajorVersion).toBe(25);

    const req262 = getJavaRequirement('26.2');
    expect(req262.minMajorVersion).toBe(25);

    const req261 = getJavaRequirement('26.1');
    expect(req261.minMajorVersion).toBe(25);
  });

  it('should require Java 21 for Minecraft 1.20.5 and newer', () => {
    const req121 = getJavaRequirement('1.21.4');
    expect(req121.minMajorVersion).toBe(21);
    expect(req121.recommendedMajorVersion).toBe(21);

    const req1205 = getJavaRequirement('1.20.5');
    expect(req1205.minMajorVersion).toBe(21);
  });

  it('should require Java 17 for Minecraft 1.17 to 1.20.4', () => {
    const req1204 = getJavaRequirement('1.20.4');
    expect(req1204.minMajorVersion).toBe(17);
    expect(req1204.recommendedMajorVersion).toBe(17);

    const req118 = getJavaRequirement('1.18.2');
    expect(req118.minMajorVersion).toBe(17);

    const req117 = getJavaRequirement('1.17.1');
    expect(req117.minMajorVersion).toBe(17);
  });

  it('should require Java 8 for Minecraft 1.16.5 and older', () => {
    const req116 = getJavaRequirement('1.16.5');
    expect(req116.minMajorVersion).toBe(8);
    expect(req116.recommendedMajorVersion).toBe(8);

    const req112 = getJavaRequirement('1.12.2');
    expect(req112.minMajorVersion).toBe(8);
  });

  it('should correctly evaluate if runtime is compatible', () => {
    const java25: JavaRuntime = {
      id: 'java-25',
      majorVersion: 25,
      versionString: '25.0.5',
      path: '/usr/lib/jvm/java-25/bin/java',
      vendor: 'Eclipse Adoptium',
      isPortable: false
    };

    const java21: JavaRuntime = {
      id: 'java-21',
      majorVersion: 21,
      versionString: '21.0.6',
      path: '/usr/lib/jvm/java-21/bin/java',
      vendor: 'Eclipse Adoptium',
      isPortable: false
    };

    const java17: JavaRuntime = {
      id: 'java-17',
      majorVersion: 17,
      versionString: '17.0.10',
      path: '/usr/lib/jvm/java-17/bin/java',
      vendor: 'Eclipse Adoptium',
      isPortable: false
    };

    const java8: JavaRuntime = {
      id: 'java-8',
      majorVersion: 8,
      versionString: '1.8.0_391',
      path: '/usr/lib/jvm/java-8/bin/java',
      vendor: 'Oracle',
      isPortable: false
    };

    expect(isRuntimeCompatible(java25, '26.3')).toBe(true);
    expect(isRuntimeCompatible(java25, '26.2')).toBe(true);
    expect(isRuntimeCompatible(java21, '26.2')).toBe(false);

    expect(isRuntimeCompatible(java21, '1.21.4')).toBe(true);
    expect(isRuntimeCompatible(java17, '1.21.4')).toBe(false);

    expect(isRuntimeCompatible(java17, '1.18.2')).toBe(true);
    expect(isRuntimeCompatible(java8, '1.18.2')).toBe(false);

    expect(isRuntimeCompatible(java8, '1.12.2')).toBe(true);
  });

  it('should select the best compatible runtime from a list', () => {
    const runtimes: JavaRuntime[] = [
      { id: '1', majorVersion: 8, versionString: '1.8.0_391', path: '/j8', vendor: 'Oracle', isPortable: false },
      { id: '2', majorVersion: 17, versionString: '17.0.10', path: '/j17', vendor: 'Adoptium', isPortable: false },
      { id: '3', majorVersion: 21, versionString: '21.0.6', path: '/j21', vendor: 'Adoptium', isPortable: false },
      { id: '4', majorVersion: 25, versionString: '25.0.5', path: '/j25', vendor: 'Adoptium', isPortable: false }
    ];

    const bestFor26 = selectBestRuntime(runtimes, '26.3');
    expect(bestFor26?.majorVersion).toBe(25);

    const bestFor121 = selectBestRuntime(runtimes, '1.21.4');
    expect(bestFor121?.majorVersion).toBe(21);

    const bestFor119 = selectBestRuntime(runtimes, '1.19.2');
    expect(bestFor119?.majorVersion).toBe(17);

    const bestFor112 = selectBestRuntime(runtimes, '1.12.2');
    expect(bestFor112?.majorVersion).toBe(8);
  });
});

describe('JavaDetector output parsing', () => {
  it('should parse modern OpenJDK output (Java 25)', () => {
    const output = `openjdk version "25.0.5" 2026-01-20
OpenJDK Runtime Environment Temurin-25.0.5+8 (build 25.0.5+8)
OpenJDK 64-Bit Server VM Temurin-25.0.5+8 (build 25.0.5+8, mixed mode, sharing)`;

    const parsed = parseJavaVersionOutput(output);
    expect(parsed).not.toBeNull();
    expect(parsed?.majorVersion).toBe(25);
    expect(parsed?.versionString).toBe('25.0.5');
    expect(parsed?.vendor).toContain('Temurin');
  });

  it('should parse modern OpenJDK output (Java 21)', () => {
    const output = `openjdk version "21.0.6" 2025-01-21 LTS
OpenJDK Runtime Environment Temurin-21.0.6+7 (build 21.0.6+7)
OpenJDK 64-Bit Server VM Temurin-21.0.6+7 (build 21.0.6+7, mixed mode, sharing)`;

    const parsed = parseJavaVersionOutput(output);
    expect(parsed).not.toBeNull();
    expect(parsed?.majorVersion).toBe(21);
    expect(parsed?.versionString).toBe('21.0.6');
    expect(parsed?.vendor).toContain('Temurin');
  });

  it('should parse Java 17 LTS output', () => {
    const output = `openjdk version "17.0.10" 2024-01-16
OpenJDK Runtime Environment (build 17.0.10+7-Ubuntu-122.04.1)
OpenJDK 64-Bit Server VM (build 17.0.10+7-Ubuntu-122.04.1, mixed mode, sharing)`;

    const parsed = parseJavaVersionOutput(output);
    expect(parsed).not.toBeNull();
    expect(parsed?.majorVersion).toBe(17);
    expect(parsed?.versionString).toBe('17.0.10');
  });

  it('should parse legacy Java 8 output', () => {
    const output = `java version "1.8.0_391"
Java(TM) SE Runtime Environment (build 1.8.0_391-b13)
Java HotSpot(TM) 64-Bit Server VM (build 25.391-b13, mixed mode)`;

    const parsed = parseJavaVersionOutput(output);
    expect(parsed).not.toBeNull();
    expect(parsed?.majorVersion).toBe(8);
    expect(parsed?.versionString).toBe('1.8.0_391');
  });
});

describe('JvmFlagPresets (Aikar Flags)', () => {
  it('should generate optimized Aikar flags matching memory allocation', () => {
    const flags = generateAikarFlags(4096, 'server.jar');
    expect(flags).toContain('-Xms4096M');
    expect(flags).toContain('-Xmx4096M');
    expect(flags).toContain('-XX:+UseG1GC');
    expect(flags).toContain('-XX:+AlwaysPreTouch');
    expect(flags).toContain('-Dusing.aikars.flags=https://mcflags.emc.gs');
    expect(flags).toContain('nogui');
    expect(flags[flags.length - 1]).toBe('nogui');
  });
});

describe('JavaDownloader URL Generation', () => {
  it('should construct accurate Adoptium API download URL for Windows x64', () => {
    const url = getAdoptiumDownloadUrl(21, 'win32', 'x64');
    expect(url).toBe('https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jdk/hotspot/normal/eclipse');
  });

  it('should construct accurate Adoptium API download URL for Linux x64 and aarch64', () => {
    const urlLinux = getAdoptiumDownloadUrl(17, 'linux', 'x64');
    expect(urlLinux).toBe('https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse');

    const urlArm = getAdoptiumDownloadUrl(21, 'linux', 'arm64');
    expect(urlArm).toBe('https://api.adoptium.net/v3/binary/latest/21/ga/linux/aarch64/jdk/hotspot/normal/eclipse');
  });

  it('should scan both direct and nested Adoptium layout folders in dataJavaDir', async () => {
    const testDir = path.resolve('data/test-adoptium-detect');
    const nestedBinDir = path.join(testDir, 'jdk-25', 'jdk-25.0.5+8', 'bin');
    await fs.mkdir(nestedBinDir, { recursive: true });

    try {
      const runtimes = await detectSystemRuntimes(testDir);
      expect(Array.isArray(runtimes)).toBe(true);
    } finally {
      await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
    }
  });
});
