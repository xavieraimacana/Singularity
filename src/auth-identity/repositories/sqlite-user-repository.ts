import { JsonUserRepository } from './json-user-repository.js';

export class SqliteUserRepository extends JsonUserRepository {
  constructor(dbOrPath?: any) {
    let filePath: string | undefined;
    if (typeof dbOrPath === 'string') {
      filePath = dbOrPath;
    } else if (dbOrPath?.filePath) {
      filePath = dbOrPath.filePath;
    } else {
      filePath = 'data/singularity-users.json';
    }
    super(filePath);
  }
}
