import { describe, it, expect } from 'vitest';
import { CrashAnalyzer } from '../../src/process-supervisor/crash-analyzer/crash-analyzer.js';

describe('CrashAnalyzer', () => {
  const analyzer = new CrashAnalyzer();

  it('should detect Java version mismatch (UnsupportedClassVersionError)', () => {
    const log = `
Exception in thread "main" java.lang.UnsupportedClassVersionError: net/minecraft/bundler/Main has been compiled by a more recent version of the Java Runtime (class file version 65.0), this version of the Java Runtime only recognizes class file versions up to 61.0
    at java.lang.ClassLoader.defineClass1(Native Method)
    at java.lang.ClassLoader.defineClass(ClassLoader.java:1017)
`;

    const result = analyzer.analyze(log);

    expect(result).not.toBeNull();
    expect(result?.code).toBe('JAVA_VERSION_MISMATCH');
    expect(result?.severity).toBe('critical');
    expect(result?.title).toContain('Java Incompatible');
    expect(result?.explanation).toContain('Java 21');
    expect(result?.suggestedAction.type).toBe('CHANGE_JAVA_VERSION');
    expect(result?.suggestedAction.targetVersion).toBe(21);
  });

  it('should detect Java version mismatch from Paper preflight check', () => {
    const log = `Minecraft 26.1 and newer requires running the server with Java 25 or above. For information on how to update Java, see https://docs.papermc.io/misc/java-install`;

    const result = analyzer.analyze(log);

    expect(result).not.toBeNull();
    expect(result?.code).toBe('JAVA_VERSION_MISMATCH');
    expect(result?.severity).toBe('critical');
    expect(result?.suggestedAction.type).toBe('CHANGE_JAVA_VERSION');
    expect(result?.suggestedAction.targetVersion).toBe(25);
  });

  it('should detect OutOfMemoryError and suggest increasing RAM', () => {
    const log = `
[Server thread/ERROR]: Encountered an unexpected exception
java.lang.OutOfMemoryError: Java heap space
    at java.util.Arrays.copyOf(Arrays.java:3745)
    at net.minecraft.world.level.chunk.LinearPalette.resize(LinearPalette.java:64)
`;

    const result = analyzer.analyze(log);

    expect(result).not.toBeNull();
    expect(result?.code).toBe('OUT_OF_MEMORY');
    expect(result?.severity).toBe('critical');
    expect(result?.title).toContain('Memoria RAM Insuficiente');
    expect(result?.suggestedAction.type).toBe('INCREASE_RAM');
  });

  it('should detect client-side only mod running on a dedicated server', () => {
    const log = `
[Server thread/ERROR]: Minecraft has crashed!
net.fabricmc.loader.impl.FormattedException: java.lang.RuntimeException: Could not execute entrypoint stage 'main' due to errors, provided by 'sodium'!
Caused by: java.lang.NoClassDefFoundError: net/minecraft/client/gui/screens/Screen
    at me.jellysquid.mods.sodium.client.SodiumClientMod.onInitializeClient(SodiumClientMod.java:23)
`;

    const result = analyzer.analyze(log);

    expect(result).not.toBeNull();
    expect(result?.code).toBe('CLIENT_SIDE_MOD_ON_SERVER');
    expect(result?.severity).toBe('error');
    expect(result?.title).toContain('Mod de Cliente en Servidor Dedicado');
    expect(result?.details?.modName?.toLowerCase()).toContain('sodium');
    expect(result?.suggestedAction.type).toBe('REMOVE_MOD');
  });

  it('should detect port bind error when port is already occupied', () => {
    const log = `
[Server thread/WARN]: **** FAILED TO BIND TO PORT!
[Server thread/WARN]: The exception was: java.net.BindException: Address already in use: bind
[Server thread/WARN]: Perhaps a server is already running on that port?
`;

    const result = analyzer.analyze(log);

    expect(result).not.toBeNull();
    expect(result?.code).toBe('PORT_ALREADY_IN_USE');
    expect(result?.severity).toBe('critical');
    expect(result?.title).toContain('Puerto Ocupado');
    expect(result?.suggestedAction.type).toBe('CHANGE_PORT');
  });

  it('should detect missing mod dependencies in Fabric or Forge', () => {
    const log = `
net.fabricmc.loader.impl.FormattedException: Some of your mods have failed to load:
 - Mod 'Sodium Extra' (sodium-extra) 0.5.4 requires version 0.5.8 or later of 'Sodium' (sodium), which is missing!
`;

    const result = analyzer.analyze(log);

    expect(result).not.toBeNull();
    expect(result?.code).toBe('MISSING_DEPENDENCY');
    expect(result?.severity).toBe('error');
    expect(result?.title).toContain('Dependencia Faltante');
    expect(result?.details?.missingMod).toContain('sodium');
    expect(result?.suggestedAction.type).toBe('INSTALL_DEPENDENCY');
  });

  it('should return null for normal server startup logs without errors', () => {
    const log = `
[Server thread/INFO]: Starting minecraft server version 1.21.4
[Server thread/INFO]: Loading properties
[Server thread/INFO]: Default game type: SURVIVAL
[Server thread/INFO]: Generating keypair
[Server thread/INFO]: Starting Minecraft server on *:25565
[Server thread/INFO]: Done (3.821s)! For help, type "help"
`;

    const result = analyzer.analyze(log);
    expect(result).toBeNull();
  });
});
