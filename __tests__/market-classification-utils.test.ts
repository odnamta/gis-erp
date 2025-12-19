import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  classifyMarketType,
  requiresEngineering,
  evaluateCriterion,
  calculateMarketClassification,
  getTriggeredDisplayValue,
  validateCargoSpecifications,
  filterByMarketType,
  countByMarketType,
  isValidNonNegative,
} from '@/lib/market-classification-utils'
import {
  ComplexityCriteria,
  PJOClassificationInput,
  COMPLEXITY_THRESHOLDS,
} from '@/types/market-classification'

// Generators
const complexityScoreArb = fc.integer({ min: 0, max: 150 })

const cargoSpecsArb = fc.record({
  cargo_weight_kg: fc.option(fc.float({ min: 0, max: 100000, noNaN: true }), { nil: null }),
  cargo_length_m: fc.option(fc.float({ min: 0, max: 50, noNaN: true }), { nil: null }),
  cargo_width_m: fc.option(fc.float({ min: 0, max: 10, noNaN: true }), { nil: null }),
  cargo_height_m: fc.option(fc.float({ min: 0, max: 10, noNaN: true }), { nil: null }),
  cargo_value: fc.option(fc.float({ min: 0, max: 10000000000, noNaN: true }), { nil: null }),
  duration_days: fc.option(fc.integer({ min: 0, max: 365 }), { nil: null }),
})

const routeCharsArb = fc.record({
  is_new_route: fc.boolean(),
  terrain_type: fc.option(fc.constantFrom('normal', 'mountain', 'unpaved', 'narrow') as fc.Arbitrary<'normal' | 'mountain' | 'unpaved' | 'narrow'>, { nil: null }),
  requires_special_permit: fc.boolean(),
  is_hazardous: fc.boolean(),
})

const pjoClassificationInputArb: fc.Arbitrary<PJOClassificationInput> = fc.record({
  cargo_weight_kg: fc.option(fc.float({ min: 0, max: 100000, noNaN: true }), { nil: null }),
  cargo_length_m: fc.option(fc.float({ min: 0, max: 50, noNaN: true }), { nil: null }),
  cargo_width_m: fc.option(fc.float({ min: 0, max: 10, noNaN: true }), { nil: null }),
  cargo_height_m: fc.option(fc.float({ min: 0, max: 10, noNaN: true }), { nil: null }),
  cargo_value: fc.option(fc.float({ min: 0, max: 10000000000, noNaN: true }), { nil: null }),
  duration_days: fc.option(fc.integer({ min: 0, max: 365 }), { nil: null }),
  is_new_route: fc.boolean(),
  terrain_type: fc.option(fc.constantFrom('normal', 'mountain', 'unpaved', 'narrow') as fc.Arbitrary<'normal' | 'mountain' | 'unpaved' | 'narrow'>, { nil: null }),
  requires_special_permit: fc.boolean(),
  is_hazardous: fc.boolean(),
})

const criterionArb: fc.Arbitrary<ComplexityCriteria> = fc.record({
  id: fc.uuid(),
  criteria_code: fc.stringMatching(/^[a-z_]{1,30}$/),
  criteria_name: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.option(fc.string(), { nil: null }),
  weight: fc.option(fc.integer({ min: 1, max: 50 }), { nil: null }),
  is_active: fc.option(fc.boolean(), { nil: null }),
  display_order: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
  created_at: fc.constant(null),
  auto_detect_rules: fc.option(
    fc.oneof(
      fc.record({
        field: fc.constantFrom('cargo_weight_kg', 'cargo_length_m', 'cargo_width_m', 'cargo_height_m', 'cargo_value', 'duration_days'),
        operator: fc.constantFrom('>', '<', '>=', '<='),
        value: fc.integer({ min: 0, max: 100000 }),
      }),
      fc.record({
        field: fc.constantFrom('is_new_route', 'requires_special_permit', 'is_hazardous'),
        operator: fc.constant('=' as const),
        value: fc.boolean(),
      }),
      fc.record({
        field: fc.constant('terrain_type'),
        operator: fc.constant('in' as const),
        value: fc.constantFrom(['mountain'], ['unpaved'], ['narrow'], ['mountain', 'unpaved'], ['mountain', 'unpaved', 'narrow']),
      })
    ),
    { nil: null }
  ),
})

const marketTypeArb = fc.constantFrom('simple', 'complex') as fc.Arbitrary<'simple' | 'complex'>

const pjoWithMarketTypeArb = fc.record({
  id: fc.uuid(),
  market_type: fc.option(marketTypeArb, { nil: null }),
})

describe('Market Classification Utils', () => {
  // Feature: market-type-classification, Property 1: Complexity Score Threshold Classification
  describe('Property 1: Complexity Score Threshold Classification', () => {
    it('should classify market type as simple when score < 20 and complex when score >= 20', () => {
      fc.assert(
        fc.property(complexityScoreArb, (score) => {
          const result = classifyMarketType(score)
          const expected = score < COMPLEXITY_THRESHOLDS.COMPLEX_MIN ? 'simple' : 'complex'
          return result === expected
        }),
        { numRuns: 100 }
      )
    })

    it('should require engineering when score >= 20', () => {
      fc.assert(
        fc.property(complexityScoreArb, (score) => {
          const result = requiresEngineering(score)
          const expected = score >= COMPLEXITY_THRESHOLDS.ENGINEERING_MIN
          return result === expected
        }),
        { numRuns: 100 }
      )
    })
  })

  // Feature: market-type-classification, Property 2: Criteria Evaluation and Score Calculation
  describe('Property 2: Criteria Evaluation and Score Calculation', () => {
    it('should calculate total score as sum of weights from triggered criteria', () => {
      fc.assert(
        fc.property(
          pjoClassificationInputArb,
          fc.array(criterionArb, { minLength: 0, maxLength: 10 }),
          (pjoData, criteria) => {
            const result = calculateMarketClassification(pjoData, criteria)
            
            // Manually calculate expected score
            let expectedScore = 0
            const activeCriteria = criteria.filter(c => c.is_active !== false)
            
            for (const criterion of activeCriteria) {
              const isTriggered = evaluateCriterion(criterion, pjoData)
              if (isTriggered) {
                expectedScore += criterion.weight ?? 0
              }
            }
            
            return result.complexity_score === expectedScore
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include all triggered factors in the result', () => {
      fc.assert(
        fc.property(
          pjoClassificationInputArb,
          fc.array(criterionArb, { minLength: 0, maxLength: 10 }),
          (pjoData, criteria) => {
            const result = calculateMarketClassification(pjoData, criteria)
            
            // Count triggered criteria
            const activeCriteria = criteria.filter(c => c.is_active !== false)
            let triggeredCount = 0
            
            for (const criterion of activeCriteria) {
              if (evaluateCriterion(criterion, pjoData)) {
                triggeredCount++
              }
            }
            
            return result.complexity_factors.length === triggeredCount
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // Feature: market-type-classification, Property 3: Operator Evaluation Correctness
  describe('Property 3: Operator Evaluation Correctness', () => {
    it('should correctly evaluate > operator', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100000, noNaN: true }),
          fc.float({ min: 0, max: 100000, noNaN: true }),
          (fieldValue, ruleValue) => {
            const criterion: ComplexityCriteria = {
              id: 'test',
              criteria_code: 'test',
              criteria_name: 'Test',
              description: null,
              weight: 10,
              is_active: true,
              display_order: 0,
              created_at: null,
              auto_detect_rules: { field: 'cargo_weight_kg', operator: '>', value: ruleValue },
            }
            const pjoData: PJOClassificationInput = {
              cargo_weight_kg: fieldValue,
              cargo_length_m: null,
              cargo_width_m: null,
              cargo_height_m: null,
              cargo_value: null,
              duration_days: null,
              is_new_route: false,
              terrain_type: null,
              requires_special_permit: false,
              is_hazardous: false,
            }
            
            const result = evaluateCriterion(criterion, pjoData)
            const expected = fieldValue > ruleValue
            return result === expected
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly evaluate = operator for boolean', () => {
      fc.assert(
        fc.property(fc.boolean(), fc.boolean(), (fieldValue, ruleValue) => {
          const criterion: ComplexityCriteria = {
            id: 'test',
            criteria_code: 'test',
            criteria_name: 'Test',
            description: null,
            weight: 10,
            is_active: true,
            display_order: 0,
            created_at: null,
            auto_detect_rules: { field: 'is_new_route', operator: '=', value: ruleValue },
          }
          const pjoData: PJOClassificationInput = {
            cargo_weight_kg: null,
            cargo_length_m: null,
            cargo_width_m: null,
            cargo_height_m: null,
            cargo_value: null,
            duration_days: null,
            is_new_route: fieldValue,
            terrain_type: null,
            requires_special_permit: false,
            is_hazardous: false,
          }
          
          const result = evaluateCriterion(criterion, pjoData)
          const expected = fieldValue === ruleValue
          return result === expected
        }),
        { numRuns: 100 }
      )
    })

    it('should correctly evaluate in operator for terrain_type', () => {
      fc.assert(
        fc.property(
          fc.option(fc.constantFrom('normal', 'mountain', 'unpaved', 'narrow') as fc.Arbitrary<'normal' | 'mountain' | 'unpaved' | 'narrow'>, { nil: null }),
          fc.constantFrom(['mountain'], ['unpaved'], ['narrow'], ['mountain', 'unpaved'], ['mountain', 'unpaved', 'narrow']),
          (fieldValue, ruleValue) => {
            const criterion: ComplexityCriteria = {
              id: 'test',
              criteria_code: 'test',
              criteria_name: 'Test',
              description: null,
              weight: 10,
              is_active: true,
              display_order: 0,
              created_at: null,
              auto_detect_rules: { field: 'terrain_type', operator: 'in', value: ruleValue },
            }
            const pjoData: PJOClassificationInput = {
              cargo_weight_kg: null,
              cargo_length_m: null,
              cargo_width_m: null,
              cargo_height_m: null,
              cargo_value: null,
              duration_days: null,
              is_new_route: false,
              terrain_type: fieldValue,
              requires_special_permit: false,
              is_hazardous: false,
            }
            
            const result = evaluateCriterion(criterion, pjoData)
            const expected = fieldValue !== null && ruleValue.includes(fieldValue)
            return result === expected
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // Feature: market-type-classification, Property 4: Triggered Factors Completeness
  describe('Property 4: Triggered Factors Completeness', () => {
    it('should include all required fields in triggered factors', () => {
      fc.assert(
        fc.property(
          pjoClassificationInputArb,
          fc.array(criterionArb, { minLength: 1, maxLength: 10 }),
          (pjoData, criteria) => {
            const result = calculateMarketClassification(pjoData, criteria)
            
            // Check each triggered factor has required fields
            for (const factor of result.complexity_factors) {
              if (!factor.criteria_code || factor.criteria_code.length === 0) return false
              if (!factor.criteria_name || factor.criteria_name.length === 0) return false
              if (typeof factor.weight !== 'number' || factor.weight < 0) return false
              if (typeof factor.triggered_value !== 'string') return false
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // Feature: market-type-classification, Property 6: Numeric Input Validation
  describe('Property 6: Numeric Input Validation', () => {
    it('should reject negative values in cargo specifications', () => {
      fc.assert(
        fc.property(
          fc.record({
            cargo_weight_kg: fc.option(fc.float({ min: -100000, max: 100000, noNaN: true }), { nil: null }),
            cargo_length_m: fc.option(fc.float({ min: -50, max: 50, noNaN: true }), { nil: null }),
            cargo_width_m: fc.option(fc.float({ min: -10, max: 10, noNaN: true }), { nil: null }),
            cargo_height_m: fc.option(fc.float({ min: -10, max: 10, noNaN: true }), { nil: null }),
            cargo_value: fc.option(fc.float({ min: -10000000000, max: 10000000000, noNaN: true }), { nil: null }),
            duration_days: fc.option(fc.integer({ min: -365, max: 365 }), { nil: null }),
          }),
          (specs) => {
            const result = validateCargoSpecifications(specs)
            
            // Check if any field is negative
            const hasNegative = 
              (specs.cargo_weight_kg !== null && specs.cargo_weight_kg < 0) ||
              (specs.cargo_length_m !== null && specs.cargo_length_m < 0) ||
              (specs.cargo_width_m !== null && specs.cargo_width_m < 0) ||
              (specs.cargo_height_m !== null && specs.cargo_height_m < 0) ||
              (specs.cargo_value !== null && specs.cargo_value < 0) ||
              (specs.duration_days !== null && specs.duration_days < 0)
            
            // If has negative, should be invalid
            if (hasNegative) {
              return !result.valid && Object.keys(result.errors).length > 0
            }
            // If no negative, should be valid
            return result.valid && Object.keys(result.errors).length === 0
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should validate non-negative correctly', () => {
      fc.assert(
        fc.property(
          fc.option(fc.float({ min: -1000, max: 1000, noNaN: true }), { nil: null }),
          (value) => {
            const result = isValidNonNegative(value)
            if (value === null || value === undefined) return result === true
            return result === (value >= 0)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // Feature: market-type-classification, Property 7: Market Type Filter Correctness
  describe('Property 7: Market Type Filter Correctness', () => {
    it('should filter PJOs correctly by market type', () => {
      fc.assert(
        fc.property(
          fc.array(pjoWithMarketTypeArb, { minLength: 0, maxLength: 20 }),
          fc.constantFrom('all', 'simple', 'complex'),
          (pjos, filter) => {
            const result = filterByMarketType(pjos, filter)
            
            if (filter === 'all') {
              return result.length === pjos.length
            }
            
            // All results should match the filter
            return result.every(pjo => pjo.market_type === filter)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // Feature: market-type-classification, Property 8: Summary Counts Accuracy
  describe('Property 8: Summary Counts Accuracy', () => {
    it('should count simple and complex PJOs correctly', () => {
      fc.assert(
        fc.property(
          fc.array(pjoWithMarketTypeArb, { minLength: 0, maxLength: 20 }),
          (pjos) => {
            const result = countByMarketType(pjos)
            
            // Manually count
            let simpleCount = 0
            let complexCount = 0
            for (const pjo of pjos) {
              if (pjo.market_type === 'complex') {
                complexCount++
              } else {
                simpleCount++
              }
            }
            
            return result.simple === simpleCount && result.complex === complexCount
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should have counts that sum to total', () => {
      fc.assert(
        fc.property(
          fc.array(pjoWithMarketTypeArb, { minLength: 0, maxLength: 20 }),
          (pjos) => {
            const result = countByMarketType(pjos)
            return result.simple + result.complex === pjos.length
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // Feature: market-type-classification, Property 14: Inactive Criteria Exclusion
  describe('Property 14: Inactive Criteria Exclusion', () => {
    it('should not include inactive criteria in score calculation', () => {
      fc.assert(
        fc.property(
          pjoClassificationInputArb,
          fc.array(criterionArb, { minLength: 1, maxLength: 10 }),
          (pjoData, criteria) => {
            // Explicitly set some criteria to inactive (false, not null)
            // Use unique criteria codes to avoid collision issues
            const mixedCriteria = criteria.map((c, i) => ({
              ...c,
              criteria_code: `${c.criteria_code}_${i}`, // Make codes unique
              is_active: i % 2 === 0 ? false : true, // Every other one is explicitly inactive
            }))
            
            const result = calculateMarketClassification(pjoData, mixedCriteria)
            
            // Check that no explicitly inactive criteria appear in factors
            const inactiveCodes = mixedCriteria
              .filter(c => c.is_active === false)
              .map(c => c.criteria_code)
            
            const hasInactive = result.complexity_factors.some(f => 
              inactiveCodes.includes(f.criteria_code)
            )
            
            return !hasInactive
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})

// Unit tests for specific examples and edge cases
describe('Market Classification Utils - Unit Tests', () => {
  describe('classifyMarketType', () => {
    it('should return simple for score 0', () => {
      expect(classifyMarketType(0)).toBe('simple')
    })

    it('should return simple for score 19', () => {
      expect(classifyMarketType(19)).toBe('simple')
    })

    it('should return complex for score 20', () => {
      expect(classifyMarketType(20)).toBe('complex')
    })

    it('should return complex for score 100', () => {
      expect(classifyMarketType(100)).toBe('complex')
    })
  })

  describe('evaluateCriterion', () => {
    it('should return false when auto_detect_rules is null', () => {
      const criterion: ComplexityCriteria = {
        id: 'test',
        criteria_code: 'test',
        criteria_name: 'Test',
        description: null,
        weight: 10,
        is_active: true,
        display_order: 0,
        created_at: null,
        auto_detect_rules: null,
      }
      const pjoData: PJOClassificationInput = {
        cargo_weight_kg: 50000,
        cargo_length_m: null,
        cargo_width_m: null,
        cargo_height_m: null,
        cargo_value: null,
        duration_days: null,
        is_new_route: false,
        terrain_type: null,
        requires_special_permit: false,
        is_hazardous: false,
      }
      
      expect(evaluateCriterion(criterion, pjoData)).toBe(false)
    })

    it('should return false when field value is null', () => {
      const criterion: ComplexityCriteria = {
        id: 'test',
        criteria_code: 'test',
        criteria_name: 'Test',
        description: null,
        weight: 10,
        is_active: true,
        display_order: 0,
        created_at: null,
        auto_detect_rules: { field: 'cargo_weight_kg', operator: '>', value: 30000 },
      }
      const pjoData: PJOClassificationInput = {
        cargo_weight_kg: null,
        cargo_length_m: null,
        cargo_width_m: null,
        cargo_height_m: null,
        cargo_value: null,
        duration_days: null,
        is_new_route: false,
        terrain_type: null,
        requires_special_permit: false,
        is_hazardous: false,
      }
      
      expect(evaluateCriterion(criterion, pjoData)).toBe(false)
    })
  })

  describe('getTriggeredDisplayValue', () => {
    it('should format cargo weight with kg suffix', () => {
      const criterion: ComplexityCriteria = {
        id: 'test',
        criteria_code: 'heavy_cargo',
        criteria_name: 'Heavy Cargo',
        description: null,
        weight: 20,
        is_active: true,
        display_order: 0,
        created_at: null,
        auto_detect_rules: { field: 'cargo_weight_kg', operator: '>', value: 30000 },
      }
      const pjoData: PJOClassificationInput = {
        cargo_weight_kg: 45000,
        cargo_length_m: null,
        cargo_width_m: null,
        cargo_height_m: null,
        cargo_value: null,
        duration_days: null,
        is_new_route: false,
        terrain_type: null,
        requires_special_permit: false,
        is_hazardous: false,
      }
      
      const result = getTriggeredDisplayValue(criterion, pjoData)
      expect(result).toContain('45')
      expect(result).toContain('kg')
    })
  })
})
