'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  ComplexityCriteria,
  MarketClassification,
  PricingApproach,
  ComplexityFactor,
} from '@/types/market-classification'

/**
 * Fetch all active complexity criteria from the database
 */
export async function getComplexityCriteria(): Promise<{
  data: ComplexityCriteria[] | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('complexity_criteria')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching complexity criteria:', error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/**
 * Update PJO with market classification data
 */
export async function updatePJOClassification(
  pjoId: string,
  classification: MarketClassification,
  pricingApproach: PricingApproach | null,
  pricingNotes: string | null
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('proforma_job_orders')
    .update({
      market_type: classification.market_type,
      complexity_score: classification.complexity_score,
      complexity_factors: classification.complexity_factors as unknown as ComplexityFactor[],
      pricing_approach: pricingApproach,
      pricing_notes: pricingNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pjoId)

  if (error) {
    console.error('Error updating PJO classification:', error)
    return { error: error.message }
  }

  revalidatePath('/proforma-jo')
  revalidatePath(`/proforma-jo/${pjoId}`)

  return { error: null }
}

/**
 * Get PJO classification data
 */
export async function getPJOClassification(pjoId: string): Promise<{
  data: {
    market_type: string | null
    complexity_score: number | null
    complexity_factors: ComplexityFactor[]
    pricing_approach: string | null
    pricing_notes: string | null
  } | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('proforma_job_orders')
    .select('market_type, complexity_score, complexity_factors, pricing_approach, pricing_notes')
    .eq('id', pjoId)
    .single()

  if (error) {
    console.error('Error fetching PJO classification:', error)
    return { data: null, error: error.message }
  }

  return {
    data: {
      market_type: data.market_type,
      complexity_score: data.complexity_score,
      complexity_factors: (data.complexity_factors as ComplexityFactor[]) || [],
      pricing_approach: data.pricing_approach,
      pricing_notes: data.pricing_notes,
    },
    error: null,
  }
}
