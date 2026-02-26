'use server';

// Engineering Drawing Management Server Actions

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  Drawing,
  DrawingWithDetails,
  DrawingRevision,
  DrawingRevisionWithDetails,
  DrawingCategory,
  DrawingTransmittal,
  DrawingTransmittalWithDetails,
  DrawingFormInput,
  RevisionFormInput,
  TransmittalFormInput,
  DrawingFilters,
  DrawingStatus,
} from '@/types/drawing';
import {
  validateDrawingInput,
  validateRevisionInput,
  validateTransmittalInput,
  getNextRevision,
  isValidStatusTransition,
} from '@/lib/drawing-utils';
import { Json } from '@/types/database';

// Action result type
interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============ Drawing Categories ============

export async function getCategories(): Promise<DrawingCategory[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('drawing_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) {
    return [];
  }

  return (data || []) as unknown as DrawingCategory[];
}

// ============ Drawings CRUD ============

export async function getDrawings(filters?: DrawingFilters): Promise<DrawingWithDetails[]> {
  const supabase = await createClient();

  let query = supabase
    .from('drawings')
    .select(`
      *,
      category:drawing_categories(*),
      project:projects(id, name),
      job_order:job_orders(id, jo_number),
      drafted_by_employee:employees!drawings_drafted_by_fkey(id, full_name),
      checked_by_employee:employees!drawings_checked_by_fkey(id, full_name),
      approved_by_employee:employees!drawings_approved_by_fkey(id, full_name),
      issued_by_employee:employees!drawings_issued_by_fkey(id, full_name)
    `)
    .neq('status', 'superseded')
    .order('drawing_number');

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id);
  }
  if (filters?.project_id) {
    query = query.eq('project_id', filters.project_id);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.search) {
    query = query.or(`drawing_number.ilike.%${filters.search}%,title.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return [];
  }

  return (data || []) as unknown as DrawingWithDetails[];
}

export async function getDrawingById(id: string): Promise<DrawingWithDetails | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('drawings')
    .select(`
      *,
      category:drawing_categories(*),
      project:projects(id, name),
      job_order:job_orders(id, jo_number),
      drafted_by_employee:employees!drawings_drafted_by_fkey(id, full_name),
      checked_by_employee:employees!drawings_checked_by_fkey(id, full_name),
      approved_by_employee:employees!drawings_approved_by_fkey(id, full_name),
      issued_by_employee:employees!drawings_issued_by_fkey(id, full_name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    return null;
  }

  return data as unknown as DrawingWithDetails;
}

export async function createDrawing(input: DrawingFormInput): Promise<ActionResult<Drawing>> {
  const validation = validateDrawingInput(input);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(', ') };
  }

  const supabase = await createClient();

  // Get category for prefix
  const { data: category } = await supabase
    .from('drawing_categories')
    .select('numbering_prefix')
    .eq('id', input.category_id)
    .single();

  if (!category) {
    return { success: false, error: 'Invalid category' };
  }

  // Generate drawing number using database function
  const { data: numberResult } = await supabase
    .rpc('generate_drawing_number', { prefix: category.numbering_prefix || 'DRW' });

  const drawingNumber = numberResult || `DRW-${Date.now()}`;

  // Get current user and profile
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Anda harus login terlebih dahulu' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    return { success: false, error: 'Profil pengguna tidak ditemukan. Coba logout dan login kembali.' };
  }

  const { data, error } = await supabase
    .from('drawings')
    .insert({
      drawing_number: drawingNumber,
      category_id: input.category_id,
      project_id: input.project_id || null,
      job_order_id: input.job_order_id || null,
      assessment_id: input.assessment_id || null,
      route_survey_id: input.route_survey_id || null,
      jmp_id: input.jmp_id || null,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      scale: input.scale?.trim() || null,
      paper_size: input.paper_size || 'A1',
      status: 'draft',
      current_revision: 'A',
      revision_count: 1,
      created_by: profile.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Drawing insert error:', error);
    return { success: false, error: `Gagal membuat gambar: ${error.message}` };
  }

  // Create initial revision
  const { error: revisionError } = await supabase.from('drawing_revisions').insert({
    drawing_id: data.id,
    revision_number: 'A',
    change_description: 'Initial issue',
    change_reason: 'initial',
    is_current: true,
  });

  if (revisionError) {
    console.error('Drawing revision insert error:', revisionError);
    // Drawing was created but revision failed — still return success with warning
  }

  revalidatePath('/engineering/drawings');
  return { success: true, data: data as unknown as Drawing };
}

export async function updateDrawing(
  id: string,
  input: Partial<DrawingFormInput>
): Promise<ActionResult<Drawing>> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (input.title !== undefined) updateData.title = input.title.trim();
  if (input.description !== undefined) updateData.description = input.description?.trim() || null;
  if (input.scale !== undefined) updateData.scale = input.scale?.trim() || null;
  if (input.paper_size !== undefined) updateData.paper_size = input.paper_size;
  if (input.project_id !== undefined) updateData.project_id = input.project_id || null;
  if (input.job_order_id !== undefined) updateData.job_order_id = input.job_order_id || null;

  const { data, error } = await supabase
    .from('drawings')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Drawing update error:', error);
    return { success: false, error: `Gagal memperbarui gambar: ${error.message}` };
  }

  revalidatePath('/engineering/drawings');
  revalidatePath(`/engineering/drawings/${id}`);
  return { success: true, data: data as unknown as Drawing };
}

export async function deleteDrawing(id: string): Promise<ActionResult<void>> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('drawings')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Drawing delete error:', error);
    return { success: false, error: `Gagal menghapus gambar: ${error.message}` };
  }

  revalidatePath('/engineering/drawings');
  return { success: true };
}

// ============ Revision Management ============

export async function getDrawingRevisions(drawingId: string): Promise<DrawingRevisionWithDetails[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('drawing_revisions')
    .select(`
      *,
      drafted_by_employee:employees!drawing_revisions_drafted_by_fkey(id, full_name),
      checked_by_employee:employees!drawing_revisions_checked_by_fkey(id, full_name),
      approved_by_employee:employees!drawing_revisions_approved_by_fkey(id, full_name)
    `)
    .eq('drawing_id', drawingId)
    .order('created_at', { ascending: false });

  if (error) {
    return [];
  }

  return (data || []) as DrawingRevisionWithDetails[];
}

export async function createRevision(
  drawingId: string,
  input: RevisionFormInput
): Promise<ActionResult<DrawingRevision>> {
  const validation = validateRevisionInput(input);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(', ') };
  }

  const supabase = await createClient();

  // Get current drawing
  const { data: drawing } = await supabase
    .from('drawings')
    .select('current_revision, revision_count')
    .eq('id', drawingId)
    .single();

  if (!drawing) {
    return { success: false, error: 'Drawing not found' };
  }

  const newRevision = getNextRevision(drawing.current_revision || 'A');

  // Archive previous revision (set is_current = false)
  await supabase
    .from('drawing_revisions')
    .update({ is_current: false })
    .eq('drawing_id', drawingId)
    .eq('is_current', true);

  // Create new revision
  const { data: revision, error: revError } = await supabase
    .from('drawing_revisions')
    .insert({
      drawing_id: drawingId,
      revision_number: newRevision,
      change_description: input.change_description.trim(),
      change_reason: input.change_reason || null,
      is_current: true,
    })
    .select()
    .single();

  if (revError) {
    console.error('Revision create error:', revError);
    return { success: false, error: `Gagal membuat revisi: ${revError.message}` };
  }

  // Update drawing
  await supabase
    .from('drawings')
    .update({
      current_revision: newRevision,
      revision_count: (drawing.revision_count || 0) + 1,
      status: 'draft', // Reset to draft on new revision
    })
    .eq('id', drawingId);

  revalidatePath(`/engineering/drawings/${drawingId}`);
  return { success: true, data: revision as unknown as DrawingRevision };
}

// ============ Workflow Actions ============

export async function submitForReview(drawingId: string): Promise<ActionResult<Drawing>> {
  return updateDrawingStatus(drawingId, 'for_review', 'drafted');
}

export async function submitForApproval(drawingId: string): Promise<ActionResult<Drawing>> {
  return updateDrawingStatus(drawingId, 'for_approval', 'checked');
}

export async function approveDrawing(drawingId: string): Promise<ActionResult<Drawing>> {
  return updateDrawingStatus(drawingId, 'approved', 'approved');
}

export async function issueDrawing(drawingId: string): Promise<ActionResult<Drawing>> {
  const supabase = await createClient();

  // Check if drawing has file
  const { data: drawing } = await supabase
    .from('drawings')
    .select('file_url, status')
    .eq('id', drawingId)
    .single();

  if (!drawing?.file_url) {
    return { success: false, error: 'Please upload a drawing file before issuing' };
  }

  return updateDrawingStatus(drawingId, 'issued', 'issued');
}

export async function supersedeDrawing(drawingId: string): Promise<ActionResult<Drawing>> {
  return updateDrawingStatus(drawingId, 'superseded', null);
}

async function updateDrawingStatus(
  drawingId: string,
  newStatus: DrawingStatus,
  timestampField: 'drafted' | 'checked' | 'approved' | 'issued' | null
): Promise<ActionResult<Drawing>> {
  const supabase = await createClient();

  // Get current drawing status
  const { data: drawing } = await supabase
    .from('drawings')
    .select('status')
    .eq('id', drawingId)
    .single();

  if (!drawing) {
    return { success: false, error: 'Drawing not found' };
  }

  // Validate transition
  if (!isValidStatusTransition(drawing.status as DrawingStatus, newStatus)) {
    return {
      success: false,
      error: `Cannot transition from ${drawing.status} to ${newStatus}`,
    };
  }

  // Get current user's employee ID
  const { data: { user } } = await supabase.auth.getUser();
  let employeeId: string | null = null;

  if (user && timestampField) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profile) {
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', profile.id)
        .single();
      employeeId = employee?.id || null;
    }
  }

  const updateData: Record<string, unknown> = { status: newStatus };
  
  if (timestampField && employeeId) {
    updateData[`${timestampField}_by`] = employeeId;
    updateData[`${timestampField}_at`] = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('drawings')
    .update(updateData)
    .eq('id', drawingId)
    .select()
    .single();

  if (error) {
    console.error('Drawing status update error:', error);
    return { success: false, error: `Gagal memperbarui status gambar: ${error.message}` };
  }

  revalidatePath('/engineering/drawings');
  revalidatePath(`/engineering/drawings/${drawingId}`);
  return { success: true, data: data as unknown as Drawing };
}

// ============ Transmittals ============

export async function getTransmittals(projectId?: string): Promise<DrawingTransmittalWithDetails[]> {
  const supabase = await createClient();

  let query = supabase
    .from('drawing_transmittals')
    .select(`
      *,
      project:projects(id, name),
      job_order:job_orders(id, jo_number)
    `)
    .order('created_at', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;

  if (error) {
    return [];
  }

  return (data || []) as unknown as DrawingTransmittalWithDetails[];
}

export async function getTransmittalById(id: string): Promise<DrawingTransmittalWithDetails | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('drawing_transmittals')
    .select(`
      *,
      project:projects(id, name),
      job_order:job_orders(id, jo_number)
    `)
    .eq('id', id)
    .single();

  if (error) {
    return null;
  }

  return data as unknown as DrawingTransmittalWithDetails;
}

export async function createTransmittal(
  input: TransmittalFormInput
): Promise<ActionResult<DrawingTransmittal>> {
  const validation = validateTransmittalInput(input);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(', ') };
  }

  const supabase = await createClient();

  // Generate transmittal number
  const { data: numberResult } = await supabase.rpc('generate_transmittal_number');
  const transmittalNumber = numberResult || `TR-${Date.now()}`;

  const { data, error } = await supabase
    .from('drawing_transmittals')
    .insert({
      transmittal_number: transmittalNumber,
      recipient_company: input.recipient_company.trim(),
      recipient_name: input.recipient_name?.trim() || null,
      recipient_email: input.recipient_email?.trim() || null,
      purpose: input.purpose,
      project_id: input.project_id || null,
      job_order_id: input.job_order_id || null,
      drawings: input.drawings as unknown as Json,
      cover_letter: input.cover_letter?.trim() || null,
      notes: input.notes?.trim() || null,
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    console.error('Transmittal create error:', error);
    return { success: false, error: `Gagal membuat transmittal: ${error.message}` };
  }

  revalidatePath('/engineering/drawings/transmittals');
  return { success: true, data: data as unknown as DrawingTransmittal };
}

export async function sendTransmittal(id: string): Promise<ActionResult<DrawingTransmittal>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get user profile (for FK references to user_profiles)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user?.id || '')
    .single();

  const { data, error } = await supabase
    .from('drawing_transmittals')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_by: profile?.id || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Transmittal send error:', error);
    return { success: false, error: `Gagal mengirim transmittal: ${error.message}` };
  }

  revalidatePath('/engineering/drawings/transmittals');
  revalidatePath(`/engineering/drawings/transmittals/${id}`);
  return { success: true, data: data as unknown as DrawingTransmittal };
}

export async function acknowledgeTransmittal(id: string): Promise<ActionResult<DrawingTransmittal>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('drawing_transmittals')
    .update({
      status: 'acknowledged',
      acknowledged_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Transmittal acknowledge error:', error);
    return { success: false, error: `Gagal mengonfirmasi transmittal: ${error.message}` };
  }

  revalidatePath('/engineering/drawings/transmittals');
  revalidatePath(`/engineering/drawings/transmittals/${id}`);
  return { success: true, data: data as unknown as DrawingTransmittal };
}
