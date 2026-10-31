import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { app } from 'electron';

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

interface StoredConnections {
  activeId: string;
  profiles: ServerConnectionProfile[];
}

const DEFAULT_PROFILES: ServerConnectionProfile[] = [
  {
    id: 'nebulax-vps',
    name: 'NebulaX Cloud VPS',
    type: 'remote',
    url: 'https://singularity.nebulaxstudio.top',
    sftpHost: '157.137.223.54',
    sftpPort: 2022,
    isDefault: true
  },
  {
    id: 'local-embedded',
    name: 'Servidor Local (PC)',
    type: 'local',
    url: 'http://127.0.0.1:3000',
    sftpHost: '127.0.0.1',
    sftpPort: 2022
  }
];

export class ConnectionManager {
  private readonly configPath: string;
  private activeId: string = 'nebulax-vps';
  private profiles: ServerConnectionProfile[] = [...DEFAULT_PROFILES];

  constructor(customConfigPath?: string) {
    if (customConfigPath) {
      this.configPath = customConfigPath;
    } else {
      try {
        const userData = app?.getPath ? app.getPath('userData') : path.join(process.cwd(), 'data');
        this.configPath = path.join(userData, 'singularity-connections.json');
      } catch {
        this.configPath = path.join(process.cwd(), 'data', 'singularity-connections.json');
      }
    }
  }

  async init(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      if (existsSync(this.configPath)) {
        const raw = await fs.readFile(this.configPath, 'utf8');
        const data = JSON.parse(raw) as StoredConnections;
        if (data.profiles && Array.isArray(data.profiles) && data.profiles.length > 0) {
          this.profiles = data.profiles;
          this.activeId = data.activeId || data.profiles[0]?.id || 'nebulax-vps';
          return;
        }
      }
    } catch {
      // Fallback to default profiles
    }

    // Initialize with defaults if not existing
    this.profiles = [...DEFAULT_PROFILES];
    this.activeId = 'nebulax-vps';
    await this.save();
  }

  private async save(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.configPath), { recursive: true });
      const data: StoredConnections = {
        activeId: this.activeId,
        profiles: this.profiles
      };
      await fs.writeFile(this.configPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.warn('[ConnectionManager] Error saving connections:', err);
    }
  }

  getProfiles(): ServerConnectionProfile[] {
    return [...this.profiles];
  }

  getActiveProfile(): ServerConnectionProfile {
    const found = this.profiles.find((p) => p.id === this.activeId);
    return found || this.profiles[0] || DEFAULT_PROFILES[0]!;
  }

  async setActiveProfile(id: string): Promise<ServerConnectionProfile> {
    const found = this.profiles.find((p) => p.id === id);
    if (!found) {
      throw new Error(`Perfil de conexión '${id}' no encontrado`);
    }

    this.activeId = id;
    found.lastConnectedAt = new Date().toISOString();
    await this.save();
    return found;
  }

  async saveProfile(
    profile: Omit<ServerConnectionProfile, 'id'> & { id?: string }
  ): Promise<ServerConnectionProfile> {
    const cleanUrl = profile.url.trim().replace(/\/+$/, '');
    const id = profile.id || `conn_${Date.now()}`;

    const newProfile: ServerConnectionProfile = {
      ...profile,
      id,
      url: cleanUrl,
      lastConnectedAt: new Date().toISOString()
    };

    const existingIndex = this.profiles.findIndex((p) => p.id === id);
    if (existingIndex >= 0) {
      this.profiles[existingIndex] = newProfile;
    } else {
      this.profiles.push(newProfile);
    }

    await this.save();
    return newProfile;
  }

  async deleteProfile(id: string): Promise<boolean> {
    if (this.profiles.length <= 1) {
      throw new Error('No puedes eliminar el único perfil de conexión restante');
    }

    const filtered = this.profiles.filter((p) => p.id !== id);
    if (filtered.length === this.profiles.length) {
      return false;
    }

    this.profiles = filtered;
    if (this.activeId === id) {
      this.activeId = this.profiles[0]?.id || 'local-embedded';
    }

    await this.save();
    return true;
  }

  async testConnection(url: string): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    const targetUrl = `${cleanUrl}/api/health`;
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Singularity-Desktop/0.1.0'
        }
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - start;
      if (res.ok) {
        return { ok: true, latencyMs };
      }
      return { ok: false, latencyMs, error: `HTTP ${res.status}` };
    } catch (err: unknown) {
      const latencyMs = Date.now() - start;
      const message = err instanceof Error ? err.message : 'No se pudo conectar';
      return { ok: false, latencyMs, error: message };
    }
  }
}
