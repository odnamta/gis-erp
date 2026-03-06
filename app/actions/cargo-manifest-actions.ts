'use server';

// =====================================================
// CARGO MANIFEST SERVER ACTIONS
// Split from bl-documentation-actions.ts
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sanitizeSearchInput } from '@/lib/utils/sanitize';
import {
  BillOfLading,
  BillOfLadingRow,
  CargoManifest,
  CargoManifestRow,
  ManifestFormData,
  ManifestStatus,
  ManifestFilters,
} from '@/types/agency';
import {
  mapBLRowToModel,
  mapManifestRowToModel,
  calculateManifestTotals,
} from '@/lib/bl-documentation-utils';

// =====================================================
// ACTION RESULT TYPE
// =====================================================

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Type assertion helper for Supabase client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

// =====================================================
// CARGO MANIFEST CRUD OPERATIONS
// =====================================================

/**
 * Create a new Cargo Manifest
 * Sets initial status to 'draft' per Requirement 7.7
 * @param data - Manifest form data
 * @returns ActionResult with created Manifest or error
 */
export async function createCargoManifest(data: ManifestFormData): Promise<ActionResult<CargoManifest>> {
  try {
    // Validate required fields
    if (!data.manifestType) {
      return { success: false, error: 'Manifest type is required' };
    }

    if (!data.vesselName?.trim()) {
      return { success: false, error: 'Vessel name is required' };
    }

    const supabase = await createClient();

    // If B/L IDs are provided, fetch them to calculate totals
    let totals = {
      totalBls: 0,
      totalContainers: 0,
      totalPackages: 0,
      totalWeightKg: 0,
      totalCbm: 0,
    };

    if (data.blIds && data.blIds.length > 0) {
      const { data: bls } = await (supabase as SupabaseAny)
        .from('bills_of_lading')
        .select('*')
        .in('id', data.blIds);

      if (bls && bls.length > 0) {
        const mappedBls = bls.map((row: BillOfLadingRow) => mapBLRowToModel(row));
        totals = calculateManifestTotals(mappedBls);
      }
    }

    const insertData = {
      manifest_type: data.manifestType,
      vessel_name: data.vesselName,
      voyage_number: data.voyageNumber || null,
      port_of_loading: data.portOfLoading || null,
      port_of_discharge: data.portOfDischarge || null,
      departure_date: data.departureDate || null,
      arrival_date: data.arrivalDate || null,
      bl_ids: data.blIds || [],
      total_bls: totals.totalBls,
      total_containers: totals.totalContainers,
      total_packages: totals.totalPackages,
      total_weight_kg: totals.totalWeightKg,
      total_cbm: totals.totalCbm,
      // Initial status is 'draft' per Requirement 7.7
      status: 'draft',
    };

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;

    revalidatePath('/agency/manifests');
    return { success: true, data: mapManifestRowToModel(result as CargoManifestRow) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create Cargo Manifest' };
  }
}

/**
 * Update an existing Cargo Manifest
 * @param id - Manifest ID
 * @param data - Partial Manifest form data to update
 * @returns ActionResult with updated Manifest or error
 */
export async function updateCargoManifest(id: string, data: Partial<ManifestFormData>): Promise<ActionResult<CargoManifest>> {
  try {
    const supabase = await createClient();

    // Check if Manifest exists
    const { data: existing } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .select('status')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Cargo Manifest not found' };
    }

    // Prevent modification of approved manifests
    if (existing.status === 'approved') {
      return { success: false, error: 'Cannot modify an approved Cargo Manifest' };
    }

    const updateData: Record<string, unknown> = {};

    // Only update fields that are provided
    if (data.manifestType !== undefined) updateData.manifest_type = data.manifestType;
    if (data.vesselName !== undefined) updateData.vessel_name = data.vesselName;
    if (data.voyageNumber !== undefined) updateData.voyage_number = data.voyageNumber || null;
    if (data.portOfLoading !== undefined) updateData.port_of_loading = data.portOfLoading || null;
    if (data.portOfDischarge !== undefined) updateData.port_of_discharge = data.portOfDischarge || null;
    if (data.departureDate !== undefined) updateData.departure_date = data.departureDate || null;
    if (data.arrivalDate !== undefined) updateData.arrival_date = data.arrivalDate || null;

    // If B/L IDs are updated, recalculate totals
    if (data.blIds !== undefined) {
      updateData.bl_ids = data.blIds || [];

      if (data.blIds && data.blIds.length > 0) {
        const { data: bls } = await (supabase as SupabaseAny)
          .from('bills_of_lading')
          .select('*')
          .in('id', data.blIds);

        if (bls && bls.length > 0) {
          const mappedBls = bls.map((row: BillOfLadingRow) => mapBLRowToModel(row));
          const totals = calculateManifestTotals(mappedBls);
          updateData.total_bls = totals.totalBls;
          updateData.total_containers = totals.totalContainers;
          updateData.total_packages = totals.totalPackages;
          updateData.total_weight_kg = totals.totalWeightKg;
          updateData.total_cbm = totals.totalCbm;
        }
      } else {
        // No B/Ls linked, reset totals
        updateData.total_bls = 0;
        updateData.total_containers = 0;
        updateData.total_packages = 0;
        updateData.total_weight_kg = 0;
        updateData.total_cbm = 0;
      }
    }

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    revalidatePath('/agency/manifests');
    revalidatePath(`/agency/manifests/${id}`);
    return { success: true, data: mapManifestRowToModel(result as CargoManifestRow) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update Cargo Manifest' };
  }
}

/**
 * Get a single Cargo Manifest by ID
 * @param id - Manifest ID
 * @returns CargoManifest or null
 */
export async function getCargoManifest(id: string): Promise<CargoManifest | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? mapManifestRowToModel(data as CargoManifestRow) : null;
  } catch {
    return null;
  }
}

/**
 * Get all Cargo Manifests with optional filters
 * @param filters - Optional filters for search, status, type, etc.
 * @returns Array of CargoManifest
 */
export async function getCargoManifests(filters?: ManifestFilters): Promise<CargoManifest[]> {
  try {
    const supabase = await createClient();

    let query = (supabase as SupabaseAny)
      .from('cargo_manifests')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.manifestType) {
      query = query.eq('manifest_type', filters.manifestType);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters?.search) {
      const search = sanitizeSearchInput(filters.search);
      query = query.or(`manifest_number.ilike.%${search}%,vessel_name.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map((row: CargoManifestRow) => mapManifestRowToModel(row));
  } catch {
    return [];
  }
}

/**
 * Delete a Cargo Manifest
 * Only allows deletion of draft manifests
 * @param id - Manifest ID
 * @returns ActionResult with success or error
 */
export async function deleteCargoManifest(id: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();

    // Check if Manifest exists and its status
    const { data: existing } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .select('status, manifest_number')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Cargo Manifest not found' };
    }

    // Prevent deletion of submitted/approved manifests
    const protectedStatuses: ManifestStatus[] = ['submitted', 'approved'];
    if (protectedStatuses.includes(existing.status as ManifestStatus)) {
      return {
        success: false,
        error: 'Cannot delete a submitted or approved Cargo Manifest'
      };
    }

    const { error } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/agency/manifests');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete Cargo Manifest' };
  }
}


// =====================================================
// CARGO MANIFEST B/L LINKING AND STATUS FUNCTIONS
// =====================================================

/**
 * Valid status transitions for Cargo Manifests
 */
const MANIFEST_STATUS_TRANSITIONS: Record<ManifestStatus, ManifestStatus[]> = {
  draft: ['submitted'],
  submitted: ['approved', 'draft'],
  approved: [], // Terminal state
};

/**
 * Check if a status transition is valid for Manifest
 * @param currentStatus - Current Manifest status
 * @param newStatus - Target status
 * @returns true if transition is valid
 */
function isValidManifestStatusTransition(currentStatus: ManifestStatus, newStatus: ManifestStatus): boolean {
  const allowedTransitions = MANIFEST_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions?.includes(newStatus) || false;
}

/**
 * Link Bills of Lading to a Cargo Manifest
 * Updates bl_ids and recalculates totals from linked B/Ls
 * Per Requirements 4.2, 4.3
 * @param manifestId - Manifest ID
 * @param blIds - Array of B/L IDs to link
 * @returns ActionResult with updated Manifest or error
 */
export async function linkBLsToManifest(manifestId: string, blIds: string[]): Promise<ActionResult<CargoManifest>> {
  try {
    const supabase = await createClient();

    // Check if Manifest exists
    const { data: existing } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .select('status')
      .eq('id', manifestId)
      .single();

    if (!existing) {
      return { success: false, error: 'Cargo Manifest not found' };
    }

    // Prevent modification of approved manifests
    if (existing.status === 'approved') {
      return { success: false, error: 'Cannot modify an approved Cargo Manifest' };
    }

    // Fetch B/Ls to calculate totals
    let totals = {
      totalBls: 0,
      totalContainers: 0,
      totalPackages: 0,
      totalWeightKg: 0,
      totalCbm: 0,
    };

    if (blIds && blIds.length > 0) {
      const { data: bls, error: blError } = await (supabase as SupabaseAny)
        .from('bills_of_lading')
        .select('*')
        .in('id', blIds);

      if (blError) throw blError;

      if (bls && bls.length > 0) {
        const mappedBls = bls.map((row: BillOfLadingRow) => mapBLRowToModel(row));
        totals = calculateManifestTotals(mappedBls);
      }
    }

    const updateData = {
      bl_ids: blIds || [],
      total_bls: totals.totalBls,
      total_containers: totals.totalContainers,
      total_packages: totals.totalPackages,
      total_weight_kg: totals.totalWeightKg,
      total_cbm: totals.totalCbm,
    };

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .update(updateData)
      .eq('id', manifestId)
      .select('*')
      .single();

    if (error) throw error;

    revalidatePath('/agency/manifests');
    revalidatePath(`/agency/manifests/${manifestId}`);
    return { success: true, data: mapManifestRowToModel(result as CargoManifestRow) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to link B/Ls to Manifest' };
  }
}

/**
 * Submit a Cargo Manifest
 * Sets status to 'submitted', records submitted_to and submitted_at
 * Per Requirements 4.4
 * @param id - Manifest ID
 * @param submittedTo - Authority/entity the manifest is submitted to
 * @returns ActionResult with updated Manifest or error
 */
export async function submitManifest(id: string, submittedTo: string): Promise<ActionResult<CargoManifest>> {
  try {
    if (!submittedTo?.trim()) {
      return { success: false, error: 'Submitted to (authority/entity) is required' };
    }

    const supabase = await createClient();

    // Get current Manifest
    const { data: existing } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .select('status, bl_ids')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Cargo Manifest not found' };
    }

    const currentStatus = existing.status as ManifestStatus;

    // Validate status transition
    if (!isValidManifestStatusTransition(currentStatus, 'submitted')) {
      return { success: false, error: `Cannot submit manifest from '${currentStatus}' status` };
    }

    // Optionally validate that manifest has at least one B/L linked
    if (!existing.bl_ids || existing.bl_ids.length === 0) {
      return { success: false, error: 'Cannot submit a manifest without linked Bills of Lading' };
    }

    const updateData = {
      status: 'submitted',
      submitted_to: submittedTo,
      submitted_at: new Date().toISOString(),
    };

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    revalidatePath('/agency/manifests');
    revalidatePath(`/agency/manifests/${id}`);
    return { success: true, data: mapManifestRowToModel(result as CargoManifestRow) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to submit Cargo Manifest' };
  }
}

/**
 * Approve a Cargo Manifest
 * Sets status to 'approved'
 * Per Requirements 4.5
 * @param id - Manifest ID
 * @param documentUrl - Optional URL to approved document
 * @returns ActionResult with updated Manifest or error
 */
export async function approveManifest(id: string, documentUrl?: string): Promise<ActionResult<CargoManifest>> {
  try {
    const supabase = await createClient();

    // Get current Manifest
    const { data: existing } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .select('status')
      .eq('id', id)
      .single();

    if (!existing) {
      return { success: false, error: 'Cargo Manifest not found' };
    }

    const currentStatus = existing.status as ManifestStatus;

    // Validate status transition
    if (!isValidManifestStatusTransition(currentStatus, 'approved')) {
      return { success: false, error: `Cannot approve manifest from '${currentStatus}' status` };
    }

    const updateData: Record<string, unknown> = {
      status: 'approved',
    };

    // Optionally attach document URL per Requirement 4.5
    if (documentUrl) {
      updateData.document_url = documentUrl;
    }

    const { data: result, error } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    revalidatePath('/agency/manifests');
    revalidatePath(`/agency/manifests/${id}`);
    return { success: true, data: mapManifestRowToModel(result as CargoManifestRow) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to approve Cargo Manifest' };
  }
}

/**
 * Update Manifest status with timestamp recording
 * Generic function for status transitions
 * @param id - Manifest ID
 * @param newStatus - Target status
 * @param submittedTo - Required when transitioning to 'submitted'
 * @param documentUrl - Optional when transitioning to 'approved'
 * @returns ActionResult with updated Manifest or error
 */
export async function updateManifestStatus(
  id: string,
  newStatus: ManifestStatus,
  submittedTo?: string,
  documentUrl?: string
): Promise<ActionResult<CargoManifest>> {
  // Route to specific functions based on status
  switch (newStatus) {
    case 'submitted':
      if (!submittedTo) {
        return { success: false, error: 'submittedTo is required when submitting manifest' };
      }
      return submitManifest(id, submittedTo);
    case 'approved':
      return approveManifest(id, documentUrl);
    default:
      return { success: false, error: `Invalid status transition to '${newStatus}'` };
  }
}

/**
 * Get Cargo Manifest with linked B/Ls populated
 * @param id - Manifest ID
 * @returns CargoManifest with bls array populated or null
 */
export async function getCargoManifestWithBLs(id: string): Promise<CargoManifest | null> {
  try {
    const supabase = await createClient();

    // Get manifest
    const { data: manifest, error: manifestError } = await (supabase as SupabaseAny)
      .from('cargo_manifests')
      .select('*')
      .eq('id', id)
      .single();

    if (manifestError) throw manifestError;
    if (!manifest) return null;

    const mappedManifest = mapManifestRowToModel(manifest as CargoManifestRow);

    // Fetch linked B/Ls if any
    if (mappedManifest.blIds && mappedManifest.blIds.length > 0) {
      const { data: bls, error: blsError } = await (supabase as SupabaseAny)
        .from('bills_of_lading')
        .select(`
          *,
          freight_bookings:booking_id(id, booking_number, vessel_name, voyage_number),
          shipping_lines:shipping_line_id(id, line_name, line_code)
        `)
        .in('id', mappedManifest.blIds);

      if (blsError) throw blsError;

      if (bls && bls.length > 0) {
        mappedManifest.bls = bls.map((row: BillOfLadingRow) => mapBLRowToModel(row));
      }
    }

    return mappedManifest;
  } catch {
    return null;
  }
}
