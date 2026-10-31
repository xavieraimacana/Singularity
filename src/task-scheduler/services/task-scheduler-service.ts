import { randomUUID } from 'node:crypto';
import type {
  CreateScheduledTaskDto,
  ScheduledTask,
  UpdateScheduledTaskDto
} from '../models/scheduled-task.js';
import type { ITaskRepository } from '../repositories/task-repository.interface.js';
import { CronCalculator } from './cron-calculator.js';

export interface TaskSchedulerDependencies {
  taskRepo: ITaskRepository;
  backupService?: {
    createBackup: (serverId: string, options?: { comment?: string }) => Promise<any>;
  };
  processRunner?: {
    getState: (serverId: string) => { status: string } | null;
    sendCommand: (serverId: string, command: string) => void;
    stopProcess: (serverId: string, timeoutMs?: number) => Promise<void>;
  };
  serverLauncher?: (serverId: string) => Promise<any>;
  serverLifecycle?: {
    listInstances: () => Promise<Array<{ id: string }>>;
  };
  pollIntervalMs?: number;
}

export class TaskSchedulerService {
  private timer: NodeJS.Timeout | null = null;
  private isTickRunning = false;

  constructor(private readonly deps: TaskSchedulerDependencies) {}

  start(): void {
    if (this.timer) return;
    const interval = this.deps.pollIntervalMs ?? 15000;
    this.timer = setInterval(() => {
      this.tick().catch((err) => {
        console.error('[TaskScheduler] Error en ciclo de evaluación:', err);
      });
    }, interval);

    // Initial check without blocking
    this.tick().catch(() => {});
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async createTask(dto: CreateScheduledTaskDto): Promise<ScheduledTask> {
    const id = `task_${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const nextRun = CronCalculator.calculateNextRun(
      {
        scheduleType: dto.scheduleType,
        intervalMinutes: dto.intervalMinutes,
        timeOfDay: dto.timeOfDay,
        cronExpression: dto.cronExpression
      },
      now
    );

    const task: ScheduledTask = {
      id,
      serverId: dto.serverId,
      name: dto.name,
      action: dto.action,
      scheduleType: dto.scheduleType,
      intervalMinutes: dto.intervalMinutes,
      timeOfDay: dto.timeOfDay,
      cronExpression: dto.cronExpression,
      payload: dto.payload,
      enabled: dto.enabled !== false,
      createdAt: now.toISOString(),
      nextRunAt: nextRun.toISOString(),
      lastStatus: 'idle'
    };

    return this.deps.taskRepo.create(task);
  }

  async getTask(id: string): Promise<ScheduledTask | null> {
    return this.deps.taskRepo.findById(id);
  }

  async listTasks(filter?: { serverId?: string }): Promise<ScheduledTask[]> {
    return this.deps.taskRepo.list(filter);
  }

  async updateTask(id: string, dto: UpdateScheduledTaskDto): Promise<ScheduledTask> {
    const existing = await this.deps.taskRepo.findById(id);
    if (!existing) {
      throw new Error(`Tarea programada '${id}' no encontrada.`);
    }

    const updated: ScheduledTask = {
      ...existing,
      name: dto.name ?? existing.name,
      action: dto.action ?? existing.action,
      scheduleType: dto.scheduleType ?? existing.scheduleType,
      intervalMinutes: dto.intervalMinutes ?? existing.intervalMinutes,
      timeOfDay: dto.timeOfDay ?? existing.timeOfDay,
      cronExpression: dto.cronExpression ?? existing.cronExpression,
      payload: dto.payload ?? existing.payload,
      enabled: dto.enabled ?? existing.enabled
    };

    // Recalculate next run if schedule parameters changed
    const nextRun = CronCalculator.calculateNextRun(updated, new Date());
    updated.nextRunAt = nextRun.toISOString();

    return this.deps.taskRepo.update(updated);
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.deps.taskRepo.delete(id);
  }

  async toggleTask(id: string, enabled: boolean): Promise<ScheduledTask> {
    return this.updateTask(id, { enabled });
  }

  async runTaskNow(id: string): Promise<{ success: boolean; message: string; error?: string }> {
    const task = await this.deps.taskRepo.findById(id);
    if (!task) {
      throw new Error(`Tarea programada '${id}' no encontrada.`);
    }

    try {
      await this.executeTask(task);
      return { success: true, message: `Tarea '${task.name}' ejecutada con éxito.` };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido al ejecutar tarea';
      return { success: false, message: `Error al ejecutar '${task.name}'`, error: message };
    }
  }

  async tick(): Promise<void> {
    if (this.isTickRunning) return;
    this.isTickRunning = true;

    try {
      const now = new Date();
      const tasks = await this.deps.taskRepo.list();

      for (const task of tasks) {
        if (!task.enabled) continue;
        if (!task.nextRunAt) continue;

        const scheduledTime = new Date(task.nextRunAt).getTime();
        if (scheduledTime <= now.getTime()) {
          try {
            await this.executeTask(task);
          } catch (err) {
            console.error(`[TaskScheduler] Error ejecutando tarea '${task.id}' (${task.name}):`, err);
          }
        }
      }
    } finally {
      this.isTickRunning = false;
    }
  }

  async executeTask(task: ScheduledTask): Promise<void> {
    task.lastStatus = 'running';
    await this.deps.taskRepo.update(task);

    try {
      const targetServers: string[] = [];
      if (task.serverId === '*') {
        if (this.deps.serverLifecycle) {
          const all = await this.deps.serverLifecycle.listInstances();
          targetServers.push(...all.map((s) => s.id));
        }
      } else {
        targetServers.push(task.serverId);
      }

      for (const srvId of targetServers) {
        await this.runActionForServer(srvId, task);
      }

      const now = new Date();
      const nextRun = CronCalculator.calculateNextRun(task, now);

      task.lastStatus = 'success';
      task.lastRunAt = now.toISOString();
      task.nextRunAt = nextRun.toISOString();
      task.lastError = undefined;
      await this.deps.taskRepo.update(task);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const now = new Date();
      const nextRun = CronCalculator.calculateNextRun(task, now);

      task.lastStatus = 'failed';
      task.lastRunAt = now.toISOString();
      task.nextRunAt = nextRun.toISOString();
      task.lastError = errorMsg;
      await this.deps.taskRepo.update(task);
      throw err;
    }
  }

  private async runActionForServer(serverId: string, task: ScheduledTask): Promise<void> {
    switch (task.action) {
      case 'backup': {
        if (!this.deps.backupService) {
          throw new Error('Servicio de copias de seguridad (BackupService) no disponible.');
        }
        const comment = task.payload?.backupComment || `Auto-backup programado: ${task.name}`;
        await this.deps.backupService.createBackup(serverId, { comment });
        break;
      }

      case 'command': {
        if (!this.deps.processRunner) {
          throw new Error('Supervisor de procesos (ProcessRunner) no disponible.');
        }
        const cmd = task.payload?.command;
        if (!cmd) {
          throw new Error('No se especificó ningún comando para ejecutar.');
        }
        this.deps.processRunner.sendCommand(serverId, cmd);
        break;
      }

      case 'restart': {
        if (!this.deps.processRunner) {
          throw new Error('Supervisor de procesos (ProcessRunner) no disponible.');
        }
        const state = this.deps.processRunner.getState(serverId);
        const isOnline = state && state.status !== 'offline';

        if (isOnline) {
          try {
            this.deps.processRunner.sendCommand(
              serverId,
              'say [Singularity] ATENCIÓN: El servidor se está reiniciando automáticamente según lo programado.'
            );
          } catch {
            // Ignore if stdin is closed
          }

          // Graceful stop with timeout
          await this.deps.processRunner.stopProcess(serverId, 10000);
        }

        // Start server instance
        if (this.deps.serverLauncher) {
          await this.deps.serverLauncher(serverId);
        }
        break;
      }

      default:
        throw new Error(`Acción desconocida: ${(task as any).action}`);
    }
  }
}
