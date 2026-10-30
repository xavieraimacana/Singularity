import { describe, it, expect } from 'vitest';
import {
  parseMotdToHtml,
  stripColorCodes,
  formatMotdPreview
} from '../../src/servers/services/motd-designer.js';

describe('MotdDesigner', () => {
  it('should strip Minecraft color and formatting codes', () => {
    const raw = '§a§lWelcome to §6Singularity Server!';
    expect(stripColorCodes(raw)).toBe('Welcome to Singularity Server!');
  });

  it('should parse legacy § and & color codes into HTML elements with exact colors', () => {
    const raw = '§aOnline Server §c§lPVP Enabled';
    const html = parseMotdToHtml(raw);

    expect(html).toContain('color: #55FF55'); // §a green
    expect(html).toContain('color: #FF5555'); // §c red
    expect(html).toContain('font-weight: bold'); // §l bold
    expect(html).toContain('Online Server');
    expect(html).toContain('PVP Enabled');
  });

  it('should format full MOTD preview with clean text and HTML representation', () => {
    const raw = '&b&lSkyblock &7| &a1.21.4';
    const preview = formatMotdPreview(raw);

    expect(preview.raw).toBe('&b&lSkyblock &7| &a1.21.4');
    expect(preview.cleanText).toBe('Skyblock | 1.21.4');
    expect(preview.html).toContain('color: #55FFFF'); // &b aqua
    expect(preview.html).toContain('color: #AAAAAA'); // &7 gray
  });
});
