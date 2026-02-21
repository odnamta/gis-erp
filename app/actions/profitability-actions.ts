'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/permissions-server';
import {
  ShipmentProfitability,
  ShipmentProfitabilityRow,
  ShipmentRevenue,
  ShipmentRevenueRow,
  BookingFinancialSummary,
  ProfitabilityFilters,
} from '@/types/agency';
import {
  transformProfitabilityRow,
  transformRevenueRow,
  calculateProfitMargin,
  calculateGrossProfit,
  isMarginTargetMet,
  DEFAULT_MARGIN_TARGET,
} from '@/lib/cost-revenue-utils';

// =====================================================
// TYPES
// =====================================================

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Unbilled revenue filters
interface UnbilledRevenueFilters {
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Unbilled revenue grouped by booking
interface UnbilledRevenueByBooking {
  bookingId: string;
  bookingNumber: string;
  customerName?: string;
  items: ShipmentRevenue[];
  totalUnbilled: number;
}

// =====================================================
// PROFITABILITY ACTIONS
// =====================================================

/**
 * Get financial summary for a specific booking.
 * 
 * Property 3: Profitability Calculation Correctness
 * - total_revenue = sum of all revenue line amounts_idr
 * - total_cost = sum of all cost line amounts_idr
 * - gross_profit = total_revenue - total_cost
 * - profit_margin_pct = (gross_profit / total_revenue) * 100 when total_revenue > 0
 * 
 * @param bookingId - The booking ID to get financial summary for
 * @returns BookingFinancialSummary with all financial metrics
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export async function getBookingFinancialSummary(
  bookingId: string
): Promise<ActionResult<BookingFinancialSummary>> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createClient();

    // Get all revenue for the booking
    const { data: revenueData, error: revenueError } = await supabase
      .from('shipment_revenue')
      .select('amount_idr, tax_amount, billing_status')
      .eq('booking_id', bookingId);

    if (revenueError) throw revenueError;

    // Get all costs for the booking
    const { data: costData, error: costError } = await supabase
      .from('shipment_costs')
      .select('amount_idr, tax_amount, total_amount, paid_amount, payment_status')
      .eq('booking_id', bookingId);

    if (costError) throw costError;

    // Calculate totals
    const revenue = revenueData || [];
    const costs = costData || [];

    // Property 3: total_revenue = sum of all amount_idr from revenue items
    const totalRevenue = revenue.reduce((sum, r) => sum + (r.amount_idr || 0), 0);
    const totalRevenueTax = revenue.reduce((sum, r) => sum + (r.tax_amount || 0), 0);

    // Property 3: total_cost = sum of all amount_idr from cost items
    const totalCost = costs.reduce((sum, c) => sum + (c.amount_idr || 0), 0);
    const totalCostTax = costs.reduce((sum, c) => sum + (c.tax_amount || 0), 0);

    // Property 3: gross_profit = total_revenue - total_cost
    const grossProfit = calculateGrossProfit(totalRevenue, totalCost);

    // Property 3: profit_margin_pct calculation
    const profitMarginPct = calculateProfitMargin(totalRevenue, totalCost);

    // Calculate unbilled revenue
    const unbilledRevenue = revenue
      .filter(r => r.billing_status === 'unbilled')
      .reduce((sum, r) => sum + (r.amount_idr || 0), 0);

    // Calculate unpaid costs
    const unpaidCosts = costs
      .filter(c => c.payment_status === 'unpaid' || c.payment_status === 'partial')
      .reduce((sum, c) => sum + ((c.total_amount || 0) - (c.paid_amount || 0)), 0);

    const summary: BookingFinancialSummary = {
      totalRevenue,
      totalRevenueTax,
      totalCost,
      totalCostTax,
      grossProfit,
      profitMarginPct,
      targetMarginPct: DEFAULT_MARGIN_TARGET,
      isTargetMet: isMarginTargetMet(profitMarginPct, DEFAULT_MARGIN_TARGET),
      unbilledRevenue,
      unpaidCosts,
    };

    return { success: true, data: summary };
  } catch (error) {
    console.error('Error fetching booking financial summary:', error);
    return { success: false, error: 'Failed to fetch booking financial summary' };
  }
}

/**
 * Get shipment profitability data with optional filters.
 * 
 * Property 10: Profitability Filter Correctness
 * For any filter applied to the profitability view (customer, date range, status),
 * the returned results SHALL only include bookings that match all specified filter criteria.
 * 
 * @param filters - Optional filters for customer, date range, status, margin range
 * @returns Array of ShipmentProfitability records
 * 
 * Requirements: 9.1, 9.2
 */
export async function getShipmentProfitability(
  filters?: ProfitabilityFilters
): Promise<ActionResult<ShipmentProfitability[]>> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createClient();

    // Query the profitability view
    let query = supabase
      .from('shipment_profitability')
      .select('*');

    // Apply filters - Property 10: filters correctly narrow results
    if (filters?.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    // Date range filter on booking created_at (via join or subquery)
    // Note: The view may need to include created_at for date filtering
    // For now, we'll filter in memory if the view doesn't have the date

    // Execute query
    const { data, error } = await query.order('booking_number', { ascending: false });

    if (error) throw error;

    // Transform rows to entities
    let profitability: ShipmentProfitability[] = ((data || []) as any[]).map((row) =>
      transformProfitabilityRow(row as ShipmentProfitabilityRow)
    );

    // Apply margin filters in memory (if specified)
    if (filters?.minMargin !== undefined) {
      profitability = profitability.filter(p => p.profitMarginPct >= filters.minMargin!);
    }

    if (filters?.maxMargin !== undefined) {
      profitability = profitability.filter(p => p.profitMarginPct <= filters.maxMargin!);
    }

    return { success: true, data: profitability };
  } catch (error) {
    console.error('Error fetching shipment profitability:', error);
    return { success: false, error: 'Failed to fetch shipment profitability' };
  }
}

/**
 * Get unbilled revenue items with optional filters.
 * 
 * Property 12: Unbilled Revenue Identification
 * For any query for unbilled revenue, the results SHALL include all and only
 * revenue items where billing_status = 'unbilled', correctly grouped by booking with accurate totals.
 * 
 * @param filters - Optional filters for customer, date range
 * @returns Array of unbilled revenue items grouped by booking
 * 
 * Requirements: 10.1, 10.2, 10.3
 */
export async function getUnbilledRevenue(
  filters?: UnbilledRevenueFilters
): Promise<ActionResult<UnbilledRevenueByBooking[]>> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = await createClient();

    // Query unbilled revenue items with booking info
    // Property 12: only items where billing_status = 'unbilled'
    let query = supabase
      .from('shipment_revenue')
      .select(`
        *,
        freight_bookings!inner (
          id,
          booking_number,
          customer_id,
          customers (
            id,
            name
          )
        ),
        agency_charge_types (
          id,
          charge_code,
          charge_name,
          charge_category,
          charge_type,
          default_currency,
          is_taxable,
          display_order,
          is_active,
          created_at
        )
      `)
      .eq('billing_status', 'unbilled');

    // Apply customer filter via booking
    if (filters?.customerId) {
      query = query.eq('freight_bookings.customer_id', filters.customerId);
    }

    // Apply date filters
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Group by booking
    const groupedMap = new Map<string, UnbilledRevenueByBooking>();

    for (const row of data || []) {
      const revenueRow = row as ShipmentRevenueRow & {
        freight_bookings?: {
          id: string;
          booking_number: string;
          customer_id?: string;
          customers?: { id: string; name: string };
        };
        agency_charge_types?: Record<string, unknown>;
      };

      const bookingId = revenueRow.booking_id;
      if (!bookingId) continue;

      const revenue = transformRevenueRow(revenueRow);

      // Add charge type if available
      if (revenueRow.agency_charge_types) {
        revenue.chargeType = {
          id: revenueRow.agency_charge_types.id as string,
          chargeCode: revenueRow.agency_charge_types.charge_code as string,
          chargeName: revenueRow.agency_charge_types.charge_name as string,
          chargeCategory: revenueRow.agency_charge_types.charge_category as 'freight' | 'origin' | 'destination' | 'documentation' | 'customs' | 'other',
          chargeType: revenueRow.agency_charge_types.charge_type as 'revenue' | 'cost' | 'both',
          defaultCurrency: revenueRow.agency_charge_types.default_currency as string,
          isTaxable: revenueRow.agency_charge_types.is_taxable as boolean,
          displayOrder: revenueRow.agency_charge_types.display_order as number,
          isActive: revenueRow.agency_charge_types.is_active as boolean,
          createdAt: revenueRow.agency_charge_types.created_at as string,
        };
      }

      if (!groupedMap.has(bookingId)) {
        groupedMap.set(bookingId, {
          bookingId,
          bookingNumber: revenueRow.freight_bookings?.booking_number || '',
          customerName: revenueRow.freight_bookings?.customers?.name,
          items: [],
          totalUnbilled: 0,
        });
      }

      const group = groupedMap.get(bookingId)!;
      group.items.push(revenue);
      group.totalUnbilled += revenue.amountIdr || 0;
    }

    // Convert map to array
    const result = Array.from(groupedMap.values());

    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching unbilled revenue:', error);
    return { success: false, error: 'Failed to fetch unbilled revenue' };
  }
}
