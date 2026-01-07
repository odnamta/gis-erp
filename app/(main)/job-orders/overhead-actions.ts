'use server';

// Server actions for Job Overhead Allocation (v0.26)

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  OverheadCategory,
  JobOverheadAllocation,
  JobOverheadAllocationWithCategory,
} from '@/types/overhead';
import {
  calculateRevenuePercentageAllocation,
  calculateMargin,
} from '@/lib/overhead-utils';

/**
 * Calculate and allocate overhead for a single job order
 */
export async function allocateJobOverhead(
  joId: string
): Promise<{ totalOverhead: number; error: string | null }> {
  try {
    const supabase = await createClient();

    // Get job order with revenue and cost
    const { data: job, error: jobError } = await supabase
      .from('job_orders')
      .select('id, final_revenue, final_cost')
      .eq('id', joId)
      .single();

    if (jobError || !job) {
      console.error('Error fetching job order:', jobError);
      return { totalOverhead: 0, error: 'Job order not found' };
    }

    const revenue = Number(job.final_revenue) || 0;
    const totalCost = Number(job.final_cost) || 0;

    // If no revenue, return 0 overhead
    if (revenue <= 0) {
      // Update job order with zero overhead
      await supabase
        .from('job_orders')
        .update({
          total_overhead: 0,
          net_profit: revenue - totalCost,
          net_margin: 0,
        })
        .eq('id', joId);

      return { totalOverhead: 0, error: null };
    }

    // Get active overhead categories
    const { data: categories, error: catError } = await supabase
      .from('overhead_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (catError) {
      console.error('Error fetching overhead categories:', catError);
      return { totalOverhead: 0, error: 'Failed to fetch overhead categories' };
    }

    // Delete existing allocations for this job
    await supabase
      .from('job_overhead_allocations')
      .delete()
      .eq('jo_id', joId);

    let totalOverhead = 0;
    const allocations: Array<{
      jo_id: string;
      category_id: string;
      allocation_method: string;
      allocation_rate: number;
      base_amount: number;
      allocated_amount: number;
    }> = [];

    // Calculate allocations for each active category
    for (const cat of categories || []) {
      if (cat.allocation_method === 'revenue_percentage' && (cat.default_rate ?? 0) > 0) {
        const allocatedAmount = calculateRevenuePercentageAllocation(revenue, cat.default_rate ?? 0);
        
        allocations.push({
          jo_id: joId,
          category_id: cat.id,
          allocation_method: 'revenue_percentage',
          allocation_rate: cat.default_rate ?? 0,
          base_amount: revenue,
          allocated_amount: allocatedAmount,
        });

        totalOverhead += allocatedAmount;
      }
    }

    // Insert new allocations
    if (allocations.length > 0) {
      const { error: insertError } = await supabase
        .from('job_overhead_allocations')
        .insert(allocations);

      if (insertError) {
        console.error('Error inserting overhead allocations:', insertError);
        return { totalOverhead: 0, error: 'Failed to save overhead allocations' };
      }
    }

    // Calculate net profit and margin
    const grossProfit = revenue - totalCost;
    const netProfit = grossProfit - totalOverhead;
    const netMargin = calculateMargin(netProfit, revenue);

    // Update job order with overhead totals
    const { error: updateError } = await supabase
      .from('job_orders')
      .update({
        total_overhead: totalOverhead,
        net_profit: netProfit,
        net_margin: netMargin,
      })
      .eq('id', joId);

    if (updateError) {
      console.error('Error updating job order overhead:', updateError);
      return { totalOverhead, error: 'Failed to update job order' };
    }

    revalidatePath(`/job-orders/${joId}`);
    return { totalOverhead, error: null };
  } catch (err) {
    console.error('Unexpected error allocating job overhead:', err);
    return { totalOverhead: 0, error: 'Failed to allocate overhead' };
  }
}

/**
 * Get overhead breakdown for a job order
 */
export async function getJobOverheadBreakdown(
  joId: string
): Promise<{
  allocations: JobOverheadAllocationWithCategory[];
  total: number;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('job_overhead_allocations')
      .select(`
        *,
        category:overhead_categories(*)
      `)
      .eq('jo_id', joId)
      .order('created_at');

    if (error) {
      console.error('Error fetching job overhead breakdown:', error);
      return { allocations: [], total: 0, error: error.message };
    }

    const allocations = (data || []) as JobOverheadAllocationWithCategory[];
    const total = allocations.reduce((sum, a) => sum + Number(a.allocated_amount), 0);

    return { allocations, total, error: null };
  } catch (err) {
    console.error('Unexpected error fetching job overhead breakdown:', err);
    return { allocations: [], total: 0, error: 'Failed to fetch overhead breakdown' };
  }
}

/**
 * Recalculate overhead for a single job (user-triggered)
 */
export async function recalculateJobOverhead(
  joId: string
): Promise<{ success: boolean; error: string | null }> {
  const result = await allocateJobOverhead(joId);
  
  if (result.error) {
    return { success: false, error: result.error };
  }

  return { success: true, error: null };
}

/**
 * Batch recalculate overhead for all jobs in a period
 */
export async function batchRecalculateOverhead(
  year: number,
  month: number
): Promise<{ count: number; error: string | null }> {
  try {
    const supabase = await createClient();

    // Calculate date range for the period
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    // Get all job orders in the period
    const { data: jobs, error: jobsError } = await supabase
      .from('job_orders')
      .select('id')
      .gte('created_at', startDate)
      .lte('created_at', `${endDate}T23:59:59`);

    if (jobsError) {
      console.error('Error fetching jobs for batch recalculation:', jobsError);
      return { count: 0, error: 'Failed to fetch jobs' };
    }

    let count = 0;
    const errors: string[] = [];

    // Recalculate overhead for each job
    for (const job of jobs || []) {
      const result = await allocateJobOverhead(job.id);
      if (result.error) {
        errors.push(`Job ${job.id}: ${result.error}`);
      } else {
        count++;
      }
    }

    if (errors.length > 0) {
      console.error('Batch recalculation errors:', errors);
    }

    revalidatePath('/job-orders');
    return { count, error: errors.length > 0 ? `${errors.length} jobs failed` : null };
  } catch (err) {
    console.error('Unexpected error in batch recalculation:', err);
    return { count: 0, error: 'Failed to batch recalculate overhead' };
  }
}

/**
 * Get job profitability data
 */
export async function getJobProfitability(joId: string): Promise<{
  data: {
    revenue: number;
    directCosts: number;
    grossProfit: number;
    grossMargin: number;
    totalOverhead: number;
    netProfit: number;
    netMargin: number;
  } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data: job, error } = await supabase
      .from('job_orders')
      .select('final_revenue, final_cost, total_overhead, net_profit, net_margin')
      .eq('id', joId)
      .single();

    if (error || !job) {
      console.error('Error fetching job profitability:', error);
      return { data: null, error: 'Job order not found' };
    }

    const revenue = Number(job.final_revenue) || 0;
    const directCosts = Number(job.final_cost) || 0;
    const grossProfit = revenue - directCosts;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    return {
      data: {
        revenue,
        directCosts,
        grossProfit,
        grossMargin: Math.round(grossMargin * 100) / 100,
        totalOverhead: Number(job.total_overhead) || 0,
        netProfit: Number(job.net_profit) || 0,
        netMargin: Number(job.net_margin) || 0,
      },
      error: null,
    };
  } catch (err) {
    console.error('Unexpected error fetching job profitability:', err);
    return { data: null, error: 'Failed to fetch profitability data' };
  }
}
