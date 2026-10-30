import type { MotdPreviewResult } from '../models/server-properties.js';

const MINECRAFT_COLORS: Record<string, string> = {
  '0': '#000000',
  '1': '#0000AA',
  '2': '#00AA00',
  '3': '#00AAAA',
  '4': '#AA0000',
  '5': '#AA00AA',
  '6': '#FFAA00',
  '7': '#AAAAAA',
  '8': '#555555',
  '9': '#5555FF',
  'a': '#55FF55',
  'b': '#55FFFF',
  'c': '#FF5555',
  'd': '#FF55FF',
  'e': '#FFFF55',
  'f': '#FFFFFF'
};

const MINECRAFT_FORMATS: Record<string, string> = {
  'l': 'font-weight: bold;',
  'm': 'text-decoration: line-through;',
  'n': 'text-decoration: underline;',
  'o': 'font-style: italic;',
  'r': 'reset'
};

export function stripColorCodes(raw: string): string {
  return raw.replace(/[§&][0-9a-fk-or]/gi, '');
}

export function parseMotdToHtml(raw: string): string {
  // Normalize '&' codes to '§'
  const normalized = raw.replace(/&([0-9a-fk-or])/gi, '§$1');
  const tokens = normalized.split(/(§[0-9a-fk-or])/gi);

  let currentColor = '#FFFFFF';
  const currentFormats = new Set<string>();
  const htmlParts: string[] = [];

  for (const token of tokens) {
    if (!token) {
      continue;
    }

    if (token.startsWith('§')) {
      const code = token.charAt(1).toLowerCase();

      if (code in MINECRAFT_COLORS) {
        currentColor = MINECRAFT_COLORS[code]!;
        currentFormats.clear();
      } else if (code === 'r') {
        currentColor = '#FFFFFF';
        currentFormats.clear();
      } else if (code in MINECRAFT_FORMATS) {
        currentFormats.add(MINECRAFT_FORMATS[code]!);
      }
    } else {
      const styles = [`color: ${currentColor};`, ...Array.from(currentFormats)].join(' ');
      const escaped = token
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      htmlParts.push(`<span style="${styles}">${escaped}</span>`);
    }
  }

  return `<div class="minecraft-motd">${htmlParts.join('')}</div>`;
}

export function formatMotdPreview(raw: string): MotdPreviewResult {
  return {
    raw,
    cleanText: stripColorCodes(raw),
    html: parseMotdToHtml(raw)
  };
}
