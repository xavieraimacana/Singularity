import path from 'node:path';
import fs from 'node:fs';
import type { User, UserPublic, UserRole } from '../models/user.js';
import type { IUserRepository } from './user-repository.interface.js';

export class JsonUserRepository implements IUserRepository {
  private readonly users = new Map<string, User>();
  private readonly filePath?: string;

  constructor(filePath?: string) {
    if (filePath && filePath !== ':memory:') {
      this.filePath = filePath.endsWith('.json') ? filePath : `${filePath}.json`;
      this.loadFromFile();
    }
  }

  initSchema(): void {
    if (this.filePath) {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  private loadFromFile(): void {
    if (!this.filePath || !fs.existsSync(this.filePath)) return;
    try {
      const content = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(content) as User[];
      this.users.clear();
      for (const u of parsed) {
        this.users.set(u.id, u);
      }
    } catch {
      // Fallback if corrupt
    }
  }

  private persist(): void {
    if (!this.filePath) return;
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = JSON.stringify(Array.from(this.users.values()), null, 2);
      const tmp = `${this.filePath}.tmp`;
      fs.writeFileSync(tmp, data, 'utf8');
      fs.renameSync(tmp, this.filePath);
    } catch (err) {
      console.error('[JsonUserRepository] Error al guardar datos:', err);
    }
  }

  findById(id: string): User | null {
    return this.users.get(id) ?? null;
  }

  findByUsername(username: string): User | null {
    const lower = username.toLowerCase();
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === lower) {
        return u;
      }
    }
    return null;
  }

  create(data: Omit<User, 'createdAt' | 'updatedAt'>): User {
    if (this.findByUsername(data.username)) {
      throw new Error(`El usuario '${data.username}' ya existe.`);
    }

    const now = new Date().toISOString();
    const user: User = {
      ...data,
      mustChangePassword: Boolean(data.mustChangePassword),
      isActive: data.isActive !== false,
      allowedServers: data.allowedServers || ['*'],
      createdAt: now,
      updatedAt: now
    };

    this.users.set(user.id, user);
    this.persist();
    return user;
  }

  updatePassword(id: string, newPasswordHash: string, mustChangePassword: boolean = false): void {
    const user = this.users.get(id);
    if (!user) return;

    user.passwordHash = newPasswordHash;
    user.mustChangePassword = mustChangePassword;
    user.updatedAt = new Date().toISOString();
    this.persist();
  }

  updateRole(id: string, role: UserRole): void {
    const user = this.users.get(id);
    if (!user) return;

    user.role = role;
    user.updatedAt = new Date().toISOString();
    this.persist();
  }

  updateStatus(id: string, isActive: boolean): void {
    const user = this.users.get(id);
    if (!user) return;

    user.isActive = isActive;
    user.updatedAt = new Date().toISOString();
    this.persist();
  }

  updateProfile(id: string, profile: { displayName?: string; minecraftUsername?: string }): User | null {
    const user = this.users.get(id);
    if (!user) return null;

    if (profile.displayName !== undefined) user.displayName = profile.displayName;
    if (profile.minecraftUsername !== undefined) user.minecraftUsername = profile.minecraftUsername;
    user.updatedAt = new Date().toISOString();
    this.persist();
    return user;
  }

  update(id: string, updates: Partial<Omit<User, 'id' | 'passwordHash' | 'createdAt' | 'updatedAt'>>): User | null {
    const user = this.users.get(id);
    if (!user) return null;

    if (updates.role !== undefined) user.role = updates.role;
    if (updates.mustChangePassword !== undefined) user.mustChangePassword = updates.mustChangePassword;
    if (updates.isActive !== undefined) user.isActive = updates.isActive;
    if (updates.displayName !== undefined) user.displayName = updates.displayName;
    if (updates.minecraftUsername !== undefined) user.minecraftUsername = updates.minecraftUsername;
    if (updates.allowedServers !== undefined) user.allowedServers = updates.allowedServers;
    user.updatedAt = new Date().toISOString();
    this.persist();
    return user;
  }

  list(): UserPublic[] {
    const list = Array.from(this.users.values());
    list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return list.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      mustChangePassword: u.mustChangePassword,
      isActive: u.isActive,
      displayName: u.displayName,
      minecraftUsername: u.minecraftUsername,
      allowedServers: u.allowedServers,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    }));
  }

  delete(id: string): boolean {
    const existed = this.users.delete(id);
    if (existed) {
      this.persist();
    }
    return existed;
  }

  count(): number {
    return this.users.size;
  }
}
