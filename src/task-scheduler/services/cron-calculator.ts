import type { ScheduledTask } from '../models/scheduled-task.js';

export class CronCalculator {
  static calculateNextRun(
    task: Pick<ScheduledTask, 'scheduleType' | 'intervalMinutes' | 'timeOfDay' | 'cronExpression'>,
    fromDate: Date = new Date()
  ): Date {
    switch (task.scheduleType) {
      case 'interval': {
        const intervalMins = task.intervalMinutes && task.intervalMinutes > 0 ? task.intervalMinutes : 60;
        return new Date(fromDate.getTime() + intervalMins * 60 * 1000);
      }

      case 'daily': {
        const [hoursStr, minsStr] = (task.timeOfDay || '04:00').split(':');
        const targetHours = parseInt(hoursStr || '4', 10);
        const targetMins = parseInt(minsStr || '0', 10);

        const next = new Date(fromDate.getTime());
        next.setHours(targetHours, targetMins, 0, 0);

        if (next.getTime() <= fromDate.getTime()) {
          next.setDate(next.getDate() + 1);
        }
        return next;
      }

      case 'cron': {
        const expr = task.cronExpression || '0 4 * * *';
        return CronCalculator.parseNextCronDate(expr, fromDate);
      }

      default:
        return new Date(fromDate.getTime() + 60 * 60 * 1000);
    }
  }

  private static parseNextCronDate(cronExpr: string, fromDate: Date): Date {
    const parts = cronExpr.trim().split(/\s+/);
    if (parts.length !== 5) {
      // Fallback: next hour
      return new Date(fromDate.getTime() + 60 * 60 * 1000);
    }

    const [minRule, hourRule, domRule, monthRule, dowRule] = parts as [string, string, string, string, string];

    // Start checking from the next whole minute
    const candidate = new Date(fromDate.getTime());
    candidate.setSeconds(0, 0);
    candidate.setMinutes(candidate.getMinutes() + 1);

    // Look ahead minute by minute up to 31 days (44,640 minutes)
    const MAX_MINUTES = 44640;
    for (let i = 0; i < MAX_MINUTES; i++) {
      const min = candidate.getMinutes();
      const hour = candidate.getHours();
      const dom = candidate.getDate();
      const month = candidate.getMonth() + 1; // 1-12
      const dow = candidate.getDay(); // 0-6 (0 is Sunday)

      if (
        CronCalculator.matchesField(minRule, min, 0, 59) &&
        CronCalculator.matchesField(hourRule, hour, 0, 23) &&
        CronCalculator.matchesField(domRule, dom, 1, 31) &&
        CronCalculator.matchesField(monthRule, month, 1, 12) &&
        CronCalculator.matchesField(dowRule, dow, 0, 6)
      ) {
        return candidate;
      }

      candidate.setMinutes(candidate.getMinutes() + 1);
    }

    // Default fallback
    return new Date(fromDate.getTime() + 24 * 60 * 60 * 1000);
  }

  private static matchesField(field: string, value: number, min: number, max: number): boolean {
    if (field === '*') return true;

    // Handle comma-separated values (e.g. "1,5,10")
    if (field.includes(',')) {
      return field.split(',').some((sub) => CronCalculator.matchesField(sub.trim(), value, min, max));
    }

    // Handle step values (e.g. "*/15" or "10-30/5")
    if (field.includes('/')) {
      const [rangePart, stepStr] = field.split('/');
      const step = parseInt(stepStr || '1', 10);
      if (isNaN(step) || step <= 0) return false;

      let start = min;
      let end = max;
      if (rangePart && rangePart !== '*') {
        if (rangePart.includes('-')) {
          const [sStr, eStr] = rangePart.split('-');
          start = parseInt(sStr || `${min}`, 10);
          end = parseInt(eStr || `${max}`, 10);
        } else {
          start = parseInt(rangePart, 10);
        }
      }

      if (value < start || value > end) return false;
      return (value - start) % step === 0;
    }

    // Handle ranges (e.g. "1-5")
    if (field.includes('-')) {
      const [startStr, endStr] = field.split('-');
      const start = parseInt(startStr || `${min}`, 10);
      const end = parseInt(endStr || `${max}`, 10);
      return value >= start && value <= end;
    }

    // Exact number
    const num = parseInt(field, 10);
    return !isNaN(num) && num === value;
  }
}
