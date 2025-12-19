import {
  MarketType,
  MarketClassification,
  ComplexityCriteria,
  ComplexityFactor,
  PJOClassificationInput,
  AutoDetectRules,
  COMPLEXITY_THRESHOLDS,
  parseAutoDetectRules,
} from '@/types/market-classification'
import { formatIDR } from './pjo-utils'

/**
 * Classify market type based on complexity score
 * @param score - Complexity score (0-100+)
 * @returns 'simple' if score < 20, 'complex' if score >= 20
 */
export function classifyMarketType(score: number): MarketType {
  return score >= COMPLEXITY_THRESHOLDS.COMPLEX_MIN ? 'complex' : 'simple'
}

/**
 * Check if engineering assessment is required based on score
 * @param score - Complexity score
 * @returns true if score >= 20
 */
export function requiresEngineering(score: number): boolean {
  return score >= COMPLEXITY_THRESHOLDS.ENGINEERING_MIN
}

/**
 * Evaluate a single criterion against PJO data
 * @param criterion - The complexity criterion to evaluate
 * @param pjoData - The PJO classification input data
 * @returns true if the criterion is triggered
 */
export function evaluateCriterion(
  criterion: ComplexityCriteria,
  pjoData: PJOClassificationInput
): boolean {
  const rules = parseAutoDetectRules(criterion.auto_detect_rules)
  if (!rules) return false

  const fieldValue = getFieldValue(pjoData, rules.field)
  
  // If field value is null/undefined, criterion is not triggered
  if (fieldValue === null || fieldValue === undefined) return false

  return evaluateOperator(fieldValue, rules.operator, rules.value)
}

/**
 * Get field value from PJO data
 */
function getFieldValue(pjoData: PJOClassificationInput, field: string): unknown {
  switch (field) {
    case 'cargo_weight_kg':
      return pjoData.cargo_weight_kg
    case 'cargo_length_m':
      return pjoData.cargo_length_m
    case 'cargo_width_m':
      return pjoData.cargo_width_m
    case 'cargo_height_m':
      return pjoData.cargo_height_m
    case 'cargo_value':
      return pjoData.cargo_value
    case 'duration_days':
      return pjoData.duration_days
    case 'is_new_route':
      return pjoData.is_new_route
    case 'terrain_type':
      return pjoData.terrain_type
    case 'requires_special_permit':
      return pjoData.requires_special_permit
    case 'is_hazardous':
      return pjoData.is_hazardous
    default:
      return undefined
  }
}

/**
 * Evaluate operator condition
 */
function evaluateOperator(
  fieldValue: unknown,
  operator: AutoDetectRules['operator'],
  ruleValue: AutoDetectRules['value']
): boolean {
  switch (operator) {
    case '>':
      return Number(fieldValue) > Number(ruleValue)
    case '<':
      return Number(fieldValue) < Number(ruleValue)
    case '>=':
      return Number(fieldValue) >= Number(ruleValue)
    case '<=':
      return Number(fieldValue) <= Number(ruleValue)
    case '=':
      return fieldValue === ruleValue
    case 'in':
      if (Array.isArray(ruleValue)) {
        return ruleValue.includes(fieldValue as string)
      }
      return false
    default:
      return false
  }
}

/**
 * Get display value for a triggered criterion
 * @param criterion - The triggered criterion
 * @param pjoData - The PJO classification input data
 * @returns Formatted string for display
 */
export function getTriggeredDisplayValue(
  criterion: ComplexityCriteria,
  pjoData: PJOClassificationInput
): string {
  const rules = parseAutoDetectRules(criterion.auto_detect_rules)
  if (!rules) return ''

  const fieldValue = getFieldValue(pjoData, rules.field)
  if (fieldValue === null || fieldValue === undefined) return ''

  switch (rules.field) {
    case 'cargo_weight_kg':
      return `${Number(fieldValue).toLocaleString('id-ID')} kg`
    case 'cargo_length_m':
      return `${fieldValue} m`
    case 'cargo_width_m':
      return `${fieldValue} m`
    case 'cargo_height_m':
      return `${fieldValue} m`
    case 'cargo_value':
      return formatIDR(Number(fieldValue))
    case 'duration_days':
      return `${fieldValue} days`
    case 'is_new_route':
      return fieldValue ? 'Yes' : 'No'
    case 'terrain_type':
      return String(fieldValue).charAt(0).toUpperCase() + String(fieldValue).slice(1)
    case 'requires_special_permit':
      return fieldValue ? 'Yes' : 'No'
    case 'is_hazardous':
      return fieldValue ? 'Yes' : 'No'
    default:
      return String(fieldValue)
  }
}

/**
 * Calculate market classification from PJO data and criteria
 * @param pjoData - The PJO classification input data
 * @param criteria - Array of active complexity criteria
 * @returns MarketClassification result
 */
export function calculateMarketClassification(
  pjoData: PJOClassificationInput,
  criteria: ComplexityCriteria[]
): MarketClassification {
  const triggeredFactors: ComplexityFactor[] = []
  let totalScore = 0

  // Only evaluate active criteria
  const activeCriteria = criteria.filter(c => c.is_active !== false)

  for (const criterion of activeCriteria) {
    const isTriggered = evaluateCriterion(criterion, pjoData)
    
    if (isTriggered) {
      const weight = criterion.weight ?? 0
      totalScore += weight
      
      triggeredFactors.push({
        criteria_code: criterion.criteria_code,
        criteria_name: criterion.criteria_name,
        weight: weight,
        triggered_value: getTriggeredDisplayValue(criterion, pjoData),
      })
    }
  }

  const marketType = classifyMarketType(totalScore)
  const needsEngineering = requiresEngineering(totalScore)

  return {
    market_type: marketType,
    complexity_score: totalScore,
    complexity_factors: triggeredFactors,
    requires_engineering: needsEngineering,
  }
}

/**
 * Format complexity score as percentage string
 * @param score - Complexity score
 * @param maxScore - Maximum possible score (default 100)
 * @returns Formatted percentage string
 */
export function formatComplexityScore(score: number, maxScore: number = 100): string {
  const percentage = Math.min((score / maxScore) * 100, 100)
  return `${Math.round(percentage)}%`
}

/**
 * Get complexity score color class based on score
 * @param score - Complexity score
 * @returns Tailwind color class
 */
export function getComplexityScoreColor(score: number): string {
  if (score >= COMPLEXITY_THRESHOLDS.COMPLEX_MIN) {
    return 'bg-orange-500'
  }
  return 'bg-green-500'
}

/**
 * Validate that a numeric value is non-negative
 * @param value - The value to validate
 * @returns true if value is null, undefined, or >= 0
 */
export function isValidNonNegative(value: number | null | undefined): boolean {
  if (value === null || value === undefined) return true
  return value >= 0
}

/**
 * Validate all cargo specification fields are non-negative
 * @param specs - Cargo specifications
 * @returns Object with valid flag and error messages
 */
export function validateCargoSpecifications(specs: Partial<PJOClassificationInput>): {
  valid: boolean
  errors: Record<string, string>
} {
  const errors: Record<string, string> = {}

  if (specs.cargo_weight_kg !== null && specs.cargo_weight_kg !== undefined && specs.cargo_weight_kg < 0) {
    errors.cargo_weight_kg = 'Weight must be non-negative'
  }
  if (specs.cargo_length_m !== null && specs.cargo_length_m !== undefined && specs.cargo_length_m < 0) {
    errors.cargo_length_m = 'Length must be non-negative'
  }
  if (specs.cargo_width_m !== null && specs.cargo_width_m !== undefined && specs.cargo_width_m < 0) {
    errors.cargo_width_m = 'Width must be non-negative'
  }
  if (specs.cargo_height_m !== null && specs.cargo_height_m !== undefined && specs.cargo_height_m < 0) {
    errors.cargo_height_m = 'Height must be non-negative'
  }
  if (specs.cargo_value !== null && specs.cargo_value !== undefined && specs.cargo_value < 0) {
    errors.cargo_value = 'Value must be non-negative'
  }
  if (specs.duration_days !== null && specs.duration_days !== undefined && specs.duration_days < 0) {
    errors.duration_days = 'Duration must be non-negative'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Filter PJOs by market type
 * @param pjos - Array of PJOs with market_type field
 * @param marketTypeFilter - Filter value: 'all', 'simple', or 'complex'
 * @returns Filtered array
 */
export function filterByMarketType<T extends { market_type?: string | null }>(
  pjos: T[],
  marketTypeFilter: string
): T[] {
  if (marketTypeFilter === 'all') return pjos
  return pjos.filter(pjo => pjo.market_type === marketTypeFilter)
}

/**
 * Count PJOs by market type
 * @param pjos - Array of PJOs with market_type field
 * @returns Object with simple and complex counts
 */
export function countByMarketType<T extends { market_type?: string | null }>(
  pjos: T[]
): { simple: number; complex: number } {
  return pjos.reduce(
    (acc, pjo) => {
      if (pjo.market_type === 'complex') {
        acc.complex++
      } else {
        acc.simple++
      }
      return acc
    },
    { simple: 0, complex: 0 }
  )
}
