import { describe, it, expect } from 'vitest';
import { CronCalculator } from '../../src/task-scheduler/services/cron-calculator.js';

describe('Task Scheduler Domain > CronCalculator', () => {
  it('should calculate next run for interval schedule', () => {
    const base = new Date('2026-10-31T10:00:00.000Z');
    const next = CronCalculator.calculateNextRun(
      {
        scheduleType: 'interval',
        intervalMinutes: 30
      },
      base
    );

    expect(next.toISOString()).toBe('2026-10-31T10:30:00.000Z');
  });

  it('should calculate next run for daily schedule for later today', () => {
    const base = new Date('2026-10-31T08:00:00.000');
    const next = CronCalculator.calculateNextRun(
      {
        scheduleType: 'daily',
        timeOfDay: '14:30'
      },
      base
    );

    expect(next.getHours()).toBe(14);
    expect(next.getMinutes()).toBe(30);
    expect(next.getDate()).toBe(base.getDate());
  });

  it('should calculate next run for daily schedule for tomorrow if time has passed', () => {
    const base = new Date('2026-10-31T20:00:00.000');
    const next = CronCalculator.calculateNextRun(
      {
        scheduleType: 'daily',
        timeOfDay: '04:00'
      },
      base
    );

    expect(next.getHours()).toBe(4);
    expect(next.getMinutes()).toBe(0);
    expect(next.getTime()).toBeGreaterThan(base.getTime());
  });

  it('should parse standard 5-part cron expressions correctly', () => {
    const base = new Date('2026-10-31T10:12:00.000Z');
    // Every 15 minutes: next should be 10:15
    const next = CronCalculator.calculateNextRun(
      {
        scheduleType: 'cron',
        cronExpression: '*/15 * * * *'
      },
      base
    );

    expect(next.getUTCMinutes()).toBe(15);
  });
});
