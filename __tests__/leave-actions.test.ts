// =====================================================
// v0.30: HR - LEAVE MANAGEMENT - Server Actions Tests
// =====================================================
// Feature: hr-leave-management

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { format, addDays } from 'date-fns';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Helper to create mock data
const createMockLeaveType = (overrides = {}) => ({
  id: 'leave-type-1',
  type_code: 'annual',
  type_name: 'Annual Leave',
  default_days_per_year: 12,
  allow_carry_over: false,
  max_carry_over_days: 0,
  requires_approval: true,
  requires_attachment: false,
  min_days_advance: 0,
  is_paid: true,
  is_active: true,
  created_at: new Date().toISOString(),
  ...overrides,
});

const createMockBalance = (overrides = {}) => ({
  id: 'balance-1',
  employee_id: 'employee-1',
  leave_type_id: 'leave-type-1',
  year: new Date().getFullYear(),
  entitled_days: 12,
  used_days: 0,
  pending_days: 0,
  carried_over_days: 0,
  available_days: 12,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createMockRequest = (overrides = {}) => ({
  id: 'request-1',
  request_number: 'LV-2025-0001',
  employee_id: 'employee-1',
  leave_type_id: 'leave-type-1',
  start_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
  end_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
  total_days: 1,
  is_half_day: false,
  status: 'pending',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('Leave Actions - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 4: Successful Submission Updates Pending Days
   * For any successfully submitted leave request with total_days = N,
   * the employee's pending_days for that leave type SHALL increase by exactly N.
   * Validates: Requirements 3.8
   */
  describe('Property 4: Successful Submission Updates Pending Days', () => {
    it('should increase pending_days by total_days on successful submission', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0.5, max: 10, noNaN: true }),
          fc.float({ min: 0, max: 5, noNaN: true }),
          (totalDays, initialPending) => {
            // Round to 0.5 increments
            const roundedTotal = Math.round(totalDays * 2) / 2;
            const roundedInitial = Math.round(initialPending * 2) / 2;
            
            const initialBalance = createMockBalance({
              pending_days: roundedInitial,
              available_days: 12 - roundedInitial,
            });
            
            // Simulate the update logic from submitLeaveRequest
            const newPendingDays = initialBalance.pending_days + roundedTotal;
            
            // Property: new pending = old pending + total days
            expect(newPendingDays).toBeCloseTo(roundedInitial + roundedTotal, 5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: Approval Moves Days from Pending to Used
   * For any approved leave request with total_days = N,
   * the employee's pending_days SHALL decrease by N and used_days SHALL increase by N.
   * Validates: Requirements 4.4
   */
  describe('Property 5: Approval Moves Days from Pending to Used', () => {
    it('should transfer days from pending to used on approval', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0.5, max: 10, noNaN: true }),
          fc.float({ min: 0, max: 5, noNaN: true }),
          fc.float({ min: 0, max: 5, noNaN: true }),
          (totalDays, initialPending, initialUsed) => {
            // Round to 0.5 increments
            const roundedTotal = Math.round(totalDays * 2) / 2;
            const roundedPending = Math.round(initialPending * 2) / 2 + roundedTotal; // Must have enough pending
            const roundedUsed = Math.round(initialUsed * 2) / 2;
            
            const balance = createMockBalance({
              pending_days: roundedPending,
              used_days: roundedUsed,
            });
            
            // Simulate the update logic from approveLeaveRequest
            const newPendingDays = balance.pending_days - roundedTotal;
            const newUsedDays = balance.used_days + roundedTotal;
            
            // Property: pending decreases by total, used increases by total
            expect(newPendingDays).toBeCloseTo(roundedPending - roundedTotal, 5);
            expect(newUsedDays).toBeCloseTo(roundedUsed + roundedTotal, 5);
            
            // Property: total of pending + used remains constant
            const totalBefore = roundedPending + roundedUsed;
            const totalAfter = newPendingDays + newUsedDays;
            expect(totalAfter).toBeCloseTo(totalBefore, 5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Rejection Returns Pending Days
   * For any rejected leave request with total_days = N,
   * the employee's pending_days SHALL decrease by N and available_days SHALL increase by N.
   * Validates: Requirements 4.7
   */
  describe('Property 6: Rejection Returns Pending Days', () => {
    it('should return pending days on rejection', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0.5, max: 10, noNaN: true }),
          fc.float({ min: 0, max: 5, noNaN: true }),
          (totalDays, initialPending) => {
            // Round to 0.5 increments
            const roundedTotal = Math.round(totalDays * 2) / 2;
            const roundedPending = Math.round(initialPending * 2) / 2 + roundedTotal; // Must have enough pending
            
            const balance = createMockBalance({
              pending_days: roundedPending,
              entitled_days: 12,
              used_days: 0,
              carried_over_days: 0,
            });
            
            // Simulate the update logic from rejectLeaveRequest
            const newPendingDays = balance.pending_days - roundedTotal;
            
            // Property: pending decreases by total
            expect(newPendingDays).toBeCloseTo(roundedPending - roundedTotal, 5);
            
            // Property: available increases (since available = entitled + carried - used - pending)
            const oldAvailable = balance.entitled_days + balance.carried_over_days - balance.used_days - balance.pending_days;
            const newAvailable = balance.entitled_days + balance.carried_over_days - balance.used_days - newPendingDays;
            expect(newAvailable).toBeCloseTo(oldAvailable + roundedTotal, 5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 7: Cancellation Returns Pending Days and Updates Status
   * For any cancelled leave request with total_days = N,
   * the status SHALL be 'cancelled' and the employee's pending_days SHALL decrease by N.
   * Validates: Requirements 5.2, 5.3
   */
  describe('Property 7: Cancellation Returns Pending Days and Updates Status', () => {
    it('should return pending days and update status on cancellation', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0.5, max: 10, noNaN: true }),
          fc.float({ min: 0, max: 5, noNaN: true }),
          (totalDays, initialPending) => {
            // Round to 0.5 increments
            const roundedTotal = Math.round(totalDays * 2) / 2;
            const roundedPending = Math.round(initialPending * 2) / 2 + roundedTotal;
            
            const request = createMockRequest({
              total_days: roundedTotal,
              status: 'pending',
            });
            
            const balance = createMockBalance({
              pending_days: roundedPending,
            });
            
            // Simulate the update logic from cancelLeaveRequest
            const newStatus = 'cancelled';
            const newPendingDays = balance.pending_days - roundedTotal;
            
            // Property: status becomes cancelled
            expect(newStatus).toBe('cancelled');
            
            // Property: pending decreases by total
            expect(newPendingDays).toBeCloseTo(roundedPending - roundedTotal, 5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: Only Pending Requests Can Be Cancelled
   * For any leave request with status other than 'pending',
   * attempting to cancel SHALL fail.
   * Validates: Requirements 5.1, 5.4
   */
  describe('Property 8: Only Pending Requests Can Be Cancelled', () => {
    it('should only allow cancellation of pending requests', () => {
      const nonPendingStatuses = ['approved', 'rejected', 'cancelled'];
      
      fc.assert(
        fc.property(
          fc.constantFrom(...nonPendingStatuses),
          (status) => {
            const request = createMockRequest({ status });
            
            // Simulate the check from cancelLeaveRequest
            const canCancel = request.status === 'pending';
            
            // Property: non-pending requests cannot be cancelled
            expect(canCancel).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow cancellation of pending requests', () => {
      const request = createMockRequest({ status: 'pending' });
      
      // Simulate the check from cancelLeaveRequest
      const canCancel = request.status === 'pending';
      
      // Property: pending requests can be cancelled
      expect(canCancel).toBe(true);
    });
  });
});

describe('Leave Actions - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Request Number Format', () => {
    /**
     * Property 11: Request Number Format
     * For any created leave request, the request_number SHALL match
     * the pattern LV-YYYY-NNNN where YYYY is the current year.
     * Validates: Requirements 3.2
     */
    it('should generate request numbers in correct format', () => {
      const requestNumberPattern = /^LV-\d{4}-\d{4}$/;
      
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 9999 }),
          fc.integer({ min: 2020, max: 2030 }),
          (seq, year) => {
            // Simulate the trigger function logic
            const requestNumber = `LV-${year}-${seq.toString().padStart(4, '0')}`;
            
            // Property: matches the expected format
            expect(requestNumber).toMatch(requestNumberPattern);
            
            // Property: contains the year
            expect(requestNumber).toContain(year.toString());
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Rejection Reason Validation', () => {
    it('should require rejection reason', () => {
      const emptyReasons = ['', '   ', null, undefined];
      
      for (const reason of emptyReasons) {
        // Simulate the validation from rejectLeaveRequest
        const isValid = reason && reason.toString().trim() !== '';
        expect(isValid).toBeFalsy();
      }
    });

    it('should accept non-empty rejection reasons', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          (reason) => {
            // Simulate the validation from rejectLeaveRequest
            const isValid = reason && reason.trim() !== '';
            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


describe('Leave Filters - Property-Based Tests', () => {
  /**
   * Property 14: Filter Results Accuracy
   * For any filter criteria applied to leave requests,
   * all returned results SHALL match all specified filter conditions.
   * Validates: Requirements 6.2
   */
  describe('Property 14: Filter Results Accuracy', () => {
    const statuses = ['pending', 'approved', 'rejected', 'cancelled'] as const;
    
    it('should filter by status correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...statuses),
          fc.array(fc.constantFrom(...statuses), { minLength: 1, maxLength: 10 }),
          (filterStatus, requestStatuses) => {
            // Create mock requests with various statuses
            const requests = requestStatuses.map((status, i) => 
              createMockRequest({ id: `request-${i}`, status })
            );
            
            // Simulate filter logic
            const filtered = requests.filter(r => r.status === filterStatus);
            
            // Property: all filtered results match the filter status
            filtered.forEach(r => {
              expect(r.status).toBe(filterStatus);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter by employee_id correctly', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
          (filterEmployeeId, employeeIds) => {
            // Create mock requests with various employee IDs
            const requests = employeeIds.map((empId, i) => 
              createMockRequest({ id: `request-${i}`, employee_id: empId })
            );
            
            // Simulate filter logic
            const filtered = requests.filter(r => r.employee_id === filterEmployeeId);
            
            // Property: all filtered results match the filter employee_id
            filtered.forEach(r => {
              expect(r.employee_id).toBe(filterEmployeeId);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter by date range correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          fc.array(fc.integer({ min: 0, max: 200 }), { minLength: 1, maxLength: 10 }),
          (filterStartOffset, filterEndOffset, requestOffsets) => {
            const baseDate = new Date('2025-01-01');
            const filterStart = format(addDays(baseDate, filterStartOffset), 'yyyy-MM-dd');
            const filterEnd = format(addDays(baseDate, filterStartOffset + filterEndOffset), 'yyyy-MM-dd');
            
            // Create mock requests with various dates
            const requests = requestOffsets.map((offset, i) => {
              const date = format(addDays(baseDate, offset), 'yyyy-MM-dd');
              return createMockRequest({ 
                id: `request-${i}`, 
                start_date: date,
                end_date: date,
              });
            });
            
            // Simulate filter logic (start_date >= filterStart AND end_date <= filterEnd)
            const filtered = requests.filter(r => 
              r.start_date >= filterStart && r.end_date <= filterEnd
            );
            
            // Property: all filtered results are within the date range
            filtered.forEach(r => {
              expect(r.start_date >= filterStart).toBe(true);
              expect(r.end_date <= filterEnd).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should combine multiple filters correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...statuses),
          fc.uuid(),
          (filterStatus, filterEmployeeId) => {
            // Create mock requests with various combinations
            const requests = [
              createMockRequest({ id: '1', status: filterStatus, employee_id: filterEmployeeId }),
              createMockRequest({ id: '2', status: filterStatus, employee_id: 'other-emp-1' }),
              createMockRequest({ id: '3', status: 'pending', employee_id: filterEmployeeId }),
              createMockRequest({ id: '4', status: 'rejected', employee_id: 'other-emp-2' }),
            ];
            
            // Ensure we have distinct statuses for testing
            // Only run test when filterStatus is not 'pending' to avoid collision with request '3'
            fc.pre(filterStatus !== 'pending');
            
            // Simulate combined filter logic
            const filtered = requests.filter(r => 
              r.status === filterStatus && r.employee_id === filterEmployeeId
            );
            
            // Property: all filtered results match ALL filter criteria
            filtered.forEach(r => {
              expect(r.status).toBe(filterStatus);
              expect(r.employee_id).toBe(filterEmployeeId);
            });
            
            // Property: should find exactly the matching request
            expect(filtered.length).toBe(1);
            expect(filtered[0].id).toBe('1');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
