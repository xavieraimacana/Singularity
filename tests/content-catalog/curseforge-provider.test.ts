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

  it('should sanitize surrounding quotes and whitespace from apiKey and filter client mods', async () => {
    const provider = new CurseForgeProvider('  "$2a$10$cleanKey12345"  ');
    expect(provider.isEnabled).toBe(true);

    const mockResponse = {
      data: [
        {
          id: 238222,
          name: 'Just Enough Items (JEI)',
          slug: 'jei',
          summary: 'View Items and Recipes',
          downloadCount: 300000000,
          authors: [{ name: 'mezz' }]
        },
        {
          id: 394468,
          name: 'Sodium',
          slug: 'sodium',
          summary: 'Client optimization mod',
          downloadCount: 50000000,
          authors: [{ name: 'jellysquid3' }]
        }
      ],
      pagination: { totalCount: 2 }
    };

    let capturedHeaders: Record<string, string> | undefined;
    globalThis.fetch = vi.fn().mockImplementation(async (_url, init) => {
      capturedHeaders = init?.headers as Record<string, string>;
      return {
        ok: true,
        json: async () => mockResponse
      } as unknown as Response;
    });

    const result = await provider.search({ query: 'jei' });
    expect(capturedHeaders?.['x-api-key']).toBe('$2a$10$cleanKey12345');
    expect(capturedHeaders?.['User-Agent']).toBeDefined();

    // Sodium should be filtered out from results
    expect(result.items.length).toBe(1);
    expect(result.items[0]?.slug).toBe('jei');
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
