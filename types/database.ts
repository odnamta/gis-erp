export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action_type: string
          created_at: string | null
          details: Json | null
          document_id: string
          document_number: string
          document_type: string
          id: string
          user_id: string | null
          user_name: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          details?: Json | null
          document_id: string
          document_number: string
          document_type: string
          id?: string
          user_id?: string | null
          user_name: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          details?: Json | null
          document_id?: string
          document_number?: string
          document_type?: string
          id?: string
          user_id?: string | null
          user_name?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
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
      document_attachments: {
        Row: {
          created_at: string | null
          description: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          invoice_id: string
          line_number: number
          quantity: number
          subtotal: number | null
          unit: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          invoice_id: string
          line_number: number
          quantity?: number
          subtotal?: number | null
          unit?: string | null
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          line_number?: number
          quantity?: number
          subtotal?: number | null
          unit?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          cancelled_at: string | null
          created_at: string | null
          customer_id: string
          due_date: string
          id: string
          invoice_date: string | null
          invoice_number: string
          jo_id: string
          notes: string | null
          paid_at: string | null
          sent_at: string | null
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string | null
          customer_id: string
          due_date: string
          id?: string
          invoice_date?: string | null
          invoice_number: string
          jo_id: string
          notes?: string | null
          paid_at?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string | null
          customer_id?: string
          due_date?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string
          jo_id?: string
          notes?: string | null
          paid_at?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
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
          completed_at: string | null
          converted_from_pjo_at: string | null
          created_at: string | null
          customer_id: string
          description: string
          final_cost: number | null
          final_revenue: number | null
          id: string
          jo_number: string
          pjo_id: string | null
          project_id: string | null
          status: string
          submitted_by: string | null
          submitted_to_finance_at: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          completed_at?: string | null
          converted_from_pjo_at?: string | null
          created_at?: string | null
          customer_id: string
          description: string
          final_cost?: number | null
          final_revenue?: number | null
          id?: string
          jo_number: string
          pjo_id?: string | null
          project_id?: string | null
          status?: string
          submitted_by?: string | null
          submitted_to_finance_at?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          converted_from_pjo_at?: string | null
          created_at?: string | null
          customer_id?: string
          description?: string
          final_cost?: number | null
          final_revenue?: number | null
          id?: string
          jo_number?: string
          pjo_id?: string | null
          project_id?: string | null
          status?: string
          submitted_by?: string | null
          submitted_to_finance_at?: string | null
          updated_at?: string | null
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
      notification_preferences: {
        Row: {
          approval_enabled: boolean | null
          budget_alert_enabled: boolean | null
          created_at: string | null
          id: string
          overdue_enabled: boolean | null
          status_change_enabled: boolean | null
          system_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approval_enabled?: boolean | null
          budget_alert_enabled?: boolean | null
          created_at?: string | null
          id?: string
          overdue_enabled?: boolean | null
          status_change_enabled?: boolean | null
          system_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approval_enabled?: boolean | null
          budget_alert_enabled?: boolean | null
          created_at?: string | null
          id?: string
          overdue_enabled?: boolean | null
          status_change_enabled?: boolean | null
          system_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          deleted_at: string | null
          entity_id: string | null
          entity_type: string | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          priority: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          priority?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          priority?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pjo_cost_items: {
        Row: {
          actual_amount: number | null
          category: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          description: string
          estimated_amount: number
          estimated_by: string | null
          id: string
          justification: string | null
          notes: string | null
          pjo_id: string
          status: string
          updated_at: string | null
          variance: number | null
          variance_pct: number | null
        }
        Insert: {
          actual_amount?: number | null
          category: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          description: string
          estimated_amount: number
          estimated_by?: string | null
          id?: string
          justification?: string | null
          notes?: string | null
          pjo_id: string
          status?: string
          updated_at?: string | null
          variance?: number | null
          variance_pct?: number | null
        }
        Update: {
          actual_amount?: number | null
          category?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          description?: string
          estimated_amount?: number
          estimated_by?: string | null
          id?: string
          justification?: string | null
          notes?: string | null
          pjo_id?: string
          status?: string
          updated_at?: string | null
          variance?: number | null
          variance_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pjo_cost_items_pjo_id_fkey"
            columns: ["pjo_id"]
            isOneToOne: false
            referencedRelation: "proforma_job_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pjo_revenue_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          notes: string | null
          pjo_id: string
          quantity: number
          source_id: string | null
          source_type: string | null
          subtotal: number | null
          unit: string
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          notes?: string | null
          pjo_id: string
          quantity?: number
          source_id?: string | null
          source_type?: string | null
          subtotal?: number | null
          unit: string
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          notes?: string | null
          pjo_id?: string
          quantity?: number
          source_id?: string | null
          source_type?: string | null
          subtotal?: number | null
          unit?: string
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjo_revenue_items_pjo_id_fkey"
            columns: ["pjo_id"]
            isOneToOne: false
            referencedRelation: "proforma_job_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      proforma_job_orders: {
        Row: {
          all_costs_confirmed: boolean | null
          approved_at: string | null
          approved_by: string | null
          carrier_type: string | null
          commodity: string | null
          converted_to_jo: boolean | null
          converted_to_jo_at: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string
          description: string
          estimated_amount: number
          eta: string | null
          etd: string | null
          has_cost_overruns: boolean | null
          id: string
          is_active: boolean | null
          jo_date: string | null
          job_order_id: string | null
          notes: string | null
          pjo_number: string
          pod: string | null
          pod_lat: number | null
          pod_lng: number | null
          pod_place_id: string | null
          pol: string | null
          pol_lat: number | null
          pol_lng: number | null
          pol_place_id: string | null
          profit: number | null
          project_id: string | null
          quantity: number | null
          quantity_unit: string | null
          rejection_reason: string | null
          status: string
          total_cost_actual: number | null
          total_cost_estimated: number | null
          total_expenses: number | null
          total_revenue: number | null
          total_revenue_calculated: number | null
          updated_at: string | null
        }
        Insert: {
          all_costs_confirmed?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          carrier_type?: string | null
          commodity?: string | null
          converted_to_jo?: boolean | null
          converted_to_jo_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          description: string
          estimated_amount?: number
          eta?: string | null
          etd?: string | null
          has_cost_overruns?: boolean | null
          id?: string
          is_active?: boolean | null
          jo_date?: string | null
          job_order_id?: string | null
          notes?: string | null
          pjo_number: string
          pod?: string | null
          pod_lat?: number | null
          pod_lng?: number | null
          pod_place_id?: string | null
          pol?: string | null
          pol_lat?: number | null
          pol_lng?: number | null
          pol_place_id?: string | null
          profit?: number | null
          project_id?: string | null
          quantity?: number | null
          quantity_unit?: string | null
          rejection_reason?: string | null
          status?: string
          total_cost_actual?: number | null
          total_cost_estimated?: number | null
          total_expenses?: number | null
          total_revenue?: number | null
          total_revenue_calculated?: number | null
          updated_at?: string | null
        }
        Update: {
          all_costs_confirmed?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          carrier_type?: string | null
          commodity?: string | null
          converted_to_jo?: boolean | null
          converted_to_jo_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          description?: string
          estimated_amount?: number
          eta?: string | null
          etd?: string | null
          has_cost_overruns?: boolean | null
          id?: string
          is_active?: boolean | null
          jo_date?: string | null
          job_order_id?: string | null
          notes?: string | null
          pjo_number?: string
          pod?: string | null
          pod_lat?: number | null
          pod_lng?: number | null
          pod_place_id?: string | null
          pol?: string | null
          pol_lat?: number | null
          pol_lng?: number | null
          pol_place_id?: string | null
          profit?: number | null
          project_id?: string | null
          quantity?: number | null
          quantity_unit?: string | null
          rejection_reason?: string | null
          status?: string
          total_cost_actual?: number | null
          total_cost_estimated?: number | null
          total_expenses?: number | null
          total_revenue?: number | null
          total_revenue_calculated?: number | null
          updated_at?: string | null
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
            foreignKeyName: "proforma_job_orders_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
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
      user_profiles: {
        Row: {
          avatar_url: string | null
          can_approve_pjo: boolean
          can_create_pjo: boolean
          can_fill_costs: boolean
          can_manage_invoices: boolean
          can_manage_users: boolean
          can_see_profit: boolean
          can_see_revenue: boolean
          created_at: string | null
          custom_dashboard: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          role: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          can_approve_pjo?: boolean
          can_create_pjo?: boolean
          can_fill_costs?: boolean
          can_manage_invoices?: boolean
          can_manage_users?: boolean
          can_see_profit?: boolean
          can_see_revenue?: boolean
          created_at?: string | null
          custom_dashboard?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          can_approve_pjo?: boolean
          can_create_pjo?: boolean
          can_fill_costs?: boolean
          can_manage_invoices?: boolean
          can_manage_users?: boolean
          can_see_profit?: boolean
          can_see_revenue?: boolean
          created_at?: string | null
          custom_dashboard?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
