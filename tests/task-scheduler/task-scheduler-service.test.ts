import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SqliteTaskRepository } from '../../src/task-scheduler/repositories/sqlite-task-repository.js';
import { TaskSchedulerService } from '../../src/task-scheduler/services/task-scheduler-service.js';

describe('Task Scheduler Domain > TaskSchedulerService', () => {

  let repo: SqliteTaskRepository;
  let mockBackupService: { createBackup: ReturnType<typeof vi.fn> };
  let mockProcessRunner: {
    getState: ReturnType<typeof vi.fn>;
    sendCommand: ReturnType<typeof vi.fn>;
    stopProcess: ReturnType<typeof vi.fn>;
  };
  let mockServerLauncher: ReturnType<typeof vi.fn>;
  let scheduler: TaskSchedulerService;

  beforeEach(() => {

    repo = new SqliteTaskRepository(':memory:');
    repo.initSchema();

    mockBackupService = {
      createBackup: vi.fn().mockResolvedValue({ id: 'backup_123' })
    };

    mockProcessRunner = {
      getState: vi.fn().mockReturnValue({ status: 'online' }),
      sendCommand: vi.fn(),
      stopProcess: vi.fn().mockResolvedValue(undefined)
    };

    mockServerLauncher = vi.fn().mockResolvedValue({ status: 'online' });

    scheduler = new TaskSchedulerService({
      taskRepo: repo,
      backupService: mockBackupService,
      processRunner: mockProcessRunner,
      serverLauncher: mockServerLauncher
    });
  });

  it('should create a task and calculate initial nextRunAt', async () => {
    const task = await scheduler.createTask({
      serverId: 'srv_1',
      name: 'Backup Diario 4AM',
      action: 'backup',
      scheduleType: 'daily',
      timeOfDay: '04:00'
    });

    expect(task.id).toBeDefined();
    expect(task.name).toBe('Backup Diario 4AM');
    expect(task.action).toBe('backup');
    expect(task.enabled).toBe(true);
    expect(task.nextRunAt).toBeDefined();

    const fetched = await scheduler.getTask(task.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe('Backup Diario 4AM');
  });

  it('should execute a backup task successfully', async () => {
    const task = await scheduler.createTask({
      serverId: 'srv_test',
      name: 'Backup Test',
      action: 'backup',
      scheduleType: 'interval',
      intervalMinutes: 120,
      payload: { backupComment: 'Test Backup' }
    });

    const result = await scheduler.runTaskNow(task.id);
    expect(result.success).toBe(true);
    expect(mockBackupService.createBackup).toHaveBeenCalledWith('srv_test', {
      comment: 'Test Backup'
    });

    const updated = await scheduler.getTask(task.id);
    expect(updated?.lastStatus).toBe('success');
    expect(updated?.lastRunAt).toBeDefined();
  });

  it('should execute a command task on online server', async () => {
    const task = await scheduler.createTask({
      serverId: 'srv_test',
      name: 'Say Hi',
      action: 'command',
      scheduleType: 'interval',
      intervalMinutes: 60,
      payload: { command: 'say Hola Jugadores' }
    });

    const result = await scheduler.runTaskNow(task.id);
    expect(result.success).toBe(true);
    expect(mockProcessRunner.sendCommand).toHaveBeenCalledWith('srv_test', 'say Hola Jugadores');

    const updated = await scheduler.getTask(task.id);
    expect(updated?.lastStatus).toBe('success');
  });

  it('should execute restart task by warning, stopping, and restarting server', async () => {
    const task = await scheduler.createTask({
      serverId: 'srv_test',
      name: 'Reinicio Nocturno',
      action: 'restart',
      scheduleType: 'daily',
      timeOfDay: '05:00'
    });

    const result = await scheduler.runTaskNow(task.id);
    expect(result.success).toBe(true);
    expect(mockProcessRunner.sendCommand).toHaveBeenCalled();
    expect(mockProcessRunner.stopProcess).toHaveBeenCalledWith('srv_test', 10000);
    expect(mockServerLauncher).toHaveBeenCalledWith('srv_test');
  });

  it('should record failure state when action throws', async () => {
    mockBackupService.createBackup.mockRejectedValueOnce(new Error('Disk full'));

    const task = await scheduler.createTask({
      serverId: 'srv_test',
      name: 'Failing Backup',
      action: 'backup',
      scheduleType: 'interval',
      intervalMinutes: 30
    });

    const result = await scheduler.runTaskNow(task.id);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Disk full');

    const updated = await scheduler.getTask(task.id);
    expect(updated?.lastStatus).toBe('failed');
    expect(updated?.lastError).toContain('Disk full');
  });

  it('should automatically execute due tasks during tick()', async () => {
    // Create a task scheduled in the past
    const task = await scheduler.createTask({
      serverId: 'srv_test',
      name: 'Due Task',
      action: 'command',
      scheduleType: 'interval',
      intervalMinutes: 10,
      payload: { command: 'save-all' }
    });

    // Artificially set nextRunAt to past
    task.nextRunAt = new Date(Date.now() - 5000).toISOString();
    await repo.update(task);

    await scheduler.tick();

    expect(mockProcessRunner.sendCommand).toHaveBeenCalledWith('srv_test', 'save-all');
    const updated = await scheduler.getTask(task.id);
    expect(updated?.lastStatus).toBe('success');
  });
});
