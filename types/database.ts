export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      customers: {
        Row: {
          address: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pjo_revenue_items: {
        Row: {
          id: string
          pjo_id: string
          description: string
          quantity: number
          unit: string
          unit_price: number
          subtotal: number
          source_type: string | null
          source_id: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          pjo_id: string
          description: string
          quantity?: number
          unit: string
          unit_price: number
          source_type?: string | null
          source_id?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          pjo_id?: string
          description?: string
          quantity?: number
          unit?: string
          unit_price?: number
          source_type?: string | null
          source_id?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjo_revenue_items_pjo_id_fkey"
            columns: ["pjo_id"]
            isOneToOne: false
            referencedRelation: "proforma_job_orders"
            referencedColumns: ["id"]
          }
        ]
      }
      pjo_cost_items: {
        Row: {
          id: string
          pjo_id: string
          category: string
          description: string
          estimated_amount: number
          actual_amount: number | null
          variance: number | null
          variance_pct: number | null
          status: string
          estimated_by: string | null
          confirmed_by: string | null
          confirmed_at: string | null
          justification: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          pjo_id: string
          category: string
          description: string
          estimated_amount: number
          actual_amount?: number | null
          status?: string
          estimated_by?: string | null
          confirmed_by?: string | null
          confirmed_at?: string | null
          justification?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          pjo_id?: string
          category?: string
          description?: string
          estimated_amount?: number
          actual_amount?: number | null
          status?: string
          estimated_by?: string | null
          confirmed_by?: string | null
          confirmed_at?: string | null
          justification?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjo_cost_items_pjo_id_fkey"
            columns: ["pjo_id"]
            isOneToOne: false
            referencedRelation: "proforma_job_orders"
            referencedColumns: ["id"]
          }
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: string
          due_date: string
          id: string
          invoice_number: string
          jo_id: string
          status: string
          tax_amount: number
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          customer_id: string
          due_date: string
          id?: string
          invoice_number: string
          jo_id: string
          status?: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: string
          due_date?: string
          id?: string
          invoice_number?: string
          jo_id?: string
          status?: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      job_orders: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: string
          description: string
          id: string
          jo_number: string
          pjo_id: string | null
          project_id: string | null
          status: string
          updated_at: string | null
          final_revenue: number | null
          final_cost: number | null
          converted_from_pjo_at: string | null
          completed_at: string | null
          submitted_to_finance_at: string | null
          submitted_by: string | null
          notes: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          customer_id: string
          description: string
          id?: string
          jo_number: string
          pjo_id?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string | null
          final_revenue?: number | null
          final_cost?: number | null
          converted_from_pjo_at?: string | null
          completed_at?: string | null
          submitted_to_finance_at?: string | null
          submitted_by?: string | null
          notes?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: string
          description?: string
          id?: string
          jo_number?: string
          pjo_id?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string | null
          final_revenue?: number | null
          final_cost?: number | null
          converted_from_pjo_at?: string | null
          completed_at?: string | null
          submitted_to_finance_at?: string | null
          submitted_by?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_orders_pjo_id_fkey"
            columns: ["pjo_id"]
            isOneToOne: false
            referencedRelation: "proforma_job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      proforma_job_orders: {
        Row: {
          id: string
          pjo_number: string
          customer_id: string
          project_id: string | null
          description: string
          estimated_amount: number
          status: string
          jo_date: string | null
          commodity: string | null
          quantity: number | null
          quantity_unit: string | null
          pol: string | null
          pod: string | null
          pol_place_id: string | null
          pol_lat: number | null
          pol_lng: number | null
          pod_place_id: string | null
          pod_lat: number | null
          pod_lng: number | null
          etd: string | null
          eta: string | null
          carrier_type: string | null
          total_revenue: number
          total_expenses: number
          profit: number
          notes: string | null
          created_by: string | null
          approved_by: string | null
          approved_at: string | null
          rejection_reason: string | null
          is_active: boolean
          created_at: string | null
          updated_at: string | null
          total_revenue_calculated: number | null
          total_cost_estimated: number | null
          total_cost_actual: number | null
          all_costs_confirmed: boolean | null
          converted_to_jo: boolean | null
          converted_to_jo_at: string | null
          job_order_id: string | null
          has_cost_overruns: boolean | null
        }
        Insert: {
          id?: string
          pjo_number: string
          customer_id: string
          project_id?: string | null
          description?: string
          estimated_amount?: number
          status?: string
          jo_date?: string | null
          commodity?: string | null
          quantity?: number | null
          quantity_unit?: string | null
          pol?: string | null
          pod?: string | null
          etd?: string | null
          eta?: string | null
          carrier_type?: string | null
          total_revenue?: number
          total_expenses?: number
          profit?: number
          notes?: string | null
          created_by?: string | null
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
          total_revenue_calculated?: number | null
          total_cost_estimated?: number | null
          total_cost_actual?: number | null
          all_costs_confirmed?: boolean | null
          converted_to_jo?: boolean | null
          converted_to_jo_at?: string | null
          job_order_id?: string | null
        }
        Update: {
          id?: string
          pjo_number?: string
          customer_id?: string
          project_id?: string | null
          description?: string
          estimated_amount?: number
          status?: string
          jo_date?: string | null
          commodity?: string | null
          quantity?: number | null
          quantity_unit?: string | null
          pol?: string | null
          pod?: string | null
          etd?: string | null
          eta?: string | null
          carrier_type?: string | null
          total_revenue?: number
          total_expenses?: number
          profit?: number
          notes?: string | null
          created_by?: string | null
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
          total_revenue_calculated?: number | null
          total_cost_estimated?: number | null
          total_cost_actual?: number | null
          all_costs_confirmed?: boolean | null
          converted_to_jo?: boolean | null
          converted_to_jo_at?: string | null
          job_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proforma_job_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proforma_job_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          customer_id: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Convenience type aliases
export type Customer = Tables<'customers'>
export type Project = Tables<'projects'>
export type ProformaJobOrder = Tables<'proforma_job_orders'>
export type JobOrder = Tables<'job_orders'>
export type Invoice = Tables<'invoices'>

// PJO specific types
export type PJOStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected'
export type QuantityUnit = 'TRIP' | 'TRIPS' | 'LOT' | 'CASE'
export type CarrierType = 'FUSO' | 'TRAILER 20FT' | 'TRAILER 40FT'

// Itemized financials types
export type CostCategory = 
  | 'trucking' | 'port_charges' | 'documentation' | 'handling'
  | 'customs' | 'insurance' | 'storage' | 'labor' | 'fuel' | 'tolls' | 'other'

export type CostItemStatus = 'estimated' | 'confirmed' | 'at_risk' | 'exceeded' | 'under_budget'

export type RevenueSourceType = 'quotation' | 'contract' | 'manual'

export type JOStatusNew = 'active' | 'completed' | 'submitted_to_finance' | 'invoiced' | 'closed'

export interface PJORevenueItem {
  id: string
  pjo_id: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  subtotal: number
  source_type?: RevenueSourceType
  source_id?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface PJOCostItem {
  id: string
  pjo_id: string
  category: CostCategory
  description: string
  estimated_amount: number
  actual_amount?: number
  variance?: number
  variance_pct?: number
  status: CostItemStatus
  estimated_by?: string
  confirmed_by?: string
  confirmed_at?: string
  justification?: string
  notes?: string
  created_at: string
  updated_at: string
}

// JobOrder already has these fields from the database type, so we just alias it
export type JobOrderExtended = JobOrder

export interface JobOrderWithRelations extends JobOrderExtended {
  proforma_job_orders?: ProformaJobOrder
  projects?: Project
  customers?: Customer
}

export interface BudgetAnalysis {
  total_estimated: number
  total_actual: number
  total_variance: number
  variance_pct: number
  items_confirmed: number
  items_pending: number
  items_over_budget: number
  items_under_budget: number
  all_confirmed: boolean
  has_overruns: boolean
}

export interface ConversionReadiness {
  ready: boolean
  blockers: string[]
  summary: {
    total_revenue: number
    total_cost: number
    profit: number
    margin: number
    cost_items_confirmed: number
    cost_items_total: number
    has_overruns: boolean
  }
}

// PJO with related data for display
export interface PJOWithRelations extends ProformaJobOrder {
  projects: {
    id: string
    name: string
    customers: {
      id: string
      name: string
    }
  } | null
}

// Project with customer for dropdowns
export interface ProjectWithCustomer extends Project {
  customers: {
    id: string
    name: string
  } | null
}
