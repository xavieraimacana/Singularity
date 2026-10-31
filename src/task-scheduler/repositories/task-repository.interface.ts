import type { ScheduledTask } from '../models/scheduled-task.js';

export interface ITaskRepository {
  create(task: ScheduledTask): Promise<ScheduledTask>;
  findById(id: string): Promise<ScheduledTask | null>;
  list(filter?: { serverId?: string }): Promise<ScheduledTask[]>;
  update(task: ScheduledTask): Promise<ScheduledTask>;
  delete(id: string): Promise<boolean>;
}
