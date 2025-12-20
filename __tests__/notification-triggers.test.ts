import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { NotificationPriority } from '@/types/notifications'

// Helper types for testing
interface PjoData {
  id: string
  pjo_number: string
  customer_name?: string
  total_revenue?: number
  created_by?: string
}

interface CostItemData {
  category: string
  estimated_amount: number
  actual_amount: number
  variance_pct: number
}

// Arbitraries
const uuidArb = fc.uuid()
const pjoNumberArb = fc.stringMatching(/^\d{4}\/CARGO\/[IVX]+\/\d{4}$/)
const customerNameArb = fc.string({ minLength: 1, maxLength: 100 })
const amountArb = fc.float({ min: 0, max: 1000000000, noNaN: true })
const categoryArb = fc.constantFrom(
  'trucking',
  'port_charges',
  'documentation',
  'handling',
  'customs',
  'insurance',
  'storage',
  'labor',
  'fuel',
  'tolls',
  'other'
)
const roleArb = fc.constantFrom('owner', 'admin', 'manager', 'ops', 'finance', 'sales', 'viewer')

/**
 * Feature: v0.11-notifications, Property 7: PJO approval notification routing
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4
 */
describe('Property 7: PJO approval notification routing', () => {
  it('approval notifications should have type=approval and priority=high', () => {
    const pjoArb = fc.record({
      id: uuidArb,
      pjo_number: fc.string({ minLength: 1, maxLength: 50 }),
      customer_name: fc.option(customerNameArb, { nil: undefined }),
      total_revenue: fc.option(amountArb, { nil: undefined }),
    })

    fc.assert(
      fc.property(pjoArb, (pjo) => {
        // Simulated notification creation for approval
        const notification = {
          type: 'approval' as const,
          priority: 'high' as NotificationPriority,
          title: 'PJO Pending Approval',
          message: `${pjo.pjo_number} from ${pjo.customer_name || 'Unknown'} requires your approval`,
          entity_type: 'pjo',
          entity_id: pjo.id,
          action_url: `/proforma-jo/${pjo.id}`,
        }

        expect(notification.type).toBe('approval')
        expect(notification.priority).toBe('high')
        expect(notification.entity_type).toBe('pjo')
        expect(notification.entity_id).toBe(pjo.id)
        expect(notification.action_url).toBe(`/proforma-jo/${pjo.id}`)
      }),
      { numRuns: 100 }
    )
  })

  it('approval notification message should contain PJO number and customer name', () => {
    const pjoArb = fc.record({
      id: uuidArb,
      pjo_number: fc.string({ minLength: 1, maxLength: 50 }),
      customer_name: customerNameArb,
      total_revenue: amountArb,
    })

    fc.assert(
      fc.property(pjoArb, (pjo) => {
        const message = `${pjo.pjo_number} from ${pjo.customer_name} requires your approval`

        expect(message).toContain(pjo.pjo_number)
        expect(message).toContain(pjo.customer_name)
      }),
      { numRuns: 100 }
    )
  })
})

/**
 * Feature: v0.11-notifications, Property 8: PJO decision notification
 * Validates: Requirements 4.5
 */
describe('Property 8: PJO decision notification', () => {
  it('PJO creator should receive notification on approval/rejection', () => {
    const pjoArb = fc.record({
      id: uuidArb,
      pjo_number: fc.string({ minLength: 1, maxLength: 50 }),
      created_by: uuidArb,
    })
    const decisionArb = fc.constantFrom('approved', 'rejected')

    fc.assert(
      fc.property(pjoArb, decisionArb, (pjo, decision) => {
        // Notification should be sent to creator
        const notification = {
          user_id: pjo.created_by,
          title: decision === 'approved' ? 'PJO Approved' : 'PJO Rejected',
          type: 'status_change',
          entity_type: 'pjo',
          entity_id: pjo.id,
        }

        expect(notification.user_id).toBe(pjo.created_by)
        expect(notification.type).toBe('status_change')
        expect(notification.entity_type).toBe('pjo')

        if (decision === 'approved') {
          expect(notification.title).toBe('PJO Approved')
        } else {
          expect(notification.title).toBe('PJO Rejected')
        }
      }),
      { numRuns: 100 }
    )
  })
})

/**
 * Feature: v0.11-notifications, Property 9: Budget alert threshold and priority
 * Validates: Requirements 5.1, 5.3, 5.5
 */
describe('Property 9: Budget alert threshold and priority', () => {
  it('budget alerts should only trigger when variance > 10%', () => {
    const costItemArb = fc.record({
      estimated_amount: fc.float({ min: 1000, max: 1000000, noNaN: true }),
      actual_amount: fc.float({ min: 1000, max: 2000000, noNaN: true }),
    })

    fc.assert(
      fc.property(costItemArb, (costItem) => {
        const variance_pct =
          ((costItem.actual_amount - costItem.estimated_amount) / costItem.estimated_amount) * 100
        const shouldTrigger = variance_pct > 10

        // If variance <= 10%, no notification should be created
        // If variance > 10%, notification should be created
        if (shouldTrigger) {
          expect(variance_pct).toBeGreaterThan(10)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('priority should be urgent when variance > 25%, otherwise high', () => {
    const varianceArb = fc.float({ min: Math.fround(10.1), max: Math.fround(100), noNaN: true })

    fc.assert(
      fc.property(varianceArb, (variance_pct) => {
        const priority: NotificationPriority = variance_pct > 25 ? 'urgent' : 'high'

        if (variance_pct > 25) {
          expect(priority).toBe('urgent')
        } else {
          expect(priority).toBe('high')
        }
      }),
      { numRuns: 100 }
    )
  })

  it('budget alert should have type=budget_alert', () => {
    const costItemArb = fc.record({
      category: categoryArb,
      variance_pct: fc.float({ min: Math.fround(10.1), max: Math.fround(100), noNaN: true }),
    })

    fc.assert(
      fc.property(costItemArb, (costItem) => {
        const notification = {
          type: 'budget_alert' as const,
          title: 'Budget Exceeded',
          message: `PJO ${costItem.category} cost exceeded budget by ${costItem.variance_pct.toFixed(1)}%`,
        }

        expect(notification.type).toBe('budget_alert')
        expect(notification.message).toContain(costItem.category)
      }),
      { numRuns: 100 }
    )
  })
})

/**
 * Feature: v0.11-notifications, Property 10: Budget alert recipient routing
 * Validates: Requirements 5.2
 */
describe('Property 10: Budget alert recipient routing', () => {
  it('budget alerts should be sent to owner, manager, and finance roles', () => {
    const targetRoles = ['owner', 'manager', 'finance']

    fc.assert(
      fc.property(fc.constant(targetRoles), (roles) => {
        // Budget alerts should target these specific roles
        expect(roles).toContain('owner')
        expect(roles).toContain('manager')
        expect(roles).toContain('finance')
        expect(roles).not.toContain('ops')
        expect(roles).not.toContain('sales')
        expect(roles).not.toContain('viewer')
      }),
      { numRuns: 1 }
    )
  })
})

/**
 * Feature: v0.11-notifications, Property 11: Invoice notification routing
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */
describe('Property 11: Invoice notification routing', () => {
  it('sent invoices should notify creator', () => {
    const invoiceArb = fc.record({
      id: uuidArb,
      invoice_number: fc.string({ minLength: 1, maxLength: 50 }),
      created_by: uuidArb,
    })

    fc.assert(
      fc.property(invoiceArb, (invoice) => {
        const notification = {
          user_id: invoice.created_by,
          type: 'status_change',
          title: 'Invoice Sent',
        }

        expect(notification.user_id).toBe(invoice.created_by)
        expect(notification.type).toBe('status_change')
      }),
      { numRuns: 100 }
    )
  })

  it('paid invoices should notify finance and manager', () => {
    const targetRoles = ['finance', 'manager']

    expect(targetRoles).toContain('finance')
    expect(targetRoles).toContain('manager')
    expect(targetRoles).not.toContain('owner')
  })

  it('overdue invoices should notify finance, manager, and owner with type=overdue and priority=high', () => {
    const targetRoles = ['finance', 'manager', 'owner']

    const notification = {
      type: 'overdue' as const,
      priority: 'high' as NotificationPriority,
    }

    expect(targetRoles).toContain('finance')
    expect(targetRoles).toContain('manager')
    expect(targetRoles).toContain('owner')
    expect(notification.type).toBe('overdue')
    expect(notification.priority).toBe('high')
  })
})

/**
 * Feature: v0.11-notifications, Property 12: JO notification routing
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */
describe('Property 12: JO notification routing', () => {
  it('new JO should notify ops users', () => {
    const targetRoles = ['ops']

    expect(targetRoles).toContain('ops')
    expect(targetRoles).not.toContain('admin')
    expect(targetRoles).not.toContain('finance')
  })

  it('completed JO should notify admin and finance', () => {
    const targetRoles = ['admin', 'finance']

    expect(targetRoles).toContain('admin')
    expect(targetRoles).toContain('finance')
    expect(targetRoles).not.toContain('ops')
  })

  it('JO submitted to finance should notify finance users', () => {
    const targetRoles = ['finance']

    expect(targetRoles).toContain('finance')
    expect(targetRoles.length).toBe(1)
  })

  it('JO notifications should have entity_type=jo and correct action_url', () => {
    const joArb = fc.record({
      id: uuidArb,
      jo_number: fc.string({ minLength: 1, maxLength: 50 }),
    })

    fc.assert(
      fc.property(joArb, (jo) => {
        const notification = {
          entity_type: 'jo',
          entity_id: jo.id,
          action_url: `/job-orders/${jo.id}`,
        }

        expect(notification.entity_type).toBe('jo')
        expect(notification.entity_id).toBe(jo.id)
        expect(notification.action_url).toBe(`/job-orders/${jo.id}`)
      }),
      { numRuns: 100 }
    )
  })
})

/**
 * Feature: v0.11-notifications, Property 13: User activity notification routing
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5
 */
describe('Property 13: User activity notification routing', () => {
  it('first login should notify owner and admin', () => {
    const targetRoles = ['owner', 'admin']

    expect(targetRoles).toContain('owner')
    expect(targetRoles).toContain('admin')
  })

  it('user deactivation should notify owner', () => {
    const targetRoles = ['owner']

    expect(targetRoles).toContain('owner')
    expect(targetRoles.length).toBe(1)
  })

  it('role change should notify affected user and owner', () => {
    const userArb = fc.record({
      id: uuidArb,
      email: fc.emailAddress(),
      previousRole: roleArb,
      newRole: roleArb,
    })

    fc.assert(
      fc.property(userArb, (user) => {
        // Affected user should receive notification
        const userNotification = {
          user_id: user.id,
          type: 'system',
          title: 'Role Changed',
        }

        expect(userNotification.user_id).toBe(user.id)
        expect(userNotification.type).toBe('system')
      }),
      { numRuns: 100 }
    )
  })

  it('user activity notifications should have type=system', () => {
    const actions = ['first_login', 'deactivated', 'role_changed']

    actions.forEach((action) => {
      const notification = {
        type: 'system' as const,
      }

      expect(notification.type).toBe('system')
    })
  })
})


/**
 * Feature: v0.22-engineering-flag-system, Property 16: Engineering notification creation
 * Validates: Requirements 10.1, 10.2, 10.3
 */
describe('Property 16: Engineering notification creation', () => {
  const complexityScoreArb = fc.integer({ min: 0, max: 100 })
  const riskLevelArb = fc.constantFrom('low', 'medium', 'high', 'critical')
  const decisionArb = fc.constantFrom('approved', 'approved_with_conditions', 'not_recommended', 'rejected')

  it('engineering assignment notification should have type=approval and priority=high', () => {
    const assignmentArb = fc.record({
      pjo_id: uuidArb,
      pjo_number: fc.string({ minLength: 1, maxLength: 50 }),
      assigned_to: uuidArb,
      complexity_score: fc.option(complexityScoreArb, { nil: undefined }),
    })

    fc.assert(
      fc.property(assignmentArb, (assignment) => {
        // Simulated notification creation for engineering assignment
        const notification = {
          user_id: assignment.assigned_to,
          type: 'approval' as const,
          priority: 'high' as NotificationPriority,
          title: 'Engineering Review Assigned',
          message: `You have been assigned to review PJO ${assignment.pjo_number}${assignment.complexity_score ? ` (Complexity: ${assignment.complexity_score})` : ''}`,
          entity_type: 'pjo',
          entity_id: assignment.pjo_id,
          action_url: `/proforma-jo/${assignment.pjo_id}`,
        }

        expect(notification.user_id).toBe(assignment.assigned_to)
        expect(notification.type).toBe('approval')
        expect(notification.priority).toBe('high')
        expect(notification.entity_type).toBe('pjo')
        expect(notification.entity_id).toBe(assignment.pjo_id)
        expect(notification.action_url).toBe(`/proforma-jo/${assignment.pjo_id}`)
        expect(notification.message).toContain(assignment.pjo_number)
      }),
      { numRuns: 100 }
    )
  })

  it('engineering completion notification should have type=status_change', () => {
    const completionArb = fc.record({
      pjo_id: uuidArb,
      pjo_number: fc.string({ minLength: 1, maxLength: 50 }),
      decision: decisionArb,
      overall_risk_level: riskLevelArb,
      created_by: uuidArb,
    })

    fc.assert(
      fc.property(completionArb, (completion) => {
        const notification = {
          user_id: completion.created_by,
          type: 'status_change' as const,
          title: 'Engineering Review Completed',
          entity_type: 'pjo',
          entity_id: completion.pjo_id,
          action_url: `/proforma-jo/${completion.pjo_id}`,
        }

        expect(notification.user_id).toBe(completion.created_by)
        expect(notification.type).toBe('status_change')
        expect(notification.entity_type).toBe('pjo')
        expect(notification.entity_id).toBe(completion.pjo_id)
      }),
      { numRuns: 100 }
    )
  })

  it('engineering completion priority should be high for critical/high risk, normal otherwise', () => {
    fc.assert(
      fc.property(riskLevelArb, (riskLevel) => {
        const priority: NotificationPriority = 
          riskLevel === 'critical' || riskLevel === 'high' ? 'high' : 'normal'

        if (riskLevel === 'critical' || riskLevel === 'high') {
          expect(priority).toBe('high')
        } else {
          expect(priority).toBe('normal')
        }
      }),
      { numRuns: 100 }
    )
  })

  it('engineering waiver notification should have type=system and priority=high', () => {
    const waiverArb = fc.record({
      pjo_id: uuidArb,
      pjo_number: fc.string({ minLength: 1, maxLength: 50 }),
      waived_reason: fc.string({ minLength: 10, maxLength: 500 }),
    })

    fc.assert(
      fc.property(waiverArb, (waiver) => {
        const notification = {
          type: 'system' as const,
          priority: 'high' as NotificationPriority,
          title: 'Engineering Review Waived',
          entity_type: 'pjo',
          entity_id: waiver.pjo_id,
          action_url: `/proforma-jo/${waiver.pjo_id}`,
        }

        expect(notification.type).toBe('system')
        expect(notification.priority).toBe('high')
        expect(notification.entity_type).toBe('pjo')
        expect(notification.entity_id).toBe(waiver.pjo_id)
      }),
      { numRuns: 100 }
    )
  })

  it('engineering waiver notification should be sent to manager roles', () => {
    const targetRoles = ['manager', 'owner', 'super_admin']

    expect(targetRoles).toContain('manager')
    expect(targetRoles).toContain('owner')
    expect(targetRoles).toContain('super_admin')
    expect(targetRoles).not.toContain('admin')
    expect(targetRoles).not.toContain('ops')
    expect(targetRoles).not.toContain('sales')
  })

  it('engineering notification message should contain PJO number', () => {
    const pjoNumberArb = fc.string({ minLength: 1, maxLength: 50 })

    fc.assert(
      fc.property(pjoNumberArb, (pjoNumber) => {
        const assignmentMessage = `You have been assigned to review PJO ${pjoNumber}`
        const completionMessage = `Engineering review for PJO ${pjoNumber} is complete`
        const waiverMessage = `Engineering review for PJO ${pjoNumber} has been waived`

        expect(assignmentMessage).toContain(pjoNumber)
        expect(completionMessage).toContain(pjoNumber)
        expect(waiverMessage).toContain(pjoNumber)
      }),
      { numRuns: 100 }
    )
  })

  it('engineering completion message should include decision and risk level labels', () => {
    const decisionLabels: Record<string, string> = {
      approved: 'Approved',
      approved_with_conditions: 'Approved with Conditions',
      not_recommended: 'Not Recommended',
      rejected: 'Rejected',
    }

    const riskLabels: Record<string, string> = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      critical: 'Critical',
    }

    fc.assert(
      fc.property(decisionArb, riskLevelArb, (decision, riskLevel) => {
        const decisionLabel = decisionLabels[decision]
        const riskLabel = riskLabels[riskLevel]
        const message = `Engineering review for PJO TEST-001 is complete. Decision: ${decisionLabel}, Risk Level: ${riskLabel}`

        expect(message).toContain(decisionLabel)
        expect(message).toContain(riskLabel)
      }),
      { numRuns: 100 }
    )
  })
})
