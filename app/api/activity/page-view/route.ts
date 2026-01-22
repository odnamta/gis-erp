import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API Route for logging page views (v0.13.1)
 * 
 * Called from middleware to log page views asynchronously.
 * This is a fire-and-forget endpoint - errors are logged but don't affect the response.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, pagePath, sessionId, ipAddress, userAgent } = body;

    if (!userId || !pagePath) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get user email from profile
    let userEmail: string | null = null;
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('user_id', userId)
        .single();
      userEmail = profile?.email ?? null;
    } catch {
      // Continue without email
    }

    // Insert page view log
    // Note: user_activity_log table exists in DB but not in generated types
    const { error } = await (supabase as any).from('user_activity_log').insert({
      user_id: userId,
      user_email: userEmail,
      action_type: 'page_view',
      page_path: pagePath,
      session_id: sessionId ?? null,
      ip_address: ipAddress ?? null,
      user_agent: userAgent ?? null,
      metadata: {},
    });

    if (error) {
      console.error('[PageViewAPI] Failed to log page view:', error.message);
      return NextResponse.json({ error: 'Failed to log' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PageViewAPI] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
