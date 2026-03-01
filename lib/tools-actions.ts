'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================================
// TYPES
// ============================================================

export interface EquipmentTool {
  id: string
  name: string
  category: string | null
  description: string | null
  quantity: number
  minimum_stock: number
  unit: string | null
  location: string | null
  condition: string | null
  last_checked_at: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ToolFormData {
  name: string
  category?: string
  description?: string
  quantity: number
  minimum_stock: number
  unit?: string
  location?: string
  condition?: string
  notes?: string
}

export interface ToolFilters {
  search?: string
  category?: string
}

// ============================================================
// GET TOOLS
// ============================================================

export async function getTools(filters?: ToolFilters): Promise<{ data: EquipmentTool[]; error?: string }> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = supabase.from('equipment_tools' as any)
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }

  if (filters?.category && filters.category !== 'all') {
    query = query.eq('category', filters.category)
  }

  const { data, error } = await query

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: (data || []) as unknown as EquipmentTool[] }
}

// ============================================================
// GET TOOL BY ID
// ============================================================

export async function getToolById(id: string): Promise<{ data: EquipmentTool | null; error?: string }> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.from('equipment_tools' as any)
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: data as unknown as EquipmentTool }
}

// ============================================================
// CREATE TOOL
// ============================================================

export async function createTool(formData: ToolFormData): Promise<{ error?: string; id?: string }> {
  if (!formData.name?.trim()) {
    return { error: 'Nama alat wajib diisi' }
  }
  if (formData.quantity < 0) {
    return { error: 'Jumlah tidak boleh negatif' }
  }
  if (formData.minimum_stock < 0) {
    return { error: 'Stok minimum tidak boleh negatif' }
  }

  const supabase = await createClient()

  const insertData = {
    name: formData.name.trim(),
    category: formData.category || null,
    description: formData.description || null,
    quantity: formData.quantity,
    minimum_stock: formData.minimum_stock,
    unit: formData.unit || null,
    location: formData.location || null,
    condition: formData.condition || null,
    notes: formData.notes || null,
    is_active: true,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.from('equipment_tools' as any)
    .insert(insertData)
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/equipment/tools')
  return { id: (data as unknown as { id: string })?.id }
}

// ============================================================
// UPDATE TOOL
// ============================================================

export async function updateTool(id: string, formData: ToolFormData): Promise<{ error?: string }> {
  if (!formData.name?.trim()) {
    return { error: 'Nama alat wajib diisi' }
  }
  if (formData.quantity < 0) {
    return { error: 'Jumlah tidak boleh negatif' }
  }
  if (formData.minimum_stock < 0) {
    return { error: 'Stok minimum tidak boleh negatif' }
  }

  const supabase = await createClient()

  const updateData = {
    name: formData.name.trim(),
    category: formData.category || null,
    description: formData.description || null,
    quantity: formData.quantity,
    minimum_stock: formData.minimum_stock,
    unit: formData.unit || null,
    location: formData.location || null,
    condition: formData.condition || null,
    notes: formData.notes || null,
    updated_at: new Date().toISOString(),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from('equipment_tools' as any)
    .update(updateData)
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/equipment/tools')
  return {}
}

// ============================================================
// DEACTIVATE TOOL (soft delete)
// ============================================================

export async function deactivateTool(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from('equipment_tools' as any)
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/equipment/tools')
  return {}
}
