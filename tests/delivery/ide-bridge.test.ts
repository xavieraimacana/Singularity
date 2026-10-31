import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { IdeBridge } from '../../src/delivery/desktop/ide-bridge.js';

describe('Electron Desktop Delivery > IdeBridge', () => {
  it('should resolve instance directory paths within default servers directory', () => {
    const customDir = path.resolve('data/test-ide-servers');
    const bridge = new IdeBridge(customDir);

    const resolved = bridge.resolveInstancePath('server-alpha');
    expect(resolved).toBe(path.join(customDir, 'server-alpha'));
  });

  it('should prevent path traversal or opening arbitrary system folders', () => {
    const customDir = path.resolve('data/test-ide-servers');
    const bridge = new IdeBridge(customDir);

    expect(() => bridge.resolveInstancePath('../../windows/system32')).toThrow('Acceso denegado');
    expect(() => bridge.resolveInstancePath('server-alpha\0malicious')).toThrow('Acceso denegado');
  });

  it('should list available IDEs with Antigravity, VS Code, Cursor, and native File Explorer', async () => {
    const bridge = new IdeBridge();
    const ides = await bridge.getAvailableIdes();

    expect(Array.isArray(ides)).toBe(true);
    expect(ides.length).toBeGreaterThanOrEqual(4);

    const antigravity = ides.find((i) => i.id === 'antigravity');
    const vscode = ides.find((i) => i.id === 'vscode');
    const cursor = ides.find((i) => i.id === 'cursor');
    const explorer = ides.find((i) => i.id === 'explorer');

    expect(antigravity).toBeDefined();
    expect(antigravity?.name).toBe('Antigravity IDE');

    expect(vscode).toBeDefined();
    expect(vscode?.name).toBe('Visual Studio Code');

    expect(cursor).toBeDefined();
    expect(cursor?.name).toBe('Cursor');

    expect(explorer).toBeDefined();
    expect(explorer?.isAvailable).toBe(true);
  }, 10000);
});
