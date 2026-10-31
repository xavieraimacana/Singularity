import path from 'node:path';
import fs from 'node:fs';
import type { ScheduledTask } from '../models/scheduled-task.js';
import type { ITaskRepository } from './task-repository.interface.js';

export class JsonTaskRepository implements ITaskRepository {
  private readonly tasks = new Map<string, ScheduledTask>();
  private readonly filePath?: string;

  constructor(filePath?: string) {
    if (filePath && filePath !== ':memory:') {
      this.filePath = filePath.endsWith('.json') ? filePath : `${filePath}.json`;
      this.loadFromFile();
    }
  }

  initSchema(): void {
    if (this.filePath) {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  private loadFromFile(): void {
    if (!this.filePath || !fs.existsSync(this.filePath)) return;
    try {
      const content = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(content) as ScheduledTask[];
      this.tasks.clear();
      for (const t of parsed) {
        this.tasks.set(t.id, t);
      }
    } catch {
      // Fallback
    }
  }

  private persist(): void {
    if (!this.filePath) return;
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = JSON.stringify(Array.from(this.tasks.values()), null, 2);
      const tmp = `${this.filePath}.tmp`;
      fs.writeFileSync(tmp, data, 'utf8');
      fs.renameSync(tmp, this.filePath);
    } catch (err) {
      console.error('[JsonTaskRepository] Error al persistir tareas:', err);
    }
  }

  async create(task: ScheduledTask): Promise<ScheduledTask> {
    this.tasks.set(task.id, { ...task });
    this.persist();
    return task;
  }

  async findById(id: string): Promise<ScheduledTask | null> {
    const task = this.tasks.get(id);
    return task ? { ...task } : null;
  }

  async list(filter?: { serverId?: string }): Promise<ScheduledTask[]> {
    const all = Array.from(this.tasks.values());
    all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    if (filter?.serverId && filter.serverId !== '*') {
      return all
        .filter((t) => t.serverId === filter.serverId || t.serverId === '*')
        .map((t) => ({ ...t }));
    }

    return all.map((t) => ({ ...t }));
  }

  async update(task: ScheduledTask): Promise<ScheduledTask> {
    this.tasks.set(task.id, { ...task });
    this.persist();
    return task;
  }

  async delete(id: string): Promise<boolean> {
    const existed = this.tasks.delete(id);
    if (existed) {
      this.persist();
    }
    return existed;
  }
}
