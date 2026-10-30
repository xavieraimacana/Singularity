import path from 'node:path';

export class SftpPathResolver {
  private readonly rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = path.resolve(rootDir);
  }

  getRootDir(): string {
    return this.rootDir;
  }

  /**
   * Resolves a client-requested SFTP path against the chroot base directory.
   * Returns the absolute path on the host system, or null if the path attempts to escape the root directory.
   */
  resolve(requestedPath: string): string | null {
    if (!requestedPath || typeof requestedPath !== 'string') {
      return null;
    }

    // Guard against null-byte poisoning
    if (requestedPath.includes('\0')) {
      return null;
    }

    // Normalize slashes to forward slashes
    let clean = requestedPath.replace(/\\/g, '/');
    if (!clean.startsWith('/')) {
      clean = '/' + clean;
    }

    // Resolve strictly inside rootDir
    const resolved = path.resolve(this.rootDir, '.' + clean);

    // Verify boundary confinement
    const isExactRoot = resolved === this.rootDir;
    const isInsideRoot = resolved.startsWith(this.rootDir + path.sep);

    if (!isExactRoot && !isInsideRoot) {
      return null;
    }

    return resolved;
  }

  /**
   * Converts a real host path back to an SFTP client virtual path.
   */
  toVirtual(realPath: string): string {
    const relative = path.relative(this.rootDir, realPath);
    if (!relative || relative === '.') {
      return '/';
    }
    return '/' + relative.replace(/\\/g, '/');
  }
}
