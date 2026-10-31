export type ScheduledTaskAction = 'backup' | 'restart' | 'command';

export type ScheduleType = 'interval' | 'daily' | 'cron';

export type TaskExecutionStatus = 'idle' | 'running' | 'success' | 'failed';

export interface TaskPayload {
  command?: string;
  advanceWarningsMinutes?: number[]; // e.g. [5, 1] means warn at 5m and 1m before restart
  backupComment?: string;
}

export interface ScheduledTask {
  id: string;
  serverId: string; // server ID or '*' for all servers
  name: string;
  action: ScheduledTaskAction;
  scheduleType: ScheduleType;
  intervalMinutes?: number;
  timeOfDay?: string; // "HH:mm" in 24h format (e.g. "04:00")
  cronExpression?: string; // Standard 5-field cron (e.g. "0 4 * * *")
  payload?: TaskPayload;
  enabled: boolean;
  createdAt: string;
  lastRunAt?: string;
  nextRunAt?: string;
  lastStatus?: TaskExecutionStatus;
  lastError?: string;
}

export interface CreateScheduledTaskDto {
  serverId: string;
  name: string;
  action: ScheduledTaskAction;
  scheduleType: ScheduleType;
  intervalMinutes?: number;
  timeOfDay?: string;
  cronExpression?: string;
  payload?: TaskPayload;
  enabled?: boolean;
}

export interface UpdateScheduledTaskDto {
  name?: string;
  action?: ScheduledTaskAction;
  scheduleType?: ScheduleType;
  intervalMinutes?: number;
  timeOfDay?: string;
  cronExpression?: string;
  payload?: TaskPayload;
  enabled?: boolean;
}
