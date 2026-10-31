import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/delivery/http/server.js';
import fs from 'node:fs/promises';
import path from 'node:path';

describe('Delivery API > Task Scheduler Endpoints (/api/tasks)', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let serverId: string;
  const testDir = path.resolve('data/test-scheduler-api');

  beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });

    app = await buildServer({
      dbPath: path.join(testDir, 'test.db'),
      serversDir: path.join(testDir, 'servers')
    });

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: 'admin',
        password: 'singularity'
      }
    });

    const body = JSON.parse(loginRes.body);
    adminToken = body.token;

    const serverLifecycle = (app as any).serverLifecycle;
    const server = await serverLifecycle.createInstance({
      name: 'Alpha Server',
      loader: 'vanilla',
      gameVersion: '1.21.1',
      memoryMb: 2048,
      port: 25580
    });
    serverId = server.id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
  });

  it('should create, list, toggle, run, and delete a scheduled task', async () => {
    // 1. Create a task
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: {
        authorization: `Bearer ${adminToken}`
      },
      payload: {
        serverId,
        name: 'Auto Backup 6h',
        action: 'backup',
        scheduleType: 'interval',
        intervalMinutes: 360,
        payload: {
          backupComment: 'Copia periódica cada 6 horas'
        }
      }
    });

    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.body);
    expect(created.id).toBeDefined();
    expect(created.name).toBe('Auto Backup 6h');
    expect(created.nextRunAt).toBeDefined();

    // 2. List tasks
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/tasks?serverId=${serverId}`,
      headers: {
        authorization: `Bearer ${adminToken}`
      }
    });

    expect(listRes.statusCode).toBe(200);
    const tasks = JSON.parse(listRes.body);
    expect(tasks.length).toBeGreaterThanOrEqual(1);

    // 3. Run task immediately
    const runRes = await app.inject({
      method: 'POST',
      url: `/api/tasks/${created.id}/run`,
      headers: {
        authorization: `Bearer ${adminToken}`
      }
    });

    expect(runRes.statusCode).toBe(200);
    const runBody = JSON.parse(runRes.body);
    expect(runBody.success).toBe(true);

    // 4. Toggle task enabled
    const toggleRes = await app.inject({
      method: 'POST',
      url: `/api/tasks/${created.id}/toggle`,
      headers: {
        authorization: `Bearer ${adminToken}`
      },
      payload: {
        enabled: false
      }
    });

    expect(toggleRes.statusCode).toBe(200);
    const toggled = JSON.parse(toggleRes.body);
    expect(toggled.enabled).toBe(false);

    // 5. Delete task
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/tasks/${created.id}`,
      headers: {
        authorization: `Bearer ${adminToken}`
      }
    });

    expect(deleteRes.statusCode).toBe(200);
  });
});
