export type PropertyValue = string | number | boolean;

export interface ServerProperties {
  readonly headers: string[];
  readonly properties: Record<string, PropertyValue>;
}

export interface MotdPreviewResult {
  readonly raw: string;
  readonly cleanText: string;
  readonly html: string;
}
