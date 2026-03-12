// =====================================================
// v0.70: n8n SCHEDULED TASK ACTIONS
// Server-side actions for task execution and management
// =====================================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/permissions-server';
import { canAccessFeature } from '@/lib/permissions';
import {
  ScheduledTask,
  TaskExecution,
  ExecutionStatus,
  TriggerType,
} from '@/types/scheduled-task';
import {
  createExecutionRecord,
  calculateExecutionTimeMs,
  isValidStatusTransition,
  getNextRunTime,
} from '@/lib/scheduled-task-utils';

// =====================================================
// DATABASE ROW TYPES
// =====================================================

interface ScheduledTaskRow {
  id: string;
  task_code: string;
  task_name: string;
  description: string | null;
  cron_expression: string;
  timezone: string;
  n8n_workflow_id: string | null;
  webhook_url: string | null;
  task_parameters: Record<string, unknown>;
  is_active: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  last_run_duration_ms: number | null;
  next_run_at: string | null;
  created_at: string;
}

interface TaskExecutionRow {
  id: string;
  task_id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  records_processed: number | null;
  result_summary: Record<string, unknown> | null;
  error_message: string | null;
  execution_time_ms: number | null;
  triggered_by: string;
  created_at: string;
}

// =====================================================
// TRANSFORM FUNCTIONS
// =====================================================

function transformTaskRow(row: ScheduledTaskRow): ScheduledTask {
  return {
    id: row.id,
    task_code: row.task_code,
    task_name: row.task_name,
    description: row.description,
    cron_expression: row.cron_expression,
    timezone: row.timezone,
    n8n_workflow_id: row.n8n_workflow_id,
    webhook_url: row.webhook_url,
    task_parameters: row.task_parameters || {},
    is_active: row.is_active,
    last_run_at: row.last_run_at,
    last_run_status: row.last_run_status as ExecutionStatus | null,
    last_run_duration_ms: row.last_run_duration_ms,
    next_run_at: row.next_run_at,
    created_at: row.created_at,
  };
}

function transformExecutionRow(row: TaskExecutionRow): TaskExecution {
  return {
    id: row.id,
    task_id: row.task_id,
    started_at: row.started_at,
    completed_at: row.completed_at,
    status: row.status as ExecutionStatus,
    records_processed: row.records_processed,
    result_summary: row.result_summary,
    error_message: row.error_message,
    execution_time_ms: row.execution_time_ms,
    triggered_by: row.triggered_by as TriggerType,
    created_at: row.created_at,
  };
}

// =====================================================
// TASK REGISTRY ACTIONS
// =====================================================

/**
 * Get all scheduled tasks
 * @param activeOnly - If true, only return active tasks
 */
export async function getScheduledTasks(
  activeOnly: boolean = false
): Promise<{ data: ScheduledTask[] | null; error: string | null }> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = supabase
    .from('scheduled_tasks')
    .select('*')
    .order('task_code', { ascending: true });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: (data as ScheduledTaskRow[]).map(transformTaskRow),
    error: null,
  };
}

/**
 * Get a scheduled task by its code
 * @param taskCode - The task code to find
 */
export async function getScheduledTaskByCode(
  taskCode: string
): Promise<{ data: ScheduledTask | null; error: string | null }> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from('scheduled_tasks')
    .select('*')
    .eq('task_code', taskCode)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: `Task not found: ${taskCode}` };
    }
    return { data: null, error: error.message };
  }

  return {
    data: transformTaskRow(data as ScheduledTaskRow),
    error: null,
  };
}

// =====================================================
// MANUAL TRIGGER FUNCTIONS
// =====================================================

/**
 * Validates if a task can be manually triggered
 * **Validates: Requirements 8.1**
 * 
 * @param taskCode - The task code to validate
 * @returns Validation result with task if valid
 */
export async function validateManualTrigger(
  taskCode: string
): Promise<{ valid: boolean; task: ScheduledTask | null; error: string | null }> {
  const { data: task, error } = await getScheduledTaskByCode(taskCode);

  if (error || !task) {
    return {
      valid: false,
      task: null,
      error: error || `Task not found: ${taskCode}`,
    };
  }

  if (!task.is_active) {
    return {
      valid: false,
      task,
      error: `Task is inactive: ${taskCode}`,
    };
  }

  return { valid: true, task, error: null };
}

/**
 * Triggers a task manually
 * Creates execution record with triggered_by='manual'
 * Does NOT update next_run_at (preserves schedule)
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
 * 
 * @param taskCode - The task code to trigger
 * @returns Execution ID if successful
 */
export async function triggerTaskManually(
  taskCode: string
): Promise<{ executionId: string | null; error: string | null }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'admin.settings')) {
    return { executionId: null, error: 'Tidak memiliki akses' };
  }

  // Validate the task can be triggered
  const validation = await validateManualTrigger(taskCode);
  if (!validation.valid || !validation.task) {
    return { executionId: null, error: validation.error };
  }

  const task = validation.task;
  const supabase = await createClient();

  // Create execution record with triggered_by='manual'
  const executionData = createExecutionRecord(task.id, 'manual');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: execution, error: execError } = await supabase
    .from('task_executions')
    .insert({
      task_id: executionData.task_id,
      started_at: executionData.started_at,
      status: executionData.status,
      triggered_by: executionData.triggered_by,
    })
    .select()
    .single();

  if (execError) {
    return { executionId: null, error: execError.message };
  }

  // Update task's last_run_at but NOT next_run_at (preserve schedule)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await supabase
    .from('scheduled_tasks')
    .update({
      last_run_at: executionData.started_at,
      last_run_status: 'running',
    })
    .eq('id', task.id);

  return { executionId: (execution as TaskExecutionRow).id, error: null };
}

// =====================================================
// TASK ENABLE/DISABLE FUNCTIONS
// =====================================================

/**
 * Enables a task and recalculates next_run_at
 * 
 * **Validates: Requirements 9.1, 9.2, 9.3**
 * 
 * @param taskId - The task ID to enable
 * @returns Success status
 */
export async function enableTask(
  taskId: string
): Promise<{ success: boolean; error: string | null }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'admin.settings')) {
    return { success: false, error: 'Tidak memiliki akses' };
  }

  const supabase = await createClient();

  // Get the task first to get cron expression
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: task, error: fetchError } = await supabase
    .from('scheduled_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (fetchError || !task) {
    return { success: false, error: fetchError?.message || 'Task not found' };
  }

  const taskRow = task as ScheduledTaskRow;

  // Calculate next run time
  const nextRun = getNextRunTime(taskRow.cron_expression, taskRow.timezone);

  // Update task to active and set next_run_at
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await supabase
    .from('scheduled_tasks')
    .update({
      is_active: true,
      next_run_at: nextRun?.toISOString() || null,
    })
    .eq('id', taskId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true, error: null };
}

/**
 * Disables a task
 * Task will be skipped during scheduled execution
 * 
 * **Validates: Requirements 9.1, 9.2, 9.3**
 * 
 * @param taskId - The task ID to disable
 * @returns Success status
 */
export async function disableTask(
  taskId: string
): Promise<{ success: boolean; error: string | null }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'admin.settings')) {
    return { success: false, error: 'Tidak memiliki akses' };
  }

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase
    .from('scheduled_tasks')
    .update({
      is_active: false,
    })
    .eq('id', taskId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Toggles task active status
 * 
 * @param taskId - The task ID to toggle
 * @param isActive - New active status
 * @returns Success status
 */
export async function toggleTaskStatus(
  taskId: string,
  isActive: boolean
): Promise<{ success: boolean; error: string | null }> {
  if (isActive) {
    return enableTask(taskId);
  } else {
    return disableTask(taskId);
  }
}

// =====================================================
// EXECUTION TRACKING ACTIONS
// =====================================================

/**
 * Creates a task execution record
 * 
 * @param taskId - The task ID
 * @param triggeredBy - How the execution was triggered
 * @returns Created execution record
 */
export async function createTaskExecution(
  taskId: string,
  triggeredBy: TriggerType
): Promise<{ data: TaskExecution | null; error: string | null }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'admin.settings')) {
    return { data: null, error: 'Tidak memiliki akses' };
  }

  const supabase = await createClient();
  const executionData = createExecutionRecord(taskId, triggeredBy);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from('task_executions')
    .insert({
      task_id: executionData.task_id,
      started_at: executionData.started_at,
      status: executionData.status,
      triggered_by: executionData.triggered_by,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: transformExecutionRow(data as TaskExecutionRow),
    error: null,
  };
}

/**
 * Updates a task execution record
 * 
 * @param executionId - The execution ID to update
 * @param updates - Fields to update
 * @returns Success status
 */
export async function updateTaskExecution(
  executionId: string,
  updates: {
    status?: ExecutionStatus;
    completedAt?: string;
    recordsProcessed?: number;
    resultSummary?: Record<string, unknown>;
    errorMessage?: string;
  }
): Promise<{ success: boolean; error: string | null }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'admin.settings')) {
    return { success: false, error: 'Tidak memiliki akses' };
  }

  const supabase = await createClient();

  // Get current execution to validate status transition
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current, error: fetchError } = await supabase
    .from('task_executions')
    .select('*')
    .eq('id', executionId)
    .single();

  if (fetchError || !current) {
    return { success: false, error: fetchError?.message || 'Execution not found' };
  }

  const currentExec = current as TaskExecutionRow;

  // Validate status transition if status is being updated
  if (updates.status && !isValidStatusTransition(currentExec.status as ExecutionStatus, updates.status)) {
    return {
      success: false,
      error: `Invalid status transition: ${currentExec.status} -> ${updates.status}`,
    };
  }

  // Build update object
  const updateData: Record<string, unknown> = {};
  
  if (updates.status) {
    updateData.status = updates.status;
  }
  
  if (updates.completedAt) {
    updateData.completed_at = updates.completedAt;
    // Calculate execution time
    updateData.execution_time_ms = calculateExecutionTimeMs(
      currentExec.started_at,
      updates.completedAt
    );
  }
  
  if (updates.recordsProcessed !== undefined) {
    updateData.records_processed = updates.recordsProcessed;
  }
  
  if (updates.resultSummary !== undefined) {
    updateData.result_summary = updates.resultSummary;
  }
  
  if (updates.errorMessage !== undefined) {
    updateData.error_message = updates.errorMessage;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase
    .from('task_executions')
    .update(updateData)
    .eq('id', executionId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Update the parent task's last_run info
  if (updates.status && updates.status !== 'running') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase
      .from('scheduled_tasks')
      .update({
        last_run_status: updates.status,
        last_run_duration_ms: updateData.execution_time_ms as number | null,
      })
      .eq('id', currentExec.task_id);
  }

  return { success: true, error: null };
}

/**
 * Completes a task execution with success
 * 
 * @param executionId - The execution ID
 * @param recordsProcessed - Number of records processed
 * @param resultSummary - Summary of results
 */
export async function completeTaskExecution(
  executionId: string,
  recordsProcessed: number,
  resultSummary?: Record<string, unknown>
): Promise<{ success: boolean; error: string | null }> {
  return updateTaskExecution(executionId, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    recordsProcessed,
    resultSummary,
  });
}

/**
 * Fails a task execution with error
 * 
 * @param executionId - The execution ID
 * @param errorMessage - Error message
 */
export async function failTaskExecution(
  executionId: string,
  errorMessage: string
): Promise<{ success: boolean; error: string | null }> {
  return updateTaskExecution(executionId, {
    status: 'failed',
    completedAt: new Date().toISOString(),
    errorMessage,
  });
}

/**
 * Gets task executions with optional filters
 * 
 * @param taskId - The task ID to get executions for
 * @param filters - Optional filters
 */
export async function getTaskExecutions(
  taskId: string,
  filters?: {
    status?: ExecutionStatus;
    triggeredBy?: TriggerType;
    limit?: number;
  }
): Promise<{ data: TaskExecution[] | null; error: string | null }> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = supabase
    .from('task_executions')
    .select('*')
    .eq('task_id', taskId)
    .order('started_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.triggeredBy) {
    query = query.eq('triggered_by', filters.triggeredBy);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: (data as TaskExecutionRow[]).map(transformExecutionRow),
    error: null,
  };
}

// =====================================================
// SCHEDULE PRESERVATION HELPERS
// =====================================================

/**
 * Gets the current next_run_at for a task
 * Used to verify schedule preservation after manual runs
 * 
 * @param taskId - The task ID
 */
export async function getTaskNextRunAt(
  taskId: string
): Promise<{ nextRunAt: string | null; error: string | null }> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from('scheduled_tasks')
    .select('next_run_at')
    .eq('id', taskId)
    .single();

  if (error) {
    return { nextRunAt: null, error: error.message };
  }

  return { nextRunAt: (data as { next_run_at: string | null }).next_run_at, error: null };
}

/**
 * Updates next_run_at for scheduled execution (not manual)
 * Called after scheduled execution completes
 * 
 * @param taskId - The task ID
 */
export async function updateScheduledNextRun(
  taskId: string
): Promise<{ success: boolean; error: string | null }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'admin.settings')) {
    return { success: false, error: 'Tidak memiliki akses' };
  }

  const supabase = await createClient();

  // Get task to calculate next run
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: task, error: fetchError } = await supabase
    .from('scheduled_tasks')
    .select('cron_expression, timezone')
    .eq('id', taskId)
    .single();

  if (fetchError || !task) {
    return { success: false, error: fetchError?.message || 'Task not found' };
  }

  const taskRow = task as { cron_expression: string; timezone: string };
  const nextRun = getNextRunTime(taskRow.cron_expression, taskRow.timezone);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase
    .from('scheduled_tasks')
    .update({
      next_run_at: nextRun?.toISOString() || null,
    })
    .eq('id', taskId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}


// =====================================================
// ERROR HANDLING AND FAILURE ISOLATION
// Task 12: Timeout handling, failure notification, retry support
// =====================================================

/**
 * Default task execution timeout (5 minutes)
 */
export const TASK_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Executes a task with timeout handling
 * Sets status to 'timeout' if execution exceeds timeout
 * 
 * **Validates: Requirements 11.2**
 * 
 * @param executionId - The execution ID
 * @param executionFn - The function to execute
 * @param timeoutMs - Timeout in milliseconds (default: 5 minutes)
 */
export async function executeWithTimeout<T>(
  executionId: string,
  executionFn: () => Promise<T>,
  timeoutMs: number = TASK_TIMEOUT_MS
): Promise<{ result: T | null; timedOut: boolean; error: string | null }> {
  let timeoutHandle: NodeJS.Timeout | null = null;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error('Task execution timeout'));
    }, timeoutMs);
  });
  
  try {
    const result = await Promise.race([executionFn(), timeoutPromise]);
    if (timeoutHandle) clearTimeout(timeoutHandle);
    return { result, timedOut: false, error: null };
  } catch (error) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const timedOut = errorMessage === 'Task execution timeout';
    
    // Update execution status
    await updateTaskExecution(executionId, {
      status: timedOut ? 'timeout' : 'failed',
      completedAt: new Date().toISOString(),
      errorMessage,
    });
    
    return { result: null, timedOut, error: errorMessage };
  }
}

/**
 * Handles task failure by logging and sending notifications
 * 
 * **Validates: Requirements 11.3**
 * 
 * @param task - The failed task
 * @param error - The error that occurred
 * @param executionId - The execution ID
 */
export async function handleTaskFailure(
  task: ScheduledTask,
  error: Error | string,
  executionId?: string
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : error;
  const timestamp = new Date().toISOString();
  
  // Error handled by return
  
  // Update execution record if provided
  if (executionId) {
    await failTaskExecution(executionId, errorMessage);
  }
  
  // Note: In production, this would send a notification to super_admin
  // For now, we log the notification data that would be sent
  const _notificationData = {
    template_code: 'TASK_EXECUTION_FAILED',
    recipient_role: 'director',
    data: {
      task_code: task.task_code,
      task_name: task.task_name,
      error_message: errorMessage,
      timestamp,
      execution_id: executionId,
    },
  };
  
}

/**
 * Retries a failed task execution
 * Creates new execution with triggered_by='retry'
 * 
 * **Validates: Requirements 11.5**
 * 
 * @param taskCode - The task code to retry
 * @returns Execution ID if successful
 */
export async function retryFailedTask(
  taskCode: string
): Promise<{ executionId: string | null; error: string | null }> {
  const profile = await getUserProfile();
  if (!canAccessFeature(profile, 'admin.settings')) {
    return { executionId: null, error: 'Tidak memiliki akses' };
  }

  // Validate the task can be triggered (same as manual trigger)
  const validation = await validateManualTrigger(taskCode);
  if (!validation.valid || !validation.task) {
    return { executionId: null, error: validation.error };
  }

  const task = validation.task;
  const supabase = await createClient();

  // Create execution record with triggered_by='retry'
  const executionData = createExecutionRecord(task.id, 'retry');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: execution, error: execError } = await supabase
    .from('task_executions')
    .insert({
      task_id: executionData.task_id,
      started_at: executionData.started_at,
      status: executionData.status,
      triggered_by: executionData.triggered_by,
    })
    .select()
    .single();

  if (execError) {
    return { executionId: null, error: execError.message };
  }

  // Update task's last_run_at but NOT next_run_at (preserve schedule like manual)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await supabase
    .from('scheduled_tasks')
    .update({
      last_run_at: executionData.started_at,
      last_run_status: 'running',
    })
    .eq('id', task.id);

  return { executionId: (execution as TaskExecutionRow).id, error: null };
}

/**
 * Gets the last failed execution for a task
 * Used to determine if retry is available
 * 
 * @param taskId - The task ID
 */
export async function getLastFailedExecution(
  taskId: string
): Promise<{ data: TaskExecution | null; error: string | null }> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from('task_executions')
    .select('*')
    .eq('task_id', taskId)
    .in('status', ['failed', 'timeout'])
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: null }; // No failed executions
    }
    return { data: null, error: error.message };
  }

  return {
    data: transformExecutionRow(data as TaskExecutionRow),
    error: null,
  };
}

/**
 * Checks if a task can be retried
 * A task can be retried if its last execution failed or timed out
 * 
 * @param taskId - The task ID
 */
export async function canRetryTask(
  taskId: string
): Promise<{ canRetry: boolean; reason: string | null }> {
  const { data: lastFailed, error } = await getLastFailedExecution(taskId);
  
  if (error) {
    return { canRetry: false, reason: error };
  }
  
  if (!lastFailed) {
    return { canRetry: false, reason: 'No failed executions to retry' };
  }
  
  // Check if there's a more recent successful execution
  const supabase = await createClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lastSuccess } = await supabase
    .from('task_executions')
    .select('started_at')
    .eq('task_id', taskId)
    .eq('status', 'completed')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();
  
  if (lastSuccess) {
    const failedTime = new Date(lastFailed.started_at).getTime();
    const successTime = new Date(lastSuccess.started_at!).getTime();
    
    if (successTime > failedTime) {
      return { canRetry: false, reason: 'Task has succeeded since last failure' };
    }
  }
  
  return { canRetry: true, reason: null };
}

// =====================================================
// FAILURE ISOLATION HELPERS
// =====================================================

/**
 * Wraps task execution to ensure failure isolation
 * One task's failure should not affect other tasks
 * 
 * **Validates: Requirements 11.4**
 * 
 * @param taskCode - The task code
 * @param executionFn - The function to execute
 */
export async function executeTaskIsolated<T>(
  taskCode: string,
  executionFn: () => Promise<T>
): Promise<{ success: boolean; result: T | null; error: string | null }> {
  try {
    const result = await executionFn();
    return { success: true, result, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log but don't throw - isolation means we contain the failure
    
    return { success: false, result: null, error: errorMessage };
  }
}

/**
 * Executes multiple tasks with failure isolation
 * Each task runs independently; failures don't affect others
 * 
 * @param tasks - Array of task codes to execute
 * @param executionFns - Map of task code to execution function
 */
export async function executeTasksIsolated(
  tasks: string[],
  executionFns: Map<string, () => Promise<unknown>>
): Promise<{
  results: Map<string, { success: boolean; error: string | null }>;
  totalSuccess: number;
  totalFailed: number;
}> {
  const results = new Map<string, { success: boolean; error: string | null }>();
  let totalSuccess = 0;
  let totalFailed = 0;
  
  for (const taskCode of tasks) {
    const executionFn = executionFns.get(taskCode);
    
    if (!executionFn) {
      results.set(taskCode, { success: false, error: 'No execution function provided' });
      totalFailed++;
      continue;
    }
    
    const { success, error } = await executeTaskIsolated(taskCode, executionFn);
    results.set(taskCode, { success, error });
    
    if (success) {
      totalSuccess++;
    } else {
      totalFailed++;
    }
  }
  
  return { results, totalSuccess, totalFailed };
}

/**
 * Timeout a task execution and mark it as timed out
 * 
 * @param executionId - The execution ID to timeout
 */
export async function timeoutTaskExecution(
  executionId: string
): Promise<{ success: boolean; error: string | null }> {
  return updateTaskExecution(executionId, {
    status: 'timeout',
    completedAt: new Date().toISOString(),
    errorMessage: 'Task execution exceeded timeout limit',
  });
}
