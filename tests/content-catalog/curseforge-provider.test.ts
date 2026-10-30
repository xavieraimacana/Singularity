import { describe, it, expect, vi, afterEach } from 'vitest';
import { CurseForgeProvider } from '../../src/content-catalog/providers/curseforge-provider.js';

describe('CurseForgeProvider', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should be disabled when CURSEFORGE_API_KEY is missing', async () => {
    const provider = new CurseForgeProvider(undefined);
    expect(provider.isEnabled).toBe(false);

    const result = await provider.search({ query: 'jei' });
    expect(result.items).toEqual([]);
    expect(result.totalHits).toBe(0);
  });

  it('should include x-api-key header when apiKey is supplied', async () => {
    const provider = new CurseForgeProvider('test-api-key-12345');
    expect(provider.isEnabled).toBe(true);

    const mockResponse = {
      data: [
        {
          id: 238222,
          name: 'Just Enough Items (JEI)',
          slug: 'jei',
          summary: 'View Items and Recipes',
          downloadCount: 300000000,
          logo: {
            url: 'https://media.forgecdn.net/avatars/28/69/635838957401348743.png'
          },
          authors: [{ name: 'mezz' }]
        }
      ],
      pagination: { totalCount: 1 }
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

    expect(capturedHeaders).toBeDefined();
    expect(capturedHeaders?.['x-api-key']).toBe('test-api-key-12345');
    expect(result.items.length).toBe(1);
    expect(result.items[0]?.title).toBe('Just Enough Items (JEI)');
  });
});
