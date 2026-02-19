'use server';

// =====================================================
// v0.50: HSE - AUDIT & INSPECTION Server Actions
// =====================================================

import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database';
import {
  AuditType,
  Audit,
  AuditFinding,
  AuditScheduleItem,
  OpenFindingView,
  AuditDashboardMetrics,
  CreateAuditTypeInput,
  UpdateAuditTypeInput,
  CreateAuditInput,
  UpdateAuditInput,
  CompleteAuditInput,
  CreateFindingInput,
  UpdateFindingInput,
  CloseFindingInput,
  ChecklistTemplate,
} from '@/types/audit';
import {
  validateAuditType,
  validateAudit,
  validateFinding,
  validateClosureEvidence,
  calculateAuditScore,
  determineAuditRating,
  calculateDashboardMetrics,
  getAuditsDueSoon,
  filterOpenFindings,
  countCriticalOpenFindings,
  calculateAverageScore,
} from '@/lib/audit-utils';

// =====================================================
// Audit Type Actions
// =====================================================

/**
 * Creates a new audit type
 */
export async function createAuditType(
  input: CreateAuditTypeInput
): Promise<{ data: AuditType | null; error: string | null }> {
  const validation = validateAuditType(input);
  if (!validation.valid) {
    return { data: null, error: validation.errors[0].message };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('audit_types')
    .insert({
      type_code: input.type_code.toUpperCase(),
      type_name: input.type_name,
      description: input.description || null,
      category: input.category,
      frequency_days: input.frequency_days || null,
      checklist_template: (input.checklist_template || { sections: [] }) as unknown as Json,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { data: null, error: 'An audit type with this code already exists' };
    }
    return { data: null, error: error.message };
  }

  return { data: data as unknown as AuditType, error: null };
}

/**
 * Updates an existing audit type
 */
export async function updateAuditType(
  id: string,
  input: UpdateAuditTypeInput
): Promise<{ data: AuditType | null; error: string | null }> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (input.type_name !== undefined) updateData.type_name = input.type_name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.frequency_days !== undefined) updateData.frequency_days = input.frequency_days;
  if (input.checklist_template !== undefined) updateData.checklist_template = input.checklist_template;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;

  const { data, error } = await supabase
    .from('audit_types')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as unknown as AuditType, error: null };
}

/**
 * Deactivates an audit type (soft delete)
 */
export async function deactivateAuditType(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('audit_types')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Gets all audit types
 */
export async function getAuditTypes(): Promise<{
  data: AuditType[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('audit_types')
    .select('*')
    .order('type_name');

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as unknown as AuditType[], error: null };
}

/**
 * Gets only active audit types
 */
export async function getActiveAuditTypes(): Promise<{
  data: AuditType[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('audit_types')
    .select('*')
    .eq('is_active', true)
    .order('type_name');

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as unknown as AuditType[], error: null };
}

/**
 * Gets a single audit type by ID
 */
export async function getAuditType(
  id: string
): Promise<{ data: AuditType | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('audit_types')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as unknown as AuditType, error: null };
}


// =====================================================
// Audit Actions
// =====================================================

/**
 * Creates a new audit
 */
export async function createAudit(
  input: CreateAuditInput
): Promise<{ data: Audit | null; error: string | null }> {
  const validation = validateAudit(input);
  if (!validation.valid) {
    return { data: null, error: validation.errors[0].message };
  }

  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Get user profile (FK references user_profiles.id, not auth UUID)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user?.id || '')
    .single();

  // Generate audit number
  const { count: auditCount } = await supabase
    .from('audits')
    .select('*', { count: 'exact', head: true });

  const nextNumber = (auditCount || 0) + 1;
  const audit_number = `AUD-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`;

  const { data, error } = await supabase
    .from('audits')
    .insert({
      audit_number,
      audit_type_id: input.audit_type_id,
      scheduled_date: input.scheduled_date || null,
      location: input.location || null,
      department_id: input.department_id || null,
      asset_id: input.asset_id || null,
      job_order_id: input.job_order_id || null,
      auditor_id: input.auditor_id || null,
      auditor_name: input.auditor_name || null,
      created_by: profile?.id || null,
      status: 'scheduled',
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as unknown as Audit, error: null };
}

/**
 * Updates an existing audit
 */
export async function updateAudit(
  id: string,
  input: UpdateAuditInput
): Promise<{ data: Audit | null; error: string | null }> {
  const supabase = await createClient();

  // Check if audit can be modified
  const { data: existing } = await supabase
    .from('audits')
    .select('status')
    .eq('id', id)
    .single();

  if (existing?.status === 'completed') {
    return { data: null, error: 'Cannot modify a completed audit' };
  }
  if (existing?.status === 'cancelled') {
    return { data: null, error: 'Cannot modify a cancelled audit' };
  }

  const updateData: Record<string, unknown> = {};
  if (input.scheduled_date !== undefined) updateData.scheduled_date = input.scheduled_date;
  if (input.conducted_date !== undefined) updateData.conducted_date = input.conducted_date;
  if (input.location !== undefined) updateData.location = input.location;
  if (input.department_id !== undefined) updateData.department_id = input.department_id;
  if (input.asset_id !== undefined) updateData.asset_id = input.asset_id;
  if (input.job_order_id !== undefined) updateData.job_order_id = input.job_order_id;
  if (input.auditor_id !== undefined) updateData.auditor_id = input.auditor_id;
  if (input.auditor_name !== undefined) updateData.auditor_name = input.auditor_name;
  if (input.checklist_responses !== undefined) updateData.checklist_responses = input.checklist_responses;
  if (input.summary !== undefined) updateData.summary = input.summary;
  if (input.photos !== undefined) updateData.photos = input.photos;
  if (input.documents !== undefined) updateData.documents = input.documents;
  if (input.status !== undefined) updateData.status = input.status;

  const { data, error } = await supabase
    .from('audits')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as unknown as Audit, error: null };
}

/**
 * Starts an audit (changes status to in_progress)
 */
export async function startAudit(
  id: string
): Promise<{ data: Audit | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('audits')
    .update({
      status: 'in_progress',
      conducted_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', id)
    .eq('status', 'scheduled')
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as unknown as Audit, error: null };
}

/**
 * Completes an audit with final responses and calculates score
 */
export async function completeAudit(
  id: string,
  input: CompleteAuditInput
): Promise<{ data: Audit | null; error: string | null }> {
  const supabase = await createClient();

  // Get the audit and its type to calculate score
  const { data: audit } = await supabase
    .from('audits')
    .select('*, audit_types(*)')
    .eq('id', id)
    .single();

  if (!audit) {
    return { data: null, error: 'Audit not found' };
  }

  if (audit.status === 'completed') {
    return { data: null, error: 'Audit is already completed' };
  }

  if (audit.status === 'cancelled') {
    return { data: null, error: 'Cannot complete a cancelled audit' };
  }

  // Calculate score based on checklist template and responses
  const template = audit.audit_types?.checklist_template as unknown as ChecklistTemplate || { sections: [] };
  const score = calculateAuditScore(template, input.checklist_responses);
  const rating = determineAuditRating(score);

  const { data, error } = await supabase
    .from('audits')
    .update({
      checklist_responses: input.checklist_responses as unknown as Json,
      summary: input.summary || null,
      photos: (input.photos || []) as unknown as Json,
      documents: (input.documents || []) as unknown as Json,
      overall_score: score,
      overall_rating: rating,
      status: 'completed',
      completed_at: new Date().toISOString(),
      conducted_date: audit.conducted_date || new Date().toISOString().split('T')[0],
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as unknown as Audit, error: null };
}

/**
 * Cancels an audit
 */
export async function cancelAudit(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('audits')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .neq('status', 'completed');

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Gets a single audit by ID with type and findings
 */
export async function getAudit(
  id: string
): Promise<{ data: Audit | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('audits')
    .select('*, audit_types(*), audit_findings(*)')
    .eq('id', id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as unknown as Audit, error: null };
}

/**
 * Gets all audits with optional filtering
 */
export async function getAudits(filters?: {
  audit_type_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}): Promise<{ data: Audit[]; error: string | null }> {
  const supabase = await createClient();

  let query = supabase
    .from('audits')
    .select('*, audit_types(type_code, type_name)')
    .order('created_at', { ascending: false });

  if (filters?.audit_type_id) {
    query = query.eq('audit_type_id', filters.audit_type_id);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.date_from) {
    query = query.gte('conducted_date', filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte('conducted_date', filters.date_to);
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as unknown as Audit[], error: null };
}

/**
 * Gets audits by type
 */
export async function getAuditsByType(
  auditTypeId: string
): Promise<{ data: Audit[]; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('audits')
    .select('*')
    .eq('audit_type_id', auditTypeId)
    .order('conducted_date', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as unknown as Audit[], error: null };
}


// =====================================================
// Finding Actions
// =====================================================

/**
 * Creates a new finding and updates parent audit counts
 */
export async function createFinding(
  input: CreateFindingInput
): Promise<{ data: AuditFinding | null; error: string | null }> {
  const validation = validateFinding(input);
  if (!validation.valid) {
    return { data: null, error: validation.errors[0].message };
  }

  const supabase = await createClient();

  // Get the next finding number for this audit
  const { data: existingFindings } = await supabase
    .from('audit_findings')
    .select('finding_number')
    .eq('audit_id', input.audit_id)
    .order('finding_number', { ascending: false })
    .limit(1);

  const nextNumber = existingFindings && existingFindings.length > 0
    ? existingFindings[0].finding_number + 1
    : 1;

  // Create the finding
  const { data, error } = await supabase
    .from('audit_findings')
    .insert({
      audit_id: input.audit_id,
      finding_number: nextNumber,
      severity: input.severity,
      category: input.category || null,
      finding_description: input.finding_description,
      location_detail: input.location_detail || null,
      photos: input.photos || [],
      risk_level: input.risk_level || null,
      potential_consequence: input.potential_consequence || null,
      corrective_action: input.corrective_action || null,
      responsible_id: input.responsible_id || null,
      due_date: input.due_date || null,
      status: 'open',
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  // Update the parent audit's finding counts
  const countField = input.severity === 'observation' ? 'observations' : `${input.severity}_findings`;
  
  // Try to update finding count manually (RPC may not exist)
  try {
    const { data: auditData } = await supabase
      .from('audits')
      .select(countField)
      .eq('id', input.audit_id)
      .single();
    
    if (auditData) {
      const currentCount = ((auditData as unknown as Record<string, number>)[countField] || 0);
      await supabase
        .from('audits')
        .update({ [countField]: currentCount + 1 })
        .eq('id', input.audit_id);
    }
  } catch {
    // Ignore errors in count update
  }

  return { data: data as unknown as AuditFinding, error: null };
}

/**
 * Updates an existing finding
 */
export async function updateFinding(
  id: string,
  input: UpdateFindingInput
): Promise<{ data: AuditFinding | null; error: string | null }> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (input.severity !== undefined) updateData.severity = input.severity;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.finding_description !== undefined) updateData.finding_description = input.finding_description;
  if (input.location_detail !== undefined) updateData.location_detail = input.location_detail;
  if (input.photos !== undefined) updateData.photos = input.photos;
  if (input.risk_level !== undefined) updateData.risk_level = input.risk_level;
  if (input.potential_consequence !== undefined) updateData.potential_consequence = input.potential_consequence;
  if (input.corrective_action !== undefined) updateData.corrective_action = input.corrective_action;
  if (input.responsible_id !== undefined) updateData.responsible_id = input.responsible_id;
  if (input.due_date !== undefined) updateData.due_date = input.due_date;
  if (input.status !== undefined) updateData.status = input.status;

  const { data, error } = await supabase
    .from('audit_findings')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as AuditFinding, error: null };
}

/**
 * Closes a finding with evidence
 */
export async function closeFinding(
  id: string,
  input: CloseFindingInput
): Promise<{ data: AuditFinding | null; error: string | null }> {
  const validation = validateClosureEvidence(input.closure_evidence);
  if (!validation.valid) {
    return { data: null, error: validation.errors[0].message };
  }

  const supabase = await createClient();

  // Check if finding is already closed
  const { data: existing } = await supabase
    .from('audit_findings')
    .select('status')
    .eq('id', id)
    .single();

  if (existing?.status === 'closed' || existing?.status === 'verified') {
    return { data: null, error: 'Finding is already closed' };
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Get user profile (FK references user_profiles.id, not auth UUID)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user?.id || '')
    .single();

  const { data, error } = await supabase
    .from('audit_findings')
    .update({
      status: 'closed',
      closure_evidence: input.closure_evidence,
      closed_by: profile?.id || null,
      closed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as AuditFinding, error: null };
}

/**
 * Verifies a closed finding
 */
export async function verifyFinding(
  id: string
): Promise<{ data: AuditFinding | null; error: string | null }> {
  const supabase = await createClient();

  // Check if finding is closed
  const { data: existing } = await supabase
    .from('audit_findings')
    .select('status, closed_by')
    .eq('id', id)
    .single();

  if (!existing) {
    return { data: null, error: 'Finding not found' };
  }

  if (existing.status !== 'closed') {
    return { data: null, error: 'Finding must be closed before verification' };
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Get user profile (FK references user_profiles.id, not auth UUID)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user?.id || '')
    .single();

  // Check if same user is trying to verify
  if (profile?.id === existing.closed_by) {
    return { data: null, error: 'Cannot verify your own closure' };
  }

  const { data, error } = await supabase
    .from('audit_findings')
    .update({
      status: 'verified',
      verified_by: profile?.id || null,
      verified_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as AuditFinding, error: null };
}

/**
 * Gets findings for an audit
 */
export async function getFindingsByAudit(
  auditId: string
): Promise<{ data: AuditFinding[]; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('audit_findings')
    .select('*')
    .eq('audit_id', auditId)
    .order('finding_number');

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as AuditFinding[], error: null };
}

/**
 * Gets all findings with optional filtering
 */
export async function getFindings(filters?: {
  severity?: string;
  status?: string;
  responsible_id?: string;
}): Promise<{ data: AuditFinding[]; error: string | null }> {
  const supabase = await createClient();

  let query = supabase
    .from('audit_findings')
    .select('*, audits(audit_number)')
    .order('created_at', { ascending: false });

  if (filters?.severity) {
    query = query.eq('severity', filters.severity);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.responsible_id) {
    query = query.eq('responsible_id', filters.responsible_id);
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as unknown as AuditFinding[], error: null };
}


// =====================================================
// Query Actions for Views and Dashboard
// =====================================================

/**
 * Gets the audit schedule from the view
 */
export async function getAuditSchedule(): Promise<{
  data: AuditScheduleItem[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('audit_schedule')
    .select('*');

  if (error) {
    return { data: [], error: error.message };
  }

  // Add is_overdue flag
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scheduleWithOverdue = (data || []).map((item) => ({
    ...item,
    is_overdue: item.next_due ? new Date(item.next_due) < today : false,
  }));

  return { data: scheduleWithOverdue as unknown as AuditScheduleItem[], error: null };
}

/**
 * Gets open findings from the view
 */
export async function getOpenFindings(): Promise<{
  data: OpenFindingView[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('open_audit_findings')
    .select('*');

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as unknown as OpenFindingView[], error: null };
}

/**
 * Gets all data needed for the audit dashboard
 */
export async function getAuditDashboardData(): Promise<{
  data: {
    metrics: AuditDashboardMetrics;
    upcomingAudits: AuditScheduleItem[];
    criticalFindings: OpenFindingView[];
  } | null;
  error: string | null;
}> {
  const supabase = await createClient();

  // Get audit schedule
  const { data: schedule, error: scheduleError } = await supabase
    .from('audit_schedule')
    .select('*');

  if (scheduleError) {
    return { data: null, error: scheduleError.message };
  }

  // Get open findings
  const { data: openFindings, error: findingsError } = await supabase
    .from('open_audit_findings')
    .select('*');

  if (findingsError) {
    return { data: null, error: findingsError.message };
  }

  // Get completed audits for this month
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const { data: monthAudits, error: auditsError } = await supabase
    .from('audits')
    .select('*')
    .eq('status', 'completed')
    .gte('conducted_date', firstOfMonth.toISOString().split('T')[0]);

  if (auditsError) {
    return { data: null, error: auditsError.message };
  }

  // Calculate metrics
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scheduleWithOverdue = (schedule || []).map((item) => ({
    ...item,
    is_overdue: item.next_due ? new Date(item.next_due) < today : false,
  })) as AuditScheduleItem[];

  const dueSoonAudits = getAuditsDueSoon(scheduleWithOverdue, 7, today);
  const overdueAudits = dueSoonAudits.filter((a) => a.is_overdue);

  const criticalMajorFindings = (openFindings || []).filter(
    (f) => f.severity === 'critical' || f.severity === 'major'
  ) as unknown as OpenFindingView[];

  const criticalCount = (openFindings || []).filter(
    (f) => f.severity === 'critical'
  ).length;

  const avgScore = calculateAverageScore(monthAudits as unknown as Audit[] || []);

  const metrics: AuditDashboardMetrics = {
    dueSoonCount: dueSoonAudits.length,
    openFindingsCount: (openFindings || []).length,
    criticalFindingsCount: criticalCount,
    averageScoreMTD: avgScore,
    overdueAuditsCount: overdueAudits.length,
  };

  return {
    data: {
      metrics,
      upcomingAudits: dueSoonAudits,
      criticalFindings: criticalMajorFindings,
    },
    error: null,
  };
}

/**
 * Gets recent audits for a specific type
 */
export async function getRecentAuditsByType(
  auditTypeId: string,
  limit: number = 5
): Promise<{ data: Audit[]; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('audits')
    .select('*')
    .eq('audit_type_id', auditTypeId)
    .eq('status', 'completed')
    .order('conducted_date', { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as unknown as Audit[], error: null };
}
