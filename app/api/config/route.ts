/**
 * Configuration API Endpoint
 * Requirements: 3.1, 3.3
 * 
 * GET: Return non-sensitive configs
 * POST: Update config (admin only)
 * Filter sensitive configs from response
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getAllConfigs,
  setConfig,
  type AppConfig,
} from '@/lib/production-readiness-utils';
import { isValidOrigin, getClientIp } from '@/lib/api-security';
import { checkRateLimit } from '@/lib/security/rate-limiter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ConfigResponse {
  success: boolean;
  configs?: AppConfig[];
  error?: string;
}

interface SetConfigRequest {
  key: string;
  value: unknown;
  environment?: string;
  isSensitive?: boolean;
  description?: string;
}

/**
 * GET /api/config
 * Returns all non-sensitive configurations
 * Query params:
 * - environment: Filter by environment (optional)
 */
export async function GET(request: NextRequest): Promise<NextResponse<ConfigResponse>> {
  try {
    // Rate limiting: 30 req/min
    const clientIp = getClientIp(request);
    const rateCheck = await checkRateLimit(clientIp, '/api/config');
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetAt.getTime() - Date.now()) / 1000)) } }
      );
    }

    const { searchParams } = new URL(request.url);
    const environment = searchParams.get('environment') || undefined;
    
    // Get all configs, excluding sensitive ones (Requirement 3.3)
    const configs = await getAllConfigs({
      environment,
      includeSensitive: false,
    });
    
    return NextResponse.json({
      success: true,
      configs,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch configurations',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/config
 * Update a configuration value (admin only)
 */
export async function POST(request: NextRequest): Promise<NextResponse<{ success: boolean; error?: string }>> {
  // CSRF protection
  if (!isValidOrigin(request)) {
    return NextResponse.json({ success: false, error: 'Invalid origin' }, { status: 403 });
  }

  // Rate limiting: 30 req/min
  const clientIpPost = getClientIp(request);
  const rateCheckPost = await checkRateLimit(clientIpPost, '/api/config');
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

    // Only admin and super_admin can update configs
    if (!['sysadmin', 'director', 'owner'].includes(profile.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Admin role required.' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const body: SetConfigRequest = await request.json();
    
    if (!body.key) {
      return NextResponse.json(
        { success: false, error: 'Config key is required' },
        { status: 400 }
      );
    }
    
    if (body.value === undefined) {
      return NextResponse.json(
        { success: false, error: 'Config value is required' },
        { status: 400 }
      );
    }
    
    // Set the config
    const result = await setConfig(body.key, body.value, {
      environment: body.environment,
      isSensitive: body.isSensitive,
      description: body.description,
      userId: profile.id,
    });
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update configuration' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update configuration',
      },
      { status: 500 }
    );
  }
}
