export interface BackupEntry {
  id: string;
  serverId: string;
  filename: string;
  sizeBytes: number;
  createdAt: string;
  comment?: string;
  format: 'tar.gz' | 'zip';
}

export interface CreateBackupOptions {
  comment?: string;
  format?: 'tar.gz' | 'zip';
}
