'use server'

/**
 * Co-Builder Submission + Review Actions
 * Split from actions.ts
 */

import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/permissions-server'
import { ADMIN_ROLES } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'
import { calculateEffortLevel } from '@/lib/co-builder-utils'

// ============================================================
// COMPETITION DATES (private)
// ============================================================

const COMPETITION_END = new Date('2026-03-12T23:59:59+07:00')

function isCompetitionOver(): boolean {
  return new Date() > COMPETITION_END
}

/** Get today's date string in WIB (UTC+7) */
function getTodayWIB(): string {
  const now = new Date()
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return wib.toISOString().split('T')[0]
}

/** Get WIB day boundaries as UTC timestamps for database queries */
function getWIBDayBounds(wibDate: string): { start: string; end: string } {
  return {
    start: `${wibDate}T00:00:00+07:00`,
    end: `${wibDate}T23:59:59+07:00`,
  }
}

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
  is_ai_suggestion: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  reviewed_at: string | null
  // Joined fields
  user_name?: string
  user_role?: string
  user_avatar?: string
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

    if (isCompetitionOver()) {
      return { success: false, error: 'Kompetisi Co-Builder sudah berakhir (12 Maret 2026)' }
    }

    // Validate description length (except praise)
    if (data.category !== 'praise' && (data.description?.length || 0) < 20) {
      return { success: false, error: 'Deskripsi minimal 20 karakter' }
    }

    // Count today's submissions for first-of-day bonus check (WIB timezone)
    const todayWIB = getTodayWIB()
    const { start: dayStart, end: dayEnd } = getWIBDayBounds(todayWIB)
    const { count: todayTotal } = await supabase
      .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'competition_feedback' as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd)

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

    // Check: First feedback of the day? (WIB timezone)
    if (!todayTotal || todayTotal === 0) {
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

    // Check: Collaboration bonus? (must reference DIFFERENT user's feedback)
    if (data.references_feedback_id) {
      const { data: refFeedback } = await supabase
        .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
      'competition_feedback' as any)
        .select('user_id')
        .eq('id', data.references_feedback_id)
        .single()

      const refUserId = (refFeedback as unknown as { user_id: string } | null)?.user_id
      if (refUserId && refUserId !== user.id) {
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
    }

    // Check: Streak bonus (3+ consecutive working days)
    const streak = await calculateStreak(user.id)
    if (streak >= 3) {
      // Check if streak bonus already awarded today (WIB timezone)
      const { count: streakToday } = await supabase
        .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'point_events' as any)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('event_type', 'streak_bonus')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)

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
    return { success: false, error: 'Terjadi kesalahan' }
  }
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

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
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (data || []) as unknown as CompetitionFeedback[]
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
// ADMIN: REVIEW FEEDBACK
// ============================================================

export async function reviewFeedback(data: {
  feedbackId: string
  impactLevel: 'helpful' | 'important' | 'critical'
  adminStatus: string
  adminResponse: string
  isAiSuggestion?: boolean
}): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await getUserProfile()
    if (!profile || !(ADMIN_ROLES as readonly string[]).includes(profile.role)) {
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
    const isAI = data.isAiSuggestion ?? fb.is_ai_suggestion

    // Find existing feedback_reviewed event(s) for this feedback and account for them
    const { data: existingReviewEvents } = await supabase
      .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'point_events' as any)
      .select('id, points')
      .eq('reference_id', data.feedbackId)
      .eq('event_type', 'feedback_reviewed')

    const existingReviewPoints = (existingReviewEvents || []).reduce((sum: number, e: any) => sum + e.points, 0)

    // Find existing AI adjustment events
    const { data: existingAiEvents } = await supabase
      .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'point_events' as any)
      .select('id, points')
      .eq('reference_id', data.feedbackId)
      .eq('event_type', 'ai_score_adjustment')

    const existingAiAdjustment = (existingAiEvents || []).reduce((sum: number, e: any) => sum + e.points, 0)

    // New total based on base_points * multiplier
    const rawTotal = fb.base_points * multiplier
    // Apply 0.5x for AI suggestions
    const newTotal = isAI ? Math.ceil(rawTotal * 0.5) : rawTotal
    // Diff accounts for the multiplier change from base, minus what was already awarded from previous reviews
    const pointsDiff = (rawTotal - fb.base_points) - existingReviewPoints

    // AI adjustment: the difference between raw and reduced total, minus what was already adjusted
    const newAiAdjustment = isAI ? -(rawTotal - newTotal) : 0
    const aiAdjustmentDiff = newAiAdjustment - existingAiAdjustment

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
        is_ai_suggestion: isAI,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq('id', data.feedbackId)

    // Create point event for the multiplier difference
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

    // Create AI score adjustment if needed
    if (aiAdjustmentDiff !== 0) {
      await supabase.from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    'point_events' as any).insert({
        user_id: fb.user_id,
        event_type: 'ai_score_adjustment',
        points: aiAdjustmentDiff,
        description: isAI ? 'Penyesuaian skor: saran AI (0.5x)' : 'Saran AI dicabut: skor dikembalikan',
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

    // Handle duplicate: zero out ALL points (base + bonuses)
    if (data.adminStatus === 'duplicate' && fb.admin_status !== 'duplicate') {
      // Find and reverse ALL point events linked to this feedback
      const { data: linkedEvents } = await supabase
        .from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
      'point_events' as any)
        .select('id, points, event_type')
        .eq('reference_id', data.feedbackId)

      const events = (linkedEvents || []).filter((e: any) => e.event_type !== 'duplicate_reversal') as unknown as { id: string; points: number; event_type: string }[]
      const totalToReverse = events.reduce((sum, e) => sum + e.points, 0)

      if (totalToReverse !== 0) {
        await supabase.from(// eslint-disable-next-line @typescript-eslint/no-explicit-any
      'point_events' as any).insert({
          user_id: fb.user_id,
          event_type: 'duplicate_reversal',
          points: -totalToReverse,
          description: `Feedback ditandai duplikat (reversal: ${events.length} event, -${totalToReverse} poin)`,
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
      return { url: null, error: 'Gagal upload file' }
    }

    const { data: urlData } = supabase.storage
      .from('feedback')
      .getPublicUrl(path)

    return { url: urlData.publicUrl }
  } catch (error) {
    return { url: null, error: 'Terjadi kesalahan' }
  }
}
