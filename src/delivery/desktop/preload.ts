import { contextBridge, ipcRenderer } from 'electron';

export interface SingularityDesktopApi {
  isElectron: boolean;
  openInIde: (serverId: string, ide?: string) => Promise<{ success: boolean; ideUsed: string; error?: string }>;
  openFolder: (targetPath?: string) => Promise<boolean>;
  getAvailableIdes: () => Promise<Array<{ id: string; name: string; isAvailable: boolean }>>;
  getSftpConnectionInfo: () => Promise<{ host: string; port: number }>;
  minimizeToTray: () => void;
}

const desktopApi: SingularityDesktopApi = {
  isElectron: true,
  openInIde: (serverId: string, ide?: string) => ipcRenderer.invoke('singularity:open-ide', { serverId, ide }),
  openFolder: (targetPath?: string) => ipcRenderer.invoke('singularity:open-folder', { targetPath }),
  getAvailableIdes: () => ipcRenderer.invoke('singularity:get-ides'),
  getSftpConnectionInfo: () => ipcRenderer.invoke('singularity:get-sftp-info'),
  minimizeToTray: () => ipcRenderer.send('singularity:minimize-to-tray')
};

contextBridge.exposeInMainWorld('singularityDesktop', desktopApi);
