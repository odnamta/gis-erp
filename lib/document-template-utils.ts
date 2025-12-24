/**
 * Document Template Utility Functions
 * Provides validation and variable extraction for document templates
 * Requirements: 1.2, 1.3
 */

import {
  DocumentTemplate,
  DocumentType,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateValidationResult,
  VALID_DOCUMENT_TYPES,
  VALID_PAGE_SIZES,
  VALID_ORIENTATIONS,
  PageSize,
  PageOrientation,
  MarginSettings,
  DEFAULT_MARGINS,
} from '@/types/document-generation'

/**
 * Validates a document template for required fields and valid values
 * Requirement 1.2: Validate that html_template field is not empty
 * Requirement 1.3: Support valid document types
 * 
 * @param template - The template data to validate
 * @returns Validation result with errors if any
 */
export function validateTemplate(
  template: CreateTemplateInput | UpdateTemplateInput
): TemplateValidationResult {
  const errors: string[] = []

  // Check html_template is not empty (for create, always required; for update, only if provided)
  if ('html_template' in template) {
    if (template.html_template === undefined || template.html_template === null) {
      errors.push('html_template is required')
    } else if (typeof template.html_template !== 'string') {
      errors.push('html_template must be a string')
    } else if (template.html_template.trim() === '') {
      errors.push('html_template cannot be empty')
    }
  }

  // Check document_type is valid (for create, always required; for update, only if provided)
  if ('document_type' in template && template.document_type !== undefined) {
    if (!isValidDocumentType(template.document_type)) {
      errors.push(
        `Invalid document_type: ${template.document_type}. Must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}`
      )
    }
  }

  // Check page_size is valid if provided
  if ('page_size' in template && template.page_size !== undefined) {
    if (!isValidPageSize(template.page_size)) {
      errors.push(
        `Invalid page_size: ${template.page_size}. Must be one of: ${VALID_PAGE_SIZES.join(', ')}`
      )
    }
  }

  // Check orientation is valid if provided
  if ('orientation' in template && template.orientation !== undefined) {
    if (!isValidOrientation(template.orientation)) {
      errors.push(
        `Invalid orientation: ${template.orientation}. Must be one of: ${VALID_ORIENTATIONS.join(', ')}`
      )
    }
  }

  // Check margins are valid if provided
  if ('margins' in template && template.margins !== undefined) {
    const marginValidation = validateMargins(template.margins)
    if (!marginValidation.valid) {
      errors.push(...marginValidation.errors)
    }
  }

  // Check template_code is not empty if provided
  if ('template_code' in template && template.template_code !== undefined) {
    if (typeof template.template_code !== 'string' || template.template_code.trim() === '') {
      errors.push('template_code cannot be empty')
    }
  }

  // Check template_name is not empty if provided
  if ('template_name' in template && template.template_name !== undefined) {
    if (typeof template.template_name !== 'string' || template.template_name.trim() === '') {
      errors.push('template_name cannot be empty')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validates a template for creation (stricter validation)
 * Requires all mandatory fields
 * 
 * @param template - The template data to validate for creation
 * @returns Validation result with errors if any
 */
export function validateTemplateForCreate(
  template: CreateTemplateInput
): TemplateValidationResult {
  const errors: string[] = []

  // Required fields for creation
  if (!template.template_code || template.template_code.trim() === '') {
    errors.push('template_code is required')
  }

  if (!template.template_name || template.template_name.trim() === '') {
    errors.push('template_name is required')
  }

  if (!template.document_type) {
    errors.push('document_type is required')
  }

  if (!template.html_template || template.html_template.trim() === '') {
    errors.push('html_template is required and cannot be empty')
  }

  // Add general validation errors
  const generalValidation = validateTemplate(template)
  errors.push(...generalValidation.errors.filter(e => !errors.includes(e)))

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Checks if a document type is valid
 * 
 * @param type - The document type to check
 * @returns True if valid, false otherwise
 */
export function isValidDocumentType(type: string): type is DocumentType {
  return VALID_DOCUMENT_TYPES.includes(type as DocumentType)
}

/**
 * Checks if a page size is valid
 * 
 * @param size - The page size to check
 * @returns True if valid, false otherwise
 */
export function isValidPageSize(size: string): size is PageSize {
  return VALID_PAGE_SIZES.includes(size as PageSize)
}

/**
 * Checks if an orientation is valid
 * 
 * @param orientation - The orientation to check
 * @returns True if valid, false otherwise
 */
export function isValidOrientation(orientation: string): orientation is PageOrientation {
  return VALID_ORIENTATIONS.includes(orientation as PageOrientation)
}

/**
 * Validates margin settings
 * 
 * @param margins - The margins to validate
 * @returns Validation result
 */
export function validateMargins(margins: MarginSettings): TemplateValidationResult {
  const errors: string[] = []

  if (typeof margins !== 'object' || margins === null) {
    return { valid: false, errors: ['margins must be an object'] }
  }

  const requiredFields: (keyof MarginSettings)[] = ['top', 'right', 'bottom', 'left']
  
  for (const field of requiredFields) {
    if (typeof margins[field] !== 'number') {
      errors.push(`margins.${field} must be a number`)
    } else if (margins[field] < 0) {
      errors.push(`margins.${field} cannot be negative`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Extracts all variable placeholders from a template string
 * Variables are in the format {{variable_name}}
 * 
 * @param template - The HTML template string
 * @returns Array of unique variable names found in the template
 */
export function extractAvailableVariables(template: string): string[] {
  if (!template || typeof template !== 'string') {
    return []
  }

  // Match {{variable_name}} patterns, excluding loop constructs
  // Loop constructs are {{#items}} and {{/items}}
  const variablePattern = /\{\{([^#/}][^}]*)\}\}/g
  const variables = new Set<string>()
  
  let match: RegExpExecArray | null
  while ((match = variablePattern.exec(template)) !== null) {
    const variableName = match[1].trim()
    // Skip empty matches and special variables like 'styles'
    if (variableName && variableName !== 'styles') {
      variables.add(variableName)
    }
  }

  return Array.from(variables).sort()
}

/**
 * Extracts loop variable names from a template string
 * Loop constructs are in the format {{#loop_name}}...{{/loop_name}}
 * 
 * @param template - The HTML template string
 * @returns Array of unique loop names found in the template
 */
export function extractLoopVariables(template: string): string[] {
  if (!template || typeof template !== 'string') {
    return []
  }

  // Match {{#loop_name}} patterns
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

/**
 * Gets default template values for optional fields
 * 
 * @returns Default values for template creation
 */
export function getDefaultTemplateValues(): Partial<CreateTemplateInput> {
  return {
    css_styles: null,
    page_size: 'A4',
    orientation: 'portrait',
    margins: DEFAULT_MARGINS,
    header_html: null,
    footer_html: null,
    include_letterhead: true,
    available_variables: [],
    is_active: true,
  }
}

/**
 * Merges template input with default values
 * 
 * @param input - The template input
 * @returns Template input with defaults applied
 */
export function applyTemplateDefaults(input: CreateTemplateInput): CreateTemplateInput {
  const defaults = getDefaultTemplateValues()
  return {
    ...defaults,
    ...input,
    // Extract variables from template if not provided
    available_variables: input.available_variables ?? extractAvailableVariables(input.html_template),
  }
}

/**
 * Sanitizes template code to ensure it's valid
 * Converts to uppercase and replaces invalid characters
 * 
 * @param code - The template code to sanitize
 * @returns Sanitized template code
 */
export function sanitizeTemplateCode(code: string): string {
  if (!code || typeof code !== 'string') {
    return ''
  }
  
  return code
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}
