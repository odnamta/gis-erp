/**
 * Health Check API Endpoint
 * Requirements: 2.1, 2.2, 2.3, 2.6
 * 
 * Returns system health status with component checks.
 * Never throws errors - always returns a valid response.
 */

import { NextResponse } from 'next/server';
import {
  getHealthStatus,
  checkDatabase,
  checkCache,
  checkStorage,
  checkQueue,
  aggregateHealthStatus,
  type HealthStatus,
  type ComponentStatus,
} from '@/lib/production-readiness-utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/health
 * Returns system health status with all component checks
 */
export async function GET(): Promise<NextResponse<HealthStatus>> {
  try {
    const healthStatus = await getHealthStatus();
    
    // Determine HTTP status code based on health
    const httpStatus = healthStatus.status === 'healthy' ? 200 
      : healthStatus.status === 'degraded' ? 200 
      : 503;
    
    return NextResponse.json(healthStatus, { status: httpStatus });
  } catch {
    // Never throw errors - always return valid response (Requirement 2.6)
    // If getHealthStatus fails, build a minimal response
    const fallbackComponents: ComponentStatus[] = [];
    
    // Try individual checks with fallbacks
    try {
      fallbackComponents.push(await checkDatabase());
    } catch {
      fallbackComponents.push({
        name: 'database',
        status: 'unhealthy',
        message: 'Database check failed',
        lastChecked: new Date().toISOString(),
      });
    }
    
    try {
      fallbackComponents.push(await checkCache());
    } catch {
      fallbackComponents.push({
        name: 'cache',
        status: 'unhealthy',
        message: 'Cache check failed',
        lastChecked: new Date().toISOString(),
      });
    }
    
    try {
      fallbackComponents.push(await checkStorage());
    } catch {
      fallbackComponents.push({
        name: 'storage',
        status: 'unhealthy',
        message: 'Storage check failed',
        lastChecked: new Date().toISOString(),
      });
    }
    
    try {
      fallbackComponents.push(await checkQueue());
    } catch {
      fallbackComponents.push({
        name: 'queue',
        status: 'unhealthy',
        message: 'Queue check failed',
        lastChecked: new Date().toISOString(),
      });
    }
    
    const fallbackStatus: HealthStatus = {
      status: aggregateHealthStatus(fallbackComponents),
      version: process.env.npm_package_version || '0.80.0',
      timestamp: new Date().toISOString(),
      components: fallbackComponents,
      metrics: {
        errorCount: 1,
      },
    };
    
    return NextResponse.json(fallbackStatus, { status: 503 });
  }
}
