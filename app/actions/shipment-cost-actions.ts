'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  ShipmentCost,
  ShipmentCostRow,
  ShipmentCostFormData,
  CostPaymentStatus,
} from '@/types/agency';
import {
  transformCostRow,
  validateCostData,
  prepareCostForInsert,
  convertToIdr,
  calculateTotalWithTax,
  calculateLineAmount,
  DEFAULT_TAX_RATE,
  isValidCostPaymentStatus,
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
// SHIPMENT COST ACTIONS
// =====================================================

/**
 * Get all costs for a specific booking.
 * 
 * @param bookingId - The booking ID to get costs for
 * @returns Array of shipment costs with charge type details
 */
export async function getShipmentCosts(
  bookingId: string
): Promise<ActionResult<ShipmentCost[]>> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('shipment_costs')
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

    const costs: ShipmentCost[] = (data || []).map((row: ShipmentCostRow & { agency_charge_types?: Record<string, unknown> }) => {
      const cost = transformCostRow(row);
      
      // Add joined charge type if available
      if (row.agency_charge_types) {
        cost.chargeType = {
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
      
      return cost;
    });

    return { success: true, data: costs };
  } catch (error) {
    console.error('Error fetching shipment costs:', error);
    return { success: false, error: 'Failed to fetch shipment costs' };
  }
}

/**
 * Get a single shipment cost by ID.
 * 
 * @param id - The cost ID
 * @returns The shipment cost or null if not found
 */
export async function getShipmentCostById(
  id: string
): Promise<ActionResult<ShipmentCost>> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('shipment_costs')
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
        return { success: false, error: 'Shipment cost not found' };
      }
      throw error;
    }

    if (!data) {
      return { success: false, error: 'Shipment cost not found' };
    }

    const row = data as ShipmentCostRow & { agency_charge_types?: Record<string, unknown> };
    const cost = transformCostRow(row);
    
    // Add joined charge type if available
    if (row.agency_charge_types) {
      cost.chargeType = {
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

    return { success: true, data: cost };
  } catch (error) {
    console.error('Error fetching shipment cost:', error);
    return { success: false, error: 'Failed to fetch shipment cost' };
  }
}

/**
 * Create a new shipment cost with auto-calculation of amount_idr, tax_amount, total_amount.
 * 
 * Property 9: Default Tax Rate Application
 * New costs default to 11% tax rate when not explicitly provided.
 * 
 * @param formData - The cost form data
 * @returns The created shipment cost
 */
export async function createShipmentCost(
  formData: ShipmentCostFormData
): Promise<ActionResult<ShipmentCost>> {
  try {
    // Validate form data
    const validation = validateCostData(formData);
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
    const dbData = prepareCostForInsert(formData);
    
    // Add created_by if user is available
    if (user) {
      dbData.created_by = user.id;
    }

    const { data, error } = await supabase
      .from('shipment_costs')
      .insert(dbData)
      .select()
      .single();

    if (error) throw error;

    // Revalidate relevant paths
    if (formData.bookingId) {
      revalidatePath(`/agency/bookings/${formData.bookingId}/financials`);
    }
    
    return { success: true, data: transformCostRow(data as ShipmentCostRow) };
  } catch (error) {
    console.error('Error creating shipment cost:', error);
    return { success: false, error: 'Failed to create shipment cost' };
  }
}

/**
 * Update an existing shipment cost.
 * Recalculates amount_idr, tax_amount, and total_amount based on updated values.
 * 
 * @param id - The cost ID
 * @param formData - The updated cost form data
 * @returns The updated shipment cost
 */
export async function updateShipmentCost(
  id: string,
  formData: Partial<ShipmentCostFormData>
): Promise<ActionResult<ShipmentCost>> {
  try {
    const supabase = await createClient();

    // Get existing cost
    const { data: existing } = await supabase
      .from('shipment_costs')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Shipment cost not found' };
    }

    const existingRow = existing as ShipmentCostRow;

    // Merge with existing data
    const mergedData: ShipmentCostFormData = {
      bookingId: formData.bookingId ?? existingRow.booking_id,
      blId: formData.blId ?? existingRow.bl_id,
      jobOrderId: formData.jobOrderId ?? existingRow.job_order_id,
      chargeTypeId: formData.chargeTypeId ?? existingRow.charge_type_id,
      description: formData.description ?? existingRow.description,
      currency: formData.currency ?? existingRow.currency,
      unitPrice: formData.unitPrice ?? existingRow.unit_price,
      quantity: formData.quantity ?? existingRow.quantity,
      exchangeRate: formData.exchangeRate ?? existingRow.exchange_rate,
      isTaxable: formData.isTaxable ?? existingRow.is_taxable,
      taxRate: formData.taxRate ?? existingRow.tax_rate,
      vendorId: formData.vendorId ?? existingRow.vendor_id,
      vendorName: formData.vendorName ?? existingRow.vendor_name,
      vendorInvoiceNumber: formData.vendorInvoiceNumber ?? existingRow.vendor_invoice_number,
      vendorInvoiceDate: formData.vendorInvoiceDate ?? existingRow.vendor_invoice_date,
      notes: formData.notes ?? existingRow.notes,
    };

    // Validate merged data
    const validation = validateCostData(mergedData);
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
      vendor_id: mergedData.vendorId || null,
      vendor_name: mergedData.vendorName || null,
      vendor_invoice_number: mergedData.vendorInvoiceNumber || null,
      vendor_invoice_date: mergedData.vendorInvoiceDate || null,
      notes: mergedData.notes || null,
    };

    const { data, error } = await supabase
      .from('shipment_costs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Revalidate relevant paths
    const bookingId = mergedData.bookingId || existingRow.booking_id;
    if (bookingId) {
      revalidatePath(`/agency/bookings/${bookingId}/financials`);
    }

    return { success: true, data: transformCostRow(data as ShipmentCostRow) };
  } catch (error) {
    console.error('Error updating shipment cost:', error);
    return { success: false, error: 'Failed to update shipment cost' };
  }
}

/**
 * Delete a shipment cost.
 * 
 * @param id - The cost ID
 * @returns Success status
 */
export async function deleteShipmentCost(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // Get existing cost to check for linked vendor invoices and get booking_id
    const { data: existing } = await supabase
      .from('shipment_costs')
      .select('id, booking_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Shipment cost not found' };
    }

    // Check if cost is linked to any vendor invoice
    const { data: linkedInvoices } = await supabase
      .from('agency_vendor_invoices')
      .select('id')
      .contains('cost_ids', [id])
      .limit(1);

    if (linkedInvoices && linkedInvoices.length > 0) {
      return { 
        success: false, 
        error: 'Cannot delete cost linked to a vendor invoice. Please unlink it first.' 
      };
    }

    const { error } = await supabase
      .from('shipment_costs')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Revalidate relevant paths
    if (existing.booking_id) {
      revalidatePath(`/agency/bookings/${existing.booking_id}/financials`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting shipment cost:', error);
    return { success: false, error: 'Failed to delete shipment cost' };
  }
}

/**
 * Update the payment status of a shipment cost.
 * 
 * Property 6: Cost Payment Status Validity
 * payment_status only accepts valid values: 'unpaid', 'partial', or 'paid'.
 * 
 * @param id - The cost ID
 * @param status - The new payment status
 * @param paidAmount - Optional paid amount (required for 'partial' or 'paid')
 * @param paidDate - Optional payment date
 * @param reference - Optional payment reference
 * @returns The updated shipment cost
 */
export async function updateCostPaymentStatus(
  id: string,
  status: CostPaymentStatus,
  paidAmount?: number,
  paidDate?: string,
  reference?: string
): Promise<ActionResult<ShipmentCost>> {
  try {
    // Validate payment status
    if (!isValidCostPaymentStatus(status)) {
      return {
        success: false,
        error: `Invalid payment status. Valid values: unpaid, partial, paid`,
      };
    }

    const supabase = await createClient();

    // Get existing cost to validate paid amount
    const { data: existing } = await supabase
      .from('shipment_costs')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Shipment cost not found' };
    }

    const existingRow = existing as ShipmentCostRow;

    // Validate paid amount doesn't exceed total
    if (paidAmount !== undefined && paidAmount > existingRow.total_amount) {
      return {
        success: false,
        error: 'Paid amount cannot exceed total amount',
      };
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      payment_status: status,
    };

    if (paidAmount !== undefined) {
      updateData.paid_amount = paidAmount;
    }

    if (paidDate !== undefined) {
      updateData.paid_date = paidDate;
    }

    if (reference !== undefined) {
      updateData.payment_reference = reference;
    }

    // Auto-set paid_date to today if status is 'paid' and no date provided
    if (status === 'paid' && !paidDate && !existingRow.paid_date) {
      updateData.paid_date = new Date().toISOString().split('T')[0];
    }

    // Auto-set paid_amount to total if status is 'paid' and no amount provided
    if (status === 'paid' && paidAmount === undefined) {
      updateData.paid_amount = existingRow.total_amount;
    }

    const { data, error } = await supabase
      .from('shipment_costs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Revalidate relevant paths
    if (existingRow.booking_id) {
      revalidatePath(`/agency/bookings/${existingRow.booking_id}/financials`);
    }

    return { success: true, data: transformCostRow(data as ShipmentCostRow) };
  } catch (error) {
    console.error('Error updating cost payment status:', error);
    return { success: false, error: 'Failed to update payment status' };
  }
}

/**
 * Get costs by vendor ID.
 * 
 * @param vendorId - The vendor ID
 * @returns Array of shipment costs for the vendor
 */
export async function getShipmentCostsByVendor(
  vendorId: string
): Promise<ActionResult<ShipmentCost[]>> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('shipment_costs')
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
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const costs: ShipmentCost[] = (data || []).map((row: ShipmentCostRow & { agency_charge_types?: Record<string, unknown> }) => {
      const cost = transformCostRow(row);
      
      if (row.agency_charge_types) {
        cost.chargeType = {
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
      
      return cost;
    });

    return { success: true, data: costs };
  } catch (error) {
    console.error('Error fetching costs by vendor:', error);
    return { success: false, error: 'Failed to fetch costs by vendor' };
  }
}

/**
 * Get unpaid costs for a booking.
 * 
 * @param bookingId - The booking ID
 * @returns Array of unpaid shipment costs
 */
export async function getUnpaidCostsByBooking(
  bookingId: string
): Promise<ActionResult<ShipmentCost[]>> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('shipment_costs')
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
      .in('payment_status', ['unpaid', 'partial'])
      .order('created_at', { ascending: true });

    if (error) throw error;

    const costs: ShipmentCost[] = (data || []).map((row: ShipmentCostRow & { agency_charge_types?: Record<string, unknown> }) => {
      const cost = transformCostRow(row);
      
      if (row.agency_charge_types) {
        cost.chargeType = {
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
      
      return cost;
    });

    return { success: true, data: costs };
  } catch (error) {
    console.error('Error fetching unpaid costs:', error);
    return { success: false, error: 'Failed to fetch unpaid costs' };
  }
}
