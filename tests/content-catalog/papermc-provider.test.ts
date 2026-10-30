import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PaperMcProvider } from '../../src/content-catalog/providers/papermc-provider.js';

describe('PaperMcProvider', () => {
  let provider: PaperMcProvider;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    provider = new PaperMcProvider();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should get latest Paper build and download URL for version 1.21.4', async () => {
    const mockVersionDetails = {
      project_id: 'paper',
      project_name: 'Paper',
      version: '1.21.4',
      builds: [100, 101, 102]
    };

    const mockBuildDetails = {
      project_id: 'paper',
      version: '1.21.4',
      build: 102,
      downloads: {
        application: {
          name: 'paper-1.21.4-102.jar',
          sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
        }
      }
    };

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockVersionDetails
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockBuildDetails
      } as Response);

    const artifact = await provider.getLatestBuildArtifact('paper', '1.21.4');

    expect(artifact.projectId).toBe('paper');
    expect(artifact.gameVersion).toBe('1.21.4');
    expect(artifact.buildNumber).toBe(102);
    expect(artifact.fileName).toBe('paper-1.21.4-102.jar');
    expect(artifact.downloadUrl).toBe(
      'https://api.papermc.io/v2/projects/paper/versions/1.21.4/builds/102/downloads/paper-1.21.4-102.jar'
    );
  });
});
