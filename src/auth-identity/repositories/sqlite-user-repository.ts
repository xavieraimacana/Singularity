import type { DatabaseSync } from 'node:sqlite';
import type { User, UserPublic, UserRole } from '../models/user.js';
import type { IUserRepository } from './user-repository.interface.js';

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  role: string;
  must_change_password: number;
  is_active?: number;
  display_name?: string | null;
  minecraft_username?: string | null;
  allowed_servers?: string | null;
  created_at: string;
  updated_at: string;
}

export class SqliteUserRepository implements IUserRepository {
  constructor(private readonly db: DatabaseSync) {}

  initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        must_change_password INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        display_name TEXT,
        minecraft_username TEXT,
        allowed_servers TEXT DEFAULT '*',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Dynamic idempotent migration for existing databases
    const columns = this.db.prepare('PRAGMA table_info(users)').all() as unknown as Array<{ name: string }>;
    const columnNames = new Set(columns.map((c) => c.name));

    if (!columnNames.has('is_active')) {
      this.db.exec('ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;');
    }
    if (!columnNames.has('display_name')) {
      this.db.exec('ALTER TABLE users ADD COLUMN display_name TEXT;');
    }
    if (!columnNames.has('minecraft_username')) {
      this.db.exec('ALTER TABLE users ADD COLUMN minecraft_username TEXT;');
    }
    if (!columnNames.has('allowed_servers')) {
      this.db.exec("ALTER TABLE users ADD COLUMN allowed_servers TEXT DEFAULT '*';");
    }
  }

  private parseAllowedServers(raw?: string | null): string[] {
    if (!raw || raw === '*') return ['*'];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : ['*'];
    } catch {
      return ['*'];
    }
  }

  private mapRowToUser(row: UserRow): User {
    return {
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      role: row.role as UserRole,
      mustChangePassword: row.must_change_password === 1,
      isActive: row.is_active === undefined || row.is_active === 1,
      displayName: row.display_name || undefined,
      minecraftUsername: row.minecraft_username || undefined,
      allowedServers: this.parseAllowedServers(row.allowed_servers),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToPublic(row: UserRow): UserPublic {
    return {
      id: row.id,
      username: row.username,
      role: row.role as UserRole,
      mustChangePassword: row.must_change_password === 1,
      isActive: row.is_active === undefined || row.is_active === 1,
      displayName: row.display_name || undefined,
      minecraftUsername: row.minecraft_username || undefined,
      allowedServers: this.parseAllowedServers(row.allowed_servers),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  findById(id: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id) as unknown as UserRow | undefined;
    if (!row) return null;
    return this.mapRowToUser(row);
  }

  findByUsername(username: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE');
    const row = stmt.get(username) as unknown as UserRow | undefined;
    if (!row) return null;
    return this.mapRowToUser(row);
  }

  create(data: Omit<User, 'createdAt' | 'updatedAt'>): User {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO users (
        id, username, password_hash, role, must_change_password,
        is_active, display_name, minecraft_username, allowed_servers,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.id,
      data.username,
      data.passwordHash,
      data.role,
      data.mustChangePassword ? 1 : 0,
      data.isActive !== false ? 1 : 0,
      data.displayName ?? null,
      data.minecraftUsername ?? null,
      JSON.stringify(data.allowedServers || ['*']),
      now,
      now
    );

    return {
      ...data,
      createdAt: now,
      updatedAt: now
    };
  }

  updatePassword(id: string, newPasswordHash: string, mustChangePassword: boolean = false): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE users
      SET password_hash = ?, must_change_password = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(newPasswordHash, mustChangePassword ? 1 : 0, now, id);
  }

  updateRole(id: string, role: UserRole): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE users
      SET role = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(role, now, id);
  }

  updateStatus(id: string, isActive: boolean): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE users
      SET is_active = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(isActive ? 1 : 0, now, id);
  }

  updateProfile(id: string, profile: { displayName?: string; minecraftUsername?: string }): User | null {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE users
      SET display_name = ?, minecraft_username = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(profile.displayName ?? null, profile.minecraftUsername ?? null, now, id);
    return this.findById(id);
  }

  update(id: string, updates: Partial<Omit<User, 'id' | 'passwordHash' | 'createdAt' | 'updatedAt'>>): User | null {
    const current = this.findById(id);
    if (!current) return null;

    const nextRole = updates.role ?? current.role;
    const nextMustChange = updates.mustChangePassword !== undefined ? (updates.mustChangePassword ? 1 : 0) : (current.mustChangePassword ? 1 : 0);
    const nextIsActive = updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : (current.isActive ? 1 : 0);
    const nextDisplayName = updates.displayName !== undefined ? updates.displayName : (current.displayName ?? null);
    const nextMinecraftUsername = updates.minecraftUsername !== undefined ? updates.minecraftUsername : (current.minecraftUsername ?? null);
    const nextAllowedServers = updates.allowedServers ? JSON.stringify(updates.allowedServers) : JSON.stringify(current.allowedServers);
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      UPDATE users
      SET role = ?, must_change_password = ?, is_active = ?, display_name = ?, minecraft_username = ?, allowed_servers = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(nextRole, nextMustChange, nextIsActive, nextDisplayName, nextMinecraftUsername, nextAllowedServers, now, id);
    return this.findById(id);
  }

  list(): UserPublic[] {
    const stmt = this.db.prepare('SELECT * FROM users ORDER BY created_at ASC');
    const rows = stmt.all() as unknown as UserRow[];
    return rows.map((r) => this.mapRowToPublic(r));
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return Number(result.changes) > 0;
  }

  count(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM users');
    const row = stmt.get() as unknown as { count: number | bigint } | undefined;
    return Number(row?.count ?? 0);
  }
}
