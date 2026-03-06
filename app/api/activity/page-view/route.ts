import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isValidOrigin } from '@/lib/api-security';

/**
 * API Route for logging page views (v0.13.1)
 *
 * Called from middleware to log page views asynchronously.
 * This is a fire-and-forget endpoint - errors are logged but don't affect the response.
 */
export async function POST(request: NextRequest) {
  // CSRF protection
  if (!isValidOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { pagePath, sessionId, ipAddress, userAgent } = body;

    if (!pagePath) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createClient();

    // Authenticate: use server-verified user identity
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

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
    const { error } = await supabase.from('user_activity_log').insert({
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
      return NextResponse.json({ error: 'Failed to log' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
