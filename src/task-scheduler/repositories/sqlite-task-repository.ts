import type { DatabaseSync } from 'node:sqlite';
import type { ScheduledTask, ScheduledTaskAction, ScheduleType, TaskExecutionStatus, TaskPayload } from '../models/scheduled-task.js';
import type { ITaskRepository } from './task-repository.interface.js';

interface TaskRow {
  id: string;
  server_id: string;
  name: string;
  action: string;
  schedule_type: string;
  interval_minutes: number | null;
  time_of_day: string | null;
  cron_expression: string | null;
  payload_json: string | null;
  enabled: number;
  created_at: string;
  last_run_at: string | null;
  next_run_at: string | null;
  last_status: string | null;
  last_error: string | null;
}

export class SqliteTaskRepository implements ITaskRepository {
  constructor(private readonly db: DatabaseSync) {}

  initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scheduled_tasks (
        id TEXT PRIMARY KEY,
        server_id TEXT NOT NULL,
        name TEXT NOT NULL,
        action TEXT NOT NULL,
        schedule_type TEXT NOT NULL,
        interval_minutes INTEGER,
        time_of_day TEXT,
        cron_expression TEXT,
        payload_json TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        last_run_at TEXT,
        next_run_at TEXT,
        last_status TEXT,
        last_error TEXT
      );
    `);
  }

  private mapRowToTask(row: TaskRow): ScheduledTask {
    let payload: TaskPayload | undefined;
    if (row.payload_json) {
      try {
        payload = JSON.parse(row.payload_json);
      } catch {
        payload = undefined;
      }
    }

    return {
      id: row.id,
      serverId: row.server_id,
      name: row.name,
      action: row.action as ScheduledTaskAction,
      scheduleType: row.schedule_type as ScheduleType,
      intervalMinutes: row.interval_minutes ?? undefined,
      timeOfDay: row.time_of_day ?? undefined,
      cronExpression: row.cron_expression ?? undefined,
      payload,
      enabled: row.enabled === 1,
      createdAt: row.created_at,
      lastRunAt: row.last_run_at ?? undefined,
      nextRunAt: row.next_run_at ?? undefined,
      lastStatus: (row.last_status as TaskExecutionStatus) ?? undefined,
      lastError: row.last_error ?? undefined
    };
  }

  async create(task: ScheduledTask): Promise<ScheduledTask> {
    const stmt = this.db.prepare(`
      INSERT INTO scheduled_tasks (
        id, server_id, name, action, schedule_type, interval_minutes,
        time_of_day, cron_expression, payload_json, enabled,
        created_at, last_run_at, next_run_at, last_status, last_error
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `);

    stmt.run(
      task.id,
      task.serverId,
      task.name,
      task.action,
      task.scheduleType,
      task.intervalMinutes ?? null,
      task.timeOfDay ?? null,
      task.cronExpression ?? null,
      task.payload ? JSON.stringify(task.payload) : null,
      task.enabled ? 1 : 0,
      task.createdAt,
      task.lastRunAt ?? null,
      task.nextRunAt ?? null,
      task.lastStatus ?? null,
      task.lastError ?? null
    );

    return task;
  }

  async findById(id: string): Promise<ScheduledTask | null> {
    const stmt = this.db.prepare('SELECT * FROM scheduled_tasks WHERE id = ?');
    const row = stmt.get(id) as unknown as TaskRow | undefined;
    if (!row) return null;
    return this.mapRowToTask(row);
  }

  async list(filter?: { serverId?: string }): Promise<ScheduledTask[]> {
    if (filter?.serverId && filter.serverId !== '*') {
      const stmt = this.db.prepare("SELECT * FROM scheduled_tasks WHERE server_id = ? OR server_id = '*' ORDER BY created_at ASC");
      const rows = stmt.all(filter.serverId) as unknown as TaskRow[];
      return rows.map((r) => this.mapRowToTask(r));
    }

    const stmt = this.db.prepare('SELECT * FROM scheduled_tasks ORDER BY created_at ASC');
    const rows = stmt.all() as unknown as TaskRow[];
    return rows.map((r) => this.mapRowToTask(r));
  }

  async update(task: ScheduledTask): Promise<ScheduledTask> {
    const stmt = this.db.prepare(`
      UPDATE scheduled_tasks SET
        name = ?,
        action = ?,
        schedule_type = ?,
        interval_minutes = ?,
        time_of_day = ?,
        cron_expression = ?,
        payload_json = ?,
        enabled = ?,
        last_run_at = ?,
        next_run_at = ?,
        last_status = ?,
        last_error = ?
      WHERE id = ?
    `);

    stmt.run(
      task.name,
      task.action,
      task.scheduleType,
      task.intervalMinutes ?? null,
      task.timeOfDay ?? null,
      task.cronExpression ?? null,
      task.payload ? JSON.stringify(task.payload) : null,
      task.enabled ? 1 : 0,
      task.lastRunAt ?? null,
      task.nextRunAt ?? null,
      task.lastStatus ?? null,
      task.lastError ?? null,
      task.id
    );

    return task;
  }

  async delete(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM scheduled_tasks WHERE id = ?');
    const res = stmt.run(id);
    return res.changes > 0;
  }
}
