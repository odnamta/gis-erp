'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  ShipmentRevenue,
  ShipmentRevenueRow,
  ShipmentRevenueFormData,
  RevenueBillingStatus,
} from '@/types/agency';
import {
  transformRevenueRow,
  validateRevenueData,
  prepareRevenueForInsert,
  convertToIdr,
  calculateTotalWithTax,
  calculateLineAmount,
  DEFAULT_TAX_RATE,
  isValidRevenueBillingStatus,
} from '@/lib/cost-revenue-utils';

// =====================================================
// TYPES
// =====================================================

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// =====================================================
// SHIPMENT REVENUE ACTIONS
// =====================================================

/**
 * Get all revenue for a specific booking.
 * 
 * @param bookingId - The booking ID to get revenue for
 * @returns Array of shipment revenue with charge type details
 */
export async function getShipmentRevenue(
  bookingId: string
): Promise<ActionResult<ShipmentRevenue[]>> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('shipment_revenue')
      .select(`
        *,
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
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const revenue: ShipmentRevenue[] = ((data || []) as any[]).map((row) => {
      const rev = transformRevenueRow(row as ShipmentRevenueRow);
      
      // Add joined charge type if available
      if (row.agency_charge_types) {
        rev.chargeType = {
          id: row.agency_charge_types.id as string,
          chargeCode: row.agency_charge_types.charge_code as string,
          chargeName: row.agency_charge_types.charge_name as string,
          chargeCategory: row.agency_charge_types.charge_category as 'freight' | 'origin' | 'destination' | 'documentation' | 'customs' | 'other',
          chargeType: row.agency_charge_types.charge_type as 'revenue' | 'cost' | 'both',
          defaultCurrency: row.agency_charge_types.default_currency as string,
          isTaxable: row.agency_charge_types.is_taxable as boolean,
          displayOrder: row.agency_charge_types.display_order as number,
          isActive: row.agency_charge_types.is_active as boolean,
          createdAt: row.agency_charge_types.created_at as string,
        };
      }
      
      return rev;
    });

    return { success: true, data: revenue };
  } catch (error) {
    console.error('Error fetching shipment revenue:', error);
    return { success: false, error: 'Failed to fetch shipment revenue' };
  }
}


/**
 * Get a single shipment revenue by ID.
 * 
 * @param id - The revenue ID
 * @returns The shipment revenue or null if not found
 */
export async function getShipmentRevenueById(
  id: string
): Promise<ActionResult<ShipmentRevenue>> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('shipment_revenue')
      .select(`
        *,
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
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Shipment revenue not found' };
      }
      throw error;
    }

    if (!data) {
      return { success: false, error: 'Shipment revenue not found' };
    }

    const row = data as ShipmentRevenueRow & { agency_charge_types?: Record<string, unknown> };
    const revenue = transformRevenueRow(row);
    
    // Add joined charge type if available
    if (row.agency_charge_types) {
      revenue.chargeType = {
        id: row.agency_charge_types.id as string,
        chargeCode: row.agency_charge_types.charge_code as string,
        chargeName: row.agency_charge_types.charge_name as string,
        chargeCategory: row.agency_charge_types.charge_category as 'freight' | 'origin' | 'destination' | 'documentation' | 'customs' | 'other',
        chargeType: row.agency_charge_types.charge_type as 'revenue' | 'cost' | 'both',
        defaultCurrency: row.agency_charge_types.default_currency as string,
        isTaxable: row.agency_charge_types.is_taxable as boolean,
        displayOrder: row.agency_charge_types.display_order as number,
        isActive: row.agency_charge_types.is_active as boolean,
        createdAt: row.agency_charge_types.created_at as string,
      };
    }

    return { success: true, data: revenue };
  } catch (error) {
    console.error('Error fetching shipment revenue:', error);
    return { success: false, error: 'Failed to fetch shipment revenue' };
  }
}

/**
 * Create a new shipment revenue with auto-calculation of amount_idr, tax_amount, total_amount.
 * 
 * Property 9: Default Tax Rate Application
 * New revenue defaults to 11% tax rate when not explicitly provided.
 * 
 * @param formData - The revenue form data
 * @returns The created shipment revenue
 */
export async function createShipmentRevenue(
  formData: ShipmentRevenueFormData
): Promise<ActionResult<ShipmentRevenue>> {
  try {
    // Validate form data
    const validation = validateRevenueData(formData);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.map(e => e.message).join(', '),
      };
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Prepare data with calculated fields
    const dbData = prepareRevenueForInsert(formData);
    
    // Add created_by if user is available
    if (user) {
      dbData.created_by = user.id;
    }

    const { data, error } = await supabase
      .from('shipment_revenue')
      .insert(dbData as any)
      .select()
      .single();

    if (error) throw error;

    // Revalidate relevant paths
    if (formData.bookingId) {
      revalidatePath(`/agency/bookings/${formData.bookingId}/financials`);
    }
    
    return { success: true, data: transformRevenueRow(data as ShipmentRevenueRow) };
  } catch (error) {
    console.error('Error creating shipment revenue:', error);
    return { success: false, error: 'Failed to create shipment revenue' };
  }
}


/**
 * Update an existing shipment revenue.
 * Recalculates amount_idr, tax_amount, and total_amount based on updated values.
 * 
 * @param id - The revenue ID
 * @param formData - The updated revenue form data
 * @returns The updated shipment revenue
 */
export async function updateShipmentRevenue(
  id: string,
  formData: Partial<ShipmentRevenueFormData>
): Promise<ActionResult<ShipmentRevenue>> {
  try {
    const supabase = await createClient();

    // Get existing revenue
    const { data: existing } = await supabase
      .from('shipment_revenue')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Shipment revenue not found' };
    }

    const existingRow = existing as ShipmentRevenueRow;

    // Merge with existing data
    const mergedData: ShipmentRevenueFormData = {
      bookingId: formData.bookingId ?? existingRow.booking_id,
      blId: formData.blId ?? existingRow.bl_id,
      jobOrderId: formData.jobOrderId ?? existingRow.job_order_id,
      invoiceId: formData.invoiceId ?? existingRow.invoice_id,
      chargeTypeId: formData.chargeTypeId ?? existingRow.charge_type_id,
      description: formData.description ?? existingRow.description,
      currency: formData.currency ?? existingRow.currency,
      unitPrice: formData.unitPrice ?? existingRow.unit_price,
      quantity: formData.quantity ?? existingRow.quantity,
      exchangeRate: formData.exchangeRate ?? existingRow.exchange_rate,
      isTaxable: formData.isTaxable ?? existingRow.is_taxable,
      taxRate: formData.taxRate ?? existingRow.tax_rate,
      notes: formData.notes ?? existingRow.notes,
    };

    // Validate merged data
    const validation = validateRevenueData(mergedData);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.map(e => e.message).join(', '),
      };
    }

    // Recalculate amounts
    const amount = calculateLineAmount(mergedData.unitPrice, mergedData.quantity);
    const exchangeRate = mergedData.currency === 'IDR' ? 1 : (mergedData.exchangeRate || 1);
    const amountIdr = convertToIdr(amount, mergedData.currency, exchangeRate);
    const taxRate = mergedData.taxRate ?? DEFAULT_TAX_RATE;
    const isTaxable = mergedData.isTaxable ?? true;
    const { tax, total } = calculateTotalWithTax(amountIdr, taxRate, isTaxable);

    // Build update object
    const updateData: Record<string, unknown> = {
      booking_id: mergedData.bookingId || null,
      bl_id: mergedData.blId || null,
      job_order_id: mergedData.jobOrderId || null,
      invoice_id: mergedData.invoiceId || null,
      charge_type_id: mergedData.chargeTypeId,
      description: mergedData.description || null,
      currency: mergedData.currency,
      unit_price: mergedData.unitPrice,
      quantity: mergedData.quantity,
      amount,
      exchange_rate: exchangeRate,
      amount_idr: amountIdr,
      is_taxable: isTaxable,
      tax_rate: taxRate,
      tax_amount: tax,
      total_amount: total,
      notes: mergedData.notes || null,
    };

    const { data, error } = await supabase
      .from('shipment_revenue')
      .update(updateData as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Revalidate relevant paths
    const bookingId = mergedData.bookingId || existingRow.booking_id;
    if (bookingId) {
      revalidatePath(`/agency/bookings/${bookingId}/financials`);
    }

    return { success: true, data: transformRevenueRow(data as ShipmentRevenueRow) };
  } catch (error) {
    console.error('Error updating shipment revenue:', error);
    return { success: false, error: 'Failed to update shipment revenue' };
  }
}

/**
 * Delete a shipment revenue.
 * Cannot delete revenue that has been billed (linked to an invoice).
 * 
 * @param id - The revenue ID
 * @returns Success status
 */
export async function deleteShipmentRevenue(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // Get existing revenue to check billing status and get booking_id
    const { data: existing } = await supabase
      .from('shipment_revenue')
      .select('id, booking_id, billing_status, invoice_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Shipment revenue not found' };
    }

    // Check if revenue is billed (linked to an invoice)
    if (existing.billing_status === 'billed' || existing.billing_status === 'paid') {
      return { 
        success: false, 
        error: 'Cannot delete revenue that has been invoiced. Please remove from invoice first.' 
      };
    }

    const { error } = await supabase
      .from('shipment_revenue')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Revalidate relevant paths
    if (existing.booking_id) {
      revalidatePath(`/agency/bookings/${existing.booking_id}/financials`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting shipment revenue:', error);
    return { success: false, error: 'Failed to delete shipment revenue' };
  }
}


/**
 * Update the billing status of a shipment revenue.
 * 
 * Property 7: Revenue Billing Status Validity
 * billing_status only accepts valid values: 'unbilled', 'billed', or 'paid'.
 * 
 * @param id - The revenue ID
 * @param status - The new billing status
 * @param invoiceId - Optional invoice ID (required when status is 'billed' or 'paid')
 * @returns The updated shipment revenue
 */
export async function updateRevenueBillingStatus(
  id: string,
  status: RevenueBillingStatus,
  invoiceId?: string
): Promise<ActionResult<ShipmentRevenue>> {
  try {
    // Validate billing status
    if (!isValidRevenueBillingStatus(status)) {
      return {
        success: false,
        error: `Invalid billing status. Valid values: unbilled, billed, paid`,
      };
    }

    const supabase = await createClient();

    // Get existing revenue
    const { data: existing } = await supabase
      .from('shipment_revenue')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Shipment revenue not found' };
    }

    const existingRow = existing as ShipmentRevenueRow;

    // Build update object
    const updateData: Record<string, unknown> = {
      billing_status: status,
    };

    // Handle invoice_id based on status
    if (status === 'billed' || status === 'paid') {
      if (invoiceId) {
        updateData.invoice_id = invoiceId;
      }
    } else if (status === 'unbilled') {
      // Clear invoice_id when setting to unbilled
      updateData.invoice_id = null;
    }

    const { data, error } = await supabase
      .from('shipment_revenue')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Revalidate relevant paths
    if (existingRow.booking_id) {
      revalidatePath(`/agency/bookings/${existingRow.booking_id}/financials`);
    }

    return { success: true, data: transformRevenueRow(data as ShipmentRevenueRow) };
  } catch (error) {
    console.error('Error updating revenue billing status:', error);
    return { success: false, error: 'Failed to update billing status' };
  }
}

/**
 * Get revenue by invoice ID.
 * 
 * @param invoiceId - The invoice ID
 * @returns Array of shipment revenue for the invoice
 */
export async function getShipmentRevenueByInvoice(
  invoiceId: string
): Promise<ActionResult<ShipmentRevenue[]>> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('shipment_revenue')
      .select(`
        *,
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
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const revenue: ShipmentRevenue[] = ((data || []) as any[]).map((row) => {
      const rev = transformRevenueRow(row as ShipmentRevenueRow);
      
      if (row.agency_charge_types) {
        rev.chargeType = {
          id: row.agency_charge_types.id as string,
          chargeCode: row.agency_charge_types.charge_code as string,
          chargeName: row.agency_charge_types.charge_name as string,
          chargeCategory: row.agency_charge_types.charge_category as 'freight' | 'origin' | 'destination' | 'documentation' | 'customs' | 'other',
          chargeType: row.agency_charge_types.charge_type as 'revenue' | 'cost' | 'both',
          defaultCurrency: row.agency_charge_types.default_currency as string,
          isTaxable: row.agency_charge_types.is_taxable as boolean,
          displayOrder: row.agency_charge_types.display_order as number,
          isActive: row.agency_charge_types.is_active as boolean,
          createdAt: row.agency_charge_types.created_at as string,
        };
      }
      
      return rev;
    });

    return { success: true, data: revenue };
  } catch (error) {
    console.error('Error fetching revenue by invoice:', error);
    return { success: false, error: 'Failed to fetch revenue by invoice' };
  }
}

/**
 * Get unbilled revenue for a booking.
 * 
 * @param bookingId - The booking ID
 * @returns Array of unbilled shipment revenue
 */
export async function getUnbilledRevenueByBooking(
  bookingId: string
): Promise<ActionResult<ShipmentRevenue[]>> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('shipment_revenue')
      .select(`
        *,
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
      .eq('booking_id', bookingId)
      .eq('billing_status', 'unbilled')
      .order('created_at', { ascending: true });

    if (error) throw error;

    const revenue: ShipmentRevenue[] = ((data || []) as any[]).map((row) => {
      const rev = transformRevenueRow(row as ShipmentRevenueRow);
      
      if (row.agency_charge_types) {
        rev.chargeType = {
          id: row.agency_charge_types.id as string,
          chargeCode: row.agency_charge_types.charge_code as string,
          chargeName: row.agency_charge_types.charge_name as string,
          chargeCategory: row.agency_charge_types.charge_category as 'freight' | 'origin' | 'destination' | 'documentation' | 'customs' | 'other',
          chargeType: row.agency_charge_types.charge_type as 'revenue' | 'cost' | 'both',
          defaultCurrency: row.agency_charge_types.default_currency as string,
          isTaxable: row.agency_charge_types.is_taxable as boolean,
          displayOrder: row.agency_charge_types.display_order as number,
          isActive: row.agency_charge_types.is_active as boolean,
          createdAt: row.agency_charge_types.created_at as string,
        };
      }
      
      return rev;
    });

    return { success: true, data: revenue };
  } catch (error) {
    console.error('Error fetching unbilled revenue:', error);
    return { success: false, error: 'Failed to fetch unbilled revenue' };
  }
}

/**
 * Bulk update billing status for multiple revenue items.
 * Useful when creating an invoice that includes multiple revenue items.
 * 
 * @param ids - Array of revenue IDs
 * @param status - The new billing status
 * @param invoiceId - Optional invoice ID
 * @returns Success status with count of updated items
 */
export async function bulkUpdateRevenueBillingStatus(
  ids: string[],
  status: RevenueBillingStatus,
  invoiceId?: string
): Promise<ActionResult<{ updatedCount: number }>> {
  try {
    // Validate billing status
    if (!isValidRevenueBillingStatus(status)) {
      return {
        success: false,
        error: `Invalid billing status. Valid values: unbilled, billed, paid`,
      };
    }

    if (!ids || ids.length === 0) {
      return { success: false, error: 'No revenue IDs provided' };
    }

    const supabase = await createClient();

    // Build update object
    const updateData: Record<string, unknown> = {
      billing_status: status,
    };

    if (status === 'billed' || status === 'paid') {
      if (invoiceId) {
        updateData.invoice_id = invoiceId;
      }
    } else if (status === 'unbilled') {
      updateData.invoice_id = null;
    }

    const { data, error } = await supabase
      .from('shipment_revenue')
      .update(updateData)
      .in('id', ids)
      .select('id, booking_id');

    if (error) throw error;

    // Revalidate paths for affected bookings
    const bookingIds = new Set((data || []).map(r => r.booking_id).filter(Boolean));
    for (const bookingId of bookingIds) {
      revalidatePath(`/agency/bookings/${bookingId}/financials`);
    }

    return { success: true, data: { updatedCount: data?.length || 0 } };
  } catch (error) {
    console.error('Error bulk updating revenue billing status:', error);
    return { success: false, error: 'Failed to update billing status' };
  }
}
