import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModrinthProvider } from '../../src/content-catalog/providers/modrinth-provider.js';

describe('ModrinthProvider', () => {
  let provider: ModrinthProvider;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    provider = new ModrinthProvider();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should search projects and format into standardized CatalogItem', async () => {
    const mockResponse = {
      hits: [
        {
          project_id: 'AANobbMI',
          slug: 'sodium',
          title: 'Sodium',
          description: 'A modern rendering engine and client-side optimization mod for Minecraft',
          categories: ['optimization'],
          client_side: 'required',
          server_side: 'unsupported',
          project_type: 'mod',
          downloads: 45000000,
          icon_url: 'https://cdn.modrinth.com/data/AANobbMI/icon.png',
          author: 'jellysquid3'
        }
      ],
      total_hits: 1
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    } as Response);

    const result = await provider.search({
      query: 'sodium',
      projectType: 'mod',
      loader: 'fabric',
      gameVersion: '1.21.4'
    });

    expect(result.items.length).toBe(1);
    const item = result.items[0];
    expect(item?.id).toBe('AANobbMI');
    expect(item?.slug).toBe('sodium');
    expect(item?.title).toBe('Sodium');
    expect(item?.projectType).toBe('mod');
    expect(item?.downloads).toBe(45000000);
    expect(item?.iconUrl).toBe('https://cdn.modrinth.com/data/AANobbMI/icon.png');
    expect(item?.author).toBe('jellysquid3');
  });

  it('should fetch project versions filtered by game version and loader', async () => {
    const mockVersions = [
      {
        id: 'ver_01',
        project_id: 'AANobbMI',
        name: 'Sodium 0.6.0',
        version_number: '0.6.0',
        game_versions: ['1.21.4'],
        loaders: ['fabric', 'neoforge'],
        files: [
          {
            url: 'https://cdn.modrinth.com/data/AANobbMI/versions/ver_01/sodium-fabric-0.6.0.jar',
            filename: 'sodium-fabric-0.6.0.jar',
            primary: true,
            size: 1540000,
            hashes: {
              sha1: 'da39a3ee5e6b4b0d3255bfef95601890afd80709',
              sha512: 'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e'
            }
          }
        ],
        dependencies: [
          {
            project_id: 'P7dR8mSH', // Fabric API
            dependency_type: 'required'
          }
        ]
      }
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockVersions
    } as Response);

    const versions = await provider.getVersions('AANobbMI', '1.21.4', 'fabric');

    expect(versions.length).toBe(1);
    expect(versions[0]?.id).toBe('ver_01');
    expect(versions[0]?.versionNumber).toBe('0.6.0');
    expect(versions[0]?.downloadUrl).toBe(
      'https://cdn.modrinth.com/data/AANobbMI/versions/ver_01/sodium-fabric-0.6.0.jar'
    );
    expect(versions[0]?.dependencies.length).toBe(1);
    expect(versions[0]?.dependencies[0]?.projectId).toBe('P7dR8mSH');
  });
});
