/**
 * Security Middleware
 *
 * Provides security middleware functions for Next.js including:
 * - Security headers (CSP, X-Frame-Options, etc.)
 * - Rate limiting integration
 * - Input validation
 * - IP blocking
 *
 * @module lib/security/middleware
 */

import { NextResponse, type NextRequest } from 'next/server';
import type { SecurityMiddlewareConfig, RateLimitResult } from './types';

// =============================================================================
// Security Headers Configuration
// =============================================================================

/**
 * Content Security Policy directives
 * Configured to allow Next.js functionality while preventing XSS
 */
const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for Next.js
  'style-src': ["'self'", "'unsafe-inline'"], // Required for Tailwind/styled-jsx
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'],
  'frame-ancestors': ["'none'"],
  'form-action': ["'self'"],
  'base-uri': ["'self'"],
  'object-src': ["'none'"],
  'upgrade-insecure-requests': [],
};

/**
 * Builds the Content-Security-Policy header value
 */
function buildCSPHeader(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, values]) => {
      if (values.length === 0) {
        return directive;
      }
      return `${directive} ${values.join(' ')}`;
    })
    .join('; ');
}

// =============================================================================
// Security Headers Functions
// =============================================================================

/**
 * Applies security headers to a response
 *
 * @param response - The NextResponse to add headers to
 * @returns The response with security headers added
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  // Content-Security-Policy - Prevents XSS attacks (Requirement 8.1)
  response.headers.set('Content-Security-Policy', buildCSPHeader());

  // X-Frame-Options - Prevents clickjacking (Requirement 8.2)
  response.headers.set('X-Frame-Options', 'DENY');

  // X-Content-Type-Options - Prevents MIME sniffing (Requirement 8.3)
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Strict-Transport-Security - Enforces HTTPS (Requirement 8.4)
  // max-age=31536000 = 1 year, includeSubDomains for all subdomains
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // X-XSS-Protection - Legacy XSS protection (Requirement 8.5)
  // Note: Modern browsers have deprecated this, but it's still useful for older browsers
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Additional security headers
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Remove potentially dangerous headers
  response.headers.delete('X-Powered-By');

  return response;
}

/**
 * Creates a new response with security headers
 *
 * @param body - Response body (optional)
 * @param init - Response init options (optional)
 * @returns NextResponse with security headers
 */
export function createSecureResponse(
  body?: BodyInit | null,
  init?: ResponseInit
): NextResponse {
  const response = new NextResponse(body, init);
  return applySecurityHeaders(response);
}

// =============================================================================
// Rate Limit Headers Functions
// =============================================================================

/**
 * Applies rate limit headers to a response
 *
 * @param response - The NextResponse to add headers to
 * @param result - The rate limit check result
 * @param limit - The configured rate limit
 * @returns The response with rate limit headers added
 */
export function applyRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
  limit: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', Math.max(0, result.remaining).toString());
  response.headers.set(
    'X-RateLimit-Reset',
    Math.floor(result.resetAt.getTime() / 1000).toString()
  );

  if (!result.allowed) {
    const retryAfterSeconds = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);
    response.headers.set('Retry-After', Math.max(0, retryAfterSeconds).toString());
  }

  return response;
}

/**
 * Creates a rate limited response (429 Too Many Requests)
 *
 * @param result - The rate limit check result
 * @param limit - The configured rate limit
 * @returns NextResponse with 429 status and appropriate headers
 */
export function createRateLimitedResponse(
  result: RateLimitResult,
  limit: number
): NextResponse {
  const response = new NextResponse(
    JSON.stringify({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  applySecurityHeaders(response);
  applyRateLimitHeaders(response, result, limit);

  return response;
}

// =============================================================================
// IP Blocked Response
// =============================================================================

/**
 * Creates a blocked IP response (403 Forbidden)
 *
 * @returns NextResponse with 403 status
 */
export function createBlockedIPResponse(): NextResponse {
  const response = new NextResponse(
    JSON.stringify({
      error: 'Forbidden',
      message: 'Access denied.',
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  applySecurityHeaders(response);
  return response;
}

// =============================================================================
// Input Validation Response
// =============================================================================

/**
 * Creates an invalid input response (400 Bad Request)
 *
 * @param message - Error message to include
 * @returns NextResponse with 400 status
 */
export function createInvalidInputResponse(message: string = 'Invalid input detected'): NextResponse {
  const response = new NextResponse(
    JSON.stringify({
      error: 'Bad Request',
      message,
    }),
    {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  applySecurityHeaders(response);
  return response;
}

// =============================================================================
// Request Helpers
// =============================================================================

/**
 * Extracts the client IP address from a request
 *
 * @param request - The incoming request
 * @returns The client IP address or 'unknown'
 */
export function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP (in order of preference)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }

  // Fallback to connection info (may not be available in all environments)
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }

  return 'unknown';
}

/**
 * Gets the request path for rate limiting purposes
 *
 * @param request - The incoming request
 * @returns Normalized request path
 */
export function getRequestPath(request: NextRequest): string {
  const url = new URL(request.url);
  return url.pathname;
}

/**
 * Gets the user agent from a request
 *
 * @param request - The incoming request
 * @returns The user agent string or 'unknown'
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default security middleware configuration
 */
export const DEFAULT_SECURITY_CONFIG: SecurityMiddlewareConfig = {
  rateLimitEnabled: true,
  inputValidationEnabled: true,
  securityHeadersEnabled: true,
  ipBlockingEnabled: true,
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Checks if a path should skip security checks (e.g., static assets)
 *
 * @param pathname - The request pathname
 * @returns Whether to skip security checks
 */
export function shouldSkipSecurityChecks(pathname: string): boolean {
  // Skip for static assets and Next.js internals
  const skipPatterns = [
    /^\/_next\//,
    /^\/favicon\.ico$/,
    /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$/,
  ];

  return skipPatterns.some((pattern) => pattern.test(pathname));
}

/**
 * Checks if a path is an API route
 *
 * @param pathname - The request pathname
 * @returns Whether the path is an API route
 */
export function isAPIRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

/**
 * Checks if a path is an authentication route
 *
 * @param pathname - The request pathname
 * @returns Whether the path is an auth route
 */
export function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith('/auth/') || pathname === '/login';
}


// =============================================================================
// Rate Limiting Middleware Functions
// =============================================================================

import { checkRateLimit, getConfigForEndpoint } from './rate-limiter';
import { isBlocked, blockIP } from './ip-blocker';
import { logEvent } from './event-logger';

/** Track repeated rate limit violations for auto-blocking */
const violationCounts = new Map<string, { count: number; lastViolation: number }>();

/** Number of violations before auto-blocking */
const AUTO_BLOCK_THRESHOLD = 5;

/** Time window for counting violations (in ms) */
const VIOLATION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/** Duration to auto-block (in seconds) */
const AUTO_BLOCK_DURATION_SECONDS = 30 * 60; // 30 minutes

/**
 * Performs rate limiting check for a request
 *
 * @param request - The incoming request
 * @returns Rate limit result and response if blocked
 */
export async function performRateLimitCheck(
  request: NextRequest
): Promise<{
  allowed: boolean;
  result: RateLimitResult;
  response?: NextResponse;
}> {
  const clientIP = getClientIP(request);
  const pathname = getRequestPath(request);
  const config = getConfigForEndpoint(pathname);

  try {
    const result = await checkRateLimit(clientIP, pathname, config);

    if (!result.allowed) {
      // Track violation for potential auto-blocking
      await trackViolation(clientIP, pathname, request);

      return {
        allowed: false,
        result,
        response: createRateLimitedResponse(result, config.limit),
      };
    }

    return { allowed: true, result };
  } catch (error) {
    // Fail open - allow request if rate limiting fails
    console.error('Rate limit check failed:', error);
    return {
      allowed: true,
      result: {
        allowed: true,
        remaining: config.limit,
        resetAt: new Date(Date.now() + config.windowSeconds * 1000),
        blocked: false,
      },
    };
  }
}

/**
 * Tracks rate limit violations and auto-blocks repeat offenders
 *
 * @param clientIP - The client IP address
 * @param pathname - The request path
 * @param request - The original request
 */
async function trackViolation(
  clientIP: string,
  pathname: string,
  request: NextRequest
): Promise<void> {
  const now = Date.now();
  const key = clientIP;

  // Get or create violation record
  let record = violationCounts.get(key);

  if (!record || now - record.lastViolation > VIOLATION_WINDOW_MS) {
    // Reset if outside window
    record = { count: 1, lastViolation: now };
  } else {
    record.count++;
    record.lastViolation = now;
  }

  violationCounts.set(key, record);

  // Check if threshold exceeded for auto-blocking
  if (record.count >= AUTO_BLOCK_THRESHOLD) {
    // Auto-block the IP
    await blockIP({
      ipAddress: clientIP,
      reason: `Automatic block: ${record.count} rate limit violations in ${VIOLATION_WINDOW_MS / 1000 / 60} minutes`,
      durationSeconds: AUTO_BLOCK_DURATION_SECONDS,
    });

    // Log the auto-block event
    await logEvent({
      eventType: 'rate_limit_exceeded',
      severity: 'high',
      description: `IP ${clientIP} auto-blocked after ${record.count} rate limit violations`,
      ipAddress: clientIP,
      userAgent: getUserAgent(request),
      requestPath: pathname,
      actionTaken: 'ip_auto_blocked',
    });

    // Reset the violation count
    violationCounts.delete(key);
  }
}

/**
 * Cleans up old violation records to prevent memory leaks
 * Should be called periodically
 */
export function cleanupViolationRecords(): void {
  const now = Date.now();
  for (const [key, record] of violationCounts.entries()) {
    if (now - record.lastViolation > VIOLATION_WINDOW_MS) {
      violationCounts.delete(key);
    }
  }
}

// =============================================================================
// IP Blocking Middleware Functions
// =============================================================================

/**
 * Performs IP blocking check for a request
 *
 * @param request - The incoming request
 * @returns Whether the IP is blocked and response if so
 */
export async function performIPBlockCheck(
  request: NextRequest
): Promise<{
  blocked: boolean;
  response?: NextResponse;
}> {
  const clientIP = getClientIP(request);

  // Skip check for unknown IPs (local development)
  if (clientIP === 'unknown' || clientIP === '127.0.0.1' || clientIP === '::1') {
    return { blocked: false };
  }

  try {
    const result = await isBlocked(clientIP);

    if (result.blocked) {
      return {
        blocked: true,
        response: createBlockedIPResponse(),
      };
    }

    return { blocked: false };
  } catch (error) {
    // Fail open - allow request if IP check fails
    console.error('IP block check failed:', error);
    return { blocked: false };
  }
}

// =============================================================================
// Combined Security Middleware
// =============================================================================

/**
 * Applies all security middleware checks to a request
 *
 * @param request - The incoming request
 * @param config - Security middleware configuration
 * @returns Response if request should be blocked, undefined otherwise
 */
export async function applySecurityMiddleware(
  request: NextRequest,
  config: SecurityMiddlewareConfig = DEFAULT_SECURITY_CONFIG
): Promise<NextResponse | undefined> {
  const pathname = getRequestPath(request);

  // Skip security checks for static assets
  if (shouldSkipSecurityChecks(pathname)) {
    return undefined;
  }

  // Check IP blocking first (fastest rejection)
  if (config.ipBlockingEnabled) {
    const ipCheck = await performIPBlockCheck(request);
    if (ipCheck.blocked && ipCheck.response) {
      return ipCheck.response;
    }
  }

  // Check rate limiting
  if (config.rateLimitEnabled) {
    const rateCheck = await performRateLimitCheck(request);
    if (!rateCheck.allowed && rateCheck.response) {
      return rateCheck.response;
    }
  }

  // All checks passed
  return undefined;
}


// =============================================================================
// Input Validation Middleware Functions
// =============================================================================

import { validateInput, detectSQLInjection, detectXSS } from './input-validator';
import type { ThreatDetection, SecurityEventType } from './types';

/**
 * Performs input validation on request body and query parameters
 *
 * @param request - The incoming request
 * @returns Validation result and response if threats detected
 */
export async function performInputValidation(
  request: NextRequest
): Promise<{
  valid: boolean;
  threats: ThreatDetection[];
  response?: NextResponse;
}> {
  const threats: ThreatDetection[] = [];
  const pathname = getRequestPath(request);
  const clientIP = getClientIP(request);
  const userAgent = getUserAgent(request);

  try {
    // Validate query parameters
    const url = new URL(request.url);
    for (const [key, value] of url.searchParams.entries()) {
      const result = validateInput(value);
      if (!result.valid) {
        threats.push(...result.threats);
        
        // Log each threat
        for (const threat of result.threats) {
          await logSecurityThreat(threat, {
            ipAddress: clientIP,
            userAgent,
            requestPath: pathname,
            requestMethod: request.method,
            payloadSample: `Query param "${key}": ${value.substring(0, 100)}`,
          });
        }
      }
    }

    // Validate request body for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const bodyThreats = await validateRequestBody(request, {
        ipAddress: clientIP,
        userAgent,
        requestPath: pathname,
        requestMethod: request.method,
      });
      threats.push(...bodyThreats);
    }

    // If threats detected, return error response
    if (threats.length > 0) {
      // Determine the most severe threat
      const hasCritical = threats.some((t) => t.severity === 'critical');
      const hasHigh = threats.some((t) => t.severity === 'high');

      let message = 'Invalid input detected';
      if (hasCritical || hasHigh) {
        message = 'Potentially malicious input detected';
      }

      return {
        valid: false,
        threats,
        response: createInvalidInputResponse(message),
      };
    }

    return { valid: true, threats: [] };
  } catch (error) {
    // Fail open - allow request if validation fails
    console.error('Input validation failed:', error);
    return { valid: true, threats: [] };
  }
}

/**
 * Validates the request body for threats
 *
 * @param request - The incoming request
 * @param context - Context for logging
 * @returns Array of detected threats
 */
async function validateRequestBody(
  request: NextRequest,
  context: {
    ipAddress: string;
    userAgent: string;
    requestPath: string;
    requestMethod: string;
  }
): Promise<ThreatDetection[]> {
  const threats: ThreatDetection[] = [];

  try {
    // Clone the request to read the body without consuming it
    const clonedRequest = request.clone();
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await clonedRequest.json();
      const bodyThreats = validateObjectRecursively(body);
      
      for (const threat of bodyThreats) {
        threats.push(threat);
        await logSecurityThreat(threat, {
          ...context,
          payloadSample: JSON.stringify(body).substring(0, 200),
        });
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await clonedRequest.formData();
      for (const [key, value] of formData.entries()) {
        if (typeof value === 'string') {
          const result = validateInput(value);
          if (!result.valid) {
            for (const threat of result.threats) {
              threats.push(threat);
              await logSecurityThreat(threat, {
                ...context,
                payloadSample: `Form field "${key}": ${value.substring(0, 100)}`,
              });
            }
          }
        }
      }
    } else if (contentType.includes('text/plain')) {
      const text = await clonedRequest.text();
      const result = validateInput(text);
      if (!result.valid) {
        for (const threat of result.threats) {
          threats.push(threat);
          await logSecurityThreat(threat, {
            ...context,
            payloadSample: text.substring(0, 200),
          });
        }
      }
    }
  } catch {
    // Body parsing failed - not necessarily a security issue
    // Could be malformed JSON, etc.
  }

  return threats;
}

/**
 * Recursively validates all string values in an object
 *
 * @param obj - The object to validate
 * @param maxDepth - Maximum recursion depth
 * @returns Array of detected threats
 */
function validateObjectRecursively(
  obj: unknown,
  maxDepth: number = 10
): ThreatDetection[] {
  const threats: ThreatDetection[] = [];

  if (maxDepth <= 0) {
    return threats;
  }

  if (typeof obj === 'string') {
    const result = validateInput(obj);
    if (!result.valid) {
      threats.push(...result.threats);
    }
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      threats.push(...validateObjectRecursively(item, maxDepth - 1));
    }
  } else if (obj !== null && typeof obj === 'object') {
    for (const value of Object.values(obj)) {
      threats.push(...validateObjectRecursively(value, maxDepth - 1));
    }
  }

  return threats;
}

/**
 * Logs a security threat as a security event
 *
 * @param threat - The detected threat
 * @param context - Additional context for the event
 */
async function logSecurityThreat(
  threat: ThreatDetection,
  context: {
    ipAddress: string;
    userAgent: string;
    requestPath: string;
    requestMethod: string;
    payloadSample?: string;
  }
): Promise<void> {
  // Map threat type to security event type
  const eventTypeMap: Record<string, SecurityEventType> = {
    sql_injection: 'sql_injection_attempt',
    xss: 'xss_attempt',
    path_traversal: 'path_traversal_attempt',
    command_injection: 'command_injection_attempt',
  };

  const eventType = eventTypeMap[threat.type] || 'suspicious_activity';

  await logEvent({
    eventType,
    severity: threat.severity,
    description: `${threat.type} detected: ${threat.pattern}`,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestPath: context.requestPath,
    requestMethod: context.requestMethod,
    payloadSample: context.payloadSample,
    actionTaken: 'request_blocked',
  });
}

/**
 * Quick check for common attack patterns without full validation
 * Useful for lightweight checks on specific fields
 *
 * @param input - The input to check
 * @returns Whether the input appears safe
 */
export function quickSecurityCheck(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return true;
  }

  // Quick checks for most common attack patterns
  return !detectSQLInjection(input) && !detectXSS(input);
}

// =============================================================================
// Full Security Middleware with Input Validation
// =============================================================================

/**
 * Applies all security middleware checks including input validation
 *
 * @param request - The incoming request
 * @param config - Security middleware configuration
 * @returns Response if request should be blocked, undefined otherwise
 */
export async function applyFullSecurityMiddleware(
  request: NextRequest,
  config: SecurityMiddlewareConfig = DEFAULT_SECURITY_CONFIG
): Promise<NextResponse | undefined> {
  const pathname = getRequestPath(request);

  // Skip security checks for static assets
  if (shouldSkipSecurityChecks(pathname)) {
    return undefined;
  }

  // Check IP blocking first (fastest rejection)
  if (config.ipBlockingEnabled) {
    const ipCheck = await performIPBlockCheck(request);
    if (ipCheck.blocked && ipCheck.response) {
      return ipCheck.response;
    }
  }

  // Check rate limiting
  if (config.rateLimitEnabled) {
    const rateCheck = await performRateLimitCheck(request);
    if (!rateCheck.allowed && rateCheck.response) {
      return rateCheck.response;
    }
  }

  // Validate input (only for API routes to avoid blocking page navigation)
  if (config.inputValidationEnabled && isAPIRoute(pathname)) {
    const inputCheck = await performInputValidation(request);
    if (!inputCheck.valid && inputCheck.response) {
      return inputCheck.response;
    }
  }

  // All checks passed
  return undefined;
}
