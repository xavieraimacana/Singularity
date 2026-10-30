import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthService } from '../../../auth-identity/services/auth-service.js';
import type { AuthTokenPayload, UserRole } from '../../../auth-identity/models/user.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthTokenPayload;
  }
}

export function createAuthHook(authService: AuthService) {
  return async function authenticate(request: FastifyRequest, reply: FastifyReply) {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.status(401).send({ error: 'Acceso no autorizado: Token no proporcionado' });
      return;
    }

    const token = authHeader.slice(7).trim();
    try {
      const payload = authService.verifyToken(token);
      request.user = payload;
    } catch {
      reply.status(401).send({ error: 'Token de sesión inválido o expirado' });
      return;
    }
  };
}

export function requireRole(allowedRoles: UserRole[]) {
  return async function checkRole(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      reply.status(401).send({ error: 'Acceso no autorizado' });
      return;
    }

    if (!allowedRoles.includes(request.user.role)) {
      reply.status(403).send({ error: 'Acceso denegado: Permisos insuficientes' });
      return;
    }
  };
}
