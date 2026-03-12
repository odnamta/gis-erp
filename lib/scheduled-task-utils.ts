// =====================================================
// v0.70: n8n SCHEDULED TASK UTILITY FUNCTIONS
// =====================================================

import {
  ScheduledTask,
  TaskExecution,
  ExecutionStatus,
  TriggerType,
  CronParts,
  ExecutionFilters,
  UpdateTaskExecutionInput,
  VALID_STATUS_TRANSITIONS,
  DEFAULT_TIMEZONE,
} from '@/types/scheduled-task';

// =====================================================
// CRON UTILITIES
// =====================================================

/**
 * Parses a cron expression into its component parts.
 * Standard 5-field cron format: minute hour dayOfMonth month dayOfWeek
 * @param cron - The cron expression string
 * @returns Parsed cron parts or null if invalid
 */
export function parseCronExpression(cron: string): CronParts | null {
  if (!cron || typeof cron !== 'string') {
    return null;
  }

  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    return null;
  }

  return {
    minute: parts[0],
    hour: parts[1],
    dayOfMonth: parts[2],
    month: parts[3],
    dayOfWeek: parts[4],
  };
}

/**
 * Validates a cron expression.
 * @param cron - The cron expression to validate
 * @returns True if valid, false otherwise
 */
export function isValidCronExpression(cron: string): boolean {
  const parts = parseCronExpression(cron);
  if (!parts) {
    return false;
  }

  // Validate each field
  const minuteValid = isValidCronField(parts.minute, 0, 59);
  const hourValid = isValidCronField(parts.hour, 0, 23);
  const dayOfMonthValid = isValidCronField(parts.dayOfMonth, 1, 31);
  const monthValid = isValidCronField(parts.month, 1, 12);
  const dayOfWeekValid = isValidCronField(parts.dayOfWeek, 0, 6);

  return minuteValid && hourValid && dayOfMonthValid && monthValid && dayOfWeekValid;
}

/**
 * Validates a single cron field.
 * Supports: asterisk, specific values, ranges (1-5), steps (star/5), lists (1,3,5)
 */
function isValidCronField(field: string, min: number, max: number): boolean {
  if (field === '*') {
    return true;
  }

  // Handle step values (*/5 or 1-10/2)
  if (field.includes('/')) {
    const [range, step] = field.split('/');
    const stepNum = parseInt(step, 10);
    if (isNaN(stepNum) || stepNum < 1) {
      return false;
    }
    if (range === '*') {
      return true;
    }
    return isValidCronField(range, min, max);
  }

  // Handle lists (1,3,5)
  if (field.includes(',')) {
    const values = field.split(',');
    return values.every(v => isValidCronField(v.trim(), min, max));
  }

  // Handle ranges (1-5)
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(v => parseInt(v, 10));
    if (isNaN(start) || isNaN(end)) {
      return false;
    }
    return start >= min && end <= max && start <= end;
  }

  // Single value
  const value = parseInt(field, 10);
  return !isNaN(value) && value >= min && value <= max;
}

/**
 * Calculates the next run time based on a cron expression.
 * @param cron - The cron expression
 * @param timezone - The timezone (default: Asia/Jakarta)
 * @param fromDate - The date to calculate from (default: now)
 * @returns The next run time as a Date, or null if invalid cron
 */
export function getNextRunTime(
  cron: string,
  _timezone: string = DEFAULT_TIMEZONE,
  fromDate: Date = new Date()
): Date | null {
  if (!isValidCronExpression(cron)) {
    return null;
  }

  const parts = parseCronExpression(cron);
  if (!parts) {
    return null;
  }

  // Start from the next minute
  const next = new Date(fromDate);
  next.setSeconds(0);
  next.setMilliseconds(0);
  next.setMinutes(next.getMinutes() + 1);

  // Try to find the next matching time (max 366 days ahead)
  const maxIterations = 366 * 24 * 60; // One year of minutes
  for (let i = 0; i < maxIterations; i++) {
    if (matchesCron(next, parts)) {
      return next;
    }
    next.setMinutes(next.getMinutes() + 1);
  }

  return null;
}

/**
 * Checks if a date matches a cron expression.
 */
function matchesCron(date: Date, parts: CronParts): boolean {
  const minute = date.getMinutes();
  const hour = date.getHours();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1; // JavaScript months are 0-indexed
  const dayOfWeek = date.getDay();

  return (
    matchesCronField(minute, parts.minute, 0, 59) &&
    matchesCronField(hour, parts.hour, 0, 23) &&
    matchesCronField(dayOfMonth, parts.dayOfMonth, 1, 31) &&
    matchesCronField(month, parts.month, 1, 12) &&
    matchesCronField(dayOfWeek, parts.dayOfWeek, 0, 6)
  );
}

/**
 * Checks if a value matches a cron field pattern.
 */
function matchesCronField(value: number, field: string, _min: number, _max: number): boolean {
  if (field === '*') {
    return true;
  }

  // Handle step values
  if (field.includes('/')) {
    const [range, step] = field.split('/');
    const stepNum = parseInt(step, 10);
    if (range === '*') {
      return value % stepNum === 0;
    }
    // Range with step (e.g., 1-10/2)
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(v => parseInt(v, 10));
      return value >= start && value <= end && (value - start) % stepNum === 0;
    }
  }

  // Handle lists
  if (field.includes(',')) {
    const values = field.split(',').map(v => parseInt(v.trim(), 10));
    return values.includes(value);
  }

  // Handle ranges
  if (field.includes('-')) {
    const [start, end] = field.split('-').map(v => parseInt(v, 10));
    return value >= start && value <= end;
  }

  // Single value
  return value === parseInt(field, 10);
}

// =====================================================
// TASK REGISTRY FUNCTIONS
// =====================================================

/**
 * Retrieves scheduled tasks from the registry.
 * @param tasks - Array of tasks to filter
 * @param activeOnly - If true, only return active tasks
 * @returns Filtered array of scheduled tasks
 */
export function filterScheduledTasks(
  tasks: ScheduledTask[],
  activeOnly: boolean = false
): ScheduledTask[] {
  if (activeOnly) {
    return tasks.filter(task => task.is_active);
  }
  return tasks;
}

/**
 * Finds a scheduled task by its task code.
 * @param tasks - Array of tasks to search
 * @param taskCode - The task code to find
 * @returns The matching task or null
 */
export function findTaskByCode(
  tasks: ScheduledTask[],
  taskCode: string
): ScheduledTask | null {
  return tasks.find(task => task.task_code === taskCode) || null;
}

/**
 * Validates that all task codes in a list are unique.
 * @param tasks - Array of tasks to validate
 * @returns True if all task codes are unique
 */
export function areTaskCodesUnique(tasks: ScheduledTask[]): boolean {
  const codes = tasks.map(t => t.task_code);
  const uniqueCodes = new Set(codes);
  return codes.length === uniqueCodes.size;
}

/**
 * Generates the next run time for a task and returns updated task data.
 * @param task - The task to update
 * @returns Updated task with new next_run_at
 */
export function calculateTaskNextRun(task: ScheduledTask): ScheduledTask {
  const nextRun = getNextRunTime(task.cron_expression, task.timezone);
  return {
    ...task,
    next_run_at: nextRun ? nextRun.toISOString() : null,
  };
}

// =====================================================
// EXECUTION TRACKING FUNCTIONS
// =====================================================

/**
 * Creates a new task execution record.
 * @param taskId - The ID of the task being executed
 * @param triggeredBy - How the execution was triggered
 * @returns A new TaskExecution object
 */
export function createExecutionRecord(
  taskId: string,
  triggeredBy: TriggerType
): Omit<TaskExecution, 'id' | 'created_at'> {
  const now = new Date().toISOString();
  return {
    task_id: taskId,
    started_at: now,
    completed_at: null,
    status: 'running',
    records_processed: null,
    result_summary: null,
    error_message: null,
    execution_time_ms: null,
    triggered_by: triggeredBy,
  };
}

/**
 * Validates a status transition for task execution.
 * @param currentStatus - The current execution status
 * @param newStatus - The proposed new status
 * @returns True if the transition is valid
 */
export function isValidStatusTransition(
  currentStatus: ExecutionStatus,
  newStatus: ExecutionStatus
): boolean {
  const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  return validTransitions.includes(newStatus);
}

/**
 * Completes an execution record with final status and metrics.
 * @param execution - The execution to complete
 * @param updates - The updates to apply
 * @returns Updated execution record
 */
export function completeExecutionRecord(
  execution: TaskExecution,
  updates: UpdateTaskExecutionInput
): TaskExecution {
  const completedAt = updates.completedAt || new Date().toISOString();
  const executionTimeMs = updates.executionTimeMs ?? 
    calculateExecutionTimeMs(execution.started_at, completedAt);

  return {
    ...execution,
    completed_at: completedAt,
    status: updates.status || execution.status,
    records_processed: updates.recordsProcessed ?? execution.records_processed,
    result_summary: updates.resultSummary ?? execution.result_summary,
    error_message: updates.errorMessage ?? execution.error_message,
    execution_time_ms: executionTimeMs,
  };
}

/**
 * Calculates execution time in milliseconds.
 * @param startedAt - Start timestamp
 * @param completedAt - End timestamp
 * @returns Execution time in milliseconds
 */
export function calculateExecutionTimeMs(
  startedAt: string,
  completedAt: string
): number {
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  return Math.max(0, end - start);
}

/**
 * Filters task executions based on criteria.
 * @param executions - Array of executions to filter
 * @param filters - Filter criteria
 * @returns Filtered array of executions
 */
export function filterExecutions(
  executions: TaskExecution[],
  filters: ExecutionFilters
): TaskExecution[] {
  let result = [...executions];

  if (filters.status) {
    result = result.filter(e => e.status === filters.status);
  }

  if (filters.triggeredBy) {
    result = result.filter(e => e.triggered_by === filters.triggeredBy);
  }

  if (filters.startDate) {
    const startDate = new Date(filters.startDate);
    result = result.filter(e => new Date(e.started_at) >= startDate);
  }

  if (filters.endDate) {
    const endDate = new Date(filters.endDate);
    result = result.filter(e => new Date(e.started_at) <= endDate);
  }

  // Sort by started_at descending (most recent first)
  result.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

  // Apply pagination
  const offset = filters.offset || 0;
  const limit = filters.limit || result.length;
  result = result.slice(offset, offset + limit);

  return result;
}

/**
 * Validates that an execution record is complete.
 * A complete record has: task_id, started_at, completed_at, status, triggered_by, execution_time_ms
 * @param execution - The execution to validate
 * @returns True if the execution record is complete
 */
export function isExecutionRecordComplete(execution: TaskExecution): boolean {
  // Must have required fields
  if (!execution.task_id || !execution.started_at || !execution.triggered_by) {
    return false;
  }

  // If status is not 'running', must have completed_at and execution_time_ms
  if (execution.status !== 'running') {
    if (!execution.completed_at || execution.execution_time_ms === null) {
      return false;
    }

    // Verify execution_time_ms matches the time difference
    const calculatedTime = calculateExecutionTimeMs(execution.started_at, execution.completed_at);
    // Allow small tolerance for rounding
    if (Math.abs(calculatedTime - execution.execution_time_ms) > 1000) {
      return false;
    }
  }

  return true;
}

/**
 * Validates execution status.
 * @param status - The status to validate
 * @returns True if valid
 */
export function isValidExecutionStatus(status: string): status is ExecutionStatus {
  return ['running', 'completed', 'failed', 'timeout'].includes(status);
}

/**
 * Validates trigger type.
 * @param triggerType - The trigger type to validate
 * @returns True if valid
 */
export function isValidTriggerType(triggerType: string): triggerType is TriggerType {
  return ['schedule', 'manual', 'retry'].includes(triggerType);
}

/**
 * Formats execution time for display.
 * @param ms - Execution time in milliseconds
 * @returns Formatted string
 */
export function formatExecutionTime(ms: number | null): string {
  if (ms === null) {
    return '-';
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Gets a human-readable description of a cron expression.
 * @param cron - The cron expression
 * @returns Human-readable description
 */
export function describeCronExpression(cron: string): string {
  const parts = parseCronExpression(cron);
  if (!parts) {
    return 'Invalid cron expression';
  }

  // Common patterns
  if (parts.minute === '0' && parts.hour !== '*' && parts.dayOfMonth === '*' && parts.month === '*' && parts.dayOfWeek === '*') {
    return `Daily at ${parts.hour}:00`;
  }

  if (parts.minute === '0' && parts.hour === '0' && parts.dayOfMonth === '*' && parts.month === '*' && parts.dayOfWeek !== '*') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayNum = parseInt(parts.dayOfWeek, 10);
    if (!isNaN(dayNum) && dayNum >= 0 && dayNum <= 6) {
      return `Weekly on ${days[dayNum]} at midnight`;
    }
  }

  if (parts.minute === '0' && parts.hour !== '*' && parts.dayOfMonth === '1' && parts.month === '*' && parts.dayOfWeek === '*') {
    return `Monthly on the 1st at ${parts.hour}:00`;
  }

  if (parts.minute === '0' && parts.hour === '*' && parts.dayOfMonth === '*' && parts.month === '*' && parts.dayOfWeek === '*') {
    return 'Every hour';
  }

  return `${cron}`;
}
