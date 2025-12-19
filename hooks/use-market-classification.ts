'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  CargoSpecifications,
  RouteCharacteristics,
  MarketClassification,
  ComplexityCriteria,
  PricingApproach,
} from '@/types/market-classification'
import { calculateMarketClassification } from '@/lib/market-classification-utils'
import { getComplexityCriteria } from '@/app/(main)/proforma-jo/classification-actions'

interface UseMarketClassificationProps {
  cargoSpecs: CargoSpecifications
  routeChars: RouteCharacteristics
  initialClassification?: MarketClassification | null
  initialPricingApproach?: PricingApproach | null
}

interface UseMarketClassificationReturn {
  classification: MarketClassification | null
  isCalculating: boolean
  pricingApproach: PricingApproach | null
  setPricingApproach: (approach: PricingApproach | null) => void
  recalculate: () => Promise<void>
  criteria: ComplexityCriteria[]
  criteriaLoading: boolean
  criteriaError: string | null
}

const DEBOUNCE_MS = 300

export function useMarketClassification({
  cargoSpecs,
  routeChars,
  initialClassification = null,
  initialPricingApproach = null,
}: UseMarketClassificationProps): UseMarketClassificationReturn {
  const [classification, setClassification] = useState<MarketClassification | null>(initialClassification)
  const [isCalculating, setIsCalculating] = useState(false)
  const [criteria, setCriteria] = useState<ComplexityCriteria[]>([])
  const [criteriaLoading, setCriteriaLoading] = useState(true)
  const [criteriaError, setCriteriaError] = useState<string | null>(null)
  const [pricingApproach, setPricingApproach] = useState<PricingApproach | null>(initialPricingApproach)
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const previousMarketTypeRef = useRef<'simple' | 'complex' | null>(initialClassification?.market_type ?? null)

  // Fetch criteria on mount
  useEffect(() => {
    async function fetchCriteria() {
      setCriteriaLoading(true)
      setCriteriaError(null)
      
      const result = await getComplexityCriteria()
      
      if (result.error) {
        setCriteriaError(result.error)
        setCriteria([])
      } else {
        setCriteria(result.data || [])
      }
      
      setCriteriaLoading(false)
    }
    
    fetchCriteria()
  }, [])

  // Calculate classification
  const calculate = useCallback(async () => {
    if (criteria.length === 0) return
    
    setIsCalculating(true)
    
    try {
      const pjoData = { ...cargoSpecs, ...routeChars }
      const result = calculateMarketClassification(pjoData, criteria)
      
      // Check if market type changed from simple to complex
      const previousType = previousMarketTypeRef.current
      const newType = result.market_type
      
      if (previousType !== 'complex' && newType === 'complex' && !pricingApproach) {
        // Default to premium pricing when becoming complex
        setPricingApproach('premium')
      }
      
      previousMarketTypeRef.current = newType
      setClassification(result)
    } finally {
      setIsCalculating(false)
    }
  }, [cargoSpecs, routeChars, criteria, pricingApproach])

  // Debounced recalculation when inputs change
  useEffect(() => {
    if (criteriaLoading || criteria.length === 0) return
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    debounceRef.current = setTimeout(() => {
      calculate()
    }, DEBOUNCE_MS)
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [cargoSpecs, routeChars, criteria, criteriaLoading, calculate])

  // Manual recalculate function
  const recalculate = useCallback(async () => {
    await calculate()
  }, [calculate])

  return {
    classification,
    isCalculating,
    pricingApproach,
    setPricingApproach,
    recalculate,
    criteria,
    criteriaLoading,
    criteriaError,
  }
}