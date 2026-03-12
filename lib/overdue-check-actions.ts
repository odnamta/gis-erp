// =====================================================
// v0.70: OVERDUE INVOICE CHECK SERVER ACTIONS
// =====================================================
'use server';

import { createClient } from '@/lib/supabase/server';
import {
  OverdueInvoice,
  OverdueCheckResult,
  OverdueStatusUpdateResult,
} from '@/types/overdue-check';
import {
  filterOverdueInvoices,
  groupOverdueInvoices,
  prepareOverdueStatusUpdate,
  canUpdateToOverdue,
  createFollowUpTaskInput,
  getFollowUpPriority,
  generateFollowUpDescription,
  generateOverdueSummary,
  hasCriticalOverdue,
} from '@/lib/overdue-check-utils';

// =====================================================
// DATABASE OPERATIONS
// =====================================================

/**
 * Fetches all invoices that are potentially overdue from the database.
 * Returns invoices with status 'sent' or 'partial' that have a due date.
 */
export async function getOverdueInvoices(): Promise<{
  success: boolean;
  data?: OverdueInvoice[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        customer_id,
        total_amount,
        due_date,
        status,
        jo_id,
        customers!inner (
          name
        )
      `)
      .in('status', ['sent', 'partial'])
      .not('due_date', 'is', null);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Transform to the format expected by filterOverdueInvoices
    const invoicesWithCustomerName = (invoices || []).map(inv => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      customer_id: inv.customer_id,
      grand_total: inv.total_amount,
      due_date: inv.due_date,
      status: inv.status,
      jo_id: inv.jo_id,
      customer_name: (inv.customers as { name: string })?.name || 'Unknown',
    }));
    
    const overdueInvoices = filterOverdueInvoices(invoicesWithCustomerName);
    
    return { success: true, data: overdueInvoices };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Updates an invoice status to 'overdue'.
 * @param invoiceId - The ID of the invoice to update
 */
export async function updateInvoiceToOverdue(
  invoiceId: string
): Promise<OverdueStatusUpdateResult> {
  try {
    const supabase = await createClient();
    
    // First, get the current invoice status
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('status')
      .eq('id', invoiceId)
      .single();
    
    if (fetchError || !invoice) {
      return {
        success: false,
        invoice_id: invoiceId,
        previous_status: 'unknown',
        new_status: 'overdue',
        updated_at: new Date().toISOString(),
      };
    }
    
    // Check if the invoice can be updated to overdue
    if (!canUpdateToOverdue(invoice.status)) {
      return {
        success: false,
        invoice_id: invoiceId,
        previous_status: invoice.status,
        new_status: invoice.status,
        updated_at: new Date().toISOString(),
      };
    }
    
    // Update the invoice status
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ status: 'overdue' })
      .eq('id', invoiceId);
    
    if (updateError) {
      return {
        success: false,
        invoice_id: invoiceId,
        previous_status: invoice.status,
        new_status: invoice.status,
        updated_at: new Date().toISOString(),
      };
    }
    
    return prepareOverdueStatusUpdate(invoiceId, invoice.status);
  } catch (_error) {
    return {
      success: false,
      invoice_id: invoiceId,
      previous_status: 'unknown',
      new_status: 'overdue',
      updated_at: new Date().toISOString(),
    };
  }
}

/**
 * Creates a follow-up task for an overdue invoice.
 * @param invoice - The overdue invoice
 */
export async function createFollowUpTask(
  invoice: OverdueInvoice
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    
    const _taskInput = createFollowUpTaskInput(invoice);
    const priority = getFollowUpPriority(invoice.severity);
    const description = generateFollowUpDescription(invoice);
    
    // Get finance manager users to notify
    const { data: financeUsers } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'finance')
      .limit(1);
    
    const userId = financeUsers?.[0]?.id;
    
    if (!userId) {
      // No finance user found, log and return success
      return { success: true };
    }
    
    // Create a notification for the finance user
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        type: 'INVOICE_OVERDUE',
        title: `Overdue Invoice: ${invoice.invoice_number}`,
        message: description,
        user_id: userId,
        entity_type: 'invoice',
        entity_id: invoice.id,
        priority: priority,
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          customer_name: invoice.customer_name,
          amount: invoice.amount,
          days_overdue: invoice.days_overdue,
          severity: invoice.severity,
        },
        is_read: false,
      })
      .select('id')
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, taskId: notification?.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Runs the complete overdue invoice check process.
 * 1. Fetches all potentially overdue invoices
 * 2. Groups them by severity
 * 3. Updates invoice statuses to 'overdue'
 * 4. Creates follow-up tasks for critical invoices
 * 5. Returns a summary
 */
export async function runOverdueCheck(): Promise<{
  success: boolean;
  result?: OverdueCheckResult;
  summary?: ReturnType<typeof generateOverdueSummary>;
  updatedCount?: number;
  followUpTasksCreated?: number;
  error?: string;
}> {
  try {
    // Step 1: Get overdue invoices
    const { success: fetchSuccess, data: overdueInvoices, error: fetchError } = await getOverdueInvoices();
    
    if (!fetchSuccess || !overdueInvoices) {
      return { success: false, error: fetchError || 'Failed to fetch overdue invoices' };
    }
    
    // Step 2: Group by severity
    const result = groupOverdueInvoices(overdueInvoices);
    const summary = generateOverdueSummary(result);
    
    // Step 3: Update invoice statuses
    let updatedCount = 0;
    for (const invoice of overdueInvoices) {
      const updateResult = await updateInvoiceToOverdue(invoice.id);
      if (updateResult.success) {
        updatedCount++;
      }
    }
    
    // Step 4: Create follow-up tasks for critical invoices
    let followUpTasksCreated = 0;
    if (hasCriticalOverdue(result)) {
      for (const invoice of result.critical) {
        const taskResult = await createFollowUpTask(invoice);
        if (taskResult.success) {
          followUpTasksCreated++;
        }
      }
    }
    
    return {
      success: true,
      result,
      summary,
      updatedCount,
      followUpTasksCreated,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sends a daily summary email for overdue invoices.
 * @param result - The overdue check result
 */
export async function sendOverdueSummaryEmail(
  result: OverdueCheckResult
): Promise<{ success: boolean; error?: string }> {
  try {
    // This would integrate with the notification system
    // For now, we'll just log the summary
    const _summary = generateOverdueSummary(result);
    
    // TODO: Integrate with email notification system
    // await sendNotification({
    //   template_code: 'DAILY_OVERDUE_SUMMARY',
    //   recipient_role: 'finance_manager',
    //   data: summary,
    // });
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
