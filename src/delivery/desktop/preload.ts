import { contextBridge, ipcRenderer } from 'electron';
import type { ServerConnectionProfile } from './connection-manager.js';

export interface SingularityDesktopApi {
  isElectron: boolean;
  openInIde: (serverId: string, ide?: string) => Promise<{ success: boolean; ideUsed: string; error?: string }>;
  openFolder: (targetPath?: string) => Promise<boolean>;
  getAvailableIdes: () => Promise<Array<{ id: string; name: string; isAvailable: boolean }>>;
  getSftpConnectionInfo: () => Promise<{ host: string; port: number }>;
  minimizeToTray: () => void;
  // Multi-Host Remote Connection Manager
  getConnections: () => Promise<ServerConnectionProfile[]>;
  getActiveConnection: () => Promise<ServerConnectionProfile>;
  switchConnection: (id: string) => Promise<{ success: boolean; profile: ServerConnectionProfile; error?: string }>;
  saveConnection: (profile: Omit<ServerConnectionProfile, 'id'> & { id?: string }) => Promise<ServerConnectionProfile>;
  deleteConnection: (id: string) => Promise<boolean>;
  testConnection: (url: string) => Promise<{ ok: boolean; latencyMs: number; error?: string }>;
}

const desktopApi: SingularityDesktopApi = {
  isElectron: true,
  openInIde: (serverId: string, ide?: string) => ipcRenderer.invoke('singularity:open-ide', { serverId, ide }),
  openFolder: (targetPath?: string) => ipcRenderer.invoke('singularity:open-folder', { targetPath }),
  getAvailableIdes: () => ipcRenderer.invoke('singularity:get-ides'),
  getSftpConnectionInfo: () => ipcRenderer.invoke('singularity:get-sftp-info'),
  minimizeToTray: () => ipcRenderer.send('singularity:minimize-to-tray'),
  // Multi-Host Remote Connection Manager
  getConnections: () => ipcRenderer.invoke('singularity:get-connections'),
  getActiveConnection: () => ipcRenderer.invoke('singularity:get-active-connection'),
  switchConnection: (id: string) => ipcRenderer.invoke('singularity:switch-connection', { id }),
  saveConnection: (profile) => ipcRenderer.invoke('singularity:save-connection', { profile }),
  deleteConnection: (id: string) => ipcRenderer.invoke('singularity:delete-connection', { id }),
  testConnection: (url: string) => ipcRenderer.invoke('singularity:test-connection', { url })
};

contextBridge.exposeInMainWorld('singularityDesktop', desktopApi);
