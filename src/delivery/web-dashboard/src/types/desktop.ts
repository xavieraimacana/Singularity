export interface ServerConnectionProfile {
  id: string;
  name: string;
  type: 'local' | 'remote';
  url: string;
  sftpHost?: string;
  sftpPort?: number;
  isDefault?: boolean;
  lastConnectedAt?: string;
}

export interface DesktopNotificationConfig {
  enabled: boolean;
  serverStatus: boolean;
  serverCrash: boolean;
  playerEvents: boolean;
  sound: boolean;
}

export interface AutoStartSettings {
  enabled: boolean;
  startHidden: boolean;
}

export interface SingularityDesktopApi {
  isElectron: boolean;
  openInIde: (serverId: string, ide?: string) => Promise<{ success: boolean; ideUsed: string; error?: string }>;
  openFolder: (targetPath?: string) => Promise<boolean>;
  getAvailableIdes: () => Promise<Array<{ id: string; name: string; isAvailable: boolean }>>;
  getSftpConnectionInfo: () => Promise<{ host: string; port: number }>;
  minimizeToTray: () => void;
  showNotification: (options: { title: string; body: string; type?: 'info' | 'warning' | 'error'; category?: string; silent?: boolean } | string, body?: string, type?: 'info' | 'warning' | 'error') => Promise<boolean>;
  // Windows Native Notifications Configuration
  getNotificationConfig?: () => Promise<DesktopNotificationConfig>;
  setNotificationConfig?: (config: Partial<DesktopNotificationConfig>) => Promise<DesktopNotificationConfig>;
  // Windows Auto-Start Configuration
  getAutoStartSettings?: () => Promise<AutoStartSettings>;
  setAutoStartSettings?: (settings: { enabled: boolean; startHidden?: boolean }) => Promise<AutoStartSettings>;
  // Multi-Host Remote Connection Manager
  getConnections: () => Promise<ServerConnectionProfile[]>;
  getActiveConnection: () => Promise<ServerConnectionProfile>;
  switchConnection: (id: string) => Promise<{ success: boolean; profile: ServerConnectionProfile; error?: string }>;
  saveConnection: (profile: Omit<ServerConnectionProfile, 'id'> & { id?: string }) => Promise<ServerConnectionProfile>;
  deleteConnection: (id: string) => Promise<boolean>;
  testConnection: (url: string) => Promise<{ ok: boolean; latencyMs: number; error?: string }>;
}

declare global {
  interface Window {
    singularityDesktop?: SingularityDesktopApi;
  }
}
