'use server'

/**
 * Co-Builder Scoring + Analytics Actions
 * Split from actions.ts
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================================
// COMPETITION DATES (private)
// ============================================================

const COMPETITION_END = new Date('2026-03-12T23:59:59+07:00')
const PERFECT_ATTENDANCE_START = new Date('2026-02-23T00:00:00+07:00')

/** Get all weekdays (Mon-Fri) between start and end dates in WIB */
function getRequiredWeekdays(): string[] {
  const days: string[] = []
  const end = COMPETITION_END
  const current = new Date(PERFECT_ATTENDANCE_START)
  while (current <= end) {
    const wib = new Date(current.getTime() + 7 * 60 * 60 * 1000)
    const dayOfWeek = wib.getUTCDay()
    // 0=Sun, 6=Sat — skip weekends
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days.push(wib.toISOString().split('T')[0])
    }
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return days
}

function isCompetitionOver(): boolean {
  return new Date() > COMPETITION_END
}

/** Get today's date string in WIB (UTC+7) */
function getTodayWIB(): string {
  const now = new Date()
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return wib.toISOString().split('T')[0]
}

// ============================================================
// TYPES
// ============================================================

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
  has_top5: boolean
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
  perfectAttendance: {
    activeDays: number
    totalRequired: number
    missedDays: number
    onTrack: boolean
  }
}

// ============================================================
// STREAK CALCULATION (private)
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

  // Convert to WIB dates for correct day boundaries
  const dates = [...new Set(
    (data as unknown as { created_at: string }[])
      .map(d => {
        const utc = new Date(d.created_at)
        const wib = new Date(utc.getTime() + 7 * 60 * 60 * 1000)
        return wib.toISOString().split('T')[0]
      })
  )].sort().reverse()

  if (dates.length === 0) return 0

  let streak = 1
  for (let i = 0; i < dates.length - 1; i++) {
    const current = new Date(dates[i])
    const prev = new Date(dates[i + 1])
    const diffDays = Math.floor((current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))

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

  // Materialized view may not have meets_requirements — enrich with top5 check
  const entries = data as unknown as LeaderboardEntry[]
  const userIds = entries.map(e => e.user_id)

  // Batch check top5 submissions
  const { data: top5Data } = await supabase
    .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'top5_submissions' as any)
    .select('user_id')
    .in('user_id', userIds)

  const top5UserIds = new Set(
    ((top5Data || []) as unknown as { user_id: string }[]).map(t => t.user_id)
  )

  for (const entry of entries) {
    entry.has_top5 = top5UserIds.has(entry.user_id)
  }

  // Sort by points only — requirements determine prize eligibility, not ranking
  entries.sort((a, b) => b.total_points - a.total_points)
  entries.forEach((e, i) => { e.rank = i + 1 })

  return entries
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
      .select('points, event_type, created_at')
      .eq('user_id', user.user_id)

    const pointData = (points || []) as unknown as { points: number; event_type: string; created_at: string }[]
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

    // Check top5 submission
    const { count: top5Count } = await supabase
      .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'top5_submissions' as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.user_id)

    const activeDays = [...new Set(pointData.map(p => {
      if (!p.created_at) return ''
      const utc = new Date(p.created_at)
      const wib = new Date(utc.getTime() + 7 * 60 * 60 * 1000)
      return wib.toISOString().split('T')[0]
    }).filter(Boolean))].length
    const fc = feedbackCount || 0
    const sc = scenarioCount || 0
    const hasTop5 = (top5Count || 0) > 0

    entries.push({
      user_id: user.user_id,
      user_name: user.full_name || 'Unknown',
      user_role: user.role || '',
      avatar_url: user.avatar_url,
      total_points: totalPoints,
      feedback_points: pointData.filter(p => ['feedback_submitted', 'feedback_reviewed'].includes(p.event_type)).reduce((s, p) => s + p.points, 0),
      scenario_points: pointData.filter(p => p.event_type === 'scenario_completed').reduce((s, p) => s + p.points, 0),
      bonus_points: pointData.filter(p => !['feedback_submitted', 'feedback_reviewed', 'scenario_completed'].includes(p.event_type)).reduce((s, p) => s + p.points, 0),
      feedback_count: fc,
      scenarios_completed: sc,
      active_days: activeDays,
      last_activity: null,
      rank: 0,
      has_top5: hasTop5,
    })
  }

  // Sort by points only — requirements determine prize eligibility, not ranking
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

  // Calculate active days (WIB timezone)
  const activeDays = new Set(points.map(p => {
    const utc = new Date(p.created_at)
    const wib = new Date(utc.getTime() + 7 * 60 * 60 * 1000)
    return wib.toISOString().split('T')[0]
  })).size

  // Calculate streak
  const streak = await calculateStreak(user.id)

  // Get rank
  const leaderboard = await getLeaderboard()
  const myEntry = leaderboard.find(e => e.user_id === user.id)
  const rank = myEntry?.rank || leaderboard.length + 1

  // Estimate login days from point_events distinct dates
  const loginDays = activeDays

  // Perfect attendance: weekdays from Feb 23 to Mar 12
  const requiredWeekdays = getRequiredWeekdays()
  const activeDateSet = new Set(points.map(p => {
    const utc = new Date(p.created_at)
    const wib = new Date(utc.getTime() + 7 * 60 * 60 * 1000)
    return wib.toISOString().split('T')[0]
  }))
  const todayWIB = getTodayWIB()
  const passedWeekdays = requiredWeekdays.filter(d => d <= todayWIB)
  const activeOnRequired = passedWeekdays.filter(d => activeDateSet.has(d)).length
  const missedDays = passedWeekdays.length - activeOnRequired

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
    perfectAttendance: {
      activeDays: activeOnRequired,
      totalRequired: requiredWeekdays.length,
      missedDays,
      onTrack: missedDays === 0,
    },
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

  // Simple rank calculation (read from materialized view, no refresh — writes handle that)
  let result: { data: unknown[] | null } = { data: null }
  try {
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'point_events' as any)
    .update({ is_seen: true } as Record<string, unknown>)
    .in('id', ids)
    .eq('user_id', user.id)
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

    if (isCompetitionOver()) {
      return { success: false, error: 'Kompetisi Co-Builder sudah berakhir (12 Maret 2026)' }
    }

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
  } catch {
    return { success: false, error: 'Terjadi kesalahan' }
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

// ============================================================
// GET COMPETITION RESULTS (for wrap-up page)
// ============================================================

export interface CompetitionResultEntry extends LeaderboardEntry {
  meets_requirements: boolean
  requirements: {
    activeDays: { value: number; met: boolean }
    feedbackCount: { value: number; met: boolean }
    scenariosCompleted: { value: number; met: boolean }
    hasTop5: boolean
  }
  prize_eligible: boolean
  prize_amount: number
  participation_bonus: number
}

export interface CompetitionResults {
  entries: CompetitionResultEntry[]
  isCompetitionOver: boolean
  totalFeedback: number
  totalScenarios: number
  totalParticipants: number
  competitionEnd: string
}

const PRIZE_TIERS = [3000000, 2000000, 1500000, 1000000, 750000]
const PARTICIPATION_BONUS = 250000

export async function getCompetitionResults(): Promise<CompetitionResults> {
  const leaderboard = await getLeaderboard()
  const over = isCompetitionOver()

  // Build result entries with eligibility
  let prizeRank = 0
  const entries: CompetitionResultEntry[] = leaderboard.map((entry) => {
    const reqs = {
      activeDays: { value: entry.active_days, met: entry.active_days >= 10 },
      feedbackCount: { value: entry.feedback_count, met: entry.feedback_count >= 5 },
      scenariosCompleted: { value: entry.scenarios_completed, met: entry.scenarios_completed >= 2 },
      hasTop5: entry.has_top5,
    }
    const meetsReqs = reqs.activeDays.met && reqs.feedbackCount.met && reqs.scenariosCompleted.met && reqs.hasTop5

    let prizeAmount = 0
    let participationBonus = 0
    if (meetsReqs) {
      if (prizeRank < PRIZE_TIERS.length) {
        prizeAmount = PRIZE_TIERS[prizeRank]
      }
      participationBonus = PARTICIPATION_BONUS
      prizeRank++
    }

    return {
      ...entry,
      meets_requirements: meetsReqs,
      requirements: reqs,
      prize_eligible: meetsReqs,
      prize_amount: prizeAmount,
      participation_bonus: participationBonus,
    }
  })

  const totalFeedback = entries.reduce((s, e) => s + e.feedback_count, 0)
  const totalScenarios = entries.reduce((s, e) => s + e.scenarios_completed, 0)

  return {
    entries,
    isCompetitionOver: over,
    totalFeedback,
    totalScenarios,
    totalParticipants: entries.length,
    competitionEnd: COMPETITION_END.toISOString(),
  }
}
