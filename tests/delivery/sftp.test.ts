import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ssh2 from 'ssh2';
import { DbClient } from '../../src/auth-identity/database/db-client.js';
import { SqliteUserRepository } from '../../src/auth-identity/repositories/sqlite-user-repository.js';
import { AuthService } from '../../src/auth-identity/services/auth-service.js';
import { SftpServer } from '../../src/delivery/sftp/sftp-server.js';

const { Client } = ssh2;

describe('Embedded SFTP Server (ssh2 on port 2022 / Antigravity IDE)', () => {
  const testBaseDir = path.resolve('data/test-sftp-env');
  const dbPath = path.join(testBaseDir, 'test-sftp.db');
  const serversDir = path.join(testBaseDir, 'servers');
  const hostKeyPath = path.join(testBaseDir, 'ssh_host_rsa_key');
  const testPort = 22022;

  let authService: AuthService;
  let sftpServer: SftpServer;

  beforeAll(async () => {
    // Setup clean test environment
    if (fs.existsSync(testBaseDir)) {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
    }
    fs.mkdirSync(serversDir, { recursive: true });

    // Seed mock server instance folder & files
    const instanceDir = path.join(serversDir, 'test-server-1');
    fs.mkdirSync(instanceDir, { recursive: true });
    fs.writeFileSync(path.join(instanceDir, 'server.properties'), 'server-port=25565\nmotd=Singularity\n');

    // Setup Auth
    const db = DbClient.getDatabase(dbPath);
    const userRepo = new SqliteUserRepository(db);
    userRepo.initSchema();

    authService = new AuthService(userRepo, 'test-jwt-secret');
    await authService.ensureDefaultAdmin('admin', 'singularity');

    // Create a read-only viewer user
    await authService.createUser({
      username: 'viewer-user',
      password: 'viewerpassword123',
      role: 'VIEWER'
    });

    // Start SFTP Server
    sftpServer = new SftpServer({
      authService,
      port: testPort,
      host: '127.0.0.1',
      rootDir: serversDir,
      hostKeyPath
    });

    await sftpServer.start();
  });

  afterAll(async () => {
    await sftpServer.stop();
    DbClient.close();
    if (fs.existsSync(testBaseDir)) {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
    }
  });

  it('should successfully authenticate admin user and list root server directory', async () => {
    const client = new Client();

    await new Promise<void>((resolve, reject) => {
      client.on('ready', () => {
        client.sftp((err, sftp) => {
          if (err) return reject(err);

          sftp.readdir('/', (err, list) => {
            if (err) return reject(err);

            expect(Array.isArray(list)).toBe(true);
            const names = list.map((item) => item.filename);
            expect(names).toContain('test-server-1');

            client.end();
            resolve();
          });
        });
      });

      client.on('error', reject);

      client.connect({
        host: '127.0.0.1',
        port: testPort,
        username: 'admin',
        password: 'singularity'
      });
    });
  });

  it('should reject invalid credentials with authentication failure', async () => {
    const client = new Client();

    await new Promise<void>((resolve) => {
      client.on('ready', () => {
        client.end();
        throw new Error('Should not have connected with bad password');
      });

      client.on('error', (err) => {
        expect(err.message.toLowerCase()).toMatch(/all configured authentication methods failed|authentication/);
        resolve();
      });

      client.connect({
        host: '127.0.0.1',
        port: testPort,
        username: 'admin',
        password: 'wrongpassword'
      });
    });
  });

  it('should allow reading and writing files within server instances for operator/admin', async () => {
    const client = new Client();

    await new Promise<void>((resolve, reject) => {
      client.on('ready', () => {
        client.sftp((err, sftp) => {
          if (err) return reject(err);

          const filePath = '/test-server-1/eula.txt';
          const fileContent = 'eula=true\n# Agreed by Singularity';

          // 1. Write file
          sftp.writeFile(filePath, fileContent, 'utf8', (err) => {
            if (err) return reject(err);

            // 2. Read back
            sftp.readFile(filePath, 'utf8', (err, data) => {
              if (err) return reject(err);

              expect(data).toBe(fileContent);

              // 3. Stat file
              sftp.stat(filePath, (err, stats) => {
                if (err) return reject(err);

                expect(stats.size).toBe(Buffer.byteLength(fileContent));

                // 4. Delete file
                sftp.unlink(filePath, (err) => {
                  if (err) return reject(err);

                  // 5. Verify gone
                  sftp.stat(filePath, (err) => {
                    expect(err).toBeDefined();
                    client.end();
                    resolve();
                  });
                });
              });
            });
          });
        });
      });

      client.on('error', reject);

      client.connect({
        host: '127.0.0.1',
        port: testPort,
        username: 'admin',
        password: 'singularity'
      });
    });
  });

  it('should block path traversal attempts outside data/servers/ with permission denied', async () => {
    const client = new Client();

    await new Promise<void>((resolve, reject) => {
      client.on('ready', () => {
        client.sftp((err, sftp) => {
          if (err) return reject(err);

          // Path traversal attempt
          sftp.readFile('/../../../../etc/passwd', (err) => {
            expect(err).toBeDefined();
            // In SFTP, permission denied or failure is returned
            client.end();
            resolve();
          });
        });
      });

      client.on('error', reject);

      client.connect({
        host: '127.0.0.1',
        port: testPort,
        username: 'admin',
        password: 'singularity'
      });
    });
  });

  it('should prevent VIEWER role from writing or modifying files (read-only enforcement)', async () => {
    const client = new Client();

    await new Promise<void>((resolve, reject) => {
      client.on('ready', () => {
        client.sftp((err, sftp) => {
          if (err) return reject(err);

          // 1. Viewer CAN read existing server.properties
          sftp.readFile('/test-server-1/server.properties', 'utf8', (err, data) => {
            if (err) return reject(err);
            expect(data).toContain('server-port=25565');

            // 2. Viewer CANNOT write new files
            sftp.writeFile('/test-server-1/hacked.txt', 'malicious content', (err) => {
              expect(err).toBeDefined();
              client.end();
              resolve();
            });
          });
        });
      });

      client.on('error', reject);

      client.connect({
        host: '127.0.0.1',
        port: testPort,
        username: 'viewer-user',
        password: 'viewerpassword123'
      });
    });
  });
});
