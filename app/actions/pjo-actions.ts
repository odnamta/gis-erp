'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserProfile, requireFeatureAccess } from '@/lib/permissions-server'
import { logCreate, logUpdate, logWorkflowTransition } from '@/lib/audit-log'
import { checkDocument, approveDocument, rejectDocument } from '@/lib/workflow-service'
import { revalidatePath } from 'next/cache'

export interface PJOFormData {
  quotation_id?: string
  project_id?: string
  customer_id: string
  pjo_number?: string
  commodity?: string
  pol?: string
  pod?: string
  description: string
  estimated_amount?: number
  notes?: string
}

/**
 * Generate PJO number: NNNN/CARGO/MM/YYYY
 */
async function generatePJONumber(): Promise<string> {
  const supabase = await createClient()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const monthRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][month - 1]
  
  // Get the latest PJO number for this month/year
  const { data } = await supabase
    .from('proforma_job_orders')
    .select('pjo_number')
    .like('pjo_number', `%/CARGO/${monthRoman}/${year}`)
    .order('pjo_number', { ascending: false })
    .limit(1)
  
  let sequence = 1
  if (data && data.length > 0) {
    const lastNumber = data[0].pjo_number
    const match = lastNumber.match(/^(\d+)\/CARGO\//)
    if (match) {
      sequence = parseInt(match[1]) + 1
    }
  }
  
  return `${sequence.toString().padStart(4, '0')}/CARGO/${monthRoman}/${year}`
}

/**
 * Create a new PJO
 */
export async function createPJO(formData: PJOFormData) {
  try {
    const supabase = await createClient()
    const userProfile = await getUserProfile()
    
    if (!userProfile) {
      return { success: false, error: 'User not authenticated' }
    }

    // Check permissions
    await requireFeatureAccess('pjo.create')
    
    // Generate PJO number if not provided
    const pjoNumber = formData.pjo_number || await generatePJONumber()
    
    const { data, error } = await supabase
      .from('proforma_job_orders')
      .insert({
        quotation_id: formData.quotation_id || null,
        project_id: formData.project_id || null,
        customer_id: formData.customer_id,
        pjo_number: pjoNumber,
        commodity: formData.commodity || null,
        pol: formData.pol || null,
        pod: formData.pod || null,
        description: formData.description,
        estimated_amount: formData.estimated_amount || 0,
        notes: formData.notes || null,
        status: 'draft',
        created_by: userProfile.id
      })
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Log the creation
    await logCreate(
      userProfile,
      'pjo',
      data.id,
      'PJO',
      data.pjo_number,
      data
    )
    
    revalidatePath('/pjo')
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Update PJO
 */
export async function updatePJO(id: string, formData: Partial<PJOFormData>) {
  try {
    const supabase = await createClient()
    const userProfile = await getUserProfile()
    
    if (!userProfile) {
      return { success: false, error: 'User not authenticated' }
    }

    // Check permissions
    await requireFeatureAccess('pjo.create')
    
    // Get current data for audit log
    const { data: currentData } = await supabase
      .from('proforma_job_orders')
      .select('*')
      .eq('id', id)
      .single()
    
    if (!currentData) {
      return { success: false, error: 'PJO not found' }
    }
    
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }
    
    // Only include defined fields from formData
    if (formData.quotation_id !== undefined) updateData.quotation_id = formData.quotation_id
    if (formData.project_id !== undefined) updateData.project_id = formData.project_id
    if (formData.customer_id !== undefined) updateData.customer_id = formData.customer_id
    if (formData.commodity !== undefined) updateData.commodity = formData.commodity
    if (formData.pol !== undefined) updateData.pol = formData.pol
    if (formData.pod !== undefined) updateData.pod = formData.pod
    if (formData.description !== undefined) updateData.description = formData.description
    if (formData.estimated_amount !== undefined) updateData.estimated_amount = formData.estimated_amount
    if (formData.notes !== undefined) updateData.notes = formData.notes
    
    const { data, error } = await supabase
      .from('proforma_job_orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Log the update
    await logUpdate(
      userProfile,
      'pjo',
      id,
      'PJO',
      data.pjo_number,
      currentData,
      data
    )
    
    revalidatePath('/pjo')
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Submit PJO for approval
 */
export async function submitPJOForApproval(id: string) {
  try {
    const supabase = await createClient()
    const userProfile = await getUserProfile()
    
    if (!userProfile) {
      return { success: false, error: 'User not authenticated' }
    }

    // Check permissions
    await requireFeatureAccess('pjo.create')
    
    // Get current PJO data
    const { data: currentPJO } = await supabase
      .from('proforma_job_orders')
      .select('*')
      .eq('id', id)
      .single()
    
    if (!currentPJO) {
      return { success: false, error: 'PJO not found' }
    }
    
    // Check if PJO can be submitted (must be in draft status)
    if (currentPJO.status !== 'draft') {
      return { success: false, error: 'PJO can only be submitted from draft status' }
    }
    
    const { data, error } = await supabase
      .from('proforma_job_orders')
      .update({
        status: 'pending_approval',
        submitted_at: new Date().toISOString(),
        submitted_by: userProfile.id
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    // Log workflow transition
    await logWorkflowTransition(
      userProfile,
      'pjo',
      id,
      'PJO',
      data.pjo_number,
      'submit',
      'draft',
      'pending_approval'
    )
    
    revalidatePath('/pjo')
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Approve PJO
 */
export async function approvePJO(id: string, notes?: string) {
  try {
    const supabase = await createClient()
    const userProfile = await getUserProfile()
    
    if (!userProfile) {
      return { success: false, error: 'User not authenticated' }
    }

    // Use workflow service to approve
    const result = await approveDocument('pjo', id, userProfile, notes)
    
    if (!result.success) {
      return result
    }
    
    revalidatePath('/pjo')
    return result
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Reject PJO
 */
export async function rejectPJO(id: string, reason: string) {
  try {
    const supabase = await createClient()
    const userProfile = await getUserProfile()
    
    if (!userProfile) {
      return { success: false, error: 'User not authenticated' }
    }

    // Use workflow service to reject
    const result = await rejectDocument('pjo', id, userProfile, reason)
    
    if (!result.success) {
      return result
    }
    
    revalidatePath('/pjo')
    return result
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
  