import type { FastifyPluginAsync } from 'fastify';
import type { IContentProvider } from '../../../content-catalog/providers/content-provider.interface.js';
import type { ContentInstallerService } from '../../../content-catalog/services/content-installer.js';
import type { AuthService } from '../../../auth-identity/services/auth-service.js';
import { createAuthHook, requireRole } from '../middleware/auth-hook.js';
import type {
  CatalogSearchQuery,
  InstallContentRequest,
  ProjectType
} from '../../../content-catalog/models/catalog-item.js';

export interface CatalogRoutesOptions {
  providers: Map<string, IContentProvider>;
  installer: ContentInstallerService;
  authService: AuthService;
}

export const catalogRoutes: FastifyPluginAsync<CatalogRoutesOptions> = async (fastify, opts) => {
  const { providers, installer, authService } = opts;
  const authenticate = createAuthHook(authService);

  fastify.addHook('preHandler', authenticate);

  // List all catalog providers and their availability status
  fastify.get('/providers', async (_request, reply) => {
    const list = Array.from(providers.values()).map((p) => ({
      id: p.id,
      name: p.name,
      isEnabled: p.isEnabled
    }));
    return reply.status(200).send(list);
  });

  // Search catalog across providers
  fastify.get<{
    Querystring: {
      query?: string;
      projectType?: ProjectType;
      gameVersion?: string;
      loader?: string;
      provider?: string;
      limit?: string;
      offset?: string;
    };
  }>('/search', async (request, reply) => {
    const {
      query,
      projectType,
      gameVersion,
      loader,
      provider: providerId = 'modrinth',
      limit,
      offset
    } = request.query;

    const provider = providers.get(providerId);
    if (!provider) {
      return reply.status(400).send({
        error: `Proveedor '${providerId}' no registrado. Disponibles: ${Array.from(providers.keys()).join(', ')}`
      });
    }

    if (!provider.isEnabled) {
      return reply.status(400).send({
        error: `El proveedor '${providerId}' no está configurado (falta API Key)`
      });
    }

    const searchQuery: CatalogSearchQuery = {
      query: query || '',
      projectType,
      gameVersion,
      loader,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0
    };

    try {
      const results = await provider.search(searchQuery);
      return reply.status(200).send(results);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al buscar en catálogo';
      return reply.status(500).send({ error: message });
    }
  });

  // Get installed manifest for an instance
  fastify.get<{
    Params: { instanceId: string };
  }>('/installed/:instanceId', async (request, reply) => {
    const manifest = await installer.getManifest(request.params.instanceId);
    return reply.status(200).send(manifest);
  });

  // Install content item (OPERATOR, ADMIN)
  fastify.post<{
    Body: InstallContentRequest;
  }>('/install', { preHandler: [requireRole(['ADMIN', 'OPERATOR'])] }, async (request, reply) => {
    try {
      const installed = await installer.install(request.body);
      return reply.status(200).send(installed);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al instalar contenido';
      return reply.status(500).send({ error: message });
    }
  });

  // Uninstall content item (OPERATOR, ADMIN)
  fastify.delete<{
    Params: { instanceId: string; projectId: string };
  }>('/installed/:instanceId/:projectId', { preHandler: [requireRole(['ADMIN', 'OPERATOR'])] }, async (request, reply) => {
    const { instanceId, projectId } = request.params;
    try {
      await installer.uninstall(instanceId, projectId);
      return reply.status(200).send({ message: `Elemento ${projectId} desinstalado correctamente` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al desinstalar contenido';
      return reply.status(500).send({ error: message });
    }
  });
};
