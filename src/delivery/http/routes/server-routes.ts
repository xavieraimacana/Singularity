import path from 'node:path';
import fs from 'node:fs';
import type { FastifyPluginAsync } from 'fastify';
import type { ServerLifecycleService } from '../../../servers/services/server-lifecycle.js';
import type { ProcessRunner } from '../../../process-supervisor/services/process-runner.js';
import type { AuthService } from '../../../auth-identity/services/auth-service.js';
import { createAuthHook, requireRole } from '../middleware/auth-hook.js';
import type { CreateServerInstanceOptions } from '../../../servers/models/server-instance.js';
import type { PropertyValue } from '../../../servers/models/server-properties.js';
import { minecraftVersionsService } from '../../../servers/services/minecraft-versions.js';

export interface ServerRoutesOptions {
  serverLifecycle: ServerLifecycleService;
  processRunner: ProcessRunner;
  authService: AuthService;
}

export const serverRoutes: FastifyPluginAsync<ServerRoutesOptions> = async (fastify, opts) => {
  const { serverLifecycle, processRunner, authService } = opts;
  const authenticate = createAuthHook(authService);

  // Apply authentication to all server routes
  fastify.addHook('preHandler', authenticate);

  function checkServerPermission(request: any, serverId: string): boolean {
    if (!request.user || request.user.role === 'ADMIN') return true;
    const allowed = request.user.allowedServers || ['*'];
    return allowed.includes('*') || allowed.includes(serverId);
  }

  // Enforce granular server permission on all /:id subroutes
  fastify.addHook('preHandler', async (request, reply) => {
    const params = request.params as { id?: string } | undefined;
    if (params?.id && params.id !== 'versions') {
      if (!checkServerPermission(request, params.id)) {
        return reply.status(403).send({ error: 'Acceso denegado: No tienes permisos para gestionar este servidor' });
      }
    }
  });

  // List all Minecraft versions with full metadata (VIEWER, OPERATOR, ADMIN)
  fastify.get<{
    Querystring: {
      includeSnapshots?: string;
      search?: string;
    };
  }>('/versions', async (request, reply) => {
    const includeSnapshots = request.query.includeSnapshots === 'true';
    const search = request.query.search;
    const versionsData = await minecraftVersionsService.getVersions({ includeSnapshots, search });
    return reply.status(200).send(versionsData);
  });

  // List all servers (VIEWER, OPERATOR, ADMIN)
  fastify.get('/', async (request, reply) => {
    const instances = await serverLifecycle.listInstances();
    const allowedInstances = (request.user?.role === 'ADMIN' || !request.user?.allowedServers || request.user.allowedServers.includes('*'))
      ? instances
      : instances.filter((srv) => request.user?.allowedServers.includes(srv.id));

    const withLiveStatus = allowedInstances.map((srv) => {
      const liveState = processRunner.getState(srv.id);
      return {
        ...srv,
        status: liveState ? liveState.status : srv.status,
        pid: liveState?.pid
      };
    });
    return reply.status(200).send(withLiveStatus);
  });

  // Create server instance (OPERATOR, ADMIN)
  fastify.post<{
    Body: CreateServerInstanceOptions;
  }>('/', { preHandler: [requireRole(['ADMIN', 'OPERATOR'])] }, async (request, reply) => {
    try {
      const created = await serverLifecycle.createInstance(request.body);
      return reply.status(201).send(created);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear instancia';
      return reply.status(400).send({ error: message });
    }
  });

  // Get server details
  fastify.get<{
    Params: { id: string };
  }>('/:id', async (request, reply) => {
    const instance = await serverLifecycle.getInstance(request.params.id);
    if (!instance) {
      return reply.status(404).send({ error: `Servidor '${request.params.id}' no encontrado` });
    }

    const liveState = processRunner.getState(instance.id);
    return reply.status(200).send({
      ...instance,
      status: liveState ? liveState.status : instance.status,
      pid: liveState?.pid
    });
  });

  // Delete server instance (ADMIN only)
  fastify.delete<{
    Params: { id: string };
  }>('/:id', { preHandler: [requireRole(['ADMIN'])] }, async (request, reply) => {
    const instance = await serverLifecycle.getInstance(request.params.id);
    if (!instance) {
      return reply.status(404).send({ error: 'Servidor no encontrado' });
    }

    // Stop process if running
    if (processRunner.getState(instance.id)?.status === 'online') {
      await processRunner.stopProcess(instance.id);
    }

    await serverLifecycle.deleteInstance(instance.id);
    return reply.status(200).send({ message: `Servidor '${instance.name}' eliminado correctamente` });
  });

  // Start server (OPERATOR, ADMIN)
  fastify.post<{
    Params: { id: string };
  }>('/:id/start', { preHandler: [requireRole(['ADMIN', 'OPERATOR'])] }, async (request, reply) => {
    const instance = await serverLifecycle.getInstance(request.params.id);
    if (!instance) {
      return reply.status(404).send({ error: 'Servidor no encontrado' });
    }

    try {
      const instanceDir = serverLifecycle.getInstanceDir(instance.id);
      const jarPath = path.join(instanceDir, 'server.jar');

      // Auto-download server.jar if missing and loader supports direct resolution
      if (!fs.existsSync(jarPath)) {
        const jarUrl = await minecraftVersionsService.resolveServerJarUrl(instance.gameVersion, instance.loader);
        if (jarUrl) {
          try {
            const res = await fetch(jarUrl);
            if (res.ok) {
              const buffer = Buffer.from(await res.arrayBuffer());
              await fs.promises.writeFile(jarPath, buffer);
            }
          } catch {
            // ignore download error and fall through to check
          }
        }
      }

      if (!fs.existsSync(jarPath)) {
        const errorMsg = `No se encontró el archivo server.jar para el servidor '${instance.name}'. Descárgalo desde el panel de control o sube tu jar mediante SFTP (:2022).`;
        return reply.status(400).send({
          error: errorMsg,
          message: errorMsg
        });
      }

      const executable = instance.javaPath || (process.platform === 'win32' ? 'java.exe' : 'java');
      const args = [...(instance.jvmArgs || ['-Xms1G', `-Xmx${instance.memoryMb}M`]), '-jar', jarPath, 'nogui'];

      const state = await processRunner.startProcess(instance, {
        executable,
        args,
        cwd: instanceDir
      });
      return reply.status(200).send(state);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al iniciar servidor';
      return reply.status(500).send({ error: message });
    }
  });

  // Download or update server.jar for an instance (OPERATOR, ADMIN)
  fastify.post<{
    Params: { id: string };
  }>('/:id/download-jar', { preHandler: [requireRole(['ADMIN', 'OPERATOR'])] }, async (request, reply) => {
    const instance = await serverLifecycle.getInstance(request.params.id);
    if (!instance) {
      return reply.status(404).send({ error: 'Servidor no encontrado' });
    }

    try {
      const jarUrl = await minecraftVersionsService.resolveServerJarUrl(instance.gameVersion, instance.loader);
      if (!jarUrl) {
        const errorMsg = `Descarga automática no disponible directamente para loader '${instance.loader}'. Sube tu server.jar vía SFTP (:2022).`;
        return reply.status(400).send({
          error: errorMsg,
          message: errorMsg
        });
      }

      const instanceDir = serverLifecycle.getInstanceDir(instance.id);
      const jarPath = path.join(instanceDir, 'server.jar');
      const res = await fetch(jarUrl);
      if (!res.ok) {
        return reply.status(502).send({
          error: `Fallo al descargar server.jar desde el repositorio remoto (HTTP ${res.status})`
        });
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      await fs.promises.writeFile(jarPath, buffer);

      return reply.status(200).send({
        success: true,
        message: `server.jar descargado correctamente para ${instance.loader} ${instance.gameVersion} (${(buffer.length / (1024 * 1024)).toFixed(1)} MB)`
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al descargar jar';
      return reply.status(500).send({ error: message });
    }
  });

  // Stop server (OPERATOR, ADMIN)
  fastify.post<{
    Params: { id: string };
  }>('/:id/stop', { preHandler: [requireRole(['ADMIN', 'OPERATOR'])] }, async (request, reply) => {
    const instance = await serverLifecycle.getInstance(request.params.id);
    if (!instance) {
      return reply.status(404).send({ error: 'Servidor no encontrado' });
    }

    try {
      await processRunner.stopProcess(instance.id);
      return reply.status(200).send({ message: 'Señal de detención enviada' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al detener servidor';
      return reply.status(500).send({ error: message });
    }
  });

  // Restart server (OPERATOR, ADMIN)
  fastify.post<{
    Params: { id: string };
  }>('/:id/restart', { preHandler: [requireRole(['ADMIN', 'OPERATOR'])] }, async (request, reply) => {
    const instance = await serverLifecycle.getInstance(request.params.id);
    if (!instance) {
      return reply.status(404).send({ error: 'Servidor no encontrado' });
    }

    try {
      const instanceDir = serverLifecycle.getInstanceDir(instance.id);
      const jarPath = path.join(instanceDir, 'server.jar');

      if (!fs.existsSync(jarPath)) {
        const errorMsg = `No se encontró el archivo server.jar para el servidor '${instance.name}'.`;
        return reply.status(400).send({
          error: errorMsg,
          message: errorMsg
        });
      }

      const executable = instance.javaPath || (process.platform === 'win32' ? 'java.exe' : 'java');
      const args = [...(instance.jvmArgs || ['-Xms1G', `-Xmx${instance.memoryMb}M`]), '-jar', jarPath, 'nogui'];

      await processRunner.stopProcess(instance.id);
      const state = await processRunner.startProcess(instance, {
        executable,
        args,
        cwd: instanceDir
      });
      return reply.status(200).send(state);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al reiniciar servidor';
      return reply.status(500).send({ error: message });
    }
  });

  // Send command to server console (OPERATOR, ADMIN)
  fastify.post<{
    Params: { id: string };
    Body: { command: string };
  }>('/:id/command', { preHandler: [requireRole(['ADMIN', 'OPERATOR'])] }, async (request, reply) => {
    const { command } = request.body || {};
    if (!command || typeof command !== 'string') {
      return reply.status(400).send({ error: 'El comando es requerido' });
    }

    const state = processRunner.getState(request.params.id);
    if (!state || state.status !== 'online') {
      return reply.status(400).send({ error: 'No se pueden enviar comandos a un servidor offline' });
    }

    try {
      processRunner.sendCommand(request.params.id, command);
      return reply.status(200).send({ message: 'Comando enviado' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al enviar comando';
      return reply.status(500).send({ error: message });
    }
  });

  // Get server.properties
  fastify.get<{
    Params: { id: string };
  }>('/:id/properties', async (request, reply) => {
    try {
      const config = await serverLifecycle.getProperties(request.params.id);
      return reply.status(200).send(config.properties);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al leer propiedades';
      return reply.status(500).send({ error: message });
    }
  });

  // Update server.properties (OPERATOR, ADMIN)
  fastify.put<{
    Params: { id: string };
    Body: { properties: Record<string, PropertyValue> };
  }>('/:id/properties', { preHandler: [requireRole(['ADMIN', 'OPERATOR'])] }, async (request, reply) => {
    const { properties } = request.body || {};
    if (!properties) {
      return reply.status(400).send({ error: 'Propiedades requeridas' });
    }

    try {
      const current = await serverLifecycle.getProperties(request.params.id);
      await serverLifecycle.saveProperties(request.params.id, {
        headers: current.headers,
        properties
      });
      return reply.status(200).send({ message: 'Propiedades actualizadas exitosamente' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar propiedades';
      return reply.status(500).send({ error: message });
    }
  });

  // Get real-time process metrics
  fastify.get<{
    Params: { id: string };
  }>('/:id/metrics', async (request, reply) => {
    const state = processRunner.getState(request.params.id);
    if (!state) {
      return reply.status(200).send({
        status: 'offline',
        pid: null
      });
    }

    return reply.status(200).send({
      status: state.status,
      pid: state.pid,
      startedAt: state.startedAt
    });
  });
};
