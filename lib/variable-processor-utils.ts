/**
 * Variable Processor Utility Functions
 * Handles variable substitution and loop processing for document templates
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.6
 */

import { VariableContext, ProcessedTemplate } from '@/types/document-generation'

function escapeRegexChars(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, (char) => '\\' + char)
}

export function extractVariables(template: string): string[] {
  if (!template || typeof template !== 'string') {
    return []
  }
  const variablePattern = /\{\{([^#/}][^}]*)\}\}/g
  const variables = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = variablePattern.exec(template)) !== null) {
    const variableName = match[1].trim()
    if (variableName) {
      variables.add(variableName)
    }
  }
  return Array.from(variables).sort()
}

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
  return Array.from(loops).sort()
}

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
  if (!Array.isArray(items)) {
    const removePattern = new RegExp(
      '\\{\\{#' + escapedName + '\\}\\}[\\s\\S]*?\\{\\{/' + escapedName + '\\}\\}',
      'g'
    )
    return template.replace(removePattern, '')
  }
  const loopPattern = new RegExp(
    '\\{\\{#' + escapedName + '\\}\\}([\\s\\S]*?)\\{\\{/' + escapedName + '\\}\\}',
    'g'
  )
  return template.replace(loopPattern, (_fullMatch, loopContent: string) => {
    return items.map((item) => {
      let itemHtml = loopContent
      const loopVariables = extractVariables(loopContent)
      for (const varName of loopVariables) {
        const value = getNestedValue(item, varName)
        if (typeof value === 'object' && value !== null) {
          itemHtml = substituteVariable(itemHtml, varName, JSON.stringify(value))
        } else {
          itemHtml = substituteVariable(itemHtml, varName, value as string | number | boolean | null | undefined)
        }
      }
      return itemHtml
    }).join('')
  })
}

export function processAllLoops(template: string, context: VariableContext): string {
  if (!template || typeof template !== 'string') {
    return template || ''
  }
  let result = template
  const loops = extractLoops(template)
  for (const loopName of loops) {
    const items = context[loopName]
    if (Array.isArray(items)) {
      result = processLoop(result, loopName, items as VariableContext[])
    } else {
      result = processLoop(result, loopName, [])
    }
  }
  return result
}

export function processTemplate(
  template: string,
  context: VariableContext
): ProcessedTemplate {
  if (!template || typeof template !== 'string') {
    return { html: '', variables_used: [] }
  }
  const variablesUsed = new Set<string>()
  let result = template
  result = processAllLoops(result, context)
  const variables = extractVariables(result)
  for (const varName of variables) {
    const value = getNestedValue(context, varName)
    if (value !== undefined) {
      variablesUsed.add(varName)
    }
    if (typeof value === 'object' && value !== null) {
      result = substituteVariable(result, varName, JSON.stringify(value))
    } else {
      result = substituteVariable(result, varName, value as string | number | boolean | null | undefined)
    }
  }
  return {
    html: result,
    variables_used: Array.from(variablesUsed).sort(),
  }
}

export function injectLetterhead(
  html: string,
  letterheadHtml: string,
  includeLetterhead: boolean = true
): string {
  if (!html || typeof html !== 'string') {
    return html || ''
  }
  const letterheadPattern = /\{\{\s*letterhead\s*\}\}/g
  if (includeLetterhead && letterheadHtml) {
    return html.replace(letterheadPattern, letterheadHtml)
  } else {
    return html.replace(letterheadPattern, '')
  }
}

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
      if (tagStack.length === 0) {
        return false
      }
      const lastOpened = tagStack.pop()
      if (lastOpened !== tagName) {
        return false
      }
    } else {
      tagStack.push(tagName)
    }
  }
  return tagStack.length === 0
}

export function formatCurrency(value: number): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0'
  }
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

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
