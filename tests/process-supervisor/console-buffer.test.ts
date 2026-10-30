import { describe, it, expect } from 'vitest';
import { ConsoleBuffer } from '../../src/process-supervisor/services/console-buffer.js';

describe('ConsoleBuffer', () => {
  it('should store lines and respect max capacity (circular ring buffer)', () => {
    const buffer = new ConsoleBuffer(5);

    buffer.push('Line 1');
    buffer.push('Line 2');
    buffer.push('Line 3');
    buffer.push('Line 4');
    buffer.push('Line 5');
    expect(buffer.getLines()).toEqual(['Line 1', 'Line 2', 'Line 3', 'Line 4', 'Line 5']);

    // Push 6th line, Line 1 should be evicted
    buffer.push('Line 6');
    expect(buffer.getLines()).toEqual(['Line 2', 'Line 3', 'Line 4', 'Line 5', 'Line 6']);
    expect(buffer.size).toBe(5);
  });

  it('should split multiline strings into individual lines', () => {
    const buffer = new ConsoleBuffer(10);
    buffer.push('First line\r\nSecond line\nThird line');

    expect(buffer.size).toBe(3);
    expect(buffer.getLines()).toEqual(['First line', 'Second line', 'Third line']);
  });

  it('should filter lines by query keyword', () => {
    const buffer = new ConsoleBuffer(10);
    buffer.push('[Server thread/INFO]: Player joined');
    buffer.push('[Server thread/WARN]: Memory low');
    buffer.push('[Server thread/INFO]: Player left');

    const filtered = buffer.filter('joined');
    expect(filtered.length).toBe(1);
    expect(filtered[0]).toContain('Player joined');
  });

  it('should clear all lines', () => {
    const buffer = new ConsoleBuffer(10);
    buffer.push('Line 1');
    buffer.push('Line 2');
    buffer.clear();

    expect(buffer.size).toBe(0);
    expect(buffer.getLines()).toEqual([]);
  });
});
