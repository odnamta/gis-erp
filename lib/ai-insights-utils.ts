// =====================================================
// v0.63: AI INSIGHTS - UTILITY FUNCTIONS
// =====================================================

import type {
  ValidationResult,
  ResponseType,
  AIQueryResponse,
  ChartConfig,
  AIQueryTemplate,
  TemplateMatch,
} from '@/types/ai-insights';
import { formatDate } from '@/lib/utils/format';

// =====================================================
// SQL VALIDATION
// =====================================================

const BLOCKED_KEYWORDS = [
  'insert',
  'update',
  'delete',
  'drop',
  'truncate',
  'alter',
  'create',
  'grant',
  'revoke',
  'execute',
  'exec',
];

const BLOCKED_TABLES = ['user_profiles', 'auth', 'passwords', 'tokens'];

/**
 * Validates SQL query for safety
 * Property 6: SQL Validation Blocks Unsafe Queries
 */
export function validateSQL(sql: string): ValidationResult {
  if (!sql || typeof sql !== 'string') {
    return { isValid: false, error: 'Invalid SQL input' };
  }

  const sqlLower = sql.toLowerCase().trim();

  // Check if starts with SELECT
  if (!sqlLower.startsWith('select')) {
    return { isValid: false, error: 'Only SELECT statements are allowed' };
  }

  // Check for blocked keywords
  for (const keyword of BLOCKED_KEYWORDS) {
    // Use word boundary to avoid false positives (e.g., "selected" shouldn't match "select")
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(sqlLower)) {
      return { isValid: false, error: `Blocked keyword detected: ${keyword}` };
    }
  }

  // Check for blocked tables
  for (const table of BLOCKED_TABLES) {
    const regex = new RegExp(`\\b${table}\\b`, 'i');
    if (regex.test(sqlLower)) {
      return { isValid: false, error: `Access to table '${table}' is not allowed` };
    }
  }

  // Check for SQL comments that could be used for injection
  if (sqlLower.includes('--') || sqlLower.includes('/*')) {
    return { isValid: false, error: 'SQL comments are not allowed' };
  }

  return { isValid: true, sanitizedSQL: sql.trim() };
}

/**
 * Check if SQL contains any blocked keywords
 */
export function checkBlockedKeywords(sql: string): string[] {
  const sqlLower = sql.toLowerCase();
  const found: string[] = [];
  
  for (const keyword of BLOCKED_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(sqlLower)) {
      found.push(keyword);
    }
  }
  
  return found;
}

/**
 * Check if SQL references any blocked tables
 */
export function checkBlockedTables(sql: string): string[] {
  const sqlLower = sql.toLowerCase();
  const found: string[] = [];
  
  for (const table of BLOCKED_TABLES) {
    const regex = new RegExp(`\\b${table}\\b`, 'i');
    if (regex.test(sqlLower)) {
      found.push(table);
    }
  }
  
  return found;
}

// =====================================================
// QUERY INPUT VALIDATION
// =====================================================

/**
 * Validates query input - rejects empty or whitespace-only queries
 * Property 1: Empty Query Validation
 */
export function validateQueryInput(query: string): boolean {
  if (!query || typeof query !== 'string') {
    return false;
  }
  return query.trim().length > 0;
}

// =====================================================
// TEMPLATE MATCHING
// =====================================================

/**
 * Calculate similarity between two strings using Jaccard similarity
 * Returns a value between 0 and 1
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  // Tokenize into words
  const words1 = new Set(s1.split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(s2.split(/\s+/).filter(w => w.length > 2));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  // Calculate Jaccard similarity
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Match query against templates
 * Property 2: Template Matching Threshold (0.7)
 */
export function matchTemplate(
  query: string,
  templates: AIQueryTemplate[]
): TemplateMatch | null {
  if (!validateQueryInput(query) || !templates || templates.length === 0) {
    return null;
  }

  let bestMatch: TemplateMatch | null = null;
  let bestSimilarity = 0;

  for (const template of templates) {
    if (!template.is_active) continue;

    const sampleQuestions = template.sample_questions || [];
    
    for (const sample of sampleQuestions) {
      const similarity = calculateSimilarity(query, sample);
      
      if (similarity > 0.7 && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        const parameters = extractParameters(query, template);
        const sql = substituteParameters(template.sql_template, parameters);
        
        bestMatch = {
          template,
          parameters,
          sql,
          similarity,
        };
      }
    }
  }

  return bestMatch;
}

/**
 * Extract parameters from query based on template patterns
 * Property 3: Parameter Extraction and Substitution
 */
export function extractParameters(
  query: string,
  template: AIQueryTemplate
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const templateParams = template.parameters || [];

  for (const param of templateParams) {
    if (param.extractPattern) {
      // Simple pattern matching - extract value from pattern like "in {month}"
      const patternRegex = param.extractPattern
        .replace('{' + param.name + '}', '(.+)')
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      const match = query.match(new RegExp(patternRegex, 'i'));
      if (match && match[1]) {
        params[param.name] = match[1].trim();
      }
    }
  }

  return params;
}

/**
 * Substitute parameters into SQL template
 */
export function substituteParameters(
  sqlTemplate: string,
  parameters: Record<string, unknown>
): string {
  let sql = sqlTemplate;
  
  for (const [key, value] of Object.entries(parameters)) {
    const valueStr = String(value);
    // Replace $1, $2 style placeholders - use function to avoid special $ patterns
    sql = sql.replace(new RegExp(`\\$\\d+`, 'g'), () => valueStr);
    // Replace {key} style placeholders - use function to avoid special $ patterns
    sql = sql.replace(new RegExp(`\\{${key}\\}`, 'gi'), () => valueStr);
  }
  
  return sql;
}

// =====================================================
// RESPONSE FORMATTING
// =====================================================

/**
 * Determine response type based on data
 * Property 7: Response Type Determination
 */
export function determineResponseType(data: unknown[]): ResponseType {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return 'text';
  }

  // Single value response
  if (data.length === 1 && typeof data[0] === 'object' && data[0] !== null) {
    const keys = Object.keys(data[0]);
    if (keys.length === 1) {
      return 'number';
    }
  }

  // Table response (2-20 rows)
  if (data.length <= 20) {
    return 'table';
  }

  // Chart response (>20 rows)
  return 'chart';
}

/**
 * Format currency value with Rp prefix and thousand separators
 * Property 8: Value Formatting
 */
export function formatCurrency(value: number): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'Rp 0';
  }
  
  const formatted = Math.abs(value)
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return value < 0 ? `Rp -${formatted}` : `Rp ${formatted}`;
}

/**
 * Format percentage value with % suffix and 1 decimal place
 * Property 8: Value Formatting
 */
export function formatPercentage(value: number): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0.0%';
  }
  
  return `${value.toFixed(1)}%`;
}

/**
 * Format value based on key name heuristics
 */
export function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  const keyLower = key.toLowerCase();
  const numValue = Number(value);

  if (!isNaN(numValue)) {
    if (keyLower.includes('revenue') || keyLower.includes('cost') || 
        keyLower.includes('amount') || keyLower.includes('price')) {
      return formatCurrency(numValue);
    }
    if (keyLower.includes('margin') || keyLower.includes('percent') || 
        keyLower.includes('rate') || keyLower.includes('utilization')) {
      return formatPercentage(numValue);
    }
    return numValue.toLocaleString('id-ID');
  }

  return String(value);
}

/**
 * Infer chart configuration from data
 */
export function inferChartConfig(data: Record<string, unknown>[]): ChartConfig {
  if (!data || data.length === 0) {
    return { type: 'bar', data: [], xKey: '', yKey: '' };
  }

  const keys = Object.keys(data[0]);
  const numericKeys = keys.filter(k => typeof data[0][k] === 'number');
  const stringKeys = keys.filter(k => typeof data[0][k] === 'string');

  return {
    type: 'bar',
    data,
    xKey: stringKeys[0] || keys[0],
    yKey: numericKeys[0] || keys[1] || keys[0],
  };
}

/**
 * Format query response based on data
 */
export function formatQueryResponse(
  query: string,
  data: unknown[]
): AIQueryResponse {
  const responseType = determineResponseType(data);

  if (responseType === 'text' && (!data || data.length === 0)) {
    return {
      responseType: 'text',
      responseText: 'No data found for your query.',
    };
  }

  if (responseType === 'number') {
    const row = data[0] as Record<string, unknown>;
    const key = Object.keys(row)[0];
    const value = row[key];
    
    return {
      responseType: 'number',
      responseText: formatValue(key, value),
      data: value,
    };
  }

  if (responseType === 'table') {
    return {
      responseType: 'table',
      responseText: `Found ${data.length} results:`,
      data,
    };
  }

  // Chart response
  return {
    responseType: 'chart',
    responseText: `Here's a visualization of ${data.length} data points:`,
    data,
    chartConfig: inferChartConfig(data as Record<string, unknown>[]),
  };
}

// =====================================================
// RELATIVE TIME FORMATTING
// =====================================================

/**
 * Format timestamp as relative time
 * Property 11: Relative Timestamp Formatting
 */
export function formatRelativeTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  if (diffDays <= 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  // Format as date for older timestamps
  return formatDate(date);
}

// =====================================================
// CSV EXPORT
// =====================================================

/**
 * Escape CSV value
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const str = String(value);
  
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Export data to CSV format
 * Property 12: CSV Export Format
 */
export function exportToCSV(data: Record<string, unknown>[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const headerLine = headers.map(escapeCSVValue).join(',');
  
  const dataLines = data.map(row => 
    headers.map(header => escapeCSVValue(row[header])).join(',')
  );

  return [headerLine, ...dataLines].join('\n');
}

// =====================================================
// ACCESS CONTROL
// =====================================================

const ALLOWED_ROLES = ['owner', 'manager', 'finance'];

/**
 * Check if user role can access AI Insights
 * Property 13: Role-Based Access Control
 */
export function canAccessAIInsights(role: string): boolean {
  if (!role || typeof role !== 'string') {
    return false;
  }
  return ALLOWED_ROLES.includes(role.toLowerCase());
}

// =====================================================
// SUGGESTED QUESTIONS
// =====================================================

const DEFAULT_SUGGESTIONS = [
  'What is the revenue this month?',
  'How many jobs are active?',
  'Who are our top customers?',
  'Show overdue invoices',
  'What is our profit margin?',
];

/**
 * Get suggested questions for error responses
 */
export function getSuggestedQuestions(): string[] {
  return [...DEFAULT_SUGGESTIONS];
}
