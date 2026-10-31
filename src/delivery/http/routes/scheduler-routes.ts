import type { FastifyPluginAsync } from 'fastify';
import type { TaskSchedulerService } from '../../../task-scheduler/services/task-scheduler-service.js';
import type { CreateScheduledTaskDto, UpdateScheduledTaskDto } from '../../../task-scheduler/models/scheduled-task.js';
import type { AuthService } from '../../../auth-identity/services/auth-service.js';
import { createAuthHook, requireRole } from '../middleware/auth-hook.js';

interface SchedulerRouteOptions {
  taskScheduler: TaskSchedulerService;
  authService: AuthService;
}

export const schedulerRoutes: FastifyPluginAsync<SchedulerRouteOptions> = async (fastify, options) => {
  const { taskScheduler, authService } = options;
  const authenticate = createAuthHook(authService);

  // Enforce authentication on all scheduler routes
  fastify.addHook('preHandler', authenticate);

  // List tasks (Optional query ?serverId=...)
  fastify.get<{
    Querystring: { serverId?: string };
  }>('/', async (request, reply) => {
    const filter = request.query.serverId ? { serverId: request.query.serverId } : undefined;
    const tasks = await taskScheduler.listTasks(filter);
    return reply.status(200).send(tasks);
  });

  // Get task by ID
  fastify.get<{
    Params: { id: string };
  }>('/:id', async (request, reply) => {
    const task = await taskScheduler.getTask(request.params.id);
    if (!task) {
      return reply.status(404).send({ error: 'Tarea programada no encontrada' });
    }
    return reply.status(200).send(task);
  });

  // Create task (ADMIN, OPERATOR)
  fastify.post<{
    Body: CreateScheduledTaskDto;
  }>('/', { preHandler: [requireRole(['ADMIN', 'OPERATOR'])] }, async (request, reply) => {
    try {
      const created = await taskScheduler.createTask(request.body);
      return reply.status(201).send(created);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear tarea programada';
      return reply.status(400).send({ error: message });
    }
  });

  // Update task (ADMIN, OPERATOR)
  fastify.put<{
    Params: { id: string };
    Body: UpdateScheduledTaskDto;
  }>('/:id', { preHandler: [requireRole(['ADMIN', 'OPERATOR'])] }, async (request, reply) => {
    try {
      const updated = await taskScheduler.updateTask(request.params.id, request.body);
      return reply.status(200).send(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar tarea programada';
      return reply.status(400).send({ error: message });
    }
  });

  // Toggle enabled/disabled (ADMIN, OPERATOR)
  fastify.post<{
    Params: { id: string };
    Body: { enabled: boolean };
  }>('/:id/toggle', { preHandler: [requireRole(['ADMIN', 'OPERATOR'])] }, async (request, reply) => {
    try {
      const updated = await taskScheduler.toggleTask(request.params.id, request.body.enabled);
      return reply.status(200).send(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cambiar estado de la tarea';
      return reply.status(400).send({ error: message });
    }
  });

  // Run task immediately (ADMIN, OPERATOR)
  fastify.post<{
    Params: { id: string };
  }>('/:id/run', { preHandler: [requireRole(['ADMIN', 'OPERATOR'])] }, async (request, reply) => {
    const result = await taskScheduler.runTaskNow(request.params.id);
    if (!result.success) {
      return reply.status(500).send(result);
    }
    return reply.status(200).send(result);
  });

  // Delete task (ADMIN, OPERATOR)
  fastify.delete<{
    Params: { id: string };
  }>('/:id', { preHandler: [requireRole(['ADMIN', 'OPERATOR'])] }, async (request, reply) => {
    const deleted = await taskScheduler.deleteTask(request.params.id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Tarea programada no encontrada' });
    }
    return reply.status(200).send({ success: true, message: 'Tarea eliminada exitosamente' });
  });
};
