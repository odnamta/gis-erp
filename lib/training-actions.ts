'use server';

// =====================================================
// v0.48: HSE - TRAINING RECORDS SERVER ACTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  TrainingCourse,
  TrainingRecord,
  TrainingSession,
  SessionParticipant,
  ComplianceEntry,
  ExpiringTraining,
  TrainingStatistics,
  CreateCourseInput,
  UpdateCourseInput,
  CreateRecordInput,
  UpdateRecordInput,
  CreateSessionInput,
  UpdateSessionInput,
  AddParticipantInput,
  CourseFilters,
  RecordFilters,
  SessionFilters,
  ComplianceFilters,
  TrainingCourseRow,
  TrainingRecordRow,
  TrainingSessionRow,
  SessionParticipantRow,
  ComplianceRow,
  ExpiringTrainingRow,
  transformCourseRow,
  transformRecordRow,
  transformSessionRow,
  transformParticipantRow,
  transformComplianceRow,
  transformExpiringTrainingRow,
} from '@/types/training';
import {
  validateCourseInput,
  validateRecordInput,
  validateSessionInput,
  calculateValidTo,
  calculateAssessmentResult,
  calculateTrainingStatistics,
  generateSessionCode,
} from '@/lib/training-utils';

// =====================================================
// COURSE ACTIONS
// =====================================================

/**
 * Get all training courses
 */
export async function getCourses(filters?: CourseFilters): Promise<TrainingCourse[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('safety_training_courses')
    .select('*')
    .order('course_code', { ascending: true });

  if (filters?.trainingType) {
    query = query.eq('training_type', filters.trainingType);
  }

  if (filters?.isMandatory !== undefined) {
    query = query.eq('is_mandatory', filters.isMandatory);
  }

  if (filters?.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }

  if (filters?.search) {
    query = query.or(`course_code.ilike.%${filters.search}%,course_name.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching courses:', error);
    throw new Error('Gagal mengambil data kursus');
  }

  return (data as TrainingCourseRow[]).map(transformCourseRow);
}

/**
 * Get course by ID
 */
export async function getCourseById(id: string): Promise<TrainingCourse | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('safety_training_courses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching course:', error);
    throw new Error('Gagal mengambil data kursus');
  }

  return transformCourseRow(data as TrainingCourseRow);
}


/**
 * Create a new training course
 */
export async function createCourse(input: CreateCourseInput): Promise<TrainingCourse> {
  const validation = validateCourseInput(input);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('safety_training_courses')
    .insert({
      course_code: input.courseCode,
      course_name: input.courseName,
      description: input.description || null,
      training_type: input.trainingType,
      duration_hours: input.durationHours || null,
      validity_months: input.validityMonths || null,
      is_mandatory: input.isMandatory ?? false,
      applicable_roles: input.applicableRoles || [],
      applicable_departments: input.applicableDepartments || [],
      prerequisite_courses: input.prerequisiteCourses || [],
      internal_training: input.internalTraining ?? true,
      external_provider: input.externalProvider || null,
      requires_assessment: input.requiresAssessment ?? false,
      passing_score: input.passingScore ?? 70,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating course:', error);
    if (error.code === '23505') {
      throw new Error('Kode kursus sudah digunakan');
    }
    throw new Error('Gagal membuat kursus');
  }

  revalidatePath('/hse/training');
  return transformCourseRow(data as TrainingCourseRow);
}

/**
 * Update a training course
 */
export async function updateCourse(id: string, input: UpdateCourseInput): Promise<TrainingCourse> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  
  if (input.courseName !== undefined) updateData.course_name = input.courseName;
  if (input.description !== undefined) updateData.description = input.description || null;
  if (input.trainingType !== undefined) updateData.training_type = input.trainingType;
  if (input.durationHours !== undefined) updateData.duration_hours = input.durationHours || null;
  if (input.validityMonths !== undefined) updateData.validity_months = input.validityMonths || null;
  if (input.isMandatory !== undefined) updateData.is_mandatory = input.isMandatory;
  if (input.applicableRoles !== undefined) updateData.applicable_roles = input.applicableRoles;
  if (input.applicableDepartments !== undefined) updateData.applicable_departments = input.applicableDepartments;
  if (input.prerequisiteCourses !== undefined) updateData.prerequisite_courses = input.prerequisiteCourses;
  if (input.internalTraining !== undefined) updateData.internal_training = input.internalTraining;
  if (input.externalProvider !== undefined) updateData.external_provider = input.externalProvider || null;
  if (input.requiresAssessment !== undefined) updateData.requires_assessment = input.requiresAssessment;
  if (input.passingScore !== undefined) updateData.passing_score = input.passingScore;
  if (input.isActive !== undefined) updateData.is_active = input.isActive;

  const { data, error } = await supabase
    .from('safety_training_courses')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating course:', error);
    throw new Error('Gagal mengupdate kursus');
  }

  revalidatePath('/hse/training');
  return transformCourseRow(data as TrainingCourseRow);
}

/**
 * Toggle course active status
 */
export async function toggleCourseActive(id: string): Promise<TrainingCourse> {
  const supabase = await createClient();

  // Get current status
  const { data: current, error: fetchError } = await supabase
    .from('safety_training_courses')
    .select('is_active')
    .eq('id', id)
    .single();

  if (fetchError) {
    throw new Error('Gagal mengambil data kursus');
  }

  // Toggle status
  const { data, error } = await supabase
    .from('safety_training_courses')
    .update({ is_active: !current.is_active })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error toggling course status:', error);
    throw new Error('Gagal mengubah status kursus');
  }

  revalidatePath('/hse/training');
  return transformCourseRow(data as TrainingCourseRow);
}

// =====================================================
// TRAINING RECORD ACTIONS
// =====================================================

/**
 * Get training records
 */
export async function getTrainingRecords(filters?: RecordFilters): Promise<TrainingRecord[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('employee_training_records')
    .select(`
      *,
      employees!inner(employee_code, full_name, departments(department_name)),
      safety_training_courses!inner(course_code, course_name)
    `)
    .order('training_date', { ascending: false });

  if (filters?.employeeId) {
    query = query.eq('employee_id', filters.employeeId);
  }

  if (filters?.courseId) {
    query = query.eq('course_id', filters.courseId);
  }

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching training records:', error);
    throw new Error('Gagal mengambil data pelatihan');
  }

  return ((data || []) as unknown as (TrainingRecordRow & { 
    employees: { employee_code: string; full_name: string; departments: { department_name: string } };
    safety_training_courses: { course_code: string; course_name: string };
  })[]).map((row) => ({
    ...transformRecordRow(row),
    employeeCode: row.employees?.employee_code,
    employeeName: row.employees?.full_name,
    departmentName: row.employees?.departments?.department_name,
    courseCode: row.safety_training_courses?.course_code,
    courseName: row.safety_training_courses?.course_name,
  }));
}

/**
 * Get employee training records
 */
export async function getEmployeeTrainingRecords(employeeId: string): Promise<TrainingRecord[]> {
  return getTrainingRecords({ employeeId });
}


/**
 * Create a training record
 */
export async function createTrainingRecord(input: CreateRecordInput): Promise<TrainingRecord> {
  const supabase = await createClient();

  // Get course for validation
  const course = await getCourseById(input.courseId);
  if (!course) {
    throw new Error('Kursus tidak ditemukan');
  }

  const validation = validateRecordInput(input, course);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Check prerequisites if course has them
  if (course.prerequisiteCourses.length > 0) {
    const employeeRecords = await getEmployeeTrainingRecords(input.employeeId);
    const completedCourseIds = employeeRecords
      .filter(r => r.status === 'completed')
      .map(r => r.courseId);
    
    const missingPrereqs = course.prerequisiteCourses.filter(
      prereqId => !completedCourseIds.includes(prereqId)
    );

    if (missingPrereqs.length > 0) {
      throw new Error('Prasyarat belum terpenuhi');
    }
  }

  // Calculate validity dates if completing
  let validFrom = input.validFrom ? input.validFrom : null;
  let validTo: string | null = null;
  let assessmentPassed: boolean | null = null;
  let status = input.status || 'scheduled';

  if (status === 'completed' && course.validityMonths) {
    validFrom = validFrom || input.trainingDate;
    const validToDate = calculateValidTo(new Date(validFrom), course.validityMonths);
    validTo = validToDate.toISOString().split('T')[0];
  }

  // Calculate assessment result if score provided
  if (input.assessmentScore !== undefined && course.requiresAssessment) {
    const result = calculateAssessmentResult(input.assessmentScore, course.passingScore);
    assessmentPassed = result.passed;
    status = result.status;
  }

  const { data: user } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('employee_training_records')
    .insert({
      employee_id: input.employeeId,
      course_id: input.courseId,
      training_date: input.trainingDate,
      completion_date: input.completionDate || null,
      training_location: input.trainingLocation || null,
      trainer_name: input.trainerName || null,
      training_provider: input.trainingProvider || null,
      status,
      assessment_score: input.assessmentScore ?? null,
      assessment_passed: assessmentPassed,
      certificate_number: input.certificateNumber || null,
      certificate_url: input.certificateUrl || null,
      valid_from: validFrom,
      valid_to: validTo,
      training_cost: input.trainingCost ?? null,
      notes: input.notes || null,
      recorded_by: user?.user?.id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating training record:', error);
    throw new Error('Gagal membuat catatan pelatihan');
  }

  revalidatePath('/hse/training');
  return transformRecordRow(data as TrainingRecordRow);
}

/**
 * Update a training record
 */
export async function updateTrainingRecord(id: string, input: UpdateRecordInput): Promise<TrainingRecord> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  
  if (input.trainingDate !== undefined) updateData.training_date = input.trainingDate;
  if (input.completionDate !== undefined) updateData.completion_date = input.completionDate || null;
  if (input.trainingLocation !== undefined) updateData.training_location = input.trainingLocation || null;
  if (input.trainerName !== undefined) updateData.trainer_name = input.trainerName || null;
  if (input.trainingProvider !== undefined) updateData.training_provider = input.trainingProvider || null;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.assessmentScore !== undefined) updateData.assessment_score = input.assessmentScore;
  if (input.certificateNumber !== undefined) updateData.certificate_number = input.certificateNumber || null;
  if (input.certificateUrl !== undefined) updateData.certificate_url = input.certificateUrl || null;
  if (input.validFrom !== undefined) updateData.valid_from = input.validFrom || null;
  if (input.validTo !== undefined) updateData.valid_to = input.validTo || null;
  if (input.trainingCost !== undefined) updateData.training_cost = input.trainingCost;
  if (input.notes !== undefined) updateData.notes = input.notes || null;

  const { data, error } = await supabase
    .from('employee_training_records')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating training record:', error);
    throw new Error('Gagal mengupdate catatan pelatihan');
  }

  revalidatePath('/hse/training');
  return transformRecordRow(data as TrainingRecordRow);
}

/**
 * Complete a training record
 */
export async function completeTrainingRecord(
  id: string,
  completionData: {
    completionDate: string;
    assessmentScore?: number;
    certificateNumber?: string;
    certificateUrl?: string;
  }
): Promise<TrainingRecord> {
  const supabase = await createClient();

  // Get current record and course
  const { data: record, error: fetchError } = await supabase
    .from('employee_training_records')
    .select('*, safety_training_courses(*)')
    .eq('id', id)
    .single();

  if (fetchError || !record) {
    throw new Error('Catatan pelatihan tidak ditemukan');
  }

  const course = record.safety_training_courses;
  
  // Calculate assessment result if needed
  let assessmentPassed: boolean | null = null;
  let status = 'completed';

  if (course.requires_assessment && completionData.assessmentScore !== undefined) {
    const result = calculateAssessmentResult(completionData.assessmentScore, course.passing_score ?? 70);
    assessmentPassed = result.passed;
    status = result.status;
  }

  // Calculate validity dates
  const validFrom = completionData.completionDate;
  let validTo: string | null = null;
  
  if (course.validity_months && status === 'completed') {
    const validToDate = calculateValidTo(new Date(validFrom), course.validity_months);
    validTo = validToDate.toISOString().split('T')[0];
  }

  const { data, error } = await supabase
    .from('employee_training_records')
    .update({
      completion_date: completionData.completionDate,
      status,
      assessment_score: completionData.assessmentScore ?? null,
      assessment_passed: assessmentPassed,
      certificate_number: completionData.certificateNumber || null,
      certificate_url: completionData.certificateUrl || null,
      valid_from: validFrom,
      valid_to: validTo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error completing training record:', error);
    throw new Error('Gagal menyelesaikan catatan pelatihan');
  }

  revalidatePath('/hse/training');
  return transformRecordRow(data as TrainingRecordRow);
}


// =====================================================
// SESSION ACTIONS
// =====================================================

/**
 * Get training sessions
 */
export async function getSessions(filters?: SessionFilters): Promise<TrainingSession[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('training_sessions')
    .select(`
      *,
      safety_training_courses(course_code, course_name),
      trainer:employees!training_sessions_trainer_employee_id_fkey(full_name)
    `)
    .order('session_date', { ascending: true });

  if (filters?.courseId) {
    query = query.eq('course_id', filters.courseId);
  }

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status);
    } else {
      query = query.eq('status', filters.status);
    }
  }

  if (filters?.fromDate) {
    query = query.gte('session_date', filters.fromDate);
  }

  if (filters?.toDate) {
    query = query.lte('session_date', filters.toDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching sessions:', error);
    throw new Error('Gagal mengambil data sesi');
  }

  // Get participant counts
  const sessionIds = ((data || []) as unknown as TrainingSessionRow[]).map((s) => s.id);
  const { data: participantCounts } = await supabase
    .from('training_session_participants')
    .select('session_id')
    .in('session_id', sessionIds);

  const countMap: Record<string, number> = {};
  (participantCounts || []).forEach((p: { session_id: string }) => {
    countMap[p.session_id] = (countMap[p.session_id] || 0) + 1;
  });

  return ((data || []) as unknown as (TrainingSessionRow & {
    safety_training_courses: { course_code: string; course_name: string };
    trainer: { full_name: string } | null;
  })[]).map((row) => ({
    ...transformSessionRow(row),
    courseCode: row.safety_training_courses?.course_code,
    courseName: row.safety_training_courses?.course_name,
    trainerEmployeeName: row.trainer?.full_name,
    participantCount: countMap[row.id] || 0,
  }));
}

/**
 * Get upcoming training sessions
 */
export async function getUpcomingSessions(): Promise<TrainingSession[]> {
  const today = new Date().toISOString().split('T')[0];
  return getSessions({
    status: ['scheduled', 'in_progress'],
    fromDate: today,
  });
}

/**
 * Get session by ID
 */
export async function getSessionById(id: string): Promise<TrainingSession | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('training_sessions')
    .select(`
      *,
      safety_training_courses(course_code, course_name),
      trainer:employees!training_sessions_trainer_employee_id_fkey(full_name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching session:', error);
    throw new Error('Gagal mengambil data sesi');
  }

  // Get participant count
  const { count } = await supabase
    .from('training_session_participants')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', id);

  const row = data as TrainingSessionRow & {
    safety_training_courses: { course_code: string; course_name: string };
    trainer: { full_name: string } | null;
  };

  return {
    ...transformSessionRow(row),
    courseCode: row.safety_training_courses?.course_code,
    courseName: row.safety_training_courses?.course_name,
    trainerEmployeeName: row.trainer?.full_name,
    participantCount: count || 0,
  };
}

/**
 * Create a training session
 */
export async function createSession(input: CreateSessionInput): Promise<TrainingSession> {
  const validation = validateSessionInput(input);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const supabase = await createClient();

  // Get course for session code generation
  const course = await getCourseById(input.courseId);
  if (!course) {
    throw new Error('Kursus tidak ditemukan');
  }

  // Generate session code
  const { count } = await supabase
    .from('training_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', input.courseId)
    .gte('session_date', `${new Date().getFullYear()}-01-01`);

  const sessionCode = generateSessionCode(
    course.courseCode,
    new Date(input.sessionDate),
    (count || 0) + 1
  );

  const { data: user } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('training_sessions')
    .insert({
      session_code: sessionCode,
      course_id: input.courseId,
      session_date: input.sessionDate,
      start_time: input.startTime || null,
      end_time: input.endTime || null,
      location: input.location || null,
      trainer_name: input.trainerName || null,
      trainer_employee_id: input.trainerEmployeeId || null,
      max_participants: input.maxParticipants || null,
      notes: input.notes || null,
      created_by: user?.user?.id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating session:', error);
    throw new Error('Gagal membuat sesi pelatihan');
  }

  revalidatePath('/hse/training');
  return transformSessionRow(data as TrainingSessionRow);
}

/**
 * Update a training session
 */
export async function updateSession(id: string, input: UpdateSessionInput): Promise<TrainingSession> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  
  if (input.sessionDate !== undefined) updateData.session_date = input.sessionDate;
  if (input.startTime !== undefined) updateData.start_time = input.startTime || null;
  if (input.endTime !== undefined) updateData.end_time = input.endTime || null;
  if (input.location !== undefined) updateData.location = input.location || null;
  if (input.trainerName !== undefined) updateData.trainer_name = input.trainerName || null;
  if (input.trainerEmployeeId !== undefined) updateData.trainer_employee_id = input.trainerEmployeeId || null;
  if (input.maxParticipants !== undefined) updateData.max_participants = input.maxParticipants || null;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.notes !== undefined) updateData.notes = input.notes || null;

  const { data, error } = await supabase
    .from('training_sessions')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating session:', error);
    throw new Error('Gagal mengupdate sesi pelatihan');
  }

  revalidatePath('/hse/training');
  return transformSessionRow(data as TrainingSessionRow);
}


/**
 * Complete a training session and auto-create records for attended participants
 */
export async function completeSession(id: string): Promise<{ session: TrainingSession; recordsCreated: number }> {
  const supabase = await createClient();

  // Get session with course info
  const { data: session, error: sessionError } = await supabase
    .from('training_sessions')
    .select('*, safety_training_courses(*)')
    .eq('id', id)
    .single();

  if (sessionError || !session) {
    throw new Error('Sesi tidak ditemukan');
  }

  if (session.status !== 'scheduled' && session.status !== 'in_progress') {
    throw new Error('Sesi tidak dalam status yang dapat diselesaikan');
  }

  // Get attended participants
  const { data: participants, error: participantsError } = await supabase
    .from('training_session_participants')
    .select('*')
    .eq('session_id', id)
    .eq('attendance_status', 'attended');

  if (participantsError) {
    throw new Error('Gagal mengambil data peserta');
  }

  const course = session.safety_training_courses;
  const { data: user } = await supabase.auth.getUser();
  let recordsCreated = 0;

  // Create training records for attended participants
  for (const participant of participants || []) {
    if (participant.training_record_id) continue; // Already has a record

    // Calculate validity dates
    const validFrom = session.session_date;
    let validTo: string | null = null;
    
    if (course.validity_months) {
      const validToDate = calculateValidTo(new Date(validFrom), course.validity_months);
      validTo = validToDate.toISOString().split('T')[0];
    }

    // Create training record
    const { data: record, error: recordError } = await supabase
      .from('employee_training_records')
      .insert({
        employee_id: participant.employee_id,
        course_id: session.course_id,
        training_date: session.session_date,
        completion_date: session.session_date,
        training_location: session.location,
        trainer_name: session.trainer_name,
        status: 'completed',
        valid_from: validFrom,
        valid_to: validTo,
        recorded_by: user?.user?.id || null,
      })
      .select()
      .single();

    if (!recordError && record) {
      // Link record to participant
      await supabase
        .from('training_session_participants')
        .update({ training_record_id: record.id })
        .eq('id', participant.id);
      
      recordsCreated++;
    }
  }

  // Update session status
  const { data: updatedSession, error: updateError } = await supabase
    .from('training_sessions')
    .update({ status: 'completed' })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    throw new Error('Gagal menyelesaikan sesi');
  }

  revalidatePath('/hse/training');
  return {
    session: transformSessionRow(updatedSession as TrainingSessionRow),
    recordsCreated,
  };
}

/**
 * Cancel a training session
 */
export async function cancelSession(id: string): Promise<TrainingSession> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('training_sessions')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error cancelling session:', error);
    throw new Error('Gagal membatalkan sesi');
  }

  // Cancel all participant registrations
  await supabase
    .from('training_session_participants')
    .update({ attendance_status: 'cancelled' })
    .eq('session_id', id);

  revalidatePath('/hse/training');
  return transformSessionRow(data as TrainingSessionRow);
}

// =====================================================
// PARTICIPANT ACTIONS
// =====================================================

/**
 * Get session participants
 */
export async function getSessionParticipants(sessionId: string): Promise<SessionParticipant[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('training_session_participants')
    .select(`
      *,
      employees(employee_code, full_name, departments(department_name))
    `)
    .eq('session_id', sessionId);

  if (error) {
    console.error('Error fetching participants:', error);
    throw new Error('Gagal mengambil data peserta');
  }

  return ((data || []) as unknown as (SessionParticipantRow & {
    employees: { employee_code: string; full_name: string; departments: { department_name: string } };
  })[]).map((row) => ({
    ...transformParticipantRow(row),
    employeeCode: row.employees?.employee_code,
    employeeName: row.employees?.full_name,
    departmentName: row.employees?.departments?.department_name,
  }));
}

/**
 * Add participant to session
 */
export async function addParticipant(input: AddParticipantInput): Promise<SessionParticipant> {
  const supabase = await createClient();

  // Check session exists and has capacity
  const session = await getSessionById(input.sessionId);
  if (!session) {
    throw new Error('Sesi tidak ditemukan');
  }

  if (session.status !== 'scheduled') {
    throw new Error('Tidak dapat menambah peserta ke sesi yang sudah selesai');
  }

  if (session.maxParticipants && session.participantCount && session.participantCount >= session.maxParticipants) {
    throw new Error('Sesi sudah penuh');
  }

  const { data, error } = await supabase
    .from('training_session_participants')
    .insert({
      session_id: input.sessionId,
      employee_id: input.employeeId,
      attendance_status: 'registered',
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding participant:', error);
    if (error.code === '23505') {
      throw new Error('Karyawan sudah terdaftar di sesi ini');
    }
    throw new Error('Gagal menambah peserta');
  }

  revalidatePath('/hse/training');
  return transformParticipantRow(data as SessionParticipantRow);
}

/**
 * Remove participant from session
 */
export async function removeParticipant(sessionId: string, employeeId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('training_session_participants')
    .delete()
    .eq('session_id', sessionId)
    .eq('employee_id', employeeId);

  if (error) {
    console.error('Error removing participant:', error);
    throw new Error('Gagal menghapus peserta');
  }

  revalidatePath('/hse/training');
}

/**
 * Update participant attendance
 */
export async function updateAttendance(
  participantId: string,
  status: 'registered' | 'attended' | 'absent' | 'cancelled'
): Promise<SessionParticipant> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('training_session_participants')
    .update({ attendance_status: status })
    .eq('id', participantId)
    .select()
    .single();

  if (error) {
    console.error('Error updating attendance:', error);
    throw new Error('Gagal mengupdate kehadiran');
  }

  revalidatePath('/hse/training');
  return transformParticipantRow(data as SessionParticipantRow);
}


// =====================================================
// COMPLIANCE ACTIONS
// =====================================================

/**
 * Get compliance matrix
 */
export async function getComplianceMatrix(filters?: ComplianceFilters): Promise<ComplianceEntry[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('training_compliance')
    .select('*');

  if (filters?.courseId) {
    query = query.eq('course_id', filters.courseId);
  }

  if (filters?.complianceStatus) {
    query = query.eq('compliance_status', filters.complianceStatus);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching compliance matrix:', error);
    throw new Error('Gagal mengambil data kepatuhan');
  }

  return (data as ComplianceRow[] || []).map(transformComplianceRow);
}

/**
 * Get expiring training
 */
export async function getExpiringTraining(withinDays: number = 60): Promise<ExpiringTraining[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('expiring_training')
    .select('*')
    .lte('days_until_expiry', withinDays)
    .gte('days_until_expiry', 0)
    .order('valid_to', { ascending: true });

  if (error) {
    console.error('Error fetching expiring training:', error);
    throw new Error('Gagal mengambil data pelatihan yang akan kadaluarsa');
  }

  return (data as ExpiringTrainingRow[] || []).map(transformExpiringTrainingRow);
}

/**
 * Get training statistics
 */
export async function getTrainingStatistics(): Promise<TrainingStatistics> {
  const supabase = await createClient();

  // Get compliance entries
  const { data: complianceData, error: complianceError } = await supabase
    .from('training_compliance')
    .select('*');

  if (complianceError) {
    console.error('Error fetching compliance data:', complianceError);
    throw new Error('Gagal mengambil data statistik');
  }

  const entries = (complianceData as ComplianceRow[] || []).map(transformComplianceRow);
  
  // Get unique employee IDs
  const employeeIds = [...new Set(entries.map(e => e.employeeId))];

  return calculateTrainingStatistics(entries, employeeIds);
}
