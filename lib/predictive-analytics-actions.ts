'use server';

// lib/predictive-analytics-actions.ts
// Server actions for AI Predictive Analytics

import { createClient } from '@/lib/supabase/server';
import {
  RevenueForecast,
  CustomerChurnRisk,
  PaymentPrediction,
  RevenueForecastSummary,
  ChurnRiskSummary,
  ForecastChartData,
} from '@/types/predictive-analytics';
import {
  calculateChurnRiskScore,
  calculateRevenueForecast,
  predictPaymentDate,
  calculateLatePaymentRisk,
  generateChurnRecommendations,
  calculatePredictionError,
  calculatePaymentAccuracyDays,
} from './predictive-analytics-utils';
import { format, addMonths, startOfMonth, endOfMonth, subMonths } from 'date-fns';

/**
 * Generate revenue forecast for target month
 */
export async function generateRevenueForecast(
  targetMonth: Date
): Promise<{ success: boolean; data?: RevenueForecast; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get pipeline data from quotations
    // Note: Using total_revenue instead of total_amount, and rfq_deadline as proxy for expected_close_date
    const { data: quotations, error: quotationsError } = await supabase
      .from('quotations')
      .select('id, total_revenue, status, rfq_deadline')
      .in('status', ['submitted'])
      .gte('rfq_deadline', format(startOfMonth(targetMonth), 'yyyy-MM-dd'))
      .lte('rfq_deadline', format(endOfMonth(targetMonth), 'yyyy-MM-dd'));

    if (quotationsError) throw quotationsError;

    // Get historical revenue from job orders
    const sixMonthsAgo = subMonths(targetMonth, 6);
    const { data: historicalJobs, error: jobsError } = await supabase
      .from('job_orders')
      .select('id, final_revenue, created_at')
      .gte('created_at', format(sixMonthsAgo, 'yyyy-MM-dd'))
      .lt('created_at', format(targetMonth, 'yyyy-MM-dd'));

    if (jobsError) throw jobsError;

    // Transform data for calculation
    // Using default probability of 50 since quotations table doesn't have probability column
    // Filter out items without rfq_deadline
    const pipelineData = (quotations || [])
      .filter(q => q.rfq_deadline !== null)
      .map(q => ({
        id: q.id,
        value: q.total_revenue || 0,
        probability: 50, // Default probability
        expected_close_date: q.rfq_deadline as string,
        status: 'probable' as const,
      }));

    // Group historical revenue by month
    const monthlyRevenue: { month: string; revenue: number }[] = [];
    const revenueByMonth: Record<string, number> = {};
    
    for (const job of historicalJobs || []) {
      if (!job.created_at) continue; // Skip jobs without created_at
      const month = format(new Date(job.created_at), 'yyyy-MM');
      revenueByMonth[month] = (revenueByMonth[month] || 0) + (job.final_revenue || 0);
    }
    
    for (const [month, revenue] of Object.entries(revenueByMonth)) {
      monthlyRevenue.push({ month, revenue });
    }

    // Calculate forecast
    const forecast = calculateRevenueForecast({
      pipelineData,
      historicalRevenue: monthlyRevenue,
      targetMonth,
    });

    // Save to database
    const forecastDate = format(new Date(), 'yyyy-MM-dd');
    const targetMonthStr = format(startOfMonth(targetMonth), 'yyyy-MM-dd');

    const { data: savedForecast, error: saveError } = await supabase
      .from('revenue_forecast')
      .upsert({
        forecast_date: forecastDate,
        target_month: targetMonthStr,
        predicted_revenue: forecast.predicted_revenue,
        confidence_low: forecast.confidence_low,
        confidence_high: forecast.confidence_high,
        confidence_level: forecast.confidence_level,
        pipeline_revenue: forecast.pipeline_revenue,
        recurring_revenue: forecast.recurring_revenue,
        new_business_revenue: forecast.new_business_revenue,
      }, {
        onConflict: 'forecast_date,target_month',
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return { success: true, data: savedForecast as unknown as RevenueForecast };
  } catch (error) {
    console.error('Error generating revenue forecast:', error);
    return { success: false, error: 'Failed to generate revenue forecast' };
  }
}


/**
 * Get revenue forecast summary
 */
export async function getRevenueForecastSummary(): Promise<{
  success: boolean;
  data?: RevenueForecastSummary;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const now = new Date();
    const nextMonth = addMonths(now, 1);
    const quarterEnd = addMonths(now, 3);

    // Get monthly forecast
    const { data: monthlyForecast } = await supabase
      .from('revenue_forecast')
      .select('*')
      .eq('target_month', format(startOfMonth(nextMonth), 'yyyy-MM-dd'))
      .order('forecast_date', { ascending: false })
      .limit(1)
      .single();

    // Get quarterly forecasts
    const { data: quarterlyForecasts } = await supabase
      .from('revenue_forecast')
      .select('*')
      .gte('target_month', format(startOfMonth(nextMonth), 'yyyy-MM-dd'))
      .lte('target_month', format(startOfMonth(quarterEnd), 'yyyy-MM-dd'))
      .order('target_month', { ascending: true });

    // Calculate quarterly totals
    let quarterlyPredicted = 0;
    let quarterlyLow = 0;
    let quarterlyHigh = 0;
    let quarterlyConfidence = 0;
    
    if (quarterlyForecasts && quarterlyForecasts.length > 0) {
      for (const f of quarterlyForecasts) {
        quarterlyPredicted += f.predicted_revenue || 0;
        quarterlyLow += f.confidence_low || 0;
        quarterlyHigh += f.confidence_high || 0;
        quarterlyConfidence += f.confidence_level || 0;
      }
      quarterlyConfidence = quarterlyConfidence / quarterlyForecasts.length;
    }

    // Get pipeline breakdown from quotations
    // Using total_revenue instead of total_amount
    const { data: quotations } = await supabase
      .from('quotations')
      .select('total_revenue, status')
      .in('status', ['submitted', 'won']);

    let pipelineConfirmed = 0;
    let pipelineProbable = 0;
    
    for (const q of quotations || []) {
      if (q.status === 'won') {
        pipelineConfirmed += q.total_revenue || 0;
      } else {
        // Using default 50% probability since quotations table doesn't have probability column
        pipelineProbable += (q.total_revenue || 0) * 0.5;
      }
    }

    const summary: RevenueForecastSummary = {
      monthly: {
        target_month: format(nextMonth, 'yyyy-MM'),
        predicted: monthlyForecast?.predicted_revenue || 0,
        range_low: monthlyForecast?.confidence_low || 0,
        range_high: monthlyForecast?.confidence_high || 0,
        confidence: monthlyForecast?.confidence_level || 0,
      },
      quarterly: {
        quarter: `Q${Math.ceil((nextMonth.getMonth() + 1) / 3)} ${nextMonth.getFullYear()}`,
        predicted: quarterlyPredicted,
        range_low: quarterlyLow,
        range_high: quarterlyHigh,
        confidence: quarterlyConfidence,
      },
      annual: {
        year: now.getFullYear(),
        predicted: quarterlyPredicted * 4, // Rough estimate
        range_low: quarterlyLow * 4,
        range_high: quarterlyHigh * 4,
        confidence: quarterlyConfidence * 0.8, // Lower confidence for annual
      },
      breakdown: {
        pipeline_confirmed: pipelineConfirmed,
        pipeline_probable: pipelineProbable,
        recurring_estimate: monthlyForecast?.recurring_revenue || 0,
        new_business_estimate: monthlyForecast?.new_business_revenue || 0,
      },
    };

    return { success: true, data: summary };
  } catch (error) {
    console.error('Error getting revenue forecast summary:', error);
    return { success: false, error: 'Failed to get revenue forecast summary' };
  }
}

/**
 * Get forecast chart data
 */
export async function getForecastChartData(
  months: number = 6
): Promise<{ success: boolean; data?: ForecastChartData[]; error?: string }> {
  try {
    const supabase = await createClient();
    const now = new Date();
    const startMonth = subMonths(now, 3); // Include 3 months of history
    const endMonth = addMonths(now, months);

    // Get forecasts
    const { data: forecasts, error: forecastError } = await supabase
      .from('revenue_forecast')
      .select('*')
      .gte('target_month', format(startOfMonth(startMonth), 'yyyy-MM-dd'))
      .lte('target_month', format(startOfMonth(endMonth), 'yyyy-MM-dd'))
      .order('target_month', { ascending: true });

    if (forecastError) throw forecastError;

    // Get actual revenue from job orders for past months
    const { data: actualRevenue, error: actualError } = await supabase
      .from('job_orders')
      .select('final_revenue, created_at')
      .gte('created_at', format(startOfMonth(startMonth), 'yyyy-MM-dd'))
      .lt('created_at', format(startOfMonth(now), 'yyyy-MM-dd'));

    if (actualError) throw actualError;

    // Group actual revenue by month
    const actualByMonth: Record<string, number> = {};
    for (const job of actualRevenue || []) {
      if (!job.created_at) continue; // Skip jobs without created_at
      const month = format(new Date(job.created_at), 'yyyy-MM');
      actualByMonth[month] = (actualByMonth[month] || 0) + (job.final_revenue || 0);
    }

    // Build chart data
    const chartData: ForecastChartData[] = [];
    
    for (const forecast of forecasts || []) {
      const month = format(new Date(forecast.target_month), 'yyyy-MM');
      chartData.push({
        month,
        predicted: forecast.predicted_revenue,
        confidence_low: forecast.confidence_low || 0,
        confidence_high: forecast.confidence_high || 0,
        actual: actualByMonth[month],
      });
    }

    return { success: true, data: chartData };
  } catch (error) {
    console.error('Error getting forecast chart data:', error);
    return { success: false, error: 'Failed to get forecast chart data' };
  }
}


/**
 * Assess churn risk for all active customers
 */
export async function assessCustomerChurnRisk(): Promise<{
  success: boolean;
  assessments?: CustomerChurnRisk[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const today = format(new Date(), 'yyyy-MM-dd');

    // Get all active customers
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, name, email')
      .eq('is_active', true);

    if (customersError) throw customersError;

    const assessments: CustomerChurnRisk[] = [];

    for (const customer of customers || []) {
      // Get last job date
      const { data: lastJob } = await supabase
        .from('job_orders')
        .select('created_at')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Calculate days since last job
      const daysSinceLastJob = lastJob && lastJob.created_at
        ? Math.floor((Date.now() - new Date(lastJob.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 365; // Default to 1 year if no jobs

      // Get revenue trend (compare last 6 months to previous 6 months)
      const sixMonthsAgo = subMonths(new Date(), 6);
      const twelveMonthsAgo = subMonths(new Date(), 12);

      const { data: recentJobs } = await supabase
        .from('job_orders')
        .select('final_revenue')
        .eq('customer_id', customer.id)
        .gte('created_at', format(sixMonthsAgo, 'yyyy-MM-dd'));

      const { data: olderJobs } = await supabase
        .from('job_orders')
        .select('final_revenue')
        .eq('customer_id', customer.id)
        .gte('created_at', format(twelveMonthsAgo, 'yyyy-MM-dd'))
        .lt('created_at', format(sixMonthsAgo, 'yyyy-MM-dd'));

      const recentRevenue = (recentJobs || []).reduce((sum, j) => sum + (j.final_revenue || 0), 0);
      const olderRevenue = (olderJobs || []).reduce((sum, j) => sum + (j.final_revenue || 0), 0);

      let revenueTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
      if (olderRevenue > 0) {
        const change = (recentRevenue - olderRevenue) / olderRevenue;
        if (change > 0.1) revenueTrend = 'increasing';
        else if (change < -0.1) revenueTrend = 'decreasing';
      }

      // Calculate engagement score (based on job frequency)
      const { count: jobCount } = await supabase
        .from('job_orders')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customer.id)
        .gte('created_at', format(twelveMonthsAgo, 'yyyy-MM-dd'));

      const engagementScore = Math.min(100, (jobCount || 0) * 10);

      // Calculate payment behavior score
      // Using paid_at instead of paid_date
      const { data: invoices } = await supabase
        .from('invoices')
        .select('status, due_date, paid_at')
        .eq('customer_id', customer.id)
        .gte('created_at', format(twelveMonthsAgo, 'yyyy-MM-dd'));

      let onTimePayments = 0;
      let totalPayments = 0;
      for (const inv of invoices || []) {
        if (inv.status === 'paid' && inv.paid_at && inv.due_date) {
          totalPayments++;
          if (new Date(inv.paid_at) <= new Date(inv.due_date)) {
            onTimePayments++;
          }
        }
      }
      const paymentBehaviorScore = totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 50;

      // Calculate churn risk
      const riskResult = calculateChurnRiskScore({
        daysSinceLastJob,
        revenueTrend,
        engagementScore,
        paymentBehaviorScore,
      });

      // Generate recommendations
      const recommendations = generateChurnRecommendations(riskResult.score, riskResult.factors);

      // Save assessment
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: savedAssessment, error: saveError } = await supabase
        .from('customer_churn_risk')
        .upsert({
          customer_id: customer.id,
          assessment_date: today,
          churn_risk_score: riskResult.score,
          risk_level: riskResult.level,
          days_since_last_job: daysSinceLastJob,
          revenue_trend: revenueTrend,
          engagement_score: engagementScore,
          payment_behavior_score: paymentBehaviorScore,
          contributing_factors: riskResult.factors as unknown,
          recommended_actions: recommendations as unknown,
        } as any, {
          onConflict: 'customer_id,assessment_date',
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving assessment for customer:', customer.id, saveError);
        continue;
      }

      assessments.push({
        ...savedAssessment,
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
        },
      } as unknown as CustomerChurnRisk);
    }

    return { success: true, assessments };
  } catch (error) {
    console.error('Error assessing customer churn risk:', error);
    return { success: false, error: 'Failed to assess customer churn risk' };
  }
}


/**
 * Get customers at churn risk
 */
export async function getCustomersAtRisk(params?: {
  minRiskScore?: number;
  limit?: number;
}): Promise<{ success: boolean; data?: CustomerChurnRisk[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { minRiskScore = 0, limit = 50 } = params || {};

    // Get latest assessments for each customer
    const { data: assessments, error } = await supabase
      .from('customer_churn_risk')
      .select(`
        *,
        customer:customers(id, name, email)
      `)
      .gte('churn_risk_score', minRiskScore)
      .order('churn_risk_score', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, data: (assessments || []) as unknown as CustomerChurnRisk[] };
  } catch (error) {
    console.error('Error getting customers at risk:', error);
    return { success: false, error: 'Failed to get customers at risk' };
  }
}

/**
 * Get churn risk summary
 */
export async function getChurnRiskSummary(): Promise<{
  success: boolean;
  data?: ChurnRiskSummary;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const today = format(new Date(), 'yyyy-MM-dd');

    // Get all assessments from today
    const { data: assessments, error } = await supabase
      .from('customer_churn_risk')
      .select('churn_risk_score, risk_level')
      .eq('assessment_date', today);

    if (error) throw error;

    // Calculate summary
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    for (const a of assessments || []) {
      switch (a.risk_level) {
        case 'critical':
          criticalCount++;
          break;
        case 'high':
          highCount++;
          break;
        case 'medium':
          mediumCount++;
          break;
        case 'low':
          lowCount++;
          break;
      }
    }

    const summary: ChurnRiskSummary = {
      total_customers: assessments?.length || 0,
      at_risk_count: criticalCount + highCount,
      critical_count: criticalCount,
      high_count: highCount,
      medium_count: mediumCount,
      low_count: lowCount,
      total_revenue_at_risk: 0, // Would need to calculate from customer revenue
    };

    return { success: true, data: summary };
  } catch (error) {
    console.error('Error getting churn risk summary:', error);
    return { success: false, error: 'Failed to get churn risk summary' };
  }
}

/**
 * Record action taken for churn risk
 */
export async function recordChurnAction(
  riskId: string,
  action: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const today = format(new Date(), 'yyyy-MM-dd');

    const { error } = await supabase
      .from('customer_churn_risk')
      .update({
        action_taken: action,
        action_date: today,
      })
      .eq('id', riskId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error recording churn action:', error);
    return { success: false, error: 'Failed to record churn action' };
  }
}


/**
 * Generate payment prediction for invoice
 */
export async function generatePaymentPrediction(
  invoiceId: string
): Promise<{ success: boolean; data?: PaymentPrediction; error?: string }> {
  try {
    const supabase = await createClient();
    const today = format(new Date(), 'yyyy-MM-dd');

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, invoice_number, total_amount, due_date, customer_id')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) throw invoiceError;
    if (!invoice) throw new Error('Invoice not found');

    // Get customer payment history
    // Using paid_at instead of paid_date
    const { data: paymentHistory, error: historyError } = await supabase
      .from('invoices')
      .select('id, total_amount, due_date, paid_at')
      .eq('customer_id', invoice.customer_id)
      .eq('status', 'paid')
      .not('paid_at', 'is', null)
      .order('paid_at', { ascending: false })
      .limit(20);

    if (historyError) throw historyError;

    // Transform payment history
    // Filter out items without paid_at
    const history = (paymentHistory || [])
      .filter(inv => inv.paid_at !== null)
      .map(inv => ({
        invoice_id: inv.id,
        invoice_amount: inv.total_amount || 0,
        due_date: inv.due_date,
        payment_date: inv.paid_at as string,
        days_to_payment: inv.paid_at && inv.due_date
          ? Math.floor((new Date(inv.paid_at).getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24)) + 30
          : 30,
      }));

    // Calculate prediction
    const prediction = predictPaymentDate({
      invoiceAmount: invoice.total_amount || 0,
      invoiceDueDate: new Date(invoice.due_date),
      customerPaymentHistory: history,
    });

    // Calculate late payment risk
    const riskResult = calculateLatePaymentRisk({
      predictedDate: prediction.predictedDate,
      dueDate: new Date(invoice.due_date),
      customerPaymentHistory: history,
    });

    // Save prediction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: savedPrediction, error: saveError } = await supabase
      .from('payment_predictions')
      .insert({
        invoice_id: invoiceId,
        prediction_date: today,
        predicted_payment_date: format(prediction.predictedDate, 'yyyy-MM-dd'),
        confidence_level: prediction.confidence,
        days_to_payment_predicted: prediction.daysToPayment,
        late_payment_risk: riskResult.risk,
        risk_factors: riskResult.factors as unknown,
      } as any)
      .select()
      .single();

    if (saveError) throw saveError;

    return { success: true, data: savedPrediction as unknown as PaymentPrediction };
  } catch (error) {
    console.error('Error generating payment prediction:', error);
    return { success: false, error: 'Failed to generate payment prediction' };
  }
}

/**
 * Get payment predictions for invoices
 */
export async function getPaymentPredictions(params?: {
  status?: 'pending' | 'all';
  limit?: number;
}): Promise<{ success: boolean; data?: PaymentPrediction[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { status = 'pending', limit = 50 } = params || {};

    let query = supabase
      .from('payment_predictions')
      .select(`
        *,
        invoice:invoices(id, invoice_number, total_amount, due_date, status, customer:customers(name))
      `)
      .order('predicted_payment_date', { ascending: true })
      .limit(limit);

    if (status === 'pending') {
      query = query.is('actual_payment_date', null);
    }

    const { data: predictions, error } = await query;

    if (error) throw error;

    // Transform data
    const transformedPredictions = (predictions || []).map(p => ({
      ...p,
      invoice: p.invoice ? {
        id: p.invoice.id,
        invoice_number: p.invoice.invoice_number,
        total_amount: p.invoice.total_amount,
        due_date: p.invoice.due_date,
        customer_name: p.invoice.customer?.name || 'Unknown',
      } : undefined,
    }));

    return { success: true, data: transformedPredictions as unknown as PaymentPrediction[] };
  } catch (error) {
    console.error('Error getting payment predictions:', error);
    return { success: false, error: 'Failed to get payment predictions' };
  }
}

/**
 * Update prediction with actual value
 */
export async function updatePredictionActual(
  predictionId: string,
  actualValue: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get the prediction
    const { data: prediction, error: getError } = await supabase
      .from('ai_predictions')
      .select('predicted_value')
      .eq('id', predictionId)
      .single();

    if (getError) throw getError;

    // Calculate error
    const predictionError = prediction?.predicted_value
      ? calculatePredictionError(prediction.predicted_value, actualValue)
      : null;

    // Update
    const { error: updateError } = await supabase
      .from('ai_predictions')
      .update({
        actual_value: actualValue,
        prediction_error: predictionError,
      })
      .eq('id', predictionId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error) {
    console.error('Error updating prediction actual:', error);
    return { success: false, error: 'Failed to update prediction actual' };
  }
}

/**
 * Update forecast with actual revenue
 */
export async function updateForecastActual(
  forecastId: string,
  actualRevenue: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('revenue_forecast')
      .update({ actual_revenue: actualRevenue })
      .eq('id', forecastId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error updating forecast actual:', error);
    return { success: false, error: 'Failed to update forecast actual' };
  }
}

/**
 * Update payment prediction with actual payment date
 */
export async function updatePaymentActual(
  predictionId: string,
  actualPaymentDate: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get the prediction
    const { data: prediction, error: getError } = await supabase
      .from('payment_predictions')
      .select('predicted_payment_date')
      .eq('id', predictionId)
      .single();

    if (getError) throw getError;

    // Calculate accuracy
    const accuracyDays = prediction?.predicted_payment_date
      ? calculatePaymentAccuracyDays(new Date(prediction.predicted_payment_date), actualPaymentDate)
      : null;

    // Update
    const { error: updateError } = await supabase
      .from('payment_predictions')
      .update({
        actual_payment_date: format(actualPaymentDate, 'yyyy-MM-dd'),
        prediction_accuracy_days: accuracyDays,
      })
      .eq('id', predictionId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error) {
    console.error('Error updating payment actual:', error);
    return { success: false, error: 'Failed to update payment actual' };
  }
}
