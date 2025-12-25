/**
 * Property-based tests for security event logging utilities
 * Feature: v0.79-security-hardening
 * Tests Property 6 from the design document
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  createEventObject,
  isValidEvent,
  getSeverityLevel,
  compareSeverity,
} from '@/lib/security/event-logger';
import type {
  SecurityEventType,
  SecuritySeverity,
  LogSecurityEventParams,
} from '@/lib/security/types';

// Valid event types for testing
const validEventTypes: SecurityEventType[] = [
  'brute_force',
  'sql_injection_attempt',
  'xss_attempt',
  'unauthorized_access',
  'suspicious_activity',
  'account_lockout',
  'rate_limit_exceeded',
  'invalid_api_key',
  'session_hijack_attempt',
  'path_traversal_attempt',
  'command_injection_attempt',
  'invalid_file_upload',
];

// Valid severity levels for testing
const validSeverities: SecuritySeverity[] = ['low', 'medium', 'high', 'critical'];

// Arbitrary generator for valid event parameters
const eventParamsArb = fc.record({
  eventType: fc.constantFrom(...validEventTypes),
  severity: fc.constantFrom(...validSeverities),
  description: fc.string({ minLength: 1, maxLength: 500 }),
  ipAddress: fc.option(fc.ipV4(), { nil: undefined }),
  userAgent: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  userId: fc.option(fc.uuid(), { nil: undefined }),
  requestPath: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  requestMethod: fc.option(fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'), { nil: undefined }),
  payloadSample: fc.option(fc.string({ minLength: 0, maxLength: 2000 }), { nil: undefined }),
  actionTaken: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
}) as fc.Arbitrary<LogSecurityEventParams>;

describe('Security Event Logger Property Tests', () => {
  describe('Property 6: Security Event Logging Completeness', () => {
    /**
     * Property: For any logged security event, the event record SHALL contain
     * all required fields: timestamp, event_type, severity, and description.
     * If source information is provided, it SHALL be captured.
     * 
     * Validates: Requirements 3.1, 3.2, 3.4
     * Feature: security-hardening, Property 6: Security Event Logging Completeness
     */
    it('should create events with all required fields present', () => {
      fc.assert(
        fc.property(
          eventParamsArb,
          (params) => {
            const event = createEventObject(params);
            
            // Required fields MUST be present
            expect(event.id).toBeDefined();
            expect(typeof event.id).toBe('string');
            expect(event.id.length).toBeGreaterThan(0);
            
            expect(event.timestamp).toBeDefined();
            expect(typeof event.timestamp).toBe('string');
            // Timestamp should be a valid ISO date string
            expect(() => new Date(event.timestamp)).not.toThrow();
            expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);
            
            expect(event.event_type).toBe(params.eventType);
            expect(event.severity).toBe(params.severity);
            expect(event.description).toBe(params.description);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Source information (IP address, user agent, user ID) SHALL be
     * captured when provided in the event parameters.
     * 
     * Validates: Requirements 3.2
     * Feature: security-hardening, Property 6: Security Event Logging Completeness
     */
    it('should capture source information when provided', () => {
      fc.assert(
        fc.property(
          eventParamsArb,
          (params) => {
            const event = createEventObject(params);
            
            // Source information should be captured when provided
            if (params.ipAddress !== undefined) {
              expect(event.ip_address).toBe(params.ipAddress);
            } else {
              expect(event.ip_address).toBeNull();
            }
            
            if (params.userAgent !== undefined) {
              expect(event.user_agent).toBe(params.userAgent);
            } else {
              expect(event.user_agent).toBeNull();
            }
            
            if (params.userId !== undefined) {
              expect(event.user_id).toBe(params.userId);
            } else {
              expect(event.user_id).toBeNull();
            }
            
            if (params.requestPath !== undefined) {
              expect(event.request_path).toBe(params.requestPath);
            } else {
              expect(event.request_path).toBeNull();
            }
            
            if (params.requestMethod !== undefined) {
              expect(event.request_method).toBe(params.requestMethod);
            } else {
              expect(event.request_method).toBeNull();
            }
            
            if (params.actionTaken !== undefined) {
              expect(event.action_taken).toBe(params.actionTaken);
            } else {
              expect(event.action_taken).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Payload samples should be truncated to 1000 characters maximum
     * 
     * Validates: Requirements 3.1
     * Feature: security-hardening, Property 6: Security Event Logging Completeness
     */
    it('should truncate payload samples to 1000 characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 3000 }),
          fc.constantFrom(...validEventTypes),
          fc.constantFrom(...validSeverities),
          (payloadSample, eventType, severity) => {
            const params: LogSecurityEventParams = {
              eventType,
              severity,
              description: 'Test event',
              payloadSample,
            };
            
            const event = createEventObject(params);
            
            if (payloadSample.length > 1000) {
              // Should be truncated
              expect(event.payload_sample?.length).toBe(1000);
              expect(event.payload_sample).toBe(payloadSample.substring(0, 1000));
            } else if (payloadSample.length > 0) {
              // Should be preserved
              expect(event.payload_sample).toBe(payloadSample);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Events should be classified into valid severity levels
     * 
     * Validates: Requirements 3.4
     * Feature: security-hardening, Property 6: Security Event Logging Completeness
     */
    it('should classify events into valid severity levels', () => {
      fc.assert(
        fc.property(
          eventParamsArb,
          (params) => {
            const event = createEventObject(params);
            
            // Severity should be one of the valid levels
            expect(validSeverities).toContain(event.severity);
            
            // Severity should match what was provided
            expect(event.severity).toBe(params.severity);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: New events should have investigated=false by default
     * 
     * Validates: Requirements 3.5
     * Feature: security-hardening, Property 6: Security Event Logging Completeness
     */
    it('should create events with investigated=false by default', () => {
      fc.assert(
        fc.property(
          eventParamsArb,
          (params) => {
            const event = createEventObject(params);
            
            // New events should not be investigated
            expect(event.investigated).toBe(false);
            expect(event.investigated_by).toBeNull();
            expect(event.investigation_notes).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Event IDs should be unique for each created event
     * 
     * Validates: Requirements 3.1
     * Feature: security-hardening, Property 6: Security Event Logging Completeness
     */
    it('should generate unique IDs for each event', () => {
      fc.assert(
        fc.property(
          fc.array(eventParamsArb, { minLength: 2, maxLength: 50 }),
          (paramsArray) => {
            const events = paramsArray.map(params => createEventObject(params));
            const ids = events.map(e => e.id);
            const uniqueIds = new Set(ids);
            
            // All IDs should be unique
            expect(uniqueIds.size).toBe(ids.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Event Validation Utility', () => {
    /**
     * Property: isValidEvent should return true for events with all required fields
     * 
     * Validates: Requirements 3.1
     */
    it('should validate events with all required fields', () => {
      fc.assert(
        fc.property(
          eventParamsArb,
          (params) => {
            const event = createEventObject(params);
            
            // Complete events should be valid
            expect(isValidEvent(event)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: isValidEvent should return false for events missing required fields
     * 
     * Validates: Requirements 3.1
     */
    it('should reject events missing required fields', () => {
      fc.assert(
        fc.property(
          eventParamsArb,
          (params) => {
            const event = createEventObject(params);
            
            // Missing timestamp
            expect(isValidEvent({ ...event, timestamp: undefined as unknown as string })).toBe(false);
            
            // Missing event_type
            expect(isValidEvent({ ...event, event_type: undefined as unknown as SecurityEventType })).toBe(false);
            
            // Missing severity
            expect(isValidEvent({ ...event, severity: undefined as unknown as SecuritySeverity })).toBe(false);
            
            // Missing description
            expect(isValidEvent({ ...event, description: undefined as unknown as string })).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Severity Level Utilities', () => {
    /**
     * Property: getSeverityLevel should return correct numeric values
     * 
     * Validates: Requirements 3.4
     */
    it('should return correct severity levels', () => {
      expect(getSeverityLevel('low')).toBe(0);
      expect(getSeverityLevel('medium')).toBe(1);
      expect(getSeverityLevel('high')).toBe(2);
      expect(getSeverityLevel('critical')).toBe(3);
    });

    /**
     * Property: compareSeverity should correctly order severities
     * 
     * Validates: Requirements 3.4
     */
    it('should correctly compare severity levels', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...validSeverities),
          fc.constantFrom(...validSeverities),
          (a, b) => {
            const comparison = compareSeverity(a, b);
            const levelA = getSeverityLevel(a);
            const levelB = getSeverityLevel(b);
            
            if (levelA < levelB) {
              expect(comparison).toBeLessThan(0);
            } else if (levelA > levelB) {
              expect(comparison).toBeGreaterThan(0);
            } else {
              expect(comparison).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Severity comparison should be transitive
     * If a < b and b < c, then a < c
     * 
     * Validates: Requirements 3.4
     */
    it('should have transitive severity comparison', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...validSeverities),
          fc.constantFrom(...validSeverities),
          fc.constantFrom(...validSeverities),
          (a, b, c) => {
            const ab = compareSeverity(a, b);
            const bc = compareSeverity(b, c);
            const ac = compareSeverity(a, c);
            
            // If a < b and b < c, then a < c
            if (ab < 0 && bc < 0) {
              expect(ac).toBeLessThan(0);
            }
            
            // If a > b and b > c, then a > c
            if (ab > 0 && bc > 0) {
              expect(ac).toBeGreaterThan(0);
            }
            
            // If a == b and b == c, then a == c
            if (ab === 0 && bc === 0) {
              expect(ac).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
