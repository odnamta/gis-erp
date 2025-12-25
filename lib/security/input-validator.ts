/**
 * Input Validator
 *
 * Provides input validation and sanitization to protect against
 * SQL injection, XSS, path traversal, and command injection attacks.
 *
 * @module lib/security/input-validator
 */

import type {
  ValidationResult,
  ThreatDetection,
  ThreatType,
  FileValidationConfig,
  SecuritySeverity,
} from './types';
import { DEFAULT_FILE_VALIDATION } from './types';

// =============================================================================
// SQL Injection Detection Patterns
// =============================================================================

/**
 * Common SQL injection patterns to detect
 */
const SQL_INJECTION_PATTERNS: RegExp[] = [
  // SQL keywords with potential injection context
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|EXEC|EXECUTE)\b)/i,
  // UNION-based injection
  /\bUNION\s+(ALL\s+)?SELECT\b/i,
  // Comment-based injection
  /(--|#|\/\*|\*\/)/,
  // OR/AND-based injection with quotes
  /'\s*(OR|AND)\s*'?\s*\d*\s*=\s*\d*/i,
  /"\s*(OR|AND)\s*"?\s*\d*\s*=\s*\d*/i,
  // Always true conditions
  /'\s*=\s*'/,
  /"\s*=\s*"/,
  /\b1\s*=\s*1\b/,
  /\b0\s*=\s*0\b/,
  // Stacked queries
  /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE)/i,
  // WAITFOR/SLEEP/BENCHMARK (time-based injection) - match anywhere
  /WAITFOR\s+DELAY/i,
  /SLEEP\s*\(/i,
  /BENCHMARK\s*\(/i,
  // Information schema access
  /INFORMATION_SCHEMA/i,
  /SYS\./i,
  /SYSOBJECTS/i,
  /SYSCOLUMNS/i,
  // Hex encoding bypass attempts
  /0x[0-9a-fA-F]+/,
  // CHAR function bypass
  /CHAR\s*\(\s*\d+\s*\)/i,
  // Concatenation-based injection
  /\|\|.*SELECT/i,
  /CONCAT\s*\(.*SELECT/i,
];

// =============================================================================
// XSS Detection Patterns
// =============================================================================

/**
 * Common XSS patterns to detect
 */
const XSS_PATTERNS: RegExp[] = [
  // Script tags
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  /<script\b[^>]*>/gi,
  // Event handlers
  /\bon\w+\s*=/gi,
  // JavaScript URIs
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  // Expression/eval - match anywhere (these are dangerous regardless of context)
  /expression\s*\(/gi,
  /eval\s*\(/gi,
  // Document/window access
  /document\s*\.\s*(cookie|domain|write|location)/gi,
  /window\s*\.\s*(location|open)/gi,
  // innerHTML/outerHTML
  /\.(innerHTML|outerHTML)\s*=/gi,
  // SVG-based XSS
  /<svg\b[^>]*\bon\w+\s*=/gi,
  // IMG onerror
  /<img\b[^>]*\bonerror\s*=/gi,
  // Iframe injection
  /<iframe\b[^>]*>/gi,
  // Object/embed tags
  /<(object|embed|applet)\b[^>]*>/gi,
  // Base tag hijacking
  /<base\b[^>]*>/gi,
  // Form action hijacking
  /<form\b[^>]*\baction\s*=/gi,
  // Meta refresh - more flexible pattern
  /<meta\b[^>]*http-equiv\s*=\s*["']?\s*refresh/gi,
  // Style-based XSS
  /style\s*=\s*["'][^"']*expression\s*\(/gi,
  /style\s*=\s*["'][^"']*javascript\s*:/gi,
];

// =============================================================================
// Path Traversal Detection Patterns
// =============================================================================

/**
 * Path traversal patterns to detect
 */
const PATH_TRAVERSAL_PATTERNS: RegExp[] = [
  // Directory traversal
  /\.\.\//g,
  /\.\.\\/, // Windows-style
  // URL-encoded traversal
  /%2e%2e%2f/gi,
  /%2e%2e\//gi,
  /\.\.%2f/gi,
  /%2e%2e%5c/gi,
  // Double URL-encoded
  /%252e%252e%252f/gi,
  // Null byte injection
  /%00/g,
  /\x00/g,
  // Absolute path attempts
  /^\/etc\//i,
  /^\/var\//i,
  /^\/usr\//i,
  /^c:\\/i,
  /^d:\\/i,
];

// =============================================================================
// Command Injection Detection Patterns
// =============================================================================

/**
 * Command injection patterns to detect
 */
const COMMAND_INJECTION_PATTERNS: RegExp[] = [
  // Shell metacharacters
  /[;&|`$]/,
  // Command substitution
  /\$\([^)]+\)/,
  /`[^`]+`/,
  // Pipe and redirect
  /\|\s*\w+/,
  />\s*\w+/,
  /<\s*\w+/,
  // Common dangerous commands
  /\b(rm|mv|cp|cat|wget|curl|chmod|chown|kill|pkill)\b/i,
  // Newline injection
  /\n|\r/,
  // Backtick execution
  /`.*`/,
];

// =============================================================================
// Sanitization Functions
// =============================================================================

/**
 * HTML entities to escape
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Sanitizes input by removing or escaping potentially dangerous characters
 * while preserving the semantic meaning of safe content.
 *
 * @param input - The input string to sanitize
 * @returns Sanitized string with dangerous patterns removed/escaped
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Remove null bytes
  sanitized = sanitized.replace(/\x00/g, '');
  sanitized = sanitized.replace(/%00/g, '');

  // Escape HTML entities to prevent XSS
  sanitized = sanitized.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  sanitized = sanitized.replace(/<script\b[^>]*>/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\bon\w+\s*=[^\s>]*/gi, '');

  // Remove javascript: and vbscript: URIs
  sanitized = sanitized.replace(/javascript\s*:/gi, '');
  sanitized = sanitized.replace(/vbscript\s*:/gi, '');

  // Remove dangerous tags
  sanitized = sanitized.replace(/<(iframe|object|embed|applet|base|form|meta)[^>]*>/gi, '');

  // Normalize whitespace (but preserve single spaces)
  sanitized = sanitized.replace(/[\t\r\n]+/g, ' ');

  // Trim excessive whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

// =============================================================================
// Detection Functions
// =============================================================================

/**
 * Detects SQL injection patterns in input
 *
 * @param input - The input string to check
 * @returns true if SQL injection patterns are detected
 */
export function detectSQLInjection(input: string): boolean {
  if (typeof input !== 'string' || input.length === 0) {
    return false;
  }

  // Normalize input for detection
  const normalized = input.toLowerCase();

  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input) || pattern.test(normalized)) {
      return true;
    }
  }

  return false;
}

/**
 * Detects XSS patterns in input
 *
 * @param input - The input string to check
 * @returns true if XSS patterns are detected
 */
export function detectXSS(input: string): boolean {
  if (typeof input !== 'string' || input.length === 0) {
    return false;
  }

  for (const pattern of XSS_PATTERNS) {
    // Reset lastIndex for global regexes to avoid state issues
    pattern.lastIndex = 0;
    if (pattern.test(input)) {
      return true;
    }
  }

  return false;
}

/**
 * Detects path traversal patterns in input
 *
 * @param input - The input string to check
 * @returns true if path traversal patterns are detected
 */
export function detectPathTraversal(input: string): boolean {
  if (typeof input !== 'string' || input.length === 0) {
    return false;
  }

  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }

  return false;
}

/**
 * Detects command injection patterns in input
 *
 * @param input - The input string to check
 * @returns true if command injection patterns are detected
 */
export function detectCommandInjection(input: string): boolean {
  if (typeof input !== 'string' || input.length === 0) {
    return false;
  }

  for (const pattern of COMMAND_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }

  return false;
}

// =============================================================================
// Threat Detection Helper
// =============================================================================

/**
 * Gets the severity level for a threat type
 */
function getThreatSeverity(type: ThreatType): SecuritySeverity {
  switch (type) {
    case 'sql_injection':
      return 'critical';
    case 'xss':
      return 'high';
    case 'command_injection':
      return 'critical';
    case 'path_traversal':
      return 'high';
    default:
      return 'medium';
  }
}

/**
 * Finds the matching pattern for a threat type
 */
function findMatchingPattern(input: string, type: ThreatType): string {
  let patterns: RegExp[];

  switch (type) {
    case 'sql_injection':
      patterns = SQL_INJECTION_PATTERNS;
      break;
    case 'xss':
      patterns = XSS_PATTERNS;
      break;
    case 'path_traversal':
      patterns = PATH_TRAVERSAL_PATTERNS;
      break;
    case 'command_injection':
      patterns = COMMAND_INJECTION_PATTERNS;
      break;
    default:
      return 'unknown';
  }

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      return match[0].substring(0, 50); // Limit pattern length
    }
  }

  return 'pattern detected';
}

// =============================================================================
// Main Validation Functions
// =============================================================================

/**
 * Validates and sanitizes input, detecting any security threats
 *
 * @param input - The input string to validate
 * @returns ValidationResult with validity status, sanitized value, and detected threats
 */
export function validateInput(input: string): ValidationResult {
  const threats: ThreatDetection[] = [];

  if (typeof input !== 'string') {
    return {
      valid: true,
      sanitizedValue: '',
      threats: [],
    };
  }

  // Check for SQL injection
  if (detectSQLInjection(input)) {
    threats.push({
      type: 'sql_injection',
      pattern: findMatchingPattern(input, 'sql_injection'),
      severity: getThreatSeverity('sql_injection'),
    });
  }

  // Check for XSS
  if (detectXSS(input)) {
    threats.push({
      type: 'xss',
      pattern: findMatchingPattern(input, 'xss'),
      severity: getThreatSeverity('xss'),
    });
  }

  // Check for path traversal
  if (detectPathTraversal(input)) {
    threats.push({
      type: 'path_traversal',
      pattern: findMatchingPattern(input, 'path_traversal'),
      severity: getThreatSeverity('path_traversal'),
    });
  }

  // Check for command injection
  if (detectCommandInjection(input)) {
    threats.push({
      type: 'command_injection',
      pattern: findMatchingPattern(input, 'command_injection'),
      severity: getThreatSeverity('command_injection'),
    });
  }

  return {
    valid: threats.length === 0,
    sanitizedValue: sanitizeInput(input),
    threats,
  };
}

/**
 * Validates a file upload against security constraints
 *
 * @param file - The file to validate (File object or file metadata)
 * @param config - Validation configuration (optional, uses defaults)
 * @returns Promise<ValidationResult> with validation status
 */
export async function validateFileUpload(
  file: { name: string; type: string; size: number },
  config: FileValidationConfig = DEFAULT_FILE_VALIDATION
): Promise<ValidationResult> {
  const threats: ThreatDetection[] = [];

  // Validate file type
  if (!config.allowedTypes.includes(file.type)) {
    threats.push({
      type: 'xss', // File type attacks often lead to XSS
      pattern: `Invalid file type: ${file.type}`,
      severity: 'high',
    });
  }

  // Validate file size
  if (file.size > config.maxSizeBytes) {
    threats.push({
      type: 'xss',
      pattern: `File too large: ${file.size} bytes (max: ${config.maxSizeBytes})`,
      severity: 'medium',
    });
  }

  // Validate filename for path traversal
  if (detectPathTraversal(file.name)) {
    threats.push({
      type: 'path_traversal',
      pattern: findMatchingPattern(file.name, 'path_traversal'),
      severity: 'high',
    });
  }

  // Check for dangerous file extensions
  const dangerousExtensions = [
    '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.jar',
    '.php', '.asp', '.aspx', '.jsp', '.cgi', '.pl', '.py', '.rb',
  ];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (dangerousExtensions.includes(fileExtension)) {
    threats.push({
      type: 'command_injection',
      pattern: `Dangerous file extension: ${fileExtension}`,
      severity: 'critical',
    });
  }

  // Check for double extensions (e.g., file.pdf.exe)
  const parts = file.name.split('.');
  if (parts.length > 2) {
    const secondToLast = '.' + parts[parts.length - 2].toLowerCase();
    if (dangerousExtensions.includes(secondToLast)) {
      threats.push({
        type: 'command_injection',
        pattern: `Suspicious double extension: ${file.name}`,
        severity: 'high',
      });
    }
  }

  return {
    valid: threats.length === 0,
    sanitizedValue: sanitizeInput(file.name),
    threats,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Validates an email address format
 *
 * @param email - The email to validate
 * @returns true if the email format is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && !detectSQLInjection(email) && !detectXSS(email);
}

/**
 * Validates a URL format
 *
 * @param url - The URL to validate
 * @returns true if the URL format is valid and safe
 */
export function isValidURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    // Check for XSS in URL
    if (detectXSS(url)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates that a string contains only alphanumeric characters and allowed special chars
 *
 * @param input - The input to validate
 * @param allowedChars - Additional allowed characters (default: '-_')
 * @returns true if the input is alphanumeric (plus allowed chars)
 */
export function isAlphanumeric(input: string, allowedChars: string = '-_'): boolean {
  const regex = new RegExp(`^[a-zA-Z0-9${allowedChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]+$`);
  return regex.test(input);
}

/**
 * Escapes a string for safe use in HTML
 *
 * @param input - The input to escape
 * @returns HTML-escaped string
 */
export function escapeHTML(input: string): string {
  return input.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Strips all HTML tags from input
 *
 * @param input - The input to strip
 * @returns String with all HTML tags removed
 */
export function stripHTML(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}
