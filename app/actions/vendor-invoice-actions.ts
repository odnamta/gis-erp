'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  AgencyVendorInvoice,
  AgencyVendorInvoiceRow,
  VendorInvoiceFormData,
  VendorInvoiceFilters,
  VendorInvoicePaymentStatus,
} from '@/types/agency';
import {
  transformVendorInvoiceRow,
  validateVendorInvoiceData,
  isValidVendorInvoicePaymentStatus,
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
// VENDOR INVOICE ACTIONS
// =====================================================

/**
 * Get vendor invoices with optional filters.
 * 
 * @param filters - Optional filters for vendor invoices
 * @returns Array of vendor invoices
 */
export async function getVendorInvoices(
  filters?: VendorInvoiceFilters
): Promise<ActionResult<AgencyVendorInvoice[]>> {
  try {
    const supabase = await createClient();
    
    let query = supabase
      .from('agency_vendor_invoices')
      .select('*')
      .order('invoice_date', { ascending: false });

    // Apply filters
    if (filters?.vendorId) {
      query = query.eq('vendor_id', filters.vendorId);
    }
    
    if (filters?.paymentStatus) {
      query = query.eq('payment_status', filters.paymentStatus);
    }
    
    if (filters?.dateFrom) {
      query = query.gte('invoice_date', filters.dateFrom);
    }
    
    if (filters?.dateTo) {
      query = query.lte('invoice_date', filters.dateTo);
    }
    
    if (filters?.dueDateFrom) {
      query = query.gte('due_date', filters.dueDateFrom);
    }
    
    if (filters?.dueDateTo) {
      query = query.lte('due_date', filters.dueDateTo);
    }

    const { data, error } = await query;

    if (error) throw error;

    const invoices: AgencyVendorInvoice[] = ((data || []) as any[]).map((row) => 
      transformVendorInvoiceRow(row as AgencyVendorInvoiceRow)
    );

    return { success: true, data: invoices };
  } catch (error) {
    console.error('Error fetching vendor invoices:', error);
    return { success: false, error: 'Failed to fetch vendor invoices' };
  }
}

/**
 * Get vendor invoices associated with a specific booking.
 * This finds invoices that have costs linked to the given booking.
 * 
 * @param bookingId - The booking ID
 * @returns Array of vendor invoices for the booking
 */
export async function getVendorInvoicesByBooking(
  bookingId: string
): Promise<ActionResult<AgencyVendorInvoice[]>> {
  try {
    const supabase = await createClient();
    
    // First, get all cost IDs for this booking
    const { data: costs, error: costsError } = await supabase
      .from('shipment_costs')
      .select('id')
      .eq('booking_id', bookingId);

    if (costsError) throw costsError;

    if (!costs || costs.length === 0) {
      return { success: true, data: [] };
    }

    const costIds = costs.map(c => c.id);

    // Get all vendor invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from('agency_vendor_invoices')
      .select('*')
      .order('invoice_date', { ascending: false });

    if (invoicesError) throw invoicesError;

    // Filter invoices that have any of the booking's cost IDs
    const filteredInvoices = ((invoices || []) as any[]).filter((invoice) => {
      const invoiceCostIds = invoice.cost_ids || [];
      return invoiceCostIds.some((costId: string) => costIds.includes(costId));
    });

    const result: AgencyVendorInvoice[] = filteredInvoices.map((row) => 
      transformVendorInvoiceRow(row as AgencyVendorInvoiceRow)
    );

    return { success: true, data: result };
  } catch (error) {
    console.error('Error fetching vendor invoices by booking:', error);
    return { success: false, error: 'Failed to fetch vendor invoices for booking' };
  }
}

/**
 * Get a single vendor invoice by ID.
 * 
 * @param id - The vendor invoice ID
 * @returns The vendor invoice or null if not found
 */
export async function getVendorInvoiceById(
  id: string
): Promise<ActionResult<AgencyVendorInvoice>> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('agency_vendor_invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Vendor invoice not found' };
      }
      throw error;
    }

    if (!data) {
      return { success: false, error: 'Vendor invoice not found' };
    }

    return { success: true, data: transformVendorInvoiceRow(data as AgencyVendorInvoiceRow) };
  } catch (error) {
    console.error('Error fetching vendor invoice:', error);
    return { success: false, error: 'Failed to fetch vendor invoice' };
  }
}


/**
 * Create a new vendor invoice.
 * 
 * @param formData - The vendor invoice form data
 * @returns The created vendor invoice
 */
export async function createVendorInvoice(
  formData: VendorInvoiceFormData
): Promise<ActionResult<AgencyVendorInvoice>> {
  try {
    // Validate form data
    const validation = validateVendorInvoiceData(formData);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.map(e => e.message).join(', '),
      };
    }

    const supabase = await createClient();

    // Check for duplicate invoice number for the same vendor
    const { data: existing } = await supabase
      .from('agency_vendor_invoices')
      .select('id')
      .eq('vendor_id', formData.vendorId)
      .eq('invoice_number', formData.invoiceNumber)
      .limit(1);

    if (existing && existing.length > 0) {
      return {
        success: false,
        error: 'This invoice number already exists for this vendor',
      };
    }

    // Prepare data for insertion
    const dbData: Record<string, unknown> = {
      invoice_number: formData.invoiceNumber,
      vendor_id: formData.vendorId,
      vendor_name: formData.vendorName || null,
      invoice_date: formData.invoiceDate,
      due_date: formData.dueDate || null,
      currency: formData.currency || 'IDR',
      subtotal: formData.subtotal || 0,
      tax_amount: formData.taxAmount || 0,
      total_amount: formData.totalAmount || 0,
      payment_status: 'unpaid',
      paid_amount: 0,
      cost_ids: formData.costIds || [],
      document_url: formData.documentUrl || null,
      notes: formData.notes || null,
    };

    const { data, error } = await supabase
      .from('agency_vendor_invoices')
      .insert(dbData as any)
      .select()
      .single();

    if (error) throw error;

    // Revalidate relevant paths
    revalidatePath('/agency/reports/payables');
    
    return { success: true, data: transformVendorInvoiceRow(data as AgencyVendorInvoiceRow) };
  } catch (error) {
    console.error('Error creating vendor invoice:', error);
    return { success: false, error: 'Failed to create vendor invoice' };
  }
}

/**
 * Update an existing vendor invoice.
 * 
 * @param id - The vendor invoice ID
 * @param formData - The updated vendor invoice form data
 * @returns The updated vendor invoice
 */
export async function updateVendorInvoice(
  id: string,
  formData: Partial<VendorInvoiceFormData>
): Promise<ActionResult<AgencyVendorInvoice>> {
  try {
    const supabase = await createClient();

    // Get existing invoice
    const { data: existing } = await supabase
      .from('agency_vendor_invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Vendor invoice not found' };
    }

    const existingRow = existing as AgencyVendorInvoiceRow;

    // Merge with existing data for validation
    const mergedData: VendorInvoiceFormData = {
      invoiceNumber: formData.invoiceNumber ?? existingRow.invoice_number,
      vendorId: formData.vendorId ?? existingRow.vendor_id,
      vendorName: formData.vendorName ?? existingRow.vendor_name,
      invoiceDate: formData.invoiceDate ?? existingRow.invoice_date,
      dueDate: formData.dueDate ?? existingRow.due_date,
      currency: formData.currency ?? existingRow.currency,
      subtotal: formData.subtotal ?? existingRow.subtotal,
      taxAmount: formData.taxAmount ?? existingRow.tax_amount,
      totalAmount: formData.totalAmount ?? existingRow.total_amount,
      costIds: formData.costIds ?? existingRow.cost_ids,
      documentUrl: formData.documentUrl ?? existingRow.document_url,
      notes: formData.notes ?? existingRow.notes,
    };

    // Validate merged data
    const validation = validateVendorInvoiceData(mergedData);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.map(e => e.message).join(', '),
      };
    }

    // Check for duplicate invoice number if it changed
    if (formData.invoiceNumber && formData.invoiceNumber !== existingRow.invoice_number) {
      const { data: duplicate } = await supabase
        .from('agency_vendor_invoices')
        .select('id')
        .eq('vendor_id', mergedData.vendorId)
        .eq('invoice_number', formData.invoiceNumber)
        .neq('id', id)
        .limit(1);

      if (duplicate && duplicate.length > 0) {
        return {
          success: false,
          error: 'This invoice number already exists for this vendor',
        };
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      invoice_number: mergedData.invoiceNumber,
      vendor_id: mergedData.vendorId,
      vendor_name: mergedData.vendorName || null,
      invoice_date: mergedData.invoiceDate,
      due_date: mergedData.dueDate || null,
      currency: mergedData.currency || 'IDR',
      subtotal: mergedData.subtotal || 0,
      tax_amount: mergedData.taxAmount || 0,
      total_amount: mergedData.totalAmount || 0,
      cost_ids: mergedData.costIds || [],
      document_url: mergedData.documentUrl || null,
      notes: mergedData.notes || null,
    };

    const { data, error } = await supabase
      .from('agency_vendor_invoices')
      .update(updateData as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Revalidate relevant paths
    revalidatePath('/agency/reports/payables');

    return { success: true, data: transformVendorInvoiceRow(data as AgencyVendorInvoiceRow) };
  } catch (error) {
    console.error('Error updating vendor invoice:', error);
    return { success: false, error: 'Failed to update vendor invoice' };
  }
}

/**
 * Delete a vendor invoice.
 * 
 * @param id - The vendor invoice ID
 * @returns Success status
 */
export async function deleteVendorInvoice(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // Get existing invoice to verify it exists
    const { data: existing } = await supabase
      .from('agency_vendor_invoices')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Vendor invoice not found' };
    }

    const { error } = await supabase
      .from('agency_vendor_invoices')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Revalidate relevant paths
    revalidatePath('/agency/reports/payables');

    return { success: true };
  } catch (error) {
    console.error('Error deleting vendor invoice:', error);
    return { success: false, error: 'Failed to delete vendor invoice' };
  }
}

/**
 * Update the payment status and paid amount of a vendor invoice.
 * 
 * @param id - The vendor invoice ID
 * @param paidAmount - The amount paid
 * @returns The updated vendor invoice
 */
export async function updateVendorInvoicePayment(
  id: string,
  paidAmount: number
): Promise<ActionResult<AgencyVendorInvoice>> {
  try {
    const supabase = await createClient();

    // Get existing invoice
    const { data: existing } = await supabase
      .from('agency_vendor_invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Vendor invoice not found' };
    }

    const existingRow = existing as AgencyVendorInvoiceRow;

    // Validate paid amount doesn't exceed total
    if (paidAmount > existingRow.total_amount) {
      return {
        success: false,
        error: 'Paid amount cannot exceed total amount',
      };
    }

    // Validate paid amount is non-negative
    if (paidAmount < 0) {
      return {
        success: false,
        error: 'Paid amount cannot be negative',
      };
    }

    // Determine payment status based on paid amount
    let paymentStatus: VendorInvoicePaymentStatus;
    if (paidAmount === 0) {
      paymentStatus = 'unpaid';
    } else if (paidAmount >= existingRow.total_amount) {
      paymentStatus = 'paid';
    } else {
      paymentStatus = 'partial';
    }

    const { data, error } = await supabase
      .from('agency_vendor_invoices')
      .update({
        paid_amount: paidAmount,
        payment_status: paymentStatus,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Revalidate relevant paths
    revalidatePath('/agency/reports/payables');

    return { success: true, data: transformVendorInvoiceRow(data as AgencyVendorInvoiceRow) };
  } catch (error) {
    console.error('Error updating vendor invoice payment:', error);
    return { success: false, error: 'Failed to update payment' };
  }
}

/**
 * Link cost items to a vendor invoice.
 * 
 * @param invoiceId - The vendor invoice ID
 * @param costIds - Array of cost IDs to link
 * @returns The updated vendor invoice
 */
export async function linkCostsToInvoice(
  invoiceId: string,
  costIds: string[]
): Promise<ActionResult<AgencyVendorInvoice>> {
  try {
    const supabase = await createClient();

    // Get existing invoice
    const { data: existing } = await supabase
      .from('agency_vendor_invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (!existing) {
      return { success: false, error: 'Vendor invoice not found' };
    }

    const existingRow = existing as AgencyVendorInvoiceRow;

    // Verify all cost IDs exist
    if (costIds.length > 0) {
      const { data: costs, error: costsError } = await supabase
        .from('shipment_costs')
        .select('id')
        .in('id', costIds);

      if (costsError) throw costsError;

      const foundIds = new Set((costs || []).map(c => c.id));
      const missingIds = costIds.filter(id => !foundIds.has(id));

      if (missingIds.length > 0) {
        return {
          success: false,
          error: `Some cost IDs were not found: ${missingIds.join(', ')}`,
        };
      }
    }

    // Merge existing cost_ids with new ones (avoid duplicates)
    const existingCostIds = existingRow.cost_ids || [];
    const mergedCostIds = [...new Set([...existingCostIds, ...costIds])];

    const { data, error } = await supabase
      .from('agency_vendor_invoices')
      .update({ cost_ids: mergedCostIds })
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) throw error;

    // Revalidate relevant paths
    revalidatePath('/agency/reports/payables');

    return { success: true, data: transformVendorInvoiceRow(data as AgencyVendorInvoiceRow) };
  } catch (error) {
    console.error('Error linking costs to invoice:', error);
    return { success: false, error: 'Failed to link costs to invoice' };
  }
}

/**
 * Unlink cost items from a vendor invoice.
 * 
 * @param invoiceId - The vendor invoice ID
 * @param costIds - Array of cost IDs to unlink
 * @returns The updated vendor invoice
 */
export async function unlinkCostsFromInvoice(
  invoiceId: string,
  costIds: string[]
): Promise<ActionResult<AgencyVendorInvoice>> {
  try {
    const supabase = await createClient();

    // Get existing invoice
    const { data: existing } = await supabase
      .from('agency_vendor_invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (!existing) {
      return { success: false, error: 'Vendor invoice not found' };
    }

    const existingRow = existing as AgencyVendorInvoiceRow;

    // Remove specified cost IDs
    const existingCostIds = existingRow.cost_ids || [];
    const costIdsToRemove = new Set(costIds);
    const updatedCostIds = existingCostIds.filter(id => !costIdsToRemove.has(id));

    const { data, error } = await supabase
      .from('agency_vendor_invoices')
      .update({ cost_ids: updatedCostIds })
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) throw error;

    // Revalidate relevant paths
    revalidatePath('/agency/reports/payables');

    return { success: true, data: transformVendorInvoiceRow(data as AgencyVendorInvoiceRow) };
  } catch (error) {
    console.error('Error unlinking costs from invoice:', error);
    return { success: false, error: 'Failed to unlink costs from invoice' };
  }
}

/**
 * Get vendor invoices by vendor ID.
 * 
 * @param vendorId - The vendor ID
 * @returns Array of vendor invoices for the vendor
 */
export async function getVendorInvoicesByVendor(
  vendorId: string
): Promise<ActionResult<AgencyVendorInvoice[]>> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('agency_vendor_invoices')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('invoice_date', { ascending: false });

    if (error) throw error;

    const invoices: AgencyVendorInvoice[] = ((data || []) as any[]).map((row) => 
      transformVendorInvoiceRow(row as AgencyVendorInvoiceRow)
    );

    return { success: true, data: invoices };
  } catch (error) {
    console.error('Error fetching vendor invoices by vendor:', error);
    return { success: false, error: 'Failed to fetch vendor invoices' };
  }
}

/**
 * Get overdue vendor invoices.
 * 
 * @returns Array of overdue vendor invoices
 */
export async function getOverdueVendorInvoices(): Promise<ActionResult<AgencyVendorInvoice[]>> {
  try {
    const supabase = await createClient();
    
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('agency_vendor_invoices')
      .select('*')
      .lt('due_date', today)
      .neq('payment_status', 'paid')
      .order('due_date', { ascending: true });

    if (error) throw error;

    const invoices: AgencyVendorInvoice[] = ((data || []) as any[]).map((row) => 
      transformVendorInvoiceRow(row as AgencyVendorInvoiceRow)
    );

    return { success: true, data: invoices };
  } catch (error) {
    console.error('Error fetching overdue vendor invoices:', error);
    return { success: false, error: 'Failed to fetch overdue invoices' };
  }
}
