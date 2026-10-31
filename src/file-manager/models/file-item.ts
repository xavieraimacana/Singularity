export interface FileItem {
  name: string;
  relativePath: string;
  isDirectory: boolean;
  sizeBytes: number;
  modifiedAt: string;
  extension: string;
}

export interface FileContentResult {
  path: string;
  content: string;
  sizeBytes: number;
  isTruncated: boolean;
}
