export class ConsoleBuffer {
  private readonly lines: string[] = [];
  private readonly listeners: Set<(line: string) => void> = new Set();

  constructor(public readonly maxLines: number = 2000) {}

  push(chunk: string): void {
    if (!chunk) {
      return;
    }

    const newLines = chunk.split(/\r?\n/).filter((l) => l.length > 0);

    for (const line of newLines) {
      if (this.lines.length >= this.maxLines) {
        this.lines.shift();
      }
      this.lines.push(line);

      for (const listener of this.listeners) {
        listener(line);
      }
    }
  }

  getLines(): string[] {
    return [...this.lines];
  }

  filter(query: string): string[] {
    const q = query.toLowerCase();
    return this.lines.filter((line) => line.toLowerCase().includes(q));
  }

  clear(): void {
    this.lines.length = 0;
  }

  get size(): number {
    return this.lines.length;
  }

  onLine(listener: (line: string) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
