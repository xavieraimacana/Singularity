import path from 'node:path';
import fs from 'node:fs';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import { DbClient } from '../../auth-identity/database/db-client.js';
import { SqliteUserRepository } from '../../auth-identity/repositories/sqlite-user-repository.js';
import { AuthService } from '../../auth-identity/services/auth-service.js';
import { ServerLifecycleService } from '../../servers/services/server-lifecycle.js';
import { ProcessRunner } from '../../process-supervisor/services/process-runner.js';
import { ModrinthProvider } from '../../content-catalog/providers/modrinth-provider.js';
import { PaperMcProvider } from '../../content-catalog/providers/papermc-provider.js';
import { CurseForgeProvider } from '../../content-catalog/providers/curseforge-provider.js';
import { ContentInstallerService } from '../../content-catalog/services/content-installer.js';
import type { IContentProvider } from '../../content-catalog/providers/content-provider.interface.js';
import { authRoutes } from './routes/auth-routes.js';
import { serverRoutes } from './routes/server-routes.js';
import { catalogRoutes } from './routes/catalog-routes.js';
import { javaRoutes } from './routes/java-routes.js';
import { consoleSocketPlugin } from '../websocket/console-socket.js';

export interface ServerOptions {
  dbPath?: string;
  serversDir?: string;
  jwtSecret?: string;
  skipDefaultAdmin?: boolean;
}

export async function buildServer(options: ServerOptions = {}): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: false
  });

  await fastify.register(cors, {
    origin: true,
    credentials: true
  });

  await fastify.register(fastifyWebsocket);

  // Initialize Auth & Database
  const db = DbClient.getDatabase(options.dbPath);
  const userRepo = new SqliteUserRepository(db);
  userRepo.initSchema();

  const jwtSecret = options.jwtSecret || process.env['SINGULARITY_JWT_SECRET'] || 'singularity-secret-key-change-me';
  const authService = new AuthService(userRepo, jwtSecret);

  if (!options.skipDefaultAdmin) {
    const adminUser = process.env['SINGULARITY_ADMIN_USER'] || 'admin';
    const adminPass = process.env['SINGULARITY_ADMIN_PASSWORD'] || 'singularity';
    await authService.ensureDefaultAdmin(adminUser, adminPass);
  }

  // Initialize Domain Services
  const serversDir = options.serversDir || path.join(process.cwd(), 'data', 'servers');
  const serverLifecycle = new ServerLifecycleService(serversDir);
  const processRunner = new ProcessRunner();

  // Initialize Content Catalog
  const providers = new Map<string, IContentProvider>();
  providers.set('modrinth', new ModrinthProvider());
  providers.set('papermc', new PaperMcProvider());
  providers.set('curseforge', new CurseForgeProvider(process.env['CURSEFORGE_API_KEY']));
  const contentInstaller = new ContentInstallerService(serversDir);

  // Register REST API Routes
  await fastify.register(authRoutes, { prefix: '/api/auth', authService });
  await fastify.register(serverRoutes, { prefix: '/api/servers', serverLifecycle, processRunner, authService });
  await fastify.register(catalogRoutes, { prefix: '/api/catalog', providers, installer: contentInstaller, authService });
  await fastify.register(javaRoutes, { prefix: '/api/java', authService });

  // Register WebSocket plugin
  await fastify.register(consoleSocketPlugin, { processRunner, authService });

  // Serve Web Dashboard Static Files if present
  const staticPath = path.join(process.cwd(), 'dist', 'web-dashboard');
  if (fs.existsSync(staticPath)) {
    await fastify.register(fastifyStatic, {
      root: staticPath,
      prefix: '/'
    });
    fastify.setNotFoundHandler((_req, reply) => {
      reply.sendFile('index.html');
    });
  }

  return fastify;
}

// Start server when executed directly
if (process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js')) {
  const port = parseInt(process.env['PORT'] || '3000', 10);
  const host = process.env['HOST'] || '0.0.0.0';

  buildServer()
    .then(async (app) => {
      await app.listen({ port, host });
      console.log(`🌌 Singularity API Server escuchando en http://${host}:${port}`);
    })
    .catch((err) => {
      console.error('Error al iniciar Singularity Server:', err);
      process.exit(1);
    });
}
