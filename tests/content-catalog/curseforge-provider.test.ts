import { describe, it, expect, vi, afterEach } from 'vitest';
import { CurseForgeProvider } from '../../src/content-catalog/providers/curseforge-provider.js';

describe('CurseForgeProvider', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should be disabled when CURSEFORGE_API_KEY is missing or empty', async () => {
    const provider = new CurseForgeProvider(undefined);
    expect(provider.isEnabled).toBe(false);

    const result = await provider.search({ query: 'jei' });
    expect(result.items).toEqual([]);
    expect(result.totalHits).toBe(0);
  });

  it('should sanitize surrounding quotes and whitespace from apiKey', async () => {
    const provider = new CurseForgeProvider('  "$2a$10$cleanKey12345"  ');
    expect(provider.isEnabled).toBe(true);

    let capturedHeaders: Record<string, string> | undefined;
    globalThis.fetch = vi.fn().mockImplementation(async (_url, init) => {
      capturedHeaders = init?.headers as Record<string, string>;
      return {
        ok: true,
        json: async () => ({ data: [], pagination: { totalCount: 0 } })
      } as unknown as Response;
    });

    await provider.search({ query: 'jei' });
    expect(capturedHeaders?.['x-api-key']).toBe('$2a$10$cleanKey12345');
    expect(capturedHeaders?.['User-Agent']).toBeDefined();
  });

  it('should provide informative 403 error message when CurseForge rejects API Key', async () => {
    const provider = new CurseForgeProvider('truncatedKey');

    globalThis.fetch = vi.fn().mockImplementation(async () => {
      return {
        ok: false,
        status: 403,
        text: async () => 'Forbidden: API Key missing or invalid'
      } as unknown as Response;
    });

    await expect(provider.search({ query: 'jei' })).rejects.toThrow(
      /CurseForge rechazó la API Key/
    );
  });
});
