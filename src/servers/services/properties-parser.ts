import type { PropertyValue, ServerProperties } from '../models/server-properties.js';

export function parseProperties(rawContent: string): ServerProperties {
  const headers: string[] = [];
  const properties: Record<string, PropertyValue> = {};

  const lines = rawContent.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith('#') || trimmed.startsWith('!')) {
      headers.push(trimmed);
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawVal = trimmed.slice(separatorIndex + 1).trim();

    if (rawVal === 'true') {
      properties[key] = true;
    } else if (rawVal === 'false') {
      properties[key] = false;
    } else if (/^-?\d+$/.test(rawVal)) {
      properties[key] = parseInt(rawVal, 10);
    } else {
      properties[key] = rawVal;
    }
  }

  return {
    headers,
    properties
  };
}

export function serializeProperties(props: ServerProperties): string {
  const lines: string[] = [...props.headers];

  for (const [key, val] of Object.entries(props.properties)) {
    lines.push(`${key}=${val}`);
  }

  return lines.join('\n') + '\n';
}

export function updateProperty(
  props: ServerProperties,
  key: string,
  value: PropertyValue
): ServerProperties {
  return {
    headers: props.headers,
    properties: {
      ...props.properties,
      [key]: value
    }
  };
}
