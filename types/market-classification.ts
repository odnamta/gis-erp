import { Tables, Json } from './database'

// Market type classification
export type MarketType = 'simple' | 'complex'
export type PricingApproach = 'standard' | 'premium' | 'negotiated' | 'cost_plus'
export type TerrainType = 'normal' | 'mountain' | 'unpaved' | 'narrow'

// Complexity criteria from database
export type ComplexityCriteria = Tables<'complexity_criteria'>

// Auto-detect rules structure
export interface AutoDetectRules {
  field: string
  operator: '>' | '<' | '>=' | '<=' | '=' | 'in'
  value: number | boolean | string | string[]
}

// Triggered complexity factor
export interface ComplexityFactor {
  criteria_code: string
  criteria_name: string
  weight: number
  triggered_value: string
}

// Market classification result
export interface MarketClassification {
  market_type: MarketType
  complexity_score: number
  complexity_factors: ComplexityFactor[]
  requires_engineering: boolean
}

// Cargo specifications input
export interface CargoSpecifications {
  cargo_weight_kg: number | null
  cargo_length_m: number | null
  cargo_width_m: number | null
  cargo_height_m: number | null
  cargo_value: number | null
  duration_days: number | null
}

// Route characteristics input
export interface RouteCharacteristics {
  is_new_route: boolean
  terrain_type: TerrainType | null
  requires_special_permit: boolean
  is_hazardous: boolean
}

// Combined input for classification calculation
export interface PJOClassificationInput extends CargoSpecifications, RouteCharacteristics {}

// Complexity thresholds
export const COMPLEXITY_THRESHOLDS = {
  SIMPLE_MAX: 19,      // 0-19 = Simple
  COMPLEX_MIN: 20,     // 20+ = Complex
  ENGINEERING_MIN: 20, // 20+ requires engineering
} as const

// Pricing approach labels
export const PRICING_APPROACH_LABELS: Record<PricingApproach, string> = {
  standard: 'Standard',
  premium: 'Premium',
  negotiated: 'Negotiated',
  cost_plus: 'Cost Plus',
}

// Terrain type labels
export const TERRAIN_TYPE_LABELS: Record<TerrainType, string> = {
  normal: 'Normal',
  mountain: 'Mountain Pass',
  unpaved: 'Unpaved Road',
  narrow: 'Narrow Road',
}

// Helper to parse complexity_factors from Json to ComplexityFactor[]
export function parseComplexityFactors(factors: Json | null): ComplexityFactor[] {
  if (!factors || !Array.isArray(factors)) return []
  return factors as unknown as ComplexityFactor[]
}

// Helper to parse auto_detect_rules from Json to AutoDetectRules
export function parseAutoDetectRules(rules: Json | null): AutoDetectRules | null {
  if (!rules || typeof rules !== 'object') return null
  return rules as unknown as AutoDetectRules
}
