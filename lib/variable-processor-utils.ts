/**
 * Variable Processor Utility Functions
 * Handles variable substitution and loop processing for document templates
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.6
 */

import { VariableContext, ProcessedTemplate } from '@/types/document-generation'

/**
 * Helper to escape regex special characters
 */
function escapeRegexChars(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, (char) => '\\' + char)
}

/**
 * Extracts all variable placeholders from a template string
 * Variables are in the format {{variable_name}}
 * Excludes loop constructs ({{#name}} and {{/name}})
 * 
 * Requirement 2.1: Replace all {{variable_name}} placeholders
 * 
 * @param template - The HTML template string
 * @returns Array of unique variable names found in the template
 */
export function extractVariables(template: string): string[] {
  if (!template || typeof template !== 'string') {
    return []
  }

  const variablePattern = /\{\{([^#/}][^}]*)\}\}/g
  const variables = new Set<string>()
  
  let match: RegExpExecArray | null
  while ((match = variablePattern.exec(template)) !== null) {
    const variableName = match[1].trim()
    if (variableName && variableName !== 'letterhead') {
      variables.add(variableName)
    }
  }

  return Array.from(variables).sort()
}

/**
 * Replaces a single variable placeholder with its value
 * 
 * Requirement 2.1: Replace {{variable_name}} with corresponding value
 * Requirement 2.2: Replace with empty string if value is missing
 */
export function substituteVariable(
  template: string,
  varName: string,
  value: string | number | boolean | null | undefined
): string {
  if (!template || typeof template !== 'string') {
    return template || ''
  }

  if (!varName || typeof varName !== 'string') {
    return template
  }

  const stringValue = value === null || value === undefined ? '' : String(value)
  const escapedName = escapeRegexChars(varName)
  const pattern = new RegExp('\\{\\{\\s*' + escapedName + '\\s*\\}\\}', 'g')
  return template.replace(pattern, stringValue)
}

/**
 * Gets a nested value from a context object using dot notation
 */
export function getNestedValue(
  context: VariableContext,
  path: string
): string | number | boolean | null | undefined | VariableContext | VariableContext[] {
  if (!context || typeof context !== 'object') {
    return undefined
  }

  const parts = path.split('.')
  let current: unknown = context

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }
    if (typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }

  return current as string | number | boolean | null | undefined | VariableContext | VariableContext[]
}

/**
 * Extracts all loop names from a template
 * Loops are in the format {{#loopName}}...{{/loopName}}
 * 
 * Requirement 2.3: Support loop constructs
 */
export function extractLoops(template: string): string[] {
  if (!template || typeof template !== 'string') {
    return []
  }

  const loopPattern = /\{\{#([^}]+)\}\}/g
  const loops = new Set<string>()
  
  let match: RegExpExecArray | null
  while ((match = loopPattern.exec(template)) !== null) {
    const loopName = match[1].trim()
    if (loopName) {
      loops.add(loopName)
    }
  }

  return Array.from(loops)
}

/**
 * Processes a single loop construct in the template
 * 
 * Requirement 2.3: Support loop constructs {{#items}}...{{/items}}
 * Requirement 2.4: Iterate over array data and render each item
 */
export function processLoop(
  template: string,
  loopName: string,
  items: VariableContext[]
): string {
  if (!template || typeof template !== 'string') {
    return template || ''
  }

  if (!loopName || typeof loopName !== 'string') {
    return template
  }

  const escapedName = escapeRegexChars(loopName)
  const loopPattern = new RegExp(
    '\\{\\{#\\s*' + escapedName + '\\s*\\}\\}([\\s\\S]*?)\\{\\{/\\s*' + escapedName + '\\s*\\}\\}',
    'g'
  )

  return template.replace(loopPattern, (_, loopContent) => {
    if (!Array.isArray(items) || items.length === 0) {
      return ''
    }

    return items.map(item => {
      let rendered = loopContent
      const variables = extractVariables(loopContent)
      for (const varName of variables) {
        const value = getNestedValue(item, varName)
        rendered = substituteVariable(rendered, varName, value as string | number | boolean | null | undefined)
      }
      return rendered
    }).join('')
  })
}

/**
 * Processes all loops in a template
 */
export function processAllLoops(template: string, context: VariableContext): string {
  if (!template || typeof template !== 'string') {
    return template || ''
  }

  let result = template
  const loopNames = extractLoops(template)

  for (const loopName of loopNames) {
    const items = context[loopName]
    if (Array.isArray(items)) {
      result = processLoop(result, loopName, items as VariableContext[])
    } else {
      const escapedName = escapeRegexChars(loopName)
      const loopPattern = new RegExp(
        '\\{\\{#\\s*' + escapedName + '\\s*\\}\\}[\\s\\S]*?\\{\\{/\\s*' + escapedName + '\\s*\\}\\}',
        'g'
      )
      result = result.replace(loopPattern, '')
    }
  }

  return result
}

/**
 * Injects letterhead HTML into the template
 * 
 * Requirement 2.6: Inject company letterhead HTML when include_letterhead is true
 */
export function injectLetterhead(
  html: string,
  letterheadHtml: string,
  includeLetterhead: boolean
): string {
  if (!html || typeof html !== 'string') {
    return html || ''
  }

  const letterheadPattern = /\{\{\s*letterhead\s*\}\}/g

  if (includeLetterhead && letterheadHtml) {
    return html.replace(letterheadPattern, letterheadHtml)
  }

  return html.replace(letterheadPattern, '')
}

/**
 * Validates that HTML has properly nested tags
 * 
 * Requirement 2.5: Preserve HTML structure when substituting variables
 */
export function hasValidHtmlStructure(html: string): boolean {
  if (!html || typeof html !== 'string') {
    return true
  }

  const selfClosingTags = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ])

  const tagStack: string[] = []
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*\/?>/g

  let match: RegExpExecArray | null
  while ((match = tagPattern.exec(html)) !== null) {
    const fullTag = match[0]
    const tagName = match[1].toLowerCase()

    if (selfClosingTags.has(tagName)) {
      continue
    }

    if (fullTag.endsWith('/>')) {
      continue
    }

    if (fullTag.startsWith('</')) {
      if (tagStack.length === 0 || tagStack[tagStack.length - 1] !== tagName) {
        return false
      }
      tagStack.pop()
    } else {
      tagStack.push(tagName)
    }
  }

  return tagStack.length === 0
}

/**
 * Processes a complete template with variable substitution and loop processing
 * 
 * Requirements 2.1, 2.2, 2.3, 2.4: Full template processing
 */
export function processTemplate(template: string, context: VariableContext): ProcessedTemplate {
  if (!template || typeof template !== 'string') {
    return { html: '', variables_used: [] }
  }

  const variablesUsed = new Set<string>()
  
  let result = processAllLoops(template, context)
  
  const variables = extractVariables(result)
  
  for (const varName of variables) {
    const value = getNestedValue(context, varName)
    const rootKey = varName.split('.')[0]
    if (Object.prototype.hasOwnProperty.call(context, rootKey)) {
      variablesUsed.add(varName)
    }
    result = substituteVariable(result, varName, value as string | number | boolean | null | undefined)
  }

  return {
    html: result,
    variables_used: Array.from(variablesUsed).sort()
  }
}

/**
 * Formats a number as currency (Indonesian Rupiah)
 */
export function formatCurrency(value: number): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0'
  }
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Formats a date string for display
 */
export function formatDate(dateString: string, format: 'short' | 'long' = 'short'): string {
  if (!dateString) {
    return ''
  }
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return dateString
    }
    if (format === 'long') {
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    }
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateString
  }
}
