import {
  createBulkNotifications,
  createNotification,
  getUsersByPermission,
  getUsersByRoles,
} from './notification-service'
import { NotificationPriority } from '@/types/notifications'

// Types for trigger parameters
interface PjoData {
  id: string
  pjo_number: string
  customer_name?: string
  total_revenue?: number
  created_by?: string
}

interface CostItemData {
  id: string
  pjo_id: string
  category: string
  estimated_amount: number
  actual_amount: number
  variance_pct: number
}

interface InvoiceData {
  id: string
  invoice_number: string
  customer_name?: string
  total_amount: number
  created_by?: string
}

interface JobOrderData {
  id: string
  jo_number: string
  customer_name?: string
  status: string
}

interface UserActivityData {
  id: string
  email: string
  full_name?: string
  role?: string
  previousRole?: string
}

/**
 * Notify users when a PJO requires approval
 * Recipients: Users with can_approve_pjo permission
 */
export async function notifyPjoApprovalRequired(pjo: PjoData): Promise<void> {
  const approvers = await getUsersByPermission('can_approve_pjo')

  if (approvers.length === 0) return

  const amount = pjo.total_revenue
    ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
        pjo.total_revenue
      )
    : 'N/A'

  await createBulkNotifications(
    {
      title: 'PJO Pending Approval',
      message: `${pjo.pjo_number} from ${pjo.customer_name || 'Unknown'} (${amount}) requires your approval`,
      type: 'approval',
      priority: 'high',
      entityType: 'pjo',
      entityId: pjo.id,
      actionUrl: `/proforma-jo/${pjo.id}`,
      metadata: {
        pjo_number: pjo.pjo_number,
        customer_name: pjo.customer_name,
        total_revenue: pjo.total_revenue,
      },
    },
    { userIds: approvers.map((u) => u.id) }
  )
}

/**
 * Notify PJO creator when their PJO is approved or rejected
 * Recipients: PJO creator
 */
export async function notifyPjoDecision(
  pjo: PjoData,
  decision: 'approved' | 'rejected',
  reason?: string
): Promise<void> {
  if (!pjo.created_by) return

  const title = decision === 'approved' ? 'PJO Approved' : 'PJO Rejected'
  const message =
    decision === 'approved'
      ? `Your PJO ${pjo.pjo_number} has been approved`
      : `Your PJO ${pjo.pjo_number} has been rejected${reason ? `: ${reason}` : ''}`

  await createNotification({
    userId: pjo.created_by,
    title,
    message,
    type: 'status_change',
    priority: decision === 'rejected' ? 'high' : 'normal',
    entityType: 'pjo',
    entityId: pjo.id,
    actionUrl: `/proforma-jo/${pjo.id}`,
    metadata: {
      pjo_number: pjo.pjo_number,
      decision,
      reason,
    },
  })
}

/**
 * Notify when a cost item exceeds budget by more than 10%
 * Recipients: Owner, Manager, Finance roles
 */
export async function notifyBudgetExceeded(
  costItem: CostItemData,
  pjo: PjoData
): Promise<void> {
  // Only notify if variance exceeds 10%
  if (costItem.variance_pct <= 10) return

  const users = await getUsersByRoles(['owner', 'manager', 'finance'])
  if (users.length === 0) return

  // Set priority based on variance
  const priority: NotificationPriority = costItem.variance_pct > 25 ? 'urgent' : 'high'

  await createBulkNotifications(
    {
      title: 'Budget Exceeded',
      message: `${pjo.pjo_number} ${costItem.category} cost exceeded budget by ${costItem.variance_pct.toFixed(1)}%`,
      type: 'budget_alert',
      priority,
      entityType: 'cost_item',
      entityId: costItem.id,
      actionUrl: `/proforma-jo/${costItem.pjo_id}`,
      metadata: {
        pjo_number: pjo.pjo_number,
        category: costItem.category,
        estimated_amount: costItem.estimated_amount,
        actual_amount: costItem.actual_amount,
        variance_pct: costItem.variance_pct,
      },
    },
    { userIds: users.map((u) => u.id) }
  )
}

/**
 * Notify on invoice status changes
 * - 'sent': Notify creator
 * - 'paid': Notify finance and manager
 * - 'overdue': Notify finance, manager, and owner
 */
export async function notifyInvoiceStatusChange(
  invoice: InvoiceData,
  newStatus: 'sent' | 'paid' | 'overdue'
): Promise<void> {
  const amount = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
  }).format(invoice.total_amount)

  if (newStatus === 'sent' && invoice.created_by) {
    await createNotification({
      userId: invoice.created_by,
      title: 'Invoice Sent',
      message: `${invoice.invoice_number} (${amount}) sent to ${invoice.customer_name || 'customer'}`,
      type: 'status_change',
      priority: 'normal',
      entityType: 'invoice',
      entityId: invoice.id,
      actionUrl: `/invoices/${invoice.id}`,
      metadata: {
        invoice_number: invoice.invoice_number,
        customer_name: invoice.customer_name,
        total_amount: invoice.total_amount,
        status: newStatus,
      },
    })
  } else if (newStatus === 'paid') {
    const users = await getUsersByRoles(['finance', 'manager'])
    if (users.length > 0) {
      await createBulkNotifications(
        {
          title: 'Invoice Paid',
          message: `${invoice.invoice_number} (${amount}) from ${invoice.customer_name || 'customer'} has been paid`,
          type: 'status_change',
          priority: 'normal',
          entityType: 'invoice',
          entityId: invoice.id,
          actionUrl: `/invoices/${invoice.id}`,
          metadata: {
            invoice_number: invoice.invoice_number,
            customer_name: invoice.customer_name,
            total_amount: invoice.total_amount,
            status: newStatus,
          },
        },
        { userIds: users.map((u) => u.id) }
      )
    }
  } else if (newStatus === 'overdue') {
    const users = await getUsersByRoles(['finance', 'manager', 'owner'])
    if (users.length > 0) {
      await createBulkNotifications(
        {
          title: 'Invoice Overdue',
          message: `${invoice.invoice_number} (${amount}) from ${invoice.customer_name || 'customer'} is now overdue`,
          type: 'overdue',
          priority: 'high',
          entityType: 'invoice',
          entityId: invoice.id,
          actionUrl: `/invoices/${invoice.id}`,
          metadata: {
            invoice_number: invoice.invoice_number,
            customer_name: invoice.customer_name,
            total_amount: invoice.total_amount,
            status: newStatus,
          },
        },
        { userIds: users.map((u) => u.id) }
      )
    }
  }
}

/**
 * Notify ops users when a new JO is created
 */
export async function notifyJoCreated(jo: JobOrderData): Promise<void> {
  const users = await getUsersByRoles(['ops'])
  if (users.length === 0) return

  await createBulkNotifications(
    {
      title: 'New Job Order',
      message: `${jo.jo_number} for ${jo.customer_name || 'customer'} has been created`,
      type: 'status_change',
      priority: 'normal',
      entityType: 'jo',
      entityId: jo.id,
      actionUrl: `/job-orders/${jo.id}`,
      metadata: {
        jo_number: jo.jo_number,
        customer_name: jo.customer_name,
      },
    },
    { userIds: users.map((u) => u.id) }
  )
}

/**
 * Notify on JO status changes
 * - 'completed': Notify admin and finance
 * - 'submitted_to_finance': Notify finance
 */
export async function notifyJoStatusChange(
  jo: JobOrderData,
  newStatus: 'completed' | 'submitted_to_finance'
): Promise<void> {
  if (newStatus === 'completed') {
    const users = await getUsersByRoles(['admin', 'finance'])
    if (users.length > 0) {
      await createBulkNotifications(
        {
          title: 'Job Order Completed',
          message: `${jo.jo_number} for ${jo.customer_name || 'customer'} has been completed`,
          type: 'status_change',
          priority: 'normal',
          entityType: 'jo',
          entityId: jo.id,
          actionUrl: `/job-orders/${jo.id}`,
          metadata: {
            jo_number: jo.jo_number,
            customer_name: jo.customer_name,
            status: newStatus,
          },
        },
        { userIds: users.map((u) => u.id) }
      )
    }
  } else if (newStatus === 'submitted_to_finance') {
    const users = await getUsersByRoles(['finance'])
    if (users.length > 0) {
      await createBulkNotifications(
        {
          title: 'JO Submitted to Finance',
          message: `${jo.jo_number} has been submitted for invoicing`,
          type: 'status_change',
          priority: 'normal',
          entityType: 'jo',
          entityId: jo.id,
          actionUrl: `/job-orders/${jo.id}`,
          metadata: {
            jo_number: jo.jo_number,
            customer_name: jo.customer_name,
            status: newStatus,
          },
        },
        { userIds: users.map((u) => u.id) }
      )
    }
  }
}

/**
 * Notify on user activity events
 * - 'first_login': Notify owner and admin
 * - 'deactivated': Notify owner
 * - 'role_changed': Notify affected user and owner
 */
export async function notifyUserActivity(
  user: UserActivityData,
  action: 'first_login' | 'deactivated' | 'role_changed'
): Promise<void> {
  const userName = user.full_name || user.email

  if (action === 'first_login') {
    const admins = await getUsersByRoles(['owner', 'admin'])
    if (admins.length > 0) {
      await createBulkNotifications(
        {
          title: 'New User Login',
          message: `${userName} logged in for the first time`,
          type: 'system',
          priority: 'normal',
          entityType: 'user',
          entityId: user.id,
          actionUrl: `/settings/users`,
          metadata: {
            user_email: user.email,
            user_name: userName,
            action,
          },
        },
        { userIds: admins.map((u) => u.id) }
      )
    }
  } else if (action === 'deactivated') {
    const owners = await getUsersByRoles(['owner'])
    if (owners.length > 0) {
      await createBulkNotifications(
        {
          title: 'User Deactivated',
          message: `${userName} has been deactivated`,
          type: 'system',
          priority: 'normal',
          entityType: 'user',
          entityId: user.id,
          actionUrl: `/settings/users`,
          metadata: {
            user_email: user.email,
            user_name: userName,
            action,
          },
        },
        { userIds: owners.map((u) => u.id) }
      )
    }
  } else if (action === 'role_changed') {
    // Notify the affected user
    await createNotification({
      userId: user.id,
      title: 'Role Changed',
      message: `Your role has been changed from ${user.previousRole || 'unknown'} to ${user.role}`,
      type: 'system',
      priority: 'normal',
      entityType: 'user',
      entityId: user.id,
      actionUrl: `/dashboard`,
      metadata: {
        user_email: user.email,
        previous_role: user.previousRole,
        new_role: user.role,
        action,
      },
    })

    // Notify owners
    const owners = await getUsersByRoles(['owner'])
    const ownerIds = owners.filter((o) => o.id !== user.id).map((o) => o.id)
    if (ownerIds.length > 0) {
      await createBulkNotifications(
        {
          title: 'User Role Changed',
          message: `${userName}'s role changed from ${user.previousRole || 'unknown'} to ${user.role}`,
          type: 'system',
          priority: 'normal',
          entityType: 'user',
          entityId: user.id,
          actionUrl: `/settings/users`,
          metadata: {
            user_email: user.email,
            user_name: userName,
            previous_role: user.previousRole,
            new_role: user.role,
            action,
          },
        },
        { userIds: ownerIds }
      )
    }
  }
}

interface RevenueDiscrepancyData {
  joId: string
  joNumber: string
  pjoRevenueTotal: number
  joFinalRevenue: number
  difference: number
  customerName?: string
}

/**
 * Notify finance and admin when there's a revenue discrepancy between PJO items and JO
 * This ensures no revenue is left behind when creating invoices
 */
export async function notifyRevenueDiscrepancy(data: RevenueDiscrepancyData): Promise<void> {
  const users = await getUsersByRoles(['finance', 'admin', 'manager'])
  if (users.length === 0) return

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)

  await createBulkNotifications(
    {
      title: 'Revenue Discrepancy Detected',
      message: `${data.joNumber}: PJO revenue (${formatAmount(data.pjoRevenueTotal)}) differs from JO revenue (${formatAmount(data.joFinalRevenue)}) by ${formatAmount(Math.abs(data.difference))}`,
      type: 'budget_alert',
      priority: 'high',
      entityType: 'jo',
      entityId: data.joId,
      actionUrl: `/job-orders/${data.joId}`,
      metadata: {
        jo_number: data.joNumber,
        pjo_revenue_total: data.pjoRevenueTotal,
        jo_final_revenue: data.joFinalRevenue,
        difference: data.difference,
        customer_name: data.customerName,
      },
    },
    { userIds: users.map((u) => u.id) }
  )
}

interface UninvoicedRevenueData {
  joId: string
  joNumber: string
  uninvoicedAmount: number
  uninvoicedPercent: number
  totalRevenue: number
  customerName?: string
}

/**
 * Notify finance when a JO has uninvoiced revenue remaining
 * Triggered when JO is marked as closed but not all terms are invoiced
 */
export async function notifyUninvoicedRevenue(data: UninvoicedRevenueData): Promise<void> {
  const users = await getUsersByRoles(['finance', 'admin'])
  if (users.length === 0) return

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)

  await createBulkNotifications(
    {
      title: 'Uninvoiced Revenue Alert',
      message: `${data.joNumber} has ${data.uninvoicedPercent}% (${formatAmount(data.uninvoicedAmount)}) of revenue not yet invoiced`,
      type: 'budget_alert',
      priority: 'high',
      entityType: 'jo',
      entityId: data.joId,
      actionUrl: `/job-orders/${data.joId}`,
      metadata: {
        jo_number: data.joNumber,
        uninvoiced_amount: data.uninvoicedAmount,
        uninvoiced_percent: data.uninvoicedPercent,
        total_revenue: data.totalRevenue,
        customer_name: data.customerName,
      },
    },
    { userIds: users.map((u) => u.id) }
  )
}


// ============================================
// Engineering Review Notifications
// ============================================

interface EngineeringAssignmentData {
  pjo_id: string
  pjo_number: string
  assigned_to: string
  assigned_by?: string
  complexity_score?: number
}

interface EngineeringCompletionData {
  pjo_id: string
  pjo_number: string
  decision: string
  overall_risk_level: string
  completed_by?: string
  created_by?: string
}

/**
 * Notify user when they are assigned an engineering review
 * Recipients: Assigned user
 */
export async function notifyEngineeringAssigned(data: EngineeringAssignmentData): Promise<void> {
  if (!data.assigned_to) return

  await createNotification({
    userId: data.assigned_to,
    title: 'Engineering Review Assigned',
    message: `You have been assigned to review PJO ${data.pjo_number}${data.complexity_score ? ` (Complexity: ${data.complexity_score})` : ''}`,
    type: 'approval',
    priority: 'high',
    entityType: 'pjo',
    entityId: data.pjo_id,
    actionUrl: `/proforma-jo/${data.pjo_id}`,
    metadata: {
      pjo_id: data.pjo_id,
      pjo_number: data.pjo_number,
      complexity_score: data.complexity_score,
      notification_category: 'engineering',
    },
  })
}

/**
 * Notify PJO creator when engineering review is completed
 * Recipients: PJO creator
 */
export async function notifyEngineeringCompleted(data: EngineeringCompletionData): Promise<void> {
  if (!data.created_by) return

  const decisionLabel = {
    approved: 'Approved',
    approved_with_conditions: 'Approved with Conditions',
    not_recommended: 'Not Recommended',
    rejected: 'Rejected',
  }[data.decision] || data.decision

  const riskLabel = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
  }[data.overall_risk_level] || data.overall_risk_level

  await createNotification({
    userId: data.created_by,
    title: 'Engineering Review Completed',
    message: `Engineering review for PJO ${data.pjo_number} is complete. Decision: ${decisionLabel}, Risk Level: ${riskLabel}`,
    type: 'status_change',
    priority: data.overall_risk_level === 'critical' || data.overall_risk_level === 'high' 
      ? 'high' 
      : 'normal',
    entityType: 'pjo',
    entityId: data.pjo_id,
    actionUrl: `/proforma-jo/${data.pjo_id}`,
    metadata: {
      pjo_id: data.pjo_id,
      pjo_number: data.pjo_number,
      decision: data.decision,
      overall_risk_level: data.overall_risk_level,
      notification_category: 'engineering',
    },
  })
}

/**
 * Notify managers when engineering review is waived
 * Recipients: Manager roles
 */
export async function notifyEngineeringWaived(data: {
  pjo_id: string
  pjo_number: string
  waived_by?: string
  waived_reason: string
}): Promise<void> {
  const managers = await getUsersByRoles(['manager', 'owner', 'super_admin'])
  if (managers.length === 0) return

  await createBulkNotifications(
    {
      title: 'Engineering Review Waived',
      message: `Engineering review for PJO ${data.pjo_number} has been waived. Reason: ${data.waived_reason.substring(0, 100)}${data.waived_reason.length > 100 ? '...' : ''}`,
      type: 'system',
      priority: 'high',
      entityType: 'pjo',
      entityId: data.pjo_id,
      actionUrl: `/proforma-jo/${data.pjo_id}`,
      metadata: {
        pjo_id: data.pjo_id,
        pjo_number: data.pjo_number,
        waived_reason: data.waived_reason,
        notification_category: 'engineering',
      },
    },
    { userIds: managers.map(user => user.id) }
  )
}


// ============================================
// Quotation Notifications
// ============================================

interface QuotationData {
  id: string
  quotation_number: string
  customer_name?: string
  total_revenue?: number
  created_by?: string
}

interface QuotationEngineeringAssignmentData {
  quotation_id: string
  quotation_number: string
  assigned_to: string
  complexity_score?: number
}

interface QuotationEngineeringCompletionData {
  quotation_id: string
  quotation_number: string
  decision: string
  overall_risk_level: string
  created_by?: string
}

/**
 * Notify user when they are assigned an engineering review for a quotation
 * Recipients: Assigned user
 */
export async function notifyQuotationEngineeringAssigned(data: QuotationEngineeringAssignmentData): Promise<void> {
  if (!data.assigned_to) return

  await createNotification({
    userId: data.assigned_to,
    title: 'Quotation Engineering Review Assigned',
    message: `You have been assigned to review Quotation ${data.quotation_number}${data.complexity_score ? ` (Complexity: ${data.complexity_score})` : ''}`,
    type: 'approval',
    priority: 'high',
    entityType: 'quotation',
    entityId: data.quotation_id,
    actionUrl: `/quotations/${data.quotation_id}`,
    metadata: {
      quotation_id: data.quotation_id,
      quotation_number: data.quotation_number,
      complexity_score: data.complexity_score,
      notification_category: 'engineering',
    },
  })
}

/**
 * Notify quotation creator when engineering review is completed
 * Recipients: Quotation creator
 */
export async function notifyQuotationEngineeringCompleted(data: QuotationEngineeringCompletionData): Promise<void> {
  if (!data.created_by) return

  const decisionLabel = {
    approved: 'Approved',
    approved_with_conditions: 'Approved with Conditions',
    not_recommended: 'Not Recommended',
    rejected: 'Rejected',
  }[data.decision] || data.decision

  const riskLabel = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
  }[data.overall_risk_level] || data.overall_risk_level

  await createNotification({
    userId: data.created_by,
    title: 'Quotation Engineering Review Completed',
    message: `Engineering review for Quotation ${data.quotation_number} is complete. Decision: ${decisionLabel}, Risk Level: ${riskLabel}`,
    type: 'status_change',
    priority: data.overall_risk_level === 'critical' || data.overall_risk_level === 'high' 
      ? 'high' 
      : 'normal',
    entityType: 'quotation',
    entityId: data.quotation_id,
    actionUrl: `/quotations/${data.quotation_id}`,
    metadata: {
      quotation_id: data.quotation_id,
      quotation_number: data.quotation_number,
      decision: data.decision,
      overall_risk_level: data.overall_risk_level,
      notification_category: 'engineering',
    },
  })
}

/**
 * Notify admin and finance when a quotation is won
 * Recipients: Admin and Finance roles
 */
export async function notifyQuotationWon(quotation: QuotationData): Promise<void> {
  const users = await getUsersByRoles(['admin', 'finance', 'manager'])
  if (users.length === 0) return

  const amount = quotation.total_revenue
    ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
        quotation.total_revenue
      )
    : 'N/A'

  await createBulkNotifications(
    {
      title: 'Quotation Won',
      message: `${quotation.quotation_number} from ${quotation.customer_name || 'Unknown'} (${amount}) has been won!`,
      type: 'status_change',
      priority: 'high',
      entityType: 'quotation',
      entityId: quotation.id,
      actionUrl: `/quotations/${quotation.id}`,
      metadata: {
        quotation_number: quotation.quotation_number,
        customer_name: quotation.customer_name,
        total_revenue: quotation.total_revenue,
      },
    },
    { userIds: users.map((u) => u.id) }
  )
}

/**
 * Notify quotation creator when deadline is approaching
 * Recipients: Quotation creator
 */
export async function notifyQuotationDeadlineApproaching(quotation: QuotationData & { rfq_deadline: string }): Promise<void> {
  if (!quotation.created_by) return

  const deadline = new Date(quotation.rfq_deadline)
  const now = new Date()
  const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  await createNotification({
    userId: quotation.created_by,
    title: 'Quotation Deadline Approaching',
    message: `Quotation ${quotation.quotation_number} deadline is in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
    type: 'deadline',
    priority: daysUntil <= 1 ? 'urgent' : 'high',
    entityType: 'quotation',
    entityId: quotation.id,
    actionUrl: `/quotations/${quotation.id}`,
    metadata: {
      quotation_number: quotation.quotation_number,
      customer_name: quotation.customer_name,
      rfq_deadline: quotation.rfq_deadline,
      days_until_deadline: daysUntil,
    },
  })
}
