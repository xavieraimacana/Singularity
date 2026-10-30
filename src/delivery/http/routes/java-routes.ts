import type { FastifyPluginAsync } from 'fastify';
import { detectSystemRuntimes } from '../../../java-manager/services/java-detector.js';
import { downloadPortableJava } from '../../../java-manager/services/java-downloader.js';
import type { AuthService } from '../../../auth-identity/services/auth-service.js';
import { createAuthHook, requireRole } from '../middleware/auth-hook.js';

export interface JavaRoutesOptions {
  authService: AuthService;
}

export const javaRoutes: FastifyPluginAsync<JavaRoutesOptions> = async (fastify, opts) => {
  const { authService } = opts;
  const authenticate = createAuthHook(authService);

  fastify.addHook('preHandler', authenticate);

  // Detect installed Java runtimes on system
  fastify.get('/detect', async (_request, reply) => {
    try {
      const runtimes = await detectSystemRuntimes();
      return reply.status(200).send(runtimes);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al detectar versiones de Java';
      return reply.status(500).send({ error: message });
    }
  });

  // Download portable Eclipse Temurin Java runtime (ADMIN only)
  fastify.post<{
    Body: { majorVersion: number };
  }>('/download', { preHandler: [requireRole(['ADMIN'])] }, async (request, reply) => {
    const { majorVersion } = request.body || {};
    if (!majorVersion) {
      return reply.status(400).send({ error: 'Versión mayor de Java requerida (ej. 8, 17, 21)' });
    }

    try {
      const runtime = await downloadPortableJava(majorVersion);
      return reply.status(200).send(runtime);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al descargar Java';
      return reply.status(500).send({ error: message });
    }
  });
};
