/**
 * Property-based tests for variable processor utilities
 * Feature: n8n-document-generation
 * 
 * Tests Properties 6, 7, and 9 from the design document:
 * - Property 6: Variable Substitution Completeness
 * - Property 7: Loop Processing Correctness
 * - Property 9: Letterhead Injection Correctness
 * 
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  extractVariables,
  substituteVariable,
  getNestedValue,
  processTemplate,
  extractLoops,
  processLoop,
  processAllLoops,
  injectLetterhead,
  hasValidHtmlStructure,
} from '@/lib/variable-processor-utils'
import { VariableContext } from '@/types/document-generation'

// Arbitraries for generating test data
const variableNameArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,19}$/)
const simpleValueArb = fc.oneof(
  fc.string({ minLength: 0, maxLength: 50 }),
  fc.integer({ min: -10000, max: 10000 }),
  fc.boolean()
)

// Generate a simple variable context
const simpleContextArb = fc.dictionary(
  variableNameArb,
  simpleValueArb,
  { minKeys: 0, maxKeys: 5 }
) as fc.Arbitrary<VariableContext>

// Generate HTML-safe content (no special chars that break HTML)
const htmlSafeContentArb = fc.stringMatching(/^[a-zA-Z0-9 .,!?-]{0,50}$/)

describe('Variable Processor Utilities Property Tests', () => {
  /**
   * Property 6: Variable Substitution Completeness
   * For any template containing {{variable_name}} placeholders and any variable context,
   * after processing: (a) all placeholders with matching context values SHALL be replaced
   * with those values, and (b) all placeholders without matching context values SHALL be
   * replaced with empty strings.
   * 
   * Validates: Requirements 2.1, 2.2
   */
  describe('Property 6: Variable Substitution Completeness', () => {
    it('should replace all placeholders with matching context values', () => {
      fc.assert(
        fc.property(
          fc.array(variableNameArb, { minLength: 1, maxLength: 5 }),
          fc.array(htmlSafeContentArb, { minLength: 1, maxLength: 5 }),
          (varNames, values) => {
            const uniqueVars = [...new Set(varNames)].slice(0, values.length)
            if (uniqueVars.length === 0) return true

            // Build template with variables
            const template = uniqueVars.map(v => `<span>{{${v}}}</span>`).join('')
            
            // Build context with values
            const context: VariableContext = {}
            uniqueVars.forEach((v, i) => {
              context[v] = values[i % values.length]
            })

            const result = processTemplate(template, context)

            // All variables should be replaced (no {{...}} remaining for known vars)
            for (const varName of uniqueVars) {
              expect(result.html).not.toContain(`{{${varName}}}`)
              // The value should appear in the result
              const expectedValue = String(context[varName])
              expect(result.html).toContain(expectedValue)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should replace missing variables with empty strings', () => {
      fc.assert(
        fc.property(
          fc.array(variableNameArb, { minLength: 1, maxLength: 3 }),
          (varNames) => {
            const uniqueVars = [...new Set(varNames)]
            if (uniqueVars.length === 0) return true

            // Build template with variables
            const template = uniqueVars.map(v => `[{{${v}}}]`).join('')
            
            // Empty context - no values provided
            const context: VariableContext = {}

            const result = processTemplate(template, context)

            // All placeholders should be replaced with empty strings
            for (const varName of uniqueVars) {
              expect(result.html).not.toContain(`{{${varName}}}`)
            }
            
            // Result should have empty brackets where variables were
            expect(result.html).toBe(uniqueVars.map(() => '[]').join(''))

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should track which variables were actually used from context', () => {
      fc.assert(
        fc.property(
          fc.array(variableNameArb, { minLength: 2, maxLength: 5 }),
          fc.array(htmlSafeContentArb, { minLength: 1, maxLength: 3 }),
          (varNames, values) => {
            const uniqueVars = [...new Set(varNames)]
            if (uniqueVars.length < 2) return true

            // Use only first half of variables in template
            const templateVars = uniqueVars.slice(0, Math.ceil(uniqueVars.length / 2))
            const template = templateVars.map(v => `{{${v}}}`).join('')
            
            // Provide values for all variables
            const context: VariableContext = {}
            uniqueVars.forEach((v, i) => {
              context[v] = values[i % values.length]
            })

            const result = processTemplate(template, context)

            // Only template variables that exist in context should be in variables_used
            for (const varName of templateVars) {
              if (context[varName] !== undefined) {
                expect(result.variables_used).toContain(varName)
              }
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle substituteVariable for single variable replacement', () => {
      fc.assert(
        fc.property(
          variableNameArb,
          htmlSafeContentArb,
          (varName, value) => {
            const template = `Hello {{${varName}}}!`
            const result = substituteVariable(template, varName, value)
            
            expect(result).toBe(`Hello ${value}!`)
            expect(result).not.toContain(`{{${varName}}}`)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle null and undefined values as empty strings', () => {
      fc.assert(
        fc.property(
          variableNameArb,
          fc.constantFrom(null, undefined),
          (varName, nullValue) => {
            const template = `[{{${varName}}}]`
            const result = substituteVariable(template, varName, nullValue)
            
            expect(result).toBe('[]')

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * Property 7: Loop Processing Correctness
   * For any template containing {{#items}}...{{/items}} loop constructs and any array
   * of N items in the context, the processed output SHALL contain exactly N rendered
   * instances of the loop content, each with the corresponding item's values substituted.
   * 
   * Validates: Requirements 2.3, 2.4
   */
  describe('Property 7: Loop Processing Correctness', () => {
    it('should render exactly N instances for N items', () => {
      fc.assert(
        fc.property(
          variableNameArb,
          fc.array(
            fc.record({
              name: htmlSafeContentArb,
              value: fc.integer({ min: 0, max: 1000 }),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          (loopName, items) => {
            const template = `{{#${loopName}}}<li>{{name}}: {{value}}</li>{{/${loopName}}}`
            
            const context: VariableContext = {
              [loopName]: items as unknown as VariableContext[],
            }

            const result = processTemplate(template, context)

            // Count the number of <li> tags in the result
            const liCount = (result.html.match(/<li>/g) || []).length
            expect(liCount).toBe(items.length)

            // Each item's values should appear in the result
            for (const item of items) {
              expect(result.html).toContain(item.name)
              expect(result.html).toContain(String(item.value))
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should remove loop construct when items is not an array', () => {
      fc.assert(
        fc.property(
          variableNameArb,
          fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
          (loopName, nonArrayValue) => {
            const template = `before{{#${loopName}}}<li>content</li>{{/${loopName}}}after`
            
            const context: VariableContext = {
              [loopName]: nonArrayValue as unknown as VariableContext[],
            }

            const result = processTemplate(template, context)

            // Loop should be removed entirely
            expect(result.html).toBe('beforeafter')
            expect(result.html).not.toContain(`{{#${loopName}}}`)
            expect(result.html).not.toContain(`{{/${loopName}}}`)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle empty arrays by removing loop content', () => {
      fc.assert(
        fc.property(variableNameArb, (loopName) => {
          const template = `start{{#${loopName}}}<item>{{name}}</item>{{/${loopName}}}end`
          
          const context: VariableContext = {
            [loopName]: [],
          }

          const result = processTemplate(template, context)

          expect(result.html).toBe('startend')

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should extract loop names correctly', () => {
      fc.assert(
        fc.property(
          fc.array(variableNameArb, { minLength: 1, maxLength: 3 }),
          (loopNames) => {
            const uniqueLoops = [...new Set(loopNames)]
            const template = uniqueLoops.map(l => `{{#${l}}}content{{/${l}}}`).join('')
            
            const extracted = extractLoops(template)
            
            for (const l of uniqueLoops) {
              expect(extracted).toContain(l)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should substitute nested variables within loop items', () => {
      fc.assert(
        fc.property(
          variableNameArb,
          fc.array(variableNameArb, { minLength: 1, maxLength: 3 }),
          fc.array(htmlSafeContentArb, { minLength: 1, maxLength: 3 }),
          (loopName, fieldNames, fieldValues) => {
            const uniqueFields = [...new Set(fieldNames)]
            if (uniqueFields.length === 0) return true

            // Create template with multiple fields
            const loopContent = uniqueFields.map(f => `{{${f}}}`).join('-')
            const template = `{{#${loopName}}}${loopContent}{{/${loopName}}}`
            
            // Create items with field values
            const items = [
              Object.fromEntries(uniqueFields.map((f, i) => [f, fieldValues[i % fieldValues.length]])),
            ]

            const context: VariableContext = {
              [loopName]: items as unknown as VariableContext[],
            }

            const result = processTemplate(template, context)

            // Each field value should appear in the result
            for (let i = 0; i < uniqueFields.length; i++) {
              const expectedValue = fieldValues[i % fieldValues.length]
              expect(result.html).toContain(expectedValue)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })


  /**
   * Property 9: Letterhead Injection Correctness
   * For any template containing {{letterhead}} placeholder where include_letterhead is true,
   * the processed output SHALL contain the company letterhead HTML in place of the placeholder.
   * When include_letterhead is false, the placeholder SHALL be replaced with empty string.
   * 
   * Validates: Requirements 2.6
   */
  describe('Property 9: Letterhead Injection Correctness', () => {
    it('should inject letterhead when includeLetterhead is true', () => {
      fc.assert(
        fc.property(
          htmlSafeContentArb,
          htmlSafeContentArb,
          (beforeContent, letterheadContent) => {
            const html = `${beforeContent}{{letterhead}}after`
            const letterheadHtml = `<div class="letterhead">${letterheadContent}</div>`

            const result = injectLetterhead(html, letterheadHtml, true)

            expect(result).not.toContain('{{letterhead}}')
            expect(result).toContain(letterheadHtml)
            expect(result).toBe(`${beforeContent}${letterheadHtml}after`)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should remove letterhead placeholder when includeLetterhead is false', () => {
      fc.assert(
        fc.property(
          htmlSafeContentArb,
          htmlSafeContentArb,
          (beforeContent, letterheadContent) => {
            const html = `${beforeContent}{{letterhead}}after`
            const letterheadHtml = `<div class="letterhead">${letterheadContent}</div>`

            const result = injectLetterhead(html, letterheadHtml, false)

            expect(result).not.toContain('{{letterhead}}')
            expect(result).not.toContain(letterheadHtml)
            expect(result).toBe(`${beforeContent}after`)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should remove letterhead placeholder when letterheadHtml is empty', () => {
      fc.assert(
        fc.property(htmlSafeContentArb, (beforeContent) => {
          const html = `${beforeContent}{{letterhead}}after`

          const result = injectLetterhead(html, '', true)

          expect(result).not.toContain('{{letterhead}}')
          expect(result).toBe(`${beforeContent}after`)

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should handle multiple letterhead placeholders', () => {
      fc.assert(
        fc.property(htmlSafeContentArb, (letterheadContent) => {
          const html = '{{letterhead}}middle{{letterhead}}end'
          const letterheadHtml = `<header>${letterheadContent}</header>`

          const result = injectLetterhead(html, letterheadHtml, true)

          expect(result).not.toContain('{{letterhead}}')
          // Should have two instances of letterhead
          const count = (result.match(/<header>/g) || []).length
          expect(count).toBe(2)

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should handle whitespace around letterhead placeholder', () => {
      fc.assert(
        fc.property(htmlSafeContentArb, (letterheadContent) => {
          const html = 'before{{ letterhead }}after'
          const letterheadHtml = `<div>${letterheadContent}</div>`

          const result = injectLetterhead(html, letterheadHtml, true)

          expect(result).not.toContain('{{')
          expect(result).toContain(letterheadHtml)

          return true
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Additional utility tests
   */
  describe('Nested Value Access', () => {
    it('should access nested values using dot notation', () => {
      fc.assert(
        fc.property(
          variableNameArb,
          variableNameArb,
          htmlSafeContentArb,
          (parentKey, childKey, value) => {
            const context: VariableContext = {
              [parentKey]: {
                [childKey]: value,
              },
            }

            const result = getNestedValue(context, `${parentKey}.${childKey}`)
            expect(result).toBe(value)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return undefined for non-existent paths', () => {
      fc.assert(
        fc.property(
          variableNameArb,
          variableNameArb,
          (existingKey, missingKey) => {
            fc.pre(existingKey !== missingKey)

            const context: VariableContext = {
              [existingKey]: 'value',
            }

            const result = getNestedValue(context, missingKey)
            expect(result).toBeUndefined()

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('HTML Structure Validation', () => {
    it('should validate properly nested HTML tags', () => {
      fc.assert(
        fc.property(htmlSafeContentArb, (content) => {
          const validHtml = `<div><p>${content}</p></div>`
          expect(hasValidHtmlStructure(validHtml)).toBe(true)

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should detect mismatched tags', () => {
      const invalidHtml = '<div><p>content</div></p>'
      expect(hasValidHtmlStructure(invalidHtml)).toBe(false)
    })

    it('should handle self-closing tags', () => {
      fc.assert(
        fc.property(htmlSafeContentArb, (content) => {
          const htmlWithSelfClosing = `<div><br><img src="test.jpg"><p>${content}</p></div>`
          expect(hasValidHtmlStructure(htmlWithSelfClosing)).toBe(true)

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should consider empty string as valid', () => {
      expect(hasValidHtmlStructure('')).toBe(true)
      expect(hasValidHtmlStructure(null as unknown as string)).toBe(true)
    })
  })

  describe('Extract Variables', () => {
    it('should return empty array for empty template', () => {
      expect(extractVariables('')).toEqual([])
      expect(extractVariables(null as unknown as string)).toEqual([])
    })

    it('should not include loop markers in extracted variables', () => {
      fc.assert(
        fc.property(variableNameArb, (loopName) => {
          const template = `{{#${loopName}}}{{item}}{{/${loopName}}}`
          const variables = extractVariables(template)

          expect(variables).not.toContain(`#${loopName}`)
          expect(variables).not.toContain(`/${loopName}`)
          expect(variables).toContain('item')

          return true
        }),
        { numRuns: 100 }
      )
    })
  })
})
