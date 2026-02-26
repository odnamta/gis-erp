'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrFetch, generateCacheKey } from '@/lib/dashboard-cache'

// =====================================================
// INTERFACES
// =====================================================

export interface RecentSurvey {
  id: string
  surveyNumber: string
  originLocation: string | null
  destinationLocation: string | null
  status: string
  createdAt: string
}

export interface RecentJmp {
  id: string
  jmpNumber: string
  journeyTitle: string | null
  status: string
  plannedDeparture: string | null
}

export interface RecentAssessment {
  id: string
  assessmentType: string | null
  status: string
  riskLevel: string | null
  createdAt: string
  pjoNumber: string | null
}

export interface MyAssignment {
  id: string
  type: 'survey' | 'jmp' | 'assessment'
  title: string
  status: string
  dueDate: string | null
  createdAt: string
}

export interface EngineeringDashboardMetrics {
  // Survey Overview
  totalSurveys: number
  pendingSurveys: number
  surveysCompletedThisMonth: number
  recentSurveys: RecentSurvey[]
  
  // JMP Status
  activeJmps: number
  upcomingJmps: number
  pendingReviewJmps: number
  recentJmps: RecentJmp[]
  
  // Engineering Assessments
  totalAssessments: number
  pendingAssessments: number
  assessmentsCompletedThisMonth: number
  completionRate: number
  recentAssessments: RecentAssessment[]
  
  // My Assignments
  myAssignments: MyAssignment[]
  mySurveyCount: number
  myAssessmentCount: number
  myJmpCount: number
}

// =====================================================
// CONSTANTS
// =====================================================

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const PENDING_SURVEY_STATUSES = ['requested', 'scheduled', 'in_progress']
const ACTIVE_JMP_STATUSES = ['active', 'in_progress']
const PENDING_ASSESSMENT_STATUSES = ['pending', 'in_progress']

// =====================================================
// MAIN DATA FETCHER
// =====================================================

export async function getEngineeringDashboardMetrics(
  userId?: string
): Promise<EngineeringDashboardMetrics> {
  const cacheKey = await generateCacheKey('engineering-dashboard-metrics', 'engineer')
  
  return getOrFetch(cacheKey, async () => {
    const supabase = await createClient()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    // Consolidated queries: fetch status+date data for counting in JS,
    // plus recent rows and user assignments — down from 15 to 8 queries
    const [
      // Surveys: all statuses + completed_at for counting, plus recent 5
      surveyStatusesResult,
      recentSurveysResult,

      // JMPs: all statuses + planned_departure for counting, plus recent 5
      jmpStatusesResult,
      recentJmpsResult,

      // Assessments: all statuses + completed_at for counting, plus recent 5
      assessmentStatusesResult,
      recentAssessmentsResult,

      // My assignments (if userId provided)
      mySurveysResult,
      myAssessmentsResult,
      myJmpsResult,
    ] = await Promise.all([
      // All survey statuses + completed_at — one query replaces 3 count queries
      supabase
        .from('route_surveys')
        .select('status, completed_at')
        .limit(10000),

      // Recent surveys (last 5)
      supabase
        .from('route_surveys')
        .select('id, survey_number, origin_location, destination_location, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5),

      // All JMP statuses + planned_departure — one query replaces 3 count queries
      supabase
        .from('journey_management_plans')
        .select('status, planned_departure')
        .limit(10000),

      // Recent JMPs (last 5)
      supabase
        .from('journey_management_plans')
        .select('id, jmp_number, journey_title, status, planned_departure, created_at')
        .order('created_at', { ascending: false })
        .limit(5),

      // All assessment statuses + completed_at — one query replaces 3 count queries
      supabase
        .from('engineering_assessments')
        .select('status, completed_at')
        .limit(10000),

      // Recent assessments (last 5) with PJO info
      supabase
        .from('engineering_assessments')
        .select('id, assessment_type, status, risk_level, created_at, pjo_id, proforma_job_orders(pjo_number)')
        .order('created_at', { ascending: false })
        .limit(5),

      // My surveys (if userId provided)
      userId
        ? supabase
            .from('route_surveys')
            .select('id, survey_number, origin_location, destination_location, status, created_at, survey_date')
            .eq('surveyor_id', userId)
            .in('status', PENDING_SURVEY_STATUSES)
            .order('survey_date', { ascending: true })
            .limit(10)
        : Promise.resolve({ data: [], count: 0 }),

      // My assessments (if userId provided)
      userId
        ? supabase
            .from('engineering_assessments')
            .select('id, assessment_type, status, risk_level, created_at, pjo_id, proforma_job_orders(pjo_number)')
            .eq('assigned_to', userId)
            .in('status', PENDING_ASSESSMENT_STATUSES)
            .order('created_at', { ascending: false })
            .limit(10)
        : Promise.resolve({ data: [], count: 0 }),

      // My JMPs (if userId provided)
      userId
        ? supabase
            .from('journey_management_plans')
            .select('id, jmp_number, journey_title, status, planned_departure, created_at')
            .or(`prepared_by.eq.${userId},convoy_commander_id.eq.${userId}`)
            .in('status', ['draft', 'pending_review', 'active'])
            .order('planned_departure', { ascending: true })
            .limit(10)
        : Promise.resolve({ data: [], count: 0 }),
    ])

    // Compute survey counts from the single statuses query
    const surveyRows = surveyStatusesResult.data || []
    const totalSurveysCount = surveyRows.length
    const pendingSurveysCount = surveyRows.filter(
      r => r.status !== null && PENDING_SURVEY_STATUSES.includes(r.status)
    ).length
    const surveysCompletedThisMonthCount = surveyRows.filter(
      r => r.status === 'completed' && r.completed_at && new Date(r.completed_at) >= startOfMonth
    ).length

    // Compute JMP counts from the single statuses query
    const jmpRows = jmpStatusesResult.data || []
    const activeJmpsCount = jmpRows.filter(
      r => r.status !== null && ACTIVE_JMP_STATUSES.includes(r.status)
    ).length
    const upcomingJmpsCount = jmpRows.filter(
      r => r.planned_departure &&
        new Date(r.planned_departure) >= now &&
        new Date(r.planned_departure) <= sevenDaysFromNow
    ).length
    const pendingReviewJmpsCount = jmpRows.filter(
      r => r.status === 'pending_review'
    ).length

    // Compute assessment counts from the single statuses query
    const assessmentRows = assessmentStatusesResult.data || []
    const totalAssessmentsCount = assessmentRows.length
    const pendingAssessmentsCount = assessmentRows.filter(
      r => r.status !== null && PENDING_ASSESSMENT_STATUSES.includes(r.status)
    ).length
    const assessmentsCompletedThisMonthCount = assessmentRows.filter(
      r => r.status === 'completed' && r.completed_at && new Date(r.completed_at) >= startOfMonth
    ).length
    
    // Transform recent surveys
    const recentSurveys: RecentSurvey[] = (recentSurveysResult.data || []).map(survey => ({
      id: survey.id,
      surveyNumber: survey.survey_number || '',
      originLocation: survey.origin_location,
      destinationLocation: survey.destination_location,
      status: survey.status || '',
      createdAt: survey.created_at || '',
    }))
    
    // Transform recent JMPs
    const recentJmps: RecentJmp[] = (recentJmpsResult.data || []).map(jmp => ({
      id: jmp.id,
      jmpNumber: jmp.jmp_number || '',
      journeyTitle: jmp.journey_title,
      status: jmp.status || '',
      plannedDeparture: jmp.planned_departure,
    }))
    
    // Transform recent assessments
    const recentAssessments: RecentAssessment[] = (recentAssessmentsResult.data || []).map(assessment => ({
      id: assessment.id,
      assessmentType: assessment.assessment_type,
      status: assessment.status || '',
      riskLevel: assessment.risk_level,
      createdAt: assessment.created_at || '',
      pjoNumber: (assessment.proforma_job_orders as { pjo_number: string } | null)?.pjo_number || null,
    }))
    
    // Build my assignments list
    const myAssignments: MyAssignment[] = []
    
    // Add my surveys
    if (mySurveysResult.data) {
      for (const survey of mySurveysResult.data) {
        myAssignments.push({
          id: survey.id,
          type: 'survey',
          title: `Survey: ${survey.origin_location || 'Unknown'} → ${survey.destination_location || 'Unknown'}`,
          status: survey.status || '',
          dueDate: survey.survey_date,
          createdAt: survey.created_at || '',
        })
      }
    }
    
    // Add my assessments
    if (myAssessmentsResult.data) {
      for (const assessment of myAssessmentsResult.data) {
        const pjoNumber = (assessment.proforma_job_orders as { pjo_number: string } | null)?.pjo_number
        myAssignments.push({
          id: assessment.id,
          type: 'assessment',
          title: `Assessment: ${pjoNumber || assessment.assessment_type || 'Unknown'}`,
          status: assessment.status || '',
          dueDate: null,
          createdAt: assessment.created_at || '',
        })
      }
    }
    
    // Add my JMPs
    if (myJmpsResult.data) {
      for (const jmp of myJmpsResult.data) {
        myAssignments.push({
          id: jmp.id,
          type: 'jmp',
          title: `JMP: ${jmp.journey_title || jmp.jmp_number || 'Unknown'}`,
          status: jmp.status || '',
          dueDate: jmp.planned_departure,
          createdAt: jmp.created_at || '',
        })
      }
    }
    
    // Sort assignments by due date (soonest first), then by created date
    myAssignments.sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      }
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    
    // Calculate completion rate
    const completionRate = totalAssessmentsCount > 0
      ? Math.round((assessmentsCompletedThisMonthCount / totalAssessmentsCount) * 100)
      : 0

    return {
      // Survey Overview
      totalSurveys: totalSurveysCount,
      pendingSurveys: pendingSurveysCount,
      surveysCompletedThisMonth: surveysCompletedThisMonthCount,
      recentSurveys,

      // JMP Status
      activeJmps: activeJmpsCount,
      upcomingJmps: upcomingJmpsCount,
      pendingReviewJmps: pendingReviewJmpsCount,
      recentJmps,

      // Engineering Assessments
      totalAssessments: totalAssessmentsCount,
      pendingAssessments: pendingAssessmentsCount,
      assessmentsCompletedThisMonth: assessmentsCompletedThisMonthCount,
      completionRate,
      recentAssessments,
      
      // My Assignments
      myAssignments: myAssignments.slice(0, 10), // Limit to 10
      mySurveyCount: mySurveysResult.data?.length || 0,
      myAssessmentCount: myAssessmentsResult.data?.length || 0,
      myJmpCount: myJmpsResult.data?.length || 0,
    }
  }, CACHE_TTL)
}
