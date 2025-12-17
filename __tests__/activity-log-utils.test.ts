import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatActionType,
  formatEntityType,
  formatRelativeTime,
  formatDetails,
  getEntityUrl,
  hasViewableEntity,
  getDateThreshold,
} from '@/lib/activity-log-utils'

describe('Activity Log Utils', () => {
  describe('formatActionType', () => {
    it('returns correct label for known action types', () => {
      expect(formatActionType('login')).toBe('Login')
      expect(formatActionType('logout')).toBe('Logout')
      expect(formatActionType('created')).toBe('Created')
      expect(formatActionType('updated')).toBe('Updated')
      expect(formatActionType('deleted')).toBe('Deleted')
      expect(formatActionType('approved')).toBe('Approved')
      expect(formatActionType('pjo_approved')).toBe('Approved')
      expect(formatActionType('rejected')).toBe('Rejected')
      expect(formatActionType('pjo_rejected')).toBe('Rejected')
      expect(formatActionType('status_changed')).toBe('Status Changed')
      expect(formatActionType('payment_recorded')).toBe('Payment Recorded')
    })

    it('formats unknown action types with title case', () => {
      expect(formatActionType('some_custom_action')).toBe('Some Custom Action')
    })
  })

  describe('formatEntityType', () => {
    it('returns correct label for known entity types', () => {
      expect(formatEntityType('pjo')).toBe('PJO')
      expect(formatEntityType('jo')).toBe('Job Order')
      expect(formatEntityType('invoice')).toBe('Invoice')
      expect(formatEntityType('customer')).toBe('Customer')
      expect(formatEntityType('project')).toBe('Project')
      expect(formatEntityType('user')).toBe('User')
      expect(formatEntityType('system')).toBe('System')
    })

    it('returns uppercase for unknown entity types', () => {
      expect(formatEntityType('unknown')).toBe('UNKNOWN')
    })
  })

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-12-17T10:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('formats today timestamps', () => {
      const result = formatRelativeTime('2025-12-17T08:35:00Z')
      expect(result).toMatch(/^Today \d{2}:\d{2}$/)
    })

    it('formats yesterday timestamps', () => {
      const result = formatRelativeTime('2025-12-16T16:45:00Z')
      expect(result).toMatch(/^Yesterday \d{2}:\d{2}$/)
    })

    it('formats timestamps within 7 days as "X days ago"', () => {
      const result = formatRelativeTime('2025-12-14T10:00:00Z')
      expect(result).toBe('3 days ago')
    })

    it('formats older timestamps as DD/MM/YYYY', () => {
      const result = formatRelativeTime('2025-11-01T10:00:00Z')
      expect(result).toBe('01/11/2025')
    })
  })

  describe('formatDetails', () => {
    it('returns "-" for null details', () => {
      expect(formatDetails(null)).toBe('-')
    })

    it('returns "-" for empty details', () => {
      expect(formatDetails({})).toBe('-')
    })

    it('formats status changes with previous value', () => {
      const details = { status: 'paid', previous: 'sent' }
      expect(formatDetails(details)).toBe('status: sent → paid')
    })

    it('formats status changes with previous_status key', () => {
      const details = { status: 'approved', previous_status: 'pending' }
      expect(formatDetails(details)).toBe('status: pending → approved')
    })

    it('formats status without previous value', () => {
      const details = { status: 'active' }
      expect(formatDetails(details)).toBe('status: active')
    })

    it('formats PJO reference', () => {
      const details = { from_pjo: 'PJO-0018' }
      expect(formatDetails(details)).toBe('from PJO-0018')
    })

    it('formats IP address', () => {
      const details = { ip: '192.168.1.1' }
      expect(formatDetails(details)).toBe('IP: 192.168.1.1')
    })

    it('formats ip_address key', () => {
      const details = { ip_address: '10.0.0.1' }
      expect(formatDetails(details)).toBe('IP: 10.0.0.1')
    })

    it('formats amount', () => {
      const details = { amount: 1500000 }
      expect(formatDetails(details)).toBe('amount: 1500000')
    })

    it('formats reason', () => {
      const details = { reason: 'Budget exceeded' }
      expect(formatDetails(details)).toBe('reason: Budget exceeded')
    })

    it('formats generic key-value pairs', () => {
      const details = { custom_field: 'value123' }
      expect(formatDetails(details)).toBe('custom_field: value123')
    })

    it('ignores null and undefined values in generic format', () => {
      const details = { field1: 'value', field2: null, field3: undefined }
      expect(formatDetails(details)).toBe('field1: value')
    })
  })

  describe('getEntityUrl', () => {
    it('returns correct URL for PJO', () => {
      expect(getEntityUrl('pjo', '123-456')).toBe('/pjo/123-456')
    })

    it('returns correct URL for JO', () => {
      expect(getEntityUrl('jo', '123-456')).toBe('/jo/123-456')
    })

    it('returns correct URL for invoice', () => {
      expect(getEntityUrl('invoice', '123-456')).toBe('/invoices/123-456')
    })

    it('returns correct URL for customer', () => {
      expect(getEntityUrl('customer', '123-456')).toBe('/customers/123-456')
    })

    it('returns correct URL for project', () => {
      expect(getEntityUrl('project', '123-456')).toBe('/projects/123-456')
    })

    it('returns null for unknown entity types', () => {
      expect(getEntityUrl('user', '123-456')).toBeNull()
      expect(getEntityUrl('system', '123-456')).toBeNull()
    })

    it('returns null for empty document ID', () => {
      expect(getEntityUrl('pjo', '')).toBeNull()
    })
  })

  describe('hasViewableEntity', () => {
    it('returns true for viewable actions and entities', () => {
      expect(hasViewableEntity('created', 'pjo')).toBe(true)
      expect(hasViewableEntity('updated', 'jo')).toBe(true)
      expect(hasViewableEntity('approved', 'invoice')).toBe(true)
    })

    it('returns false for login/logout actions', () => {
      expect(hasViewableEntity('login', 'user')).toBe(false)
      expect(hasViewableEntity('logout', 'user')).toBe(false)
    })

    it('returns false for user/system entities', () => {
      expect(hasViewableEntity('created', 'user')).toBe(false)
      expect(hasViewableEntity('updated', 'system')).toBe(false)
    })
  })

  describe('getDateThreshold', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-12-17T10:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns correct threshold for last7', () => {
      const threshold = getDateThreshold('last7')
      expect(threshold).toEqual(new Date('2025-12-10T10:00:00Z'))
    })

    it('returns correct threshold for last30', () => {
      const threshold = getDateThreshold('last30')
      expect(threshold).toEqual(new Date('2025-11-17T10:00:00Z'))
    })

    it('returns correct threshold for last90', () => {
      const threshold = getDateThreshold('last90')
      expect(threshold).toEqual(new Date('2025-09-18T10:00:00Z'))
    })

    it('returns null for all', () => {
      expect(getDateThreshold('all')).toBeNull()
    })

    it('returns null for unknown range', () => {
      expect(getDateThreshold('unknown')).toBeNull()
    })
  })
})
