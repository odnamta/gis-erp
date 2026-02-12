'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/permissions-server'
import { revalidatePath } from 'next/cache'
import { calculateEffortLevel } from '@/lib/co-builder-utils'

// ============================================================
// TYPES
// ============================================================

export interface CompetitionFeedback {
  id: string
  user_id: string
  category: 'bug' | 'ux_issue' | 'suggestion' | 'praise' | 'question'
  title: string
  description: string
  steps_to_reproduce: string | null
  suggestion: string | null
  page_url: string | null
  screenshot_url: string | null
  effort_level: 'quick' | 'standard' | 'detailed'
  base_points: number
  impact_level: 'pending' | 'helpful' | 'important' | 'critical'
  impact_multiplier: number
  bonus_points: number
  total_points: number
  admin_response: string | null
  admin_status: string
  references_feedback_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  reviewed_at: string | null
  // Joined fields
  user_name?: string
  user_role?: string
  user_avatar?: string
}

export interface LeaderboardEntry {
  user_id: string
  user_name: string
  user_role: string
  avatar_url: string | null
  total_points: number
  feedback_points: number
  scenario_points: number
  bonus_points: number
  feedback_count: number
  scenarios_completed: number
  active_days: number
  last_activity: string | null
  rank: number
}

export interface PointEvent {
  id: string
  user_id: string
  event_type: string
  points: number
  description: string
  reference_id: string | null
  is_seen: boolean
  created_at: string
}

export interface UserCompetitionStats {
  totalPoints: number
  rank: number
  totalParticipants: number
  feedbackCount: number
  scenariosCompleted: number
  activeDays: number
  currentStreak: number
  hasSubmittedTop5: boolean
  loginDays: number
}

export interface TestScenario {
  id: string
  scenario_code: string
  title: string
  description: string
  target_roles: string[]
  week_number: number
  steps: { step: number; instruction: string; checkpoint: string }[]
  points_value: number
  estimated_minutes: number
  display_order: number
  is_active: boolean
  is_completed?: boolean
}

// calculateEffortLevel is in @/lib/co-builder-utils.ts (shared with client)

// ============================================================
// SUBMIT FEEDBACK
// ============================================================

export async function submitCompetitionFeedback(data: {
  category: string
  title: string
  description: string
  steps_to_reproduce?: string
  suggestion?: string
  page_url?: string
  screenshot_url?: string
  references_feedback_id?: string
}): Promise<{ success: boolean; error?: string; points?: number; bonuses?: string[] }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Validate description length (except praise)
    if (data.category !== 'praise' && (data.description?.length || 0) < 20) {
      return { success: false, error: 'Deskripsi minimal 20 karakter' }
    }

    // Calculate effort level
    const { level, basePoints } = calculateEffortLevel(data)

    // Insert feedback
    const { data: feedback, error: insertError } = await supabase
      .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'competition_feedback' as any)
      .insert({
        user_id: user.id,
        category: data.category,
        title: data.title,
        description: data.description,
        steps_to_reproduce: data.steps_to_reproduce || null,
        suggestion: data.suggestion || null,
        page_url: data.page_url || null,
        screenshot_url: data.screenshot_url || null,
        references_feedback_id: data.references_feedback_id || null,
        effort_level: level,
        base_points: basePoints,
        total_points: basePoints,
      } as Record<string, unknown>)
      .select('id')
      .single()

    if (insertError) {
      console.error('Error submitting feedback:', insertError)
      return { success: false, error: 'Gagal mengirim feedback' }
    }

    const feedbackId = (feedback as unknown as { id: string }).id
    let totalEarned = basePoints
    const bonuses: string[] = []

    // Create base point event
    await supabase.from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'point_events' as any).insert({
      user_id: user.id,
      event_type: 'feedback_submitted',
      points: basePoints,
      description: `Feedback "${data.title}" (${level})`,
      reference_id: feedbackId,
    } as Record<string, unknown>)

    // Check: First feedback of the day?
    const today = new Date().toISOString().split('T')[0]
    const { count: todayCount } = await supabase
      .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'competition_feedback' as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00Z`)
      .lte('created_at', `${today}T23:59:59Z`)

    if (todayCount && todayCount <= 1) {
      await supabase.from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'point_events' as any).insert({
        user_id: user.id,
        event_type: 'first_of_day',
        points: 2,
        description: 'Feedback pertama hari ini!',
        reference_id: feedbackId,
      } as Record<string, unknown>)
      totalEarned += 2
      bonuses.push('first_of_day')
    }

    // Check: Collaboration bonus?
    if (data.references_feedback_id) {
      await supabase.from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'point_events' as any).insert({
        user_id: user.id,
        event_type: 'collaboration_bonus',
        points: 5,
        description: 'Kolaborasi: referensi feedback lain',
        reference_id: feedbackId,
      } as Record<string, unknown>)
      totalEarned += 5
      bonuses.push('collaboration')
    }

    // Check: Streak bonus (3+ consecutive working days)
    const streak = await calculateStreak(user.id)
    if (streak >= 3) {
      // Check if streak bonus already awarded today
      const { count: streakToday } = await supabase
        .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'point_events' as any)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('event_type', 'streak_bonus')
        .gte('created_at', `${today}T00:00:00Z`)

      if (!streakToday || streakToday === 0) {
        await supabase.from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'point_events' as any).insert({
          user_id: user.id,
          event_type: 'streak_bonus',
          points: 3,
          description: `Streak ${streak} hari berturut-turut!`,
          reference_id: feedbackId,
        } as Record<string, unknown>)
        totalEarned += 3
        bonuses.push('streak')
      }
    }

    // Refresh leaderboard
    try {
      await supabase.rpc('refresh_leaderboard' as any)
    } catch {
      // Non-critical
    }

    revalidatePath('/co-builder')
    return { success: true, points: totalEarned, bonuses }
  } catch (error) {
    console.error('Error in submitCompetitionFeedback:', error)
    return { success: false, error: 'Terjadi kesalahan' }
  }
}

// ============================================================
// STREAK CALCULATION
// ============================================================

async function calculateStreak(userId: string): Promise<number> {
  const supabase = await createClient()

  const { data } = await supabase
    .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'competition_feedback' as any)
    .select('created_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (!data || data.length === 0) return 0

  const dates = [...new Set(
    (data as unknown as { created_at: string }[])
      .map(d => d.created_at.split('T')[0])
  )].sort().reverse()

  if (dates.length === 0) return 0

  let streak = 1
  for (let i = 0; i < dates.length - 1; i++) {
    const current = new Date(dates[i])
    const prev = new Date(dates[i + 1])
    const diffDays = Math.floor((current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))

    // Allow weekend gaps (diff of 1, 2, or 3 for Fri->Mon)
    if (diffDays <= 3) {
      streak++
    } else {
      break
    }
  }

  return streak
}

// ============================================================
// GET LEADERBOARD
// ============================================================

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = await createClient()

  // Try materialized view first, fall back to direct query
  const { data, error } = await supabase
    .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'competition_leaderboard' as any)
    .select('*')
    .order('total_points', { ascending: false })

  if (error || !data || data.length === 0) {
    // Fallback: direct query
    return await getLeaderboardDirect()
  }

  return data as unknown as LeaderboardEntry[]
}

async function getLeaderboardDirect(): Promise<LeaderboardEntry[]> {
  const supabase = await createClient()

  // Get all users with their points
  const { data: users } = await supabase
    .from('user_profiles')
    .select('user_id, full_name, role, avatar_url')
    .neq('email', 'dioatmando@gama-group.co')
    .neq('email', 'info@gama-group.co')
    .neq('role', 'agency')
    .eq('is_active', true)
    .not('role', 'is', null)

  if (!users) return []

  const entries: LeaderboardEntry[] = []

  for (const user of users) {
    if (!user.user_id) continue

    // Get total points
    const { data: points } = await supabase
      .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'point_events' as any)
      .select('points, event_type')
      .eq('user_id', user.user_id)

    const pointData = (points || []) as unknown as { points: number; event_type: string }[]
    const totalPoints = pointData.reduce((sum, p) => sum + p.points, 0)

    // Get feedback count
    const { count: feedbackCount } = await supabase
      .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'competition_feedback' as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.user_id)
      .eq('is_active', true)

    // Get scenario count
    const { count: scenarioCount } = await supabase
      .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'scenario_completions' as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.user_id)

    entries.push({
      user_id: user.user_id,
      user_name: user.full_name || 'Unknown',
      user_role: user.role || '',
      avatar_url: user.avatar_url,
      total_points: totalPoints,
      feedback_points: pointData.filter(p => ['feedback_submitted', 'feedback_reviewed'].includes(p.event_type)).reduce((s, p) => s + p.points, 0),
      scenario_points: pointData.filter(p => p.event_type === 'scenario_completed').reduce((s, p) => s + p.points, 0),
      bonus_points: pointData.filter(p => !['feedback_submitted', 'feedback_reviewed', 'scenario_completed'].includes(p.event_type)).reduce((s, p) => s + p.points, 0),
      feedback_count: feedbackCount || 0,
      scenarios_completed: scenarioCount || 0,
      active_days: [...new Set(pointData.map(() => ''))].length, // simplified
      last_activity: null,
      rank: 0,
    })
  }

  // Sort and assign ranks
  entries.sort((a, b) => b.total_points - a.total_points)
  entries.forEach((e, i) => { e.rank = i + 1 })

  return entries
}

// ============================================================
// GET USER STATS
// ============================================================

export async function getUserCompetitionStats(): Promise<UserCompetitionStats | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Get total points
  const { data: pointEvents } = await supabase
    .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'point_events' as any)
    .select('points, created_at')
    .eq('user_id', user.id)

  const points = (pointEvents || []) as unknown as { points: number; created_at: string }[]
  const totalPoints = points.reduce((sum, p) => sum + p.points, 0)

  // Get feedback count
  const { count: feedbackCount } = await supabase
    .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'competition_feedback' as any)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true)

  // Get scenarios completed
  const { count: scenariosCompleted } = await supabase
    .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'scenario_completions' as any)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Check top5 submission
  const { count: top5Count } = await supabase
    .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'top5_submissions' as any)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Calculate active days
  const activeDays = new Set(points.map(p => p.created_at.split('T')[0])).size

  // Calculate streak
  const streak = await calculateStreak(user.id)

  // Get rank
  const leaderboard = await getLeaderboard()
  const myEntry = leaderboard.find(e => e.user_id === user.id)
  const rank = myEntry?.rank || leaderboard.length + 1

  // Estimate login days from point_events distinct dates
  const loginDays = activeDays

  return {
    totalPoints,
    rank,
    totalParticipants: Math.max(leaderboard.length, 1),
    feedbackCount: feedbackCount || 0,
    scenariosCompleted: scenariosCompleted || 0,
    activeDays,
    currentStreak: streak,
    hasSubmittedTop5: (top5Count || 0) > 0,
    loginDays,
  }
}

// ============================================================
// GET USER POINT COUNTER (lightweight, for header)
// ============================================================

export async function getUserPointCounter(): Promise<{ points: number; rank: number } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: pointEvents } = await supabase
    .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'point_events' as any)
    .select('points')
    .eq('user_id', user.id)

  const points = (pointEvents || []) as unknown as { points: number }[]
  const totalPoints = points.reduce((sum, p) => sum + p.points, 0)

  // Simple rank calculation
  let result: { data: unknown[] | null } = { data: null }
  try {
    await supabase.rpc('refresh_leaderboard' as any)
    const { data: lbData } = await supabase
      .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
      'competition_leaderboard' as any)
      .select('user_id, total_points')
      .order('total_points', { ascending: false })
    result = { data: lbData }
  } catch {
    // Non-critical
  }

  let rank = 1
  if (result.data) {
    const entries = result.data as unknown as { user_id: string; total_points: number }[]
    const idx = entries.findIndex(e => e.user_id === user.id)
    rank = idx >= 0 ? idx + 1 : entries.length + 1
  }

  return { points: totalPoints, rank }
}

// ============================================================
// GET UNSEEN POINT EVENTS (for toasts)
// ============================================================

export async function getUnseenPointEvents(): Promise<PointEvent[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'point_events' as any)
    .select('*')
    .eq('user_id', user.id)
    .eq('is_seen', false)
    .order('created_at', { ascending: false })
    .limit(10)

  return (data || []) as unknown as PointEvent[]
}

export async function markPointEventsSeen(ids: string[]): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'point_events' as any)
    .update({ is_seen: true } as Record<string, unknown>)
    .in('id', ids)
}

// ============================================================
// GET ALL FEEDBACK (for bug tracker)
// ============================================================

export async function getAllCompetitionFeedback(filters?: {
  status?: string
  category?: string
  impact?: string
}): Promise<CompetitionFeedback[]> {
  const supabase = await createClient()

  let query = supabase
    .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'competition_feedback' as any)
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('admin_status', filters.status)
  }
  if (filters?.category && filters.category !== 'all') {
    query = query.eq('category', filters.category)
  }
  if (filters?.impact && filters.impact !== 'all') {
    query = query.eq('impact_level', filters.impact)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching feedback:', error)
    return []
  }

  // Enrich with user names
  const feedbackList = (data || []) as unknown as CompetitionFeedback[]
  const userIds = [...new Set(feedbackList.map(f => f.user_id))]

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, role, avatar_url')
      .in('user_id', userIds)

    const profileMap = new Map(
      ((profiles || []) as unknown as { user_id: string; full_name: string; role: string; avatar_url: string }[])
        .map(p => [p.user_id, p])
    )

    feedbackList.forEach(f => {
      const profile = profileMap.get(f.user_id)
      if (profile) {
        f.user_name = profile.full_name
        f.user_role = profile.role
        f.user_avatar = profile.avatar_url
      }
    })
  }

  return feedbackList
}

// ============================================================
// GET USER'S OWN FEEDBACK
// ============================================================

export async function getMyFeedback(): Promise<CompetitionFeedback[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'competition_feedback' as any)
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (data || []) as unknown as CompetitionFeedback[]
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
// GET SINGLE FEEDBACK BY ID (for admin review)
// ============================================================

export async function getFeedbackById(id: string): Promise<CompetitionFeedback | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'competition_feedback' as any)
    .select('*')
    .eq('id', id)
    .single()

  if (!data) return null

  const feedback = data as unknown as CompetitionFeedback

  // Enrich with user info
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, role, avatar_url')
    .eq('user_id', feedback.user_id)
    .single()

  if (profile) {
    const p = profile as unknown as { full_name: string; role: string; avatar_url: string }
    feedback.user_name = p.full_name
    feedback.user_role = p.role
    feedback.user_avatar = p.avatar_url
  }

  return feedback
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

    const pointsEarned = 20

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
  } catch (error) {
    console.error('Error completing scenario:', error)
    return { success: false, error: 'Terjadi kesalahan' }
  }
}

// ============================================================
// ADMIN: REVIEW FEEDBACK
// ============================================================

export async function reviewFeedback(data: {
  feedbackId: string
  impactLevel: 'helpful' | 'important' | 'critical'
  adminStatus: string
  adminResponse: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await getUserProfile()
    if (!profile || !['owner', 'director', 'sysadmin'].includes(profile.role)) {
      return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()
    const multiplierMap = { helpful: 1, important: 2, critical: 3 }
    const multiplier = multiplierMap[data.impactLevel]

    // Get current feedback
    const { data: current } = await supabase
      .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'competition_feedback' as any)
      .select('*')
      .eq('id', data.feedbackId)
      .single()

    if (!current) return { success: false, error: 'Feedback not found' }

    const fb = current as unknown as CompetitionFeedback
    const newTotal = fb.base_points * multiplier
    const pointsDiff = newTotal - fb.total_points

    // Update feedback
    await supabase
      .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'competition_feedback' as any)
      .update({
        impact_level: data.impactLevel,
        impact_multiplier: multiplier,
        total_points: newTotal,
        admin_status: data.adminStatus,
        admin_response: data.adminResponse,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('id', data.feedbackId)

    // Create point event for the difference
    if (pointsDiff !== 0) {
      await supabase.from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'point_events' as any).insert({
        user_id: fb.user_id,
        event_type: 'feedback_reviewed',
        points: pointsDiff,
        description: `Feedback dinilai ${data.impactLevel} (x${multiplier})`,
        reference_id: data.feedbackId,
      } as Record<string, unknown>)
    }

    // Extra bonus for fixed bugs or implemented ideas
    if (data.adminStatus === 'fixed' && fb.admin_status !== 'fixed') {
      await supabase.from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'point_events' as any).insert({
        user_id: fb.user_id,
        event_type: 'bug_fixed',
        points: 5,
        description: 'Bug yang kamu laporkan sudah diperbaiki!',
        reference_id: data.feedbackId,
      } as Record<string, unknown>)
    }
    if (data.adminStatus === 'implemented' && fb.admin_status !== 'implemented') {
      await supabase.from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'point_events' as any).insert({
        user_id: fb.user_id,
        event_type: 'idea_implemented',
        points: 10,
        description: 'Saran kamu sudah diimplementasikan!',
        reference_id: data.feedbackId,
      } as Record<string, unknown>)
    }

    // Handle duplicate: zero out points
    if (data.adminStatus === 'duplicate' && fb.admin_status !== 'duplicate') {
      const reversePoints = -fb.total_points
      if (reversePoints !== 0) {
        await supabase.from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'point_events' as any).insert({
          user_id: fb.user_id,
          event_type: 'feedback_reviewed',
          points: reversePoints,
          description: 'Feedback ditandai duplikat',
          reference_id: data.feedbackId,
        } as Record<string, unknown>)
      }
      await supabase
        .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'competition_feedback' as any)
        .update({ total_points: 0 } as Record<string, unknown>)
        .eq('id', data.feedbackId)
    }

    // Refresh leaderboard
    try { await supabase.rpc('refresh_leaderboard' as any) } catch { /* non-critical */ }

    revalidatePath('/co-builder')
    revalidatePath('/co-builder/admin')
    revalidatePath('/co-builder/bug-tracker')
    return { success: true }
  } catch (error) {
    console.error('Error reviewing feedback:', error)
    return { success: false, error: 'Terjadi kesalahan' }
  }
}

// ============================================================
// SUBMIT TOP 5
// ============================================================

export async function submitTop5(data: {
  items: { rank: number; title: string; description: string; category: string }[]
  additionalComments?: string
}): Promise<{ success: boolean; error?: string; points?: number }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Check if already submitted
    const { count } = await supabase
      .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'top5_submissions' as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (count && count > 0) {
      return { success: false, error: 'Kamu sudah pernah mengirim Top 5' }
    }

    // Check if week 3+ (Feb 26)
    const now = new Date()
    const week3Start = new Date('2026-02-26T00:00:00+07:00')
    if (now < week3Start) {
      return { success: false, error: 'Top 5 baru bisa dikirim mulai minggu ke-3 (26 Feb)' }
    }

    await supabase.from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'top5_submissions' as any).insert({
      user_id: user.id,
      items: data.items,
      additional_comments: data.additionalComments || null,
      points_earned: 30,
    } as Record<string, unknown>)

    await supabase.from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'point_events' as any).insert({
      user_id: user.id,
      event_type: 'top5_submitted',
      points: 30,
      description: 'Top 5 Perubahan submitted!',
    } as Record<string, unknown>)

    try { await supabase.rpc('refresh_leaderboard' as any) } catch { /* non-critical */ }

    revalidatePath('/co-builder')
    return { success: true, points: 30 }
  } catch (error) {
    console.error('Error submitting top5:', error)
    return { success: false, error: 'Terjadi kesalahan' }
  }
}

// ============================================================
// UPLOAD SCREENSHOT
// ============================================================

export async function uploadCompetitionScreenshot(
  formData: FormData
): Promise<{ url: string | null; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { url: null, error: 'Not authenticated' }

    const file = formData.get('file') as File
    if (!file) return { url: null, error: 'No file' }

    if (file.size > 5 * 1024 * 1024) {
      return { url: null, error: 'File terlalu besar (max 5MB)' }
    }

    const ext = file.name.split('.').pop() || 'png'
    const path = `co-builder/${user.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('feedback')
      .upload(path, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return { url: null, error: 'Gagal upload file' }
    }

    const { data: urlData } = supabase.storage
      .from('feedback')
      .getPublicUrl(path)

    return { url: urlData.publicUrl }
  } catch (error) {
    console.error('Upload error:', error)
    return { url: null, error: 'Terjadi kesalahan' }
  }
}

// ============================================================
// GET RECENT ACTIVITY (for leaderboard feed)
// ============================================================

export async function getRecentActivity(): Promise<{ user_name: string; action: string; time: string }[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'point_events' as any)
    .select('user_id, event_type, description, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  if (!data) return []

  const events = data as unknown as { user_id: string; event_type: string; description: string; created_at: string }[]
  const userIds = [...new Set(events.map(e => e.user_id))]

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, full_name')
    .in('user_id', userIds)

  const nameMap = new Map(
    ((profiles || []) as unknown as { user_id: string; full_name: string }[])
      .map(p => [p.user_id, p.full_name])
  )

  return events.map(e => ({
    user_name: nameMap.get(e.user_id) || 'Unknown',
    action: e.description,
    time: e.created_at,
  }))
}
