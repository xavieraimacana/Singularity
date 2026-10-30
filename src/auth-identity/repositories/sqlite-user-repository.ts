import type { DatabaseSync } from 'node:sqlite';
import type { User, UserPublic, UserRole } from '../models/user.js';
import type { IUserRepository } from './user-repository.interface.js';

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  role: string;
  must_change_password: number;
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
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  private mapRowToUser(row: UserRow): User {
    return {
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      role: row.role as UserRole,
      mustChangePassword: row.must_change_password === 1,
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
      INSERT INTO users (id, username, password_hash, role, must_change_password, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.id,
      data.username,
      data.passwordHash,
      data.role,
      data.mustChangePassword ? 1 : 0,
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
