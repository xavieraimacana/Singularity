import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

export class DbClient {
  private static instance: DatabaseSync | null = null;

  static getDatabase(dbPath?: string): DatabaseSync {
    if (this.instance) {
      return this.instance;
    }

    const targetPath = dbPath || path.join(process.cwd(), 'data', 'singularity.db');
    if (targetPath !== ':memory:') {
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    const db = new DatabaseSync(targetPath);
    // Performance & safety pragmas
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;
    `);

    this.instance = db;
    return db;
  }

  static close(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
    }
  }
}
