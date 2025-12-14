'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { JobOrderWithRelations } from '@/types'

export async function getJobOrders(): Promise<JobOrderWithRelations[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('job_orders')
    .select(`
      *,
      projects (
        id,
        name
      ),
      customers (
        id,
        name
      ),
      proforma_job_orders (
        id,
        pjo_number
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching job orders:', error)
    return []
  }

  return data as JobOrderWithRelations[]
}

export async function getJobOrder(id: string): Promise<JobOrderWithRelations | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('job_orders')
    .select(`
      *,
      projects (
        id,
        name
      ),
      customers (
        id,
        name
      ),
      proforma_job_orders (
        id,
        pjo_number,
        commodity,
        quantity,
        quantity_unit,
        pol,
        pod,
        etd,
        eta,
        carrier_type,
        notes
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching job order:', error)
    return null
  }

  return data as JobOrderWithRelations
}

export async function markCompleted(joId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: jo, error: fetchError } = await supabase
    .from('job_orders')
    .select('status')
    .eq('id', joId)
    .single()

  if (fetchError || !jo) {
    return { error: 'Job Order not found' }
  }

  if (jo.status !== 'active' && jo.status !== 'in_progress') {
    return { error: 'Only active or in-progress Job Orders can be marked as completed' }
  }

  const { error } = await supabase
    .from('job_orders')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', joId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/job-orders')
  revalidatePath(`/job-orders/${joId}`)
  return {}
}

export async function submitToFinance(joId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: jo, error: fetchError } = await supabase
    .from('job_orders')
    .select('status')
    .eq('id', joId)
    .single()

  if (fetchError || !jo) {
    return { error: 'Job Order not found' }
  }

  if (jo.status !== 'completed') {
    return { error: 'Only completed Job Orders can be submitted to finance' }
  }

  const { error } = await supabase
    .from('job_orders')
    .update({
      status: 'submitted_to_finance',
      submitted_to_finance_at: new Date().toISOString(),
      submitted_by: user?.id || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', joId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/job-orders')
  revalidatePath(`/job-orders/${joId}`)
  return {}
}

export async function getJORevenueItems(pjoId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pjo_revenue_items')
    .select('*')
    .eq('pjo_id', pjoId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching revenue items:', error)
    return []
  }

  return data
}

export async function getJOCostItems(pjoId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pjo_cost_items')
    .select('*')
    .eq('pjo_id', pjoId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching cost items:', error)
    return []
  }

  return data
}
