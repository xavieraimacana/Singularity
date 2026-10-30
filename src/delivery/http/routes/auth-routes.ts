import type { FastifyPluginAsync } from 'fastify';
import type { AuthService } from '../../../auth-identity/services/auth-service.js';
import { createAuthHook, requireRole } from '../middleware/auth-hook.js';
import type { CreateUserRequest } from '../../../auth-identity/models/user.js';

export interface AuthRoutesOptions {
  authService: AuthService;
}

export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (fastify, opts) => {
  const { authService } = opts;
  const authenticate = createAuthHook(authService);

  // Public: Login
  fastify.post<{
    Body: { username: string; password: string };
  }>('/login', async (request, reply) => {
    const { username, password } = request.body || {};
    if (!username || !password) {
      return reply.status(400).send({ error: 'Usuario y contraseña requeridos' });
    }

    try {
      const result = await authService.login(username, password);
      return reply.status(200).send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error de autenticación';
      return reply.status(401).send({ error: message });
    }
  });

  // Protected: Current user profile
  fastify.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'No autenticado' });
    }

    const user = authService.getUserById(request.user.userId);
    if (!user) {
      return reply.status(404).send({ error: 'Usuario no encontrado' });
    }

    return reply.status(200).send({
      id: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  });

  // Protected: Change password
  fastify.post<{
    Body: { userId: string; currentPassword: string; newPassword: string };
  }>('/change-password', { preHandler: [authenticate] }, async (request, reply) => {
    const { userId, currentPassword, newPassword } = request.body || {};
    if (!userId || !currentPassword || !newPassword) {
      return reply.status(400).send({ error: 'Todos los campos son requeridos' });
    }

    // Only allow changing own password unless ADMIN
    if (request.user?.role !== 'ADMIN' && request.user?.userId !== userId) {
      return reply.status(403).send({ error: 'No autorizado para cambiar contraseñas de otros usuarios' });
    }

    try {
      await authService.changePassword(userId, currentPassword, newPassword);
      return reply.status(200).send({ message: 'Contraseña actualizada exitosamente' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cambiar contraseña';
      return reply.status(400).send({ error: message });
    }
  });

  // Protected (ADMIN only): List users
  fastify.get(
    '/users',
    { preHandler: [authenticate, requireRole(['ADMIN'])] },
    async (_request, reply) => {
      const users = authService.listUsers();
      return reply.status(200).send(users);
    }
  );

  // Protected (ADMIN only): Create user
  fastify.post<{
    Body: CreateUserRequest;
  }>(
    '/users',
    { preHandler: [authenticate, requireRole(['ADMIN'])] },
    async (request, reply) => {
      try {
        const created = await authService.createUser(request.body);
        return reply.status(201).send(created);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al crear usuario';
        return reply.status(400).send({ error: message });
      }
    }
  );
};
