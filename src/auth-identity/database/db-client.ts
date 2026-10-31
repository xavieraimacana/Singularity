import path from 'node:path';
import fs from 'node:fs';

export interface DatabaseHandle {
  filePath: string;
  close: () => void;
}

export class DbClient {
  private static instance: DatabaseHandle | null = null;

  static getDatabase(dbPath?: string): DatabaseHandle {
    if (dbPath === ':memory:') {
      return { filePath: ':memory:', close: () => {} };
    }

    if (this.instance) {
      return this.instance;
    }

    const targetPath = dbPath || path.join(process.cwd(), 'data', 'singularity.db');
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const handle: DatabaseHandle = {
      filePath: targetPath,
      close: () => {}
    };

    this.instance = handle;
    return handle;
  }

  static close(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
    }
  }
}
