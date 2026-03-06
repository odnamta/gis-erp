'use server'

/**
 * Co-Builder Scenario Actions
 * Split from actions.ts
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================================
// COMPETITION DATES (private)
// ============================================================

const COMPETITION_END = new Date('2026-03-12T23:59:59+07:00')

function isCompetitionOver(): boolean {
  return new Date() > COMPETITION_END
}

// ============================================================
// TYPES
// ============================================================

export interface ScenarioStep {
  step: number
  instruction: string
  checkpoint: string
}

export interface TestScenario {
  id: string
  scenario_code: string
  title: string
  description: string
  target_roles: string[]
  week_number: number
  steps: (ScenarioStep | string)[]
  points_value: number
  estimated_minutes: number
  display_order: number
  is_active: boolean
  is_completed?: boolean
}

// ============================================================
// GET TEST SCENARIOS
// ============================================================

export async function getTestScenarios(): Promise<TestScenario[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: scenarios } = await supabase
    .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'test_scenarios' as any)
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (!scenarios) return []

  // Get user's completions
  let completedIds: string[] = []
  if (user) {
    const { data: completions } = await supabase
      .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'scenario_completions' as any)
      .select('scenario_id')
      .eq('user_id', user.id)

    completedIds = ((completions || []) as unknown as { scenario_id: string }[]).map(c => c.scenario_id)
  }

  return (scenarios as unknown as TestScenario[]).map(s => ({
    ...s,
    is_completed: completedIds.includes(s.id),
  }))
}

// ============================================================
// GET SINGLE SCENARIO BY CODE
// ============================================================

export async function getScenarioByCode(code: string): Promise<TestScenario | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: scenario } = await supabase
    .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'test_scenarios' as any)
    .select('*')
    .eq('scenario_code', code)
    .eq('is_active', true)
    .single()

  if (!scenario) return null

  let isCompleted = false
  if (user) {
    const s = scenario as unknown as TestScenario
    const { count } = await supabase
      .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
      'scenario_completions' as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('scenario_id', s.id)
    isCompleted = (count || 0) > 0
  }

  return { ...(scenario as unknown as TestScenario), is_completed: isCompleted }
}

// ============================================================
// COMPLETE SCENARIO
// ============================================================

export async function completeScenario(data: {
  scenarioId: string
  checkpointResults: Record<number, 'pass' | 'fail' | 'skip'>
  overallRating: number
  comments?: string
  issuesFound?: string
}): Promise<{ success: boolean; error?: string; points?: number }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    if (isCompetitionOver()) {
      return { success: false, error: 'Kompetisi Co-Builder sudah berakhir (12 Maret 2026)' }
    }

    // Validate rating range (1-5)
    if (!data.overallRating || data.overallRating < 1 || data.overallRating > 5 || !Number.isInteger(data.overallRating)) {
      return { success: false, error: 'Rating harus antara 1-5' }
    }

    // Validate checkpoints: at least 1 must be pass or fail (not all skip)
    const results = Object.values(data.checkpointResults)
    if (results.length === 0) {
      return { success: false, error: 'Harus mengisi minimal 1 checkpoint' }
    }
    const hasRealEngagement = results.some(r => r === 'pass' || r === 'fail')
    if (!hasRealEngagement) {
      return { success: false, error: 'Minimal 1 checkpoint harus pass atau fail (tidak boleh semua skip)' }
    }

    // Check if already completed
    const { count } = await supabase
      .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'scenario_completions' as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('scenario_id', data.scenarioId)

    if (count && count > 0) {
      return { success: false, error: 'Skenario sudah pernah diselesaikan' }
    }

    // Fetch scenario to get its points_value (fall back to 20)
    const { data: scenarioData } = await supabase
      .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'test_scenarios' as any)
      .select('points_value')
      .eq('id', data.scenarioId)
      .single()

    const pointsEarned = (scenarioData as unknown as { points_value: number } | null)?.points_value || 20

    // Insert completion
    await supabase.from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'scenario_completions' as any).insert({
      user_id: user.id,
      scenario_id: data.scenarioId,
      checkpoint_results: data.checkpointResults,
      overall_rating: data.overallRating,
      comments: data.comments || null,
      issues_found: data.issuesFound || null,
      points_earned: pointsEarned,
    } as Record<string, unknown>)

    // Create point event
    await supabase.from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'point_events' as any).insert({
      user_id: user.id,
      event_type: 'scenario_completed',
      points: pointsEarned,
      description: `Skenario selesai`,
      reference_id: data.scenarioId,
    } as Record<string, unknown>)

    // Refresh leaderboard
    try { await supabase.rpc('refresh_leaderboard' as any) } catch { /* non-critical */ }

    revalidatePath('/co-builder')
    revalidatePath('/co-builder/scenarios')
    return { success: true, points: pointsEarned }
  } catch {
    return { success: false, error: 'Terjadi kesalahan' }
  }
}
