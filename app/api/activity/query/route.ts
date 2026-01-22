import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/permissions-server';
import type { UserActivityLog, DailyActivityCount } from '@/types/activity';

/**
 * API Route for querying user activities (v0.13.1)
 * 
 * Only accessible to owner, director, sysadmin roles.
 */
export async function GET(request: NextRequest) {
  try {
    // Check authorization
    const profile = await getUserProfile();
    if (!profile || !['owner', 'director', 'sysadmin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const userId = searchParams.get('userId');
    const actionType = searchParams.get('actionType');

    const supabase = await createClient();

    // Build query for activities
    // Note: user_activity_log table exists in DB but not in generated types
    let query = (supabase as any)
      .from('user_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (start) {
      query = query.gte('created_at', start);
    }
    if (end) {
      query = query.lte('created_at', end);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (actionType && actionType !== 'all') {
      query = query.eq('action_type', actionType);
    }

    const { data: activities, error: activitiesError } = await query;

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }

    // Get daily active users (unique users today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: todayActivities } = await (supabase as any)
      .from('user_activity_log')
      .select('user_id')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString());

    const uniqueUsersToday = new Set(todayActivities?.map((a: { user_id: string }) => a.user_id) || []);
    const dailyActiveUsers = uniqueUsersToday.size;

    // Get chart data (activities per day for last 7 days)
    const chartData: DailyActivityCount[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      let chartQuery = (supabase as any)
        .from('user_activity_log')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', date.toISOString())
        .lt('created_at', nextDate.toISOString());

      if (userId) {
        chartQuery = chartQuery.eq('user_id', userId);
      }
      if (actionType && actionType !== 'all') {
        chartQuery = chartQuery.eq('action_type', actionType);
      }

      const { count } = await chartQuery;

      chartData.push({
        date: date.toISOString().split('T')[0],
        count: count || 0,
      });
    }

    // Get unique users for filter dropdown
    const { data: allActivities } = await (supabase as any)
      .from('user_activity_log')
      .select('user_id, user_email');
    
    const uniqueUsersMap = new Map<string, { user_id: string; user_email: string | null }>();
    for (const activity of allActivities || []) {
      if (activity.user_email && !uniqueUsersMap.has(activity.user_id)) {
        uniqueUsersMap.set(activity.user_id, {
          user_id: activity.user_id,
          user_email: activity.user_email,
        });
      }
    }
    const users = Array.from(uniqueUsersMap.values()).sort((a, b) =>
      (a.user_email || '').localeCompare(b.user_email || '')
    );

    return NextResponse.json({
      activities: activities as UserActivityLog[],
      chartData,
      dailyActiveUsers,
      users,
    });
  } catch (error) {
    console.error('Error in activity query:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
