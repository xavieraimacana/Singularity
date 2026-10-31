import { JsonTaskRepository } from './json-task-repository.js';

export class SqliteTaskRepository extends JsonTaskRepository {
  constructor(dbOrPath?: any) {
    let filePath: string | undefined;
    if (typeof dbOrPath === 'string') {
      filePath = dbOrPath;
    } else if (dbOrPath?.filePath) {
      filePath = dbOrPath.filePath;
    } else {
      filePath = 'data/singularity-tasks.json';
    }
    super(filePath);
  }
}
