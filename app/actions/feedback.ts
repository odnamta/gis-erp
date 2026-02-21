'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  FeedbackFormData,
  FeedbackSubmission,
  FeedbackActionResult,
  BrowserInfo,
  Screenshot,
  FeedbackListItem,
  FeedbackSummary,
  FeedbackFilters,
  PaginatedFeedback,
  FeedbackComment,
  FeedbackStatus,
  Severity,
} from '@/types/feedback';
import { validateFeedbackForm } from '@/lib/feedback-utils';
import { getUserProfile } from '@/lib/permissions-server';
import {
  notifyNewFeedback,
  notifyFeedbackStatusChange,
  notifyFeedbackComment,
  notifyFeedbackAssignment,
} from '@/lib/notifications/feedback-notifications';

/**
 * Submit a new feedback (bug report, improvement request, or question)
 */
export async function submitFeedback(
  formData: FeedbackFormData,
  context: {
    pageUrl: string;
    pageTitle: string;
    module: string;
    browserInfo: BrowserInfo;
  }
): Promise<FeedbackActionResult<{ ticketNumber: string; id: string }>> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'You must be logged in to submit feedback' };
    }

    // Get user profile for name/role and FK reference
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, role, department_scope')
      .eq('user_id', user.id)
      .single();

    // Validate form data
    const validation = validateFeedbackForm(formData);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    // Upload screenshots if any
    const screenshots: Screenshot[] = [];
    for (const screenshot of formData.screenshots) {
      const result = await uploadScreenshot(screenshot.dataUrl, user.id);
      if (result.success && result.data) {
        screenshots.push(result.data);
      }
    }

    // Insert feedback submission
    const { data, error } = await supabase
      .from('feedback_submissions' as any)
      .insert({
        feedback_type: formData.feedbackType,
        submitted_by: profile?.id || null,
        submitted_by_name: profile?.full_name || user.email,
        submitted_by_email: user.email,
        submitted_by_role: profile?.role || null,
        submitted_by_department: profile?.department_scope?.[0] || null,
        severity: formData.severity || null,
        title: formData.title.trim(),
        description: formData.description.trim(),
        steps_to_reproduce: formData.stepsToReproduce?.trim() || null,
        expected_behavior: formData.expectedBehavior?.trim() || null,
        actual_behavior: formData.actualBehavior?.trim() || null,
        current_behavior: formData.currentBehavior?.trim() || null,
        desired_behavior: formData.desiredBehavior?.trim() || null,
        business_justification: formData.businessJustification?.trim() || null,
        page_url: context.pageUrl,
        page_title: context.pageTitle,
        module: context.module,
        browser_info: context.browserInfo,
        screen_resolution: context.browserInfo.screenResolution,
        screenshots: screenshots,
        affected_module: formData.affectedModule || context.module,
        priority_suggested: formData.prioritySuggested || null,
        status: 'new',
      })
      .select('id, ticket_number')
      .single();

    if (error) {
      console.error('Error submitting feedback:', error);
      return { success: false, error: 'Failed to submit feedback' };
    }

    // Cast data to access properties
    const result = data as any;

    // Send notification to admins
    await notifyNewFeedback(
      result.ticket_number,
      formData.feedbackType,
      formData.title,
      formData.severity || null,
      profile?.full_name || user.email || 'Unknown User'
    );

    revalidatePath('/feedback');
    revalidatePath('/admin/feedback');

    return {
      success: true,
      data: { ticketNumber: result.ticket_number, id: result.id },
    };
  } catch (err) {
    console.error('Unexpected error submitting feedback:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Upload a screenshot to Supabase storage
 */
export async function uploadScreenshot(
  dataUrl: string,
  userId: string
): Promise<FeedbackActionResult<Screenshot>> {
  try {
    const supabase = await createClient();

    // Check basic auth
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: 'Unauthorized' };
    }

    // Convert data URL to blob
    const base64Data = dataUrl.split(',')[1];
    const mimeType = dataUrl.split(';')[0].split(':')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    // Generate unique filename
    const ext = mimeType.split('/')[1] || 'png';
    const filename = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('feedback')
      .upload(filename, byteArray, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading screenshot:', uploadError);
      return { success: false, error: 'Failed to upload screenshot' };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('feedback')
      .getPublicUrl(filename);

    return {
      success: true,
      data: {
        url: urlData.publicUrl,
        filename,
        uploaded_at: new Date().toISOString(),
      },
    };
  } catch (err) {
    console.error('Unexpected error uploading screenshot:', err);
    return { success: false, error: 'Failed to upload screenshot' };
  }
}

/**
 * Get current user's feedback submissions
 */
export async function getMySubmissions(): Promise<FeedbackActionResult<FeedbackListItem[]>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'You must be logged in' };
    }

    // submitted_by references user_profiles.id, not auth UUID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return { success: false, error: 'User profile not found' };
    }

    const { data, error } = await supabase
      .from('feedback_with_comments' as any)
      .select('*')
      .eq('submitted_by', profile.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching submissions:', error);
      return { success: false, error: 'Failed to fetch submissions' };
    }

    return { success: true, data: data as unknown as FeedbackListItem[] };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get count of user's open tickets (for badge display)
 */
export async function getMyOpenTicketCount(): Promise<FeedbackActionResult<number>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: true, data: 0 };
    }

    const { count, error } = await supabase
      .from('feedback_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('submitted_by', user.id)
      .not('status', 'in', '("resolved","closed","wont_fix")');

    if (error) {
      console.error('Error fetching open ticket count:', error);
      return { success: true, data: 0 };
    }

    return { success: true, data: count || 0 };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: true, data: 0 };
  }
}


/**
 * Get all feedback with filters (admin only)
 */
export async function getAllFeedback(
  filters: FeedbackFilters = {},
  page = 1,
  pageSize = 20
): Promise<FeedbackActionResult<PaginatedFeedback>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'You must be logged in' };
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['owner', 'director', 'sysadmin'].includes(profile.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    // Build query
    let query = supabase
      .from('feedback_with_comments' as any)
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.type) {
      query = query.eq('feedback_type', filters.type);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }
    if (filters.module) {
      query = query.or(`module.eq.${filters.module},affected_module.eq.${filters.module}`);
    }
    if (filters.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,ticket_number.ilike.%${filters.search}%`);
    }
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching feedback:', error);
      return { success: false, error: 'Failed to fetch feedback' };
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      success: true,
      data: {
        items: data as unknown as FeedbackListItem[],
        total,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get feedback summary statistics (admin only)
 */
export async function getFeedbackSummary(): Promise<FeedbackActionResult<FeedbackSummary>> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'You must be logged in' };
    }

    // Check admin role
    const profile = await getUserProfile();
    if (!profile || !['owner', 'director', 'sysadmin'].includes(profile.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get counts in parallel
    const [newResult, criticalResult, openBugsResult, openRequestsResult, resolvedResult] = await Promise.all([
      supabase
        .from('feedback_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new'),
      supabase
        .from('feedback_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'critical')
        .not('status', 'in', '("resolved","closed","wont_fix")'),
      supabase
        .from('feedback_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('feedback_type', 'bug')
        .not('status', 'in', '("resolved","closed","wont_fix")'),
      supabase
        .from('feedback_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('feedback_type', 'improvement')
        .not('status', 'in', '("resolved","closed","wont_fix")'),
      supabase
        .from('feedback_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolved')
        .gte('resolved_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    return {
      success: true,
      data: {
        newCount: newResult.count || 0,
        criticalCount: criticalResult.count || 0,
        openBugsCount: openBugsResult.count || 0,
        openRequestsCount: openRequestsResult.count || 0,
        resolvedThisWeekCount: resolvedResult.count || 0,
      },
    };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Update feedback status (admin only)
 */
export async function updateFeedbackStatus(
  feedbackId: string,
  newStatus: FeedbackStatus,
  notes?: string
): Promise<FeedbackActionResult> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'You must be logged in' };
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, role, full_name')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['owner', 'director', 'sysadmin'].includes(profile.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get current feedback for notification
    const { data: currentFeedback } = await supabase
      .from('feedback_submissions')
      .select('status, ticket_number, submitted_by')
      .eq('id', feedbackId)
      .single();

    const oldStatus = currentFeedback?.status as FeedbackStatus;

    // Update status
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Set resolution fields if resolving
    if (['resolved', 'closed', 'wont_fix'].includes(newStatus)) {
      updateData.resolved_at = new Date().toISOString();
      updateData.resolved_by = profile?.id || null;
      if (notes) {
        updateData.resolution_notes = notes;
      }
    }

    const { error } = await supabase
      .from('feedback_submissions')
      .update(updateData)
      .eq('id', feedbackId);

    if (error) {
      console.error('Error updating status:', error);
      return { success: false, error: 'Failed to update status' };
    }

    // Send notification to submitter
    if (currentFeedback?.submitted_by && oldStatus !== newStatus) {
      await notifyFeedbackStatusChange(
        feedbackId,
        currentFeedback.ticket_number,
        currentFeedback.submitted_by,
        oldStatus,
        newStatus,
        notes
      );
    }

    revalidatePath('/feedback');
    revalidatePath('/admin/feedback');

    return { success: true };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Assign feedback to a user (admin only)
 */
export async function assignFeedback(
  feedbackId: string,
  assigneeId: string | null
): Promise<FeedbackActionResult> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'You must be logged in' };
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['owner', 'director', 'sysadmin'].includes(profile.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get feedback info for notification
    const { data: feedback } = await supabase
      .from('feedback_submissions')
      .select('ticket_number, title, severity')
      .eq('id', feedbackId)
      .single();

    const { error } = await supabase
      .from('feedback_submissions')
      .update({
        assigned_to: assigneeId,
        assigned_at: assigneeId ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', feedbackId);

    if (error) {
      console.error('Error assigning feedback:', error);
      return { success: false, error: 'Failed to assign feedback' };
    }

    // Send notification to assignee
    if (assigneeId && feedback) {
      await notifyFeedbackAssignment(
        feedbackId,
        feedback.ticket_number,
        feedback.title,
        assigneeId,
        feedback.severity as Severity | null
      );
    }

    revalidatePath('/admin/feedback');

    return { success: true };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Mark feedback as duplicate
 */
export async function markAsDuplicate(
  feedbackId: string,
  duplicateOfId: string
): Promise<FeedbackActionResult> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'You must be logged in' };
    }

    // Check admin role
    const profile = await getUserProfile();
    if (!profile || !['owner', 'director', 'sysadmin'].includes(profile.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('feedback_submissions')
      .update({
        status: 'duplicate',
        duplicate_of: duplicateOfId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', feedbackId);

    if (error) {
      console.error('Error marking as duplicate:', error);
      return { success: false, error: 'Failed to mark as duplicate' };
    }

    revalidatePath('/admin/feedback');

    return { success: true };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Add a comment to feedback
 */
export async function addFeedbackComment(
  feedbackId: string,
  commentText: string,
  isInternal = false
): Promise<FeedbackActionResult<FeedbackComment>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'You must be logged in' };
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, full_name, role')
      .eq('user_id', user.id)
      .single();

    // Only admins can post internal comments
    if (isInternal && (!profile || !['owner', 'director', 'sysadmin'].includes(profile.role))) {
      return { success: false, error: 'Only admins can post internal comments' };
    }

    const { data, error } = await supabase
      .from('feedback_comments')
      .insert({
        feedback_id: feedbackId,
        comment_by: profile?.id || null,
        comment_by_name: profile?.full_name || user.email,
        comment_text: commentText.trim(),
        is_internal: isInternal,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding comment:', error);
      return { success: false, error: 'Failed to add comment' };
    }

    // Get feedback info for notification
    const { data: feedback } = await supabase
      .from('feedback_submissions')
      .select('ticket_number, submitted_by')
      .eq('id', feedbackId)
      .single();

    // Notify submitter if comment is from admin (and not internal)
    if (feedback?.submitted_by && feedback.submitted_by !== profile?.id && !isInternal) {
      await notifyFeedbackComment(
        feedbackId,
        feedback.ticket_number,
        feedback.submitted_by,
        profile?.full_name || user.email || 'Someone',
        isInternal
      );
    }

    revalidatePath('/feedback');
    revalidatePath('/admin/feedback');

    return { success: true, data: data as FeedbackComment };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get comments for a feedback submission
 */
export async function getFeedbackComments(
  feedbackId: string
): Promise<FeedbackActionResult<FeedbackComment[]>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'You must be logged in' };
    }

    // Check if user is admin (can see internal comments)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isAdmin = profile && ['owner', 'director', 'sysadmin'].includes(profile.role);

    let query = supabase
      .from('feedback_comments')
      .select('*')
      .eq('feedback_id', feedbackId)
      .order('created_at', { ascending: true });

    // Non-admins can't see internal comments
    if (!isAdmin) {
      query = query.eq('is_internal', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching comments:', error);
      return { success: false, error: 'Failed to fetch comments' };
    }

    return { success: true, data: data as FeedbackComment[] };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get a single feedback submission by ID
 */
export async function getFeedbackById(
  feedbackId: string
): Promise<FeedbackActionResult<FeedbackSubmission>> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'You must be logged in' };
    }

    const { data, error } = await supabase
      .from('feedback_submissions')
      .select('*')
      .eq('id', feedbackId)
      .single();

    if (error) {
      console.error('Error fetching feedback:', error);
      return { success: false, error: 'Failed to fetch feedback' };
    }

    // Check access - user can see own submissions, admins can see all
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isAdmin = profile && ['owner', 'director', 'sysadmin'].includes(profile.role);
    
    if (data.submitted_by !== user.id && !isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    return { success: true, data: data as unknown as FeedbackSubmission };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get feedback status history
 */
export async function getFeedbackHistory(
  feedbackId: string
): Promise<FeedbackActionResult<Array<{
  id: string;
  old_status: FeedbackStatus | null;
  new_status: FeedbackStatus;
  changed_by_name: string | null;
  changed_at: string;
  notes: string | null;
}>>> {
  try {
    const supabase = await createClient();

    // Check admin role
    const profile = await getUserProfile();
    if (!profile || !['owner', 'director', 'sysadmin'].includes(profile.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data, error } = await supabase
      .from('feedback_status_history')
      .select('id, old_status, new_status, changed_by_name, changed_at, notes')
      .eq('feedback_id', feedbackId)
      .order('changed_at', { ascending: true });

    if (error) {
      console.error('Error fetching history:', error);
      return { success: false, error: 'Failed to fetch history' };
    }

    return { success: true, data: data as unknown as Array<{
      id: string;
      old_status: FeedbackStatus | null;
      new_status: FeedbackStatus;
      changed_by_name: string | null;
      changed_at: string;
      notes: string | null;
    }> };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
