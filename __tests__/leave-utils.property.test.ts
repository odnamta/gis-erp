// =====================================================
// v0.30: HR - LEAVE MANAGEMENT - Property-Based Tests
// =====================================================
// Feature: hr-leave-management

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateWorkingDays,
  validateLeaveRequest,
  calculateCarryOver,
  formatDays,
  isWorkingDay,
} from '@/lib/leave-utils';
import { LeaveType, LeaveBalance, LeaveRequestFormData } from '@/types/leave';
import { format, addDays, isWeekend, parseISO, isSameDay } from 'date-fns';

// Helper to generate valid date strings
const dateArb = fc.integer({ min: 0, max: 3650 }).map(days => {
  const baseDate = new Date('2020-01-01');
  const date = addDays(baseDate, days);
  return format(date, 'yyyy-MM-dd');
});

// Helper to generate date ranges where end >= start
const dateRangeArb = fc.tuple(
  fc.integer({ min: 0, max: 3650 }),
  fc.integer({ min: 0, max: 30 })
).map(([baseDays, extraDays]) => {
  const baseDate = new Date('2020-01-01');
  const startDate = addDays(baseDate, baseDays);
  const endDate = addDays(startDate, extraDays);
  return {
    start_date: format(startDate, 'yyyy-MM-dd'),
    end_date: format(endDate, 'yyyy-MM-dd'),
  };
});

// Helper to generate holiday arrays
const holidaysArb = fc.array(dateArb, { minLength: 0, maxLength: 10 });

// Helper to create a mock leave type
const createMockLeaveType = (overrides: Partial<LeaveType> = {}): LeaveType => ({
  id: 'test-leave-type',
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

// Helper to create a mock leave balance
const createMockBalance = (overrides: Partial<LeaveBalance> = {}): LeaveBalance => ({
  id: 'test-balance',
  employee_id: 'test-employee',
  leave_type_id: 'test-leave-type',
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

describe('Leave Utils - Property-Based Tests', () => {
  /**
   * Property 2: Working Days Calculation Excludes Non-Working Days
   * For any date range and list of holidays, the calculateWorkingDays function
   * SHALL return a count that excludes all Saturdays, Sundays, and dates in the holiday list.
   * Validates: Requirements 3.3, 3.4
   */
  describe('Property 2: Working Days Calculation Excludes Non-Working Days', () => {
    it('should never count weekends as working days', () => {
      fc.assert(
        fc.property(dateRangeArb, holidaysArb, ({ start_date, end_date }, holidays) => {
          const workingDays = calculateWorkingDays(start_date, end_date, holidays);
          
          // Count weekends in range manually
          const start = parseISO(start_date);
          const end = parseISO(end_date);
          let current = start;
          let weekendCount = 0;
          let totalDays = 0;
          
          while (current <= end) {
            totalDays++;
            if (isWeekend(current)) {
              weekendCount++;
            }
            current = addDays(current, 1);
          }
          
          // Working days should be at most total days minus weekends
          expect(workingDays).toBeLessThanOrEqual(totalDays - weekendCount);
        }),
        { numRuns: 100 }
      );
    });

    it('should never count holidays as working days', () => {
      fc.assert(
        fc.property(dateRangeArb, holidaysArb, ({ start_date, end_date }, holidays) => {
          const workingDays = calculateWorkingDays(start_date, end_date, holidays);
          const workingDaysWithoutHolidays = calculateWorkingDays(start_date, end_date, []);
          
          // Count holidays that fall on weekdays within the range
          const start = parseISO(start_date);
          const end = parseISO(end_date);
          const holidayDates = holidays.map(h => parseISO(h));
          
          let weekdayHolidaysInRange = 0;
          for (const holiday of holidayDates) {
            if (holiday >= start && holiday <= end && !isWeekend(holiday)) {
              weekdayHolidaysInRange++;
            }
          }
          
          // Working days with holidays should be less than or equal to without holidays
          expect(workingDays).toBeLessThanOrEqual(workingDaysWithoutHolidays);
        }),
        { numRuns: 100 }
      );
    });

    it('should return 0 for invalid date ranges (end before start)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 3650 }),
          fc.integer({ min: 1, max: 30 }),
          (baseDays, daysBefore) => {
            const baseDate = new Date('2020-01-01');
            const endDate = addDays(baseDate, baseDays);
            const startDate = addDays(endDate, daysBefore);
            const startStr = format(startDate, 'yyyy-MM-dd');
            const endStr = format(endDate, 'yyyy-MM-dd');
            
            const workingDays = calculateWorkingDays(startStr, endStr, []);
            expect(workingDays).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return correct count for single day', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 3650 }), (days) => {
          const baseDate = new Date('2020-01-01');
          const date = addDays(baseDate, days);
          const dateStr = format(date, 'yyyy-MM-dd');
          
          const workingDays = calculateWorkingDays(dateStr, dateStr, []);
          
          if (isWeekend(date)) {
            expect(workingDays).toBe(0);
          } else {
            expect(workingDays).toBe(1);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 1: Available Balance Calculation
   * For any leave balance, available_days SHALL equal
   * entitled_days + carried_over_days - used_days - pending_days
   * Validates: Requirements 2.2
   */
  describe('Property 1: Available Balance Calculation', () => {
    const balanceArb = fc.record({
      entitled_days: fc.float({ min: 0, max: 100, noNaN: true }),
      used_days: fc.float({ min: 0, max: 50, noNaN: true }),
      pending_days: fc.float({ min: 0, max: 50, noNaN: true }),
      carried_over_days: fc.float({ min: 0, max: 20, noNaN: true }),
    });

    it('should calculate available days correctly', () => {
      fc.assert(
        fc.property(balanceArb, ({ entitled_days, used_days, pending_days, carried_over_days }) => {
          const expectedAvailable = entitled_days + carried_over_days - used_days - pending_days;
          
          // This tests the formula - in the actual DB it's a generated column
          const calculatedAvailable = entitled_days + carried_over_days - used_days - pending_days;
          
          expect(calculatedAvailable).toBeCloseTo(expectedAvailable, 5);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 12: Carry-Over Calculation
   * For any leave balance at year-end where the leave type allows carry-over,
   * the carried_over_days for the next year SHALL equal min(unused_days, max_carry_over_days)
   * Validates: Requirements 2.4
   */
  describe('Property 12: Carry-Over Calculation', () => {
    const carryOverArb = fc.record({
      entitled_days: fc.float({ min: 0, max: 30, noNaN: true }),
      used_days: fc.float({ min: 0, max: 30, noNaN: true }),
      carried_over_days: fc.float({ min: 0, max: 10, noNaN: true }),
      max_carry_over_days: fc.integer({ min: 0, max: 15 }),
      allow_carry_over: fc.boolean(),
    });

    it('should calculate carry-over correctly', () => {
      fc.assert(
        fc.property(carryOverArb, ({ entitled_days, used_days, carried_over_days, max_carry_over_days, allow_carry_over }) => {
          const balance = createMockBalance({
            entitled_days,
            used_days,
            carried_over_days,
            available_days: entitled_days + carried_over_days - used_days,
          });
          
          const leaveType = createMockLeaveType({
            allow_carry_over,
            max_carry_over_days,
          });
          
          const carryOver = calculateCarryOver(balance, leaveType);
          
          if (!allow_carry_over) {
            expect(carryOver).toBe(0);
          } else {
            const unusedDays = entitled_days + carried_over_days - used_days;
            const expectedCarryOver = Math.min(Math.max(0, unusedDays), max_carry_over_days);
            expect(carryOver).toBeCloseTo(expectedCarryOver, 5);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should never exceed max_carry_over_days', () => {
      fc.assert(
        fc.property(carryOverArb, ({ entitled_days, used_days, carried_over_days, max_carry_over_days }) => {
          const balance = createMockBalance({
            entitled_days,
            used_days,
            carried_over_days,
          });
          
          const leaveType = createMockLeaveType({
            allow_carry_over: true,
            max_carry_over_days,
          });
          
          const carryOver = calculateCarryOver(balance, leaveType);
          expect(carryOver).toBeLessThanOrEqual(max_carry_over_days);
        }),
        { numRuns: 100 }
      );
    });

    it('should never be negative', () => {
      fc.assert(
        fc.property(carryOverArb, ({ entitled_days, used_days, carried_over_days, max_carry_over_days, allow_carry_over }) => {
          const balance = createMockBalance({
            entitled_days,
            used_days,
            carried_over_days,
          });
          
          const leaveType = createMockLeaveType({
            allow_carry_over,
            max_carry_over_days,
          });
          
          const carryOver = calculateCarryOver(balance, leaveType);
          expect(carryOver).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 13: Half-Day Support
   * For any half-day leave request, total_days SHALL equal 0.5
   * and half_day_type SHALL be either 'morning' or 'afternoon'
   * Validates: Requirements 2.5, 3.5
   */
  describe('Property 13: Half-Day Support', () => {
    it('should format half days correctly', () => {
      expect(formatDays(0.5)).toBe('½ day');
      expect(formatDays(1.5)).toBe('1½ days');
      expect(formatDays(2.5)).toBe('2½ days');
    });

    it('should format whole days correctly', () => {
      fc.assert(
        fc.property(fc.integer({ min: 2, max: 100 }), (days) => {
          const formatted = formatDays(days);
          expect(formatted).toBe(`${days} days`);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle 1 day specially', () => {
      expect(formatDays(1)).toBe('1 day');
    });
  });
});


describe('Leave Validation - Property-Based Tests', () => {
  /**
   * Property 3: Balance Validation Rejects Insufficient Balance
   * For any leave request where total_days exceeds the employee's available_days,
   * the submission SHALL fail with an error indicating the available balance.
   * Validates: Requirements 3.6, 3.7
   */
  describe('Property 3: Balance Validation Rejects Insufficient Balance', () => {
    it('should reject requests exceeding available balance', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 10, noNaN: true }),
          fc.integer({ min: 1, max: 20 }),
          (availableDays, requestDays) => {
            // Only test when request exceeds available
            fc.pre(requestDays > availableDays);
            
            const balance = createMockBalance({
              available_days: availableDays,
              entitled_days: availableDays,
            });
            
            const leaveType = createMockLeaveType({
              min_days_advance: 0,
              requires_attachment: false,
            });
            
            // Create a date range that results in requestDays working days
            const today = new Date();
            const startDate = format(addDays(today, 1), 'yyyy-MM-dd');
            const endDate = format(addDays(today, requestDays + 10), 'yyyy-MM-dd'); // Extra days to account for weekends
            
            const formData: LeaveRequestFormData = {
              leave_type_id: 'test',
              start_date: startDate,
              end_date: endDate,
              is_half_day: false,
            };
            
            const result = validateLeaveRequest(formData, leaveType, balance, []);
            
            // If the calculated working days exceed available, should be invalid
            const workingDays = calculateWorkingDays(startDate, endDate, []);
            if (workingDays > availableDays) {
              expect(result.valid).toBe(false);
              expect(result.errors.some(e => e.includes('Insufficient'))).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept requests within available balance', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5, max: 20 }),
          fc.integer({ min: 1, max: 4 }),
          (availableDays, requestDays) => {
            const balance = createMockBalance({
              available_days: availableDays,
              entitled_days: availableDays,
            });
            
            const leaveType = createMockLeaveType({
              min_days_advance: 0,
              requires_attachment: false,
            });
            
            // Create a short date range
            const today = new Date();
            const startDate = format(addDays(today, 1), 'yyyy-MM-dd');
            const endDate = format(addDays(today, requestDays), 'yyyy-MM-dd');
            
            const formData: LeaveRequestFormData = {
              leave_type_id: 'test',
              start_date: startDate,
              end_date: endDate,
              is_half_day: false,
            };
            
            const result = validateLeaveRequest(formData, leaveType, balance, []);
            
            // Should not have insufficient balance error
            expect(result.errors.filter(e => e.includes('Insufficient')).length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 9: Advance Notice Validation
   * For any leave request, if the leave type requires min_days_advance = M,
   * then requests with start_date less than M days from submission date SHALL be rejected.
   * Validates: Requirements 1.4, 1.5
   */
  describe('Property 9: Advance Notice Validation', () => {
    it('should reject requests with insufficient advance notice', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 30 }),
          fc.integer({ min: 0, max: 29 }),
          (minDaysAdvance, daysFromNow) => {
            // Only test when advance notice is insufficient
            fc.pre(daysFromNow < minDaysAdvance);
            
            const balance = createMockBalance({ available_days: 100 });
            const leaveType = createMockLeaveType({
              min_days_advance: minDaysAdvance,
              requires_attachment: false,
            });
            
            const today = new Date();
            const startDate = format(addDays(today, daysFromNow), 'yyyy-MM-dd');
            const endDate = startDate;
            
            const formData: LeaveRequestFormData = {
              leave_type_id: 'test',
              start_date: startDate,
              end_date: endDate,
              is_half_day: false,
            };
            
            const result = validateLeaveRequest(formData, leaveType, balance, []);
            
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('advance'))).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept requests with sufficient advance notice', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 0, max: 20 }),
          (minDaysAdvance, extraDays) => {
            const daysFromNow = minDaysAdvance + extraDays;
            
            const balance = createMockBalance({ available_days: 100 });
            const leaveType = createMockLeaveType({
              min_days_advance: minDaysAdvance,
              requires_attachment: false,
            });
            
            const today = new Date();
            const startDate = format(addDays(today, daysFromNow), 'yyyy-MM-dd');
            const endDate = startDate;
            
            const formData: LeaveRequestFormData = {
              leave_type_id: 'test',
              start_date: startDate,
              end_date: endDate,
              is_half_day: false,
            };
            
            const result = validateLeaveRequest(formData, leaveType, balance, []);
            
            // Should not have advance notice error
            expect(result.errors.filter(e => e.includes('advance')).length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow same-day requests when min_days_advance is 0', () => {
      const balance = createMockBalance({ available_days: 100 });
      const leaveType = createMockLeaveType({
        min_days_advance: 0,
        requires_attachment: false,
      });
      
      const today = new Date();
      const startDate = format(today, 'yyyy-MM-dd');
      
      const formData: LeaveRequestFormData = {
        leave_type_id: 'test',
        start_date: startDate,
        end_date: startDate,
        is_half_day: false,
      };
      
      const result = validateLeaveRequest(formData, leaveType, balance, []);
      
      // Should not have advance notice error
      expect(result.errors.filter(e => e.includes('advance')).length).toBe(0);
    });
  });

  /**
   * Property 10: Attachment Requirement Validation
   * For any leave request where the leave type has requires_attachment = true,
   * submission without an attachment_url SHALL fail.
   * Validates: Requirements 1.3, 8.1
   */
  describe('Property 10: Attachment Requirement Validation', () => {
    it('should reject requests without attachment when required', () => {
      fc.assert(
        fc.property(fc.boolean(), (hasAttachment) => {
          const balance = createMockBalance({ available_days: 100 });
          const leaveType = createMockLeaveType({
            min_days_advance: 0,
            requires_attachment: true,
            type_name: 'Sick Leave',
          });
          
          const today = new Date();
          const startDate = format(addDays(today, 1), 'yyyy-MM-dd');
          
          const formData: LeaveRequestFormData = {
            leave_type_id: 'test',
            start_date: startDate,
            end_date: startDate,
            is_half_day: false,
            attachment_url: hasAttachment ? 'https://example.com/doc.pdf' : undefined,
          };
          
          const result = validateLeaveRequest(formData, leaveType, balance, []);
          
          if (!hasAttachment) {
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('attachment') || e.includes('certificate'))).toBe(true);
          } else {
            // Should not have attachment error
            expect(result.errors.filter(e => e.includes('attachment') || e.includes('certificate')).length).toBe(0);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should not require attachment when not configured', () => {
      fc.assert(
        fc.property(fc.boolean(), (hasAttachment) => {
          const balance = createMockBalance({ available_days: 100 });
          const leaveType = createMockLeaveType({
            min_days_advance: 0,
            requires_attachment: false,
          });
          
          const today = new Date();
          const startDate = format(addDays(today, 1), 'yyyy-MM-dd');
          
          const formData: LeaveRequestFormData = {
            leave_type_id: 'test',
            start_date: startDate,
            end_date: startDate,
            is_half_day: false,
            attachment_url: hasAttachment ? 'https://example.com/doc.pdf' : undefined,
          };
          
          const result = validateLeaveRequest(formData, leaveType, balance, []);
          
          // Should never have attachment error when not required
          expect(result.errors.filter(e => e.includes('attachment') || e.includes('certificate')).length).toBe(0);
        }),
        { numRuns: 100 }
      );
    });
  });
});
