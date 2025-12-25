# Implementation Plan: Security Hardening

## Overview

This implementation plan covers the security hardening features for Gama ERP, including database schema, security utilities, middleware, and comprehensive testing.

## Tasks

- [x] 1. Set up database schema and types
  - [x] 1.1 Create database migration for security tables
    - Create rate_limit_log, security_events, api_keys, blocked_ips, user_sessions tables
    - Add all indexes for performance
    - _Requirements: 1.1, 3.1, 4.1, 5.1, 6.1_
  - [x] 1.2 Create TypeScript types for security module
    - Create lib/security/types.ts with all interfaces
    - _Requirements: All_
  - [x] 1.3 Enable RLS policies on sensitive tables
    - Enable RLS on job_orders, invoices, employees
    - Create role-based access policies
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2. Implement Input Validator
  - [x] 2.1 Create input validation utility
    - Implement sanitizeInput, detectSQLInjection, detectXSS functions
    - Implement validateInput and validateFileUpload
    - Create lib/security/input-validator.ts
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 2.2 Write property test for SQL injection detection
    - **Property 4: SQL Injection Detection**
    - **Validates: Requirements 2.2**
  - [x] 2.3 Write property test for XSS detection
    - **Property 5: XSS Detection**
    - **Validates: Requirements 2.3**
  - [x] 2.4 Write property test for sanitization preservation
    - **Property 3: Input Sanitization Preservation**
    - **Validates: Requirements 2.1, 2.5**

- [x] 3. Implement Security Event Logger
  - [x] 3.1 Create security event logging utility
    - Implement logEvent, getEventsByType, getEventsBySeverity
    - Implement markInvestigated and sendSecurityAlert
    - Create lib/security/event-logger.ts
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 3.2 Write property test for event logging completeness
    - **Property 6: Security Event Logging Completeness**
    - **Validates: Requirements 3.1, 3.2, 3.4**

- [x] 4. Implement Rate Limiter
  - [x] 4.1 Create rate limiting utility
    - Implement checkRateLimit with configurable limits
    - Implement getRateLimitHeaders
    - Implement cleanupOldEntries
    - Create lib/security/rate-limiter.ts
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 4.2 Write property test for rate limiting enforcement
    - **Property 1: Rate Limiting Enforcement**
    - **Validates: Requirements 1.1, 1.2**
  - [x] 4.3 Write property test for rate limit headers
    - **Property 2: Rate Limit Headers Consistency**
    - **Validates: Requirements 1.3**

- [x] 5. Checkpoint - Core utilities complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement API Key Manager
  - [x] 6.1 Create API key management utility
    - Implement generateKey with secure random generation
    - Implement validateKey with hash verification
    - Implement revokeKey, listUserKeys, updateKeyPermissions
    - Create lib/security/api-key-manager.ts
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [x] 6.2 Write property test for API key round-trip
    - **Property 7: API Key Round-Trip**
    - **Validates: Requirements 4.1, 4.2, 4.5**
  - [x] 6.3 Write property test for expired API key rejection
    - **Property 8: Expired API Key Rejection**
    - **Validates: Requirements 4.6**

- [x] 7. Implement Session Manager
  - [x] 7.1 Create session management utility
    - Implement createSession with secure token generation
    - Implement validateSession with hash verification
    - Implement terminateSession, terminateAllUserSessions
    - Implement session limit enforcement (max 5)
    - Create lib/security/session-manager.ts
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [x] 7.2 Write property test for session round-trip
    - **Property 9: Session Token Round-Trip**
    - **Validates: Requirements 5.1, 5.2**
  - [x] 7.3 Write property test for session limit enforcement
    - **Property 10: Session Limit Enforcement**
    - **Validates: Requirements 5.3**
  - [x] 7.4 Write property test for expired session rejection
    - **Property 11: Expired Session Rejection**
    - **Validates: Requirements 5.4**

- [x] 8. Implement IP Blocker
  - [x] 8.1 Create IP blocking utility
    - Implement isBlocked, blockIP, unblockIP
    - Implement listBlockedIPs, cleanupExpiredBlocks
    - Create lib/security/ip-blocker.ts
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [x] 8.2 Write property test for IP blocking round-trip
    - **Property 12: IP Blocking Round-Trip**
    - **Validates: Requirements 6.1, 6.2**
  - [x] 8.3 Write property test for expired block automatic lift
    - **Property 13: Expired Block Automatic Lift**
    - **Validates: Requirements 6.4**

- [x] 9. Checkpoint - Security services complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Security Middleware
  - [x] 10.1 Create security headers middleware
    - Add CSP, X-Frame-Options, X-Content-Type-Options headers
    - Add Strict-Transport-Security, X-XSS-Protection headers
    - Update middleware.ts
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [x] 10.2 Create rate limiting middleware
    - Integrate rate limiter with request handling
    - Add automatic IP blocking for repeated violations
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 10.3 Create input validation middleware
    - Integrate input validator with request handling
    - Log security events for detected threats
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 11. Create Security Admin UI
  - [x] 11.1 Create security events viewer page
    - Display security events with filtering by type/severity
    - Allow marking events as investigated
    - Create app/(main)/admin/security/events/page.tsx
    - _Requirements: 3.1, 3.5_
  - [x] 11.2 Create blocked IPs management page
    - Display blocked IPs with block/unblock actions
    - Show block reason and expiration
    - Create app/(main)/admin/security/blocked-ips/page.tsx
    - _Requirements: 6.1, 6.2_
  - [x] 11.3 Create API keys management page
    - Display API keys with create/revoke actions
    - Show usage statistics and permissions
    - Create app/(main)/admin/security/api-keys/page.tsx
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [x] 11.4 Create active sessions viewer page
    - Display active sessions per user
    - Allow terminating sessions
    - Create app/(main)/admin/security/sessions/page.tsx
    - _Requirements: 5.1, 5.5, 5.6_

- [x] 12. Implement Server Actions
  - [x] 12.1 Create security event actions
    - Implement getSecurityEvents, markEventInvestigated
    - Create app/actions/security-events.ts
    - _Requirements: 3.1, 3.5_
  - [x] 12.2 Create IP blocking actions
    - Implement blockIP, unblockIP, getBlockedIPs
    - Create app/actions/ip-blocking.ts
    - _Requirements: 6.1, 6.2_
  - [x] 12.3 Create API key actions
    - Implement createAPIKey, revokeAPIKey, getAPIKeys
    - Create app/actions/api-keys.ts
    - _Requirements: 4.1, 4.2_
  - [x] 12.4 Create session management actions
    - Implement getUserSessions, terminateSession
    - Create app/actions/sessions.ts
    - _Requirements: 5.1, 5.5_

- [x] 13. Final checkpoint - All features complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive security coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Use fast-check library for property-based testing
