/**
 * Feature Flags API Endpoint
 * Requirements: 5.1
 * 
 * GET: Return all flags or check specific flag
 * POST: Update flag (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getAllFeatureFlags,
  getFeatureFlag,
  isFeatureEnabled,
  updateFeatureFlag,
  type FeatureFlag,
  type FeatureFlagContext,
} from '@/lib/production-readiness-utils';
import { isValidOrigin, getClientIp } from '@/lib/api-security';
import { checkRateLimit } from '@/lib/security/rate-limiter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface FeatureFlagsResponse {
  success: boolean;
  flags?: FeatureFlag[];
  flag?: FeatureFlag;
  enabled?: boolean;
  error?: string;
}

interface UpdateFeatureFlagRequest {
  flagKey: string;
  updates: {
    name?: string;
    description?: string;
    isEnabled?: boolean;
    targetUsers?: string[];
    targetRoles?: string[];
    rolloutPercentage?: number;
    enableAt?: string;
    disableAt?: string;
    metadata?: Record<string, unknown>;
  };
}

/**
 * GET /api/feature-flags
 * Returns all feature flags or checks a specific flag
 * Query params:
 * - flagKey: Get specific flag (optional)
 * - check: If true, check if flag is enabled for current user (optional)
 * - userId: User ID for flag evaluation (optional)
 * - userRole: User role for flag evaluation (optional)
 */
export async function GET(request: NextRequest): Promise<NextResponse<FeatureFlagsResponse>> {
  try {
    // Rate limiting: 30 req/min
    const clientIp = getClientIp(request);
    const rateCheck = await checkRateLimit(clientIp, '/api/feature-flags');
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetAt.getTime() - Date.now()) / 1000)) } }
      );
    }

    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Derive role from user_profiles (never trust query params)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const userId = user.id;
    const userRole = profile?.role || undefined;

    const { searchParams } = new URL(request.url);
    const flagKey = searchParams.get('flagKey');
    const check = searchParams.get('check') === 'true';

    // If checking a specific flag's enabled status
    if (flagKey && check) {
      const context: FeatureFlagContext = { userId, userRole };
      const enabled = await isFeatureEnabled(flagKey, context);

      return NextResponse.json({
        success: true,
        enabled,
      });
    }

    // If getting a specific flag
    if (flagKey) {
      const flag = await getFeatureFlag(flagKey);

      if (!flag) {
        return NextResponse.json(
          {
            success: false,
            error: `Feature flag '${flagKey}' not found`,
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        flag,
      });
    }

    // Get all flags
    const flags = await getAllFeatureFlags();

    return NextResponse.json({
      success: true,
      flags,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch feature flags',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/feature-flags
 * Update a feature flag (admin only)
 */
export async function POST(request: NextRequest): Promise<NextResponse<{ success: boolean; error?: string }>> {
  // CSRF protection
  if (!isValidOrigin(request)) {
    return NextResponse.json({ success: false, error: 'Invalid origin' }, { status: 403 });
  }

  // Rate limiting: 30 req/min
  const clientIpPost = getClientIp(request);
  const rateCheckPost = await checkRateLimit(clientIpPost, '/api/feature-flags');
  if (!rateCheckPost.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheckPost.resetAt.getTime() - Date.now()) / 1000)) } }
    );
  }

  try {
    // Check authentication and admin role
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 403 }
      );
    }

    // Only admin and super_admin can update feature flags
    if (!['sysadmin', 'director', 'owner'].includes(profile.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Admin role required.' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const body: UpdateFeatureFlagRequest = await request.json();
    
    if (!body.flagKey) {
      return NextResponse.json(
        { success: false, error: 'Flag key is required' },
        { status: 400 }
      );
    }
    
    if (!body.updates || Object.keys(body.updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Updates are required' },
        { status: 400 }
      );
    }
    
    // Check if flag exists
    const existingFlag = await getFeatureFlag(body.flagKey);
    if (!existingFlag) {
      return NextResponse.json(
        { success: false, error: `Feature flag '${body.flagKey}' not found` },
        { status: 404 }
      );
    }
    
    // Update the flag
    const result = await updateFeatureFlag(body.flagKey, {
      ...body.updates,
      updatedBy: profile.id,
    });
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update feature flag' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update feature flag',
      },
      { status: 500 }
    );
  }
}
