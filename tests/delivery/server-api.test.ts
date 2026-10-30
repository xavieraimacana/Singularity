import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import { buildServer } from '../../src/delivery/http/server.js';
import type { FastifyInstance } from 'fastify';

describe('Delivery API (Fastify REST & WebSocket)', () => {
  let app: FastifyInstance;
  const testDataDir = path.join(process.cwd(), 'data', 'test-delivery-data');
  const testServersDir = path.join(testDataDir, 'servers');
  const testDbPath = ':memory:';
  const testSecret = 'singularity-delivery-test-secret-key-98765';

  beforeEach(async () => {
    await fs.mkdir(testServersDir, { recursive: true });

    app = await buildServer({
      dbPath: testDbPath,
      serversDir: testServersDir,
      jwtSecret: testSecret,
      skipDefaultAdmin: false
    });

    await app.ready();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch {
      // cleanup ignore
    }
  });

  describe('Healthcheck & Diagnostics (/api/health)', () => {
    it('should return health status ok for docker and cloud healthchecks', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/health'
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('ok');
      expect(body.service).toBe('singularity');
      expect(body.version).toBe('0.1.0-alpha');
    });
  });

  describe('Auth Routes (/api/auth)', () => {
    it('should reject unauthorized access to protected endpoints', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/servers'
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error).toBeDefined();
    });

    it('should login with default credentials admin/singularity', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          username: 'admin',
          password: 'singularity'
        }
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload);
      expect(data.token).toBeDefined();
      expect(data.user.username).toBe('admin');
      expect(data.user.role).toBe('ADMIN');
      expect(data.user.mustChangePassword).toBe(true);
    });

    it('should retrieve current user profile with valid Bearer token', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'admin', password: 'singularity' }
      });
      const { token } = JSON.parse(loginRes.payload);

      const meRes = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      expect(meRes.statusCode).toBe(200);
      const profile = JSON.parse(meRes.payload);
      expect(profile.username).toBe('admin');
      expect(profile.role).toBe('ADMIN');
    });

    it('should allow changing password and clearing mustChangePassword', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'admin', password: 'singularity' }
      });
      const { token, user } = JSON.parse(loginRes.payload);

      const changeRes = await app.inject({
        method: 'POST',
        url: '/api/auth/change-password',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          userId: user.id,
          currentPassword: 'singularity',
          newPassword: 'BrandNewStrongPassword2026!'
        }
      });

      expect(changeRes.statusCode).toBe(200);

      // Verify login with new password
      const newLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'admin', password: 'BrandNewStrongPassword2026!' }
      });
      expect(newLogin.statusCode).toBe(200);
      const newBody = JSON.parse(newLogin.payload);
      expect(newBody.user.mustChangePassword).toBe(false);
    });
  });

  describe('Server Management Routes (/api/servers)', () => {
    let authToken: string;

    beforeEach(async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'admin', password: 'singularity' }
      });
      authToken = JSON.parse(loginRes.payload).token;
    });

    it('should create a server instance and list it', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/servers',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: 'Survival SMP',
          loader: 'paper',
          gameVersion: '1.21.4',
          memoryMb: 4096,
          motd: '§aNebulaX §fSurvival Server',
          port: 25565
        }
      });

      expect(createRes.statusCode).toBe(201);
      const created = JSON.parse(createRes.payload);
      expect(created.id).toBeDefined();
      expect(created.name).toBe('Survival SMP');
      expect(created.loader).toBe('paper');
      expect(created.port).toBe(25565);

      // List servers
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/servers',
        headers: { authorization: `Bearer ${authToken}` }
      });

      expect(listRes.statusCode).toBe(200);
      const list = JSON.parse(listRes.payload);
      expect(list.length).toBe(1);
      expect(list[0].id).toBe(created.id);
    });

    it('should read and update server properties', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/servers',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: 'Vanilla World',
          loader: 'vanilla',
          gameVersion: '1.21.4',
          memoryMb: 2048,
          port: 25566
        }
      });
      const server = JSON.parse(createRes.payload);

      // Read properties
      const propsRes = await app.inject({
        method: 'GET',
        url: `/api/servers/${server.id}/properties`,
        headers: { authorization: `Bearer ${authToken}` }
      });
      expect(propsRes.statusCode).toBe(200);
      const props = JSON.parse(propsRes.payload);
      expect(props['server-port']).toBe(25566);

      // Update properties
      const updateRes = await app.inject({
        method: 'PUT',
        url: `/api/servers/${server.id}/properties`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          properties: {
            ...props,
            'pvp': false,
            'max-players': 50,
            'difficulty': 'hard'
          }
        }
      });
      expect(updateRes.statusCode).toBe(200);

      // Re-read to confirm disk persistence
      const verifyRes = await app.inject({
        method: 'GET',
        url: `/api/servers/${server.id}/properties`,
        headers: { authorization: `Bearer ${authToken}` }
      });
      const updatedProps = JSON.parse(verifyRes.payload);
      expect(updatedProps['pvp']).toBe(false);
      expect(updatedProps['max-players']).toBe(50);
      expect(updatedProps['difficulty']).toBe('hard');
    });

    it('should list all available minecraft versions including 26.3', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/servers/versions',
        headers: { authorization: `Bearer ${authToken}` }
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload);
      expect(data.latest).toBeDefined();
      expect(data.latest.release).toBe('26.3');
      expect(Array.isArray(data.versions)).toBe(true);

      const versionIds = data.versions.map((v: any) => v.id);
      expect(versionIds).toContain('26.3');
      expect(versionIds).toContain('1.21.4');
    });
  });

  describe('Java Manager Routes (/api/java)', () => {
    let authToken: string;

    beforeEach(async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'admin', password: 'singularity' }
      });
      authToken = JSON.parse(loginRes.payload).token;
    });

    it('should detect installed java runtimes on host', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/java/detect',
        headers: { authorization: `Bearer ${authToken}` }
      });

      expect(res.statusCode).toBe(200);
      const runtimes = JSON.parse(res.payload);
      expect(Array.isArray(runtimes)).toBe(true);
    });
  });
});
