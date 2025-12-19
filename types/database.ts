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
      berita_acara: {
        Row: {
          ba_number: string
          cargo_condition: string | null
          client_representative: string | null
          client_signature_url: string | null
          company_representative: string | null
          company_signature_url: string | null
          condition_notes: string | null
          created_at: string | null
          created_by: string | null
          handover_date: string
          id: string
          jo_id: string
          location: string | null
          notes: string | null
          photo_urls: Json | null
          signed_at: string | null
          status: string | null
          updated_at: string | null
          work_description: string | null
        }
        Insert: {
          ba_number: string
          cargo_condition?: string | null
          client_representative?: string | null
          client_signature_url?: string | null
          company_representative?: string | null
          company_signature_url?: string | null
          condition_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          handover_date: string
          id?: string
          jo_id: string
          location?: string | null
          notes?: string | null
          photo_urls?: Json | null
          signed_at?: string | null
          status?: string | null
          updated_at?: string | null
          work_description?: string | null
        }
        Update: {
          ba_number?: string
          cargo_condition?: string | null
          client_representative?: string | null
          client_signature_url?: string | null
          company_representative?: string | null
          company_signature_url?: string | null
          condition_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          handover_date?: string
          id?: string
          jo_id?: string
          location?: string | null
          notes?: string | null
          photo_urls?: Json | null
          signed_at?: string | null
          status?: string | null
          updated_at?: string | null
          work_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "berita_acara_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "berita_acara_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      bukti_kas_keluar: {
        Row: {
          amount_requested: number
          amount_returned: number | null
          amount_spent: number | null
          approved_at: string | null
          approved_by: string | null
          bkk_number: string
          budget_amount: number | null
          budget_category: string | null
          created_at: string | null
          id: string
          jo_id: string
          notes: string | null
          pjo_cost_item_id: string | null
          purpose: string
          receipt_urls: Json | null
          rejection_reason: string | null
          release_method: string | null
          release_reference: string | null
          released_at: string | null
          released_by: string | null
          requested_at: string | null
          requested_by: string | null
          settled_at: string | null
          settled_by: string | null
          status: string | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          amount_requested: number
          amount_returned?: number | null
          amount_spent?: number | null
          approved_at?: string | null
          approved_by?: string | null
          bkk_number: string
          budget_amount?: number | null
          budget_category?: string | null
          created_at?: string | null
          id?: string
          jo_id: string
          notes?: string | null
          pjo_cost_item_id?: string | null
          purpose: string
          receipt_urls?: Json | null
          rejection_reason?: string | null
          release_method?: string | null
          release_reference?: string | null
          released_at?: string | null
          released_by?: string | null
          requested_at?: string | null
          requested_by?: string | null
          settled_at?: string | null
          settled_by?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          amount_requested?: number
          amount_returned?: number | null
          amount_spent?: number | null
          approved_at?: string | null
          approved_by?: string | null
          bkk_number?: string
          budget_amount?: number | null
          budget_category?: string | null
          created_at?: string | null
          id?: string
          jo_id?: string
          notes?: string | null
          pjo_cost_item_id?: string | null
          purpose?: string
          receipt_urls?: Json | null
          rejection_reason?: string | null
          release_method?: string | null
          release_reference?: string | null
          released_at?: string | null
          released_by?: string | null
          requested_at?: string | null
          requested_by?: string | null
          settled_at?: string | null
          settled_by?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bukti_kas_keluar_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bukti_kas_keluar_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bukti_kas_keluar_pjo_cost_item_id_fkey"
            columns: ["pjo_cost_item_id"]
            isOneToOne: false
            referencedRelation: "pjo_cost_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bukti_kas_keluar_released_by_fkey"
            columns: ["released_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bukti_kas_keluar_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bukti_kas_keluar_settled_by_fkey"
            columns: ["settled_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bukti_kas_keluar_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
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
      complexity_criteria: {
        Row: {
          auto_detect_rules: Json | null
          created_at: string | null
          criteria_code: string
          criteria_name: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          weight: number | null
        }
        Insert: {
          auto_detect_rules?: Json | null
          created_at?: string | null
          criteria_code: string
          criteria_name: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          weight?: number | null
        }
        Update: {
          auto_detect_rules?: Json | null
          created_at?: string | null
          criteria_code?: string
          criteria_name?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          weight?: number | null
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
          amount_paid: number | null
          cancelled_at: string | null
          created_at: string | null
          customer_id: string
          due_date: string
          id: string
          invoice_date: string | null
          invoice_number: string
          invoice_term: string | null
          jo_id: string
          notes: string | null
          paid_at: string | null
          sent_at: string | null
          status: string
          subtotal: number
          tax_amount: number
          term_description: string | null
          term_percentage: number | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          cancelled_at?: string | null
          created_at?: string | null
          customer_id: string
          due_date: string
          id?: string
          invoice_date?: string | null
          invoice_number: string
          invoice_term?: string | null
          jo_id: string
          notes?: string | null
          paid_at?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          term_description?: string | null
          term_percentage?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          cancelled_at?: string | null
          created_at?: string | null
          customer_id?: string
          due_date?: string
          id?: string
          invoice_date?: string | null
          invoice_number?: string
          invoice_term?: string | null
          jo_id?: string
          notes?: string | null
          paid_at?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          term_description?: string | null
          term_percentage?: number | null
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
          has_berita_acara: boolean | null
          has_surat_jalan: boolean | null
          id: string
          invoice_terms: Json | null
          invoiceable_amount: number | null
          jo_number: string
          pjo_id: string | null
          project_id: string | null
          requires_berita_acara: boolean | null
          status: string
          submitted_by: string | null
          submitted_to_finance_at: string | null
          total_invoiced: number | null
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
          has_berita_acara?: boolean | null
          has_surat_jalan?: boolean | null
          id?: string
          invoice_terms?: Json | null
          invoiceable_amount?: number | null
          jo_number: string
          pjo_id?: string | null
          project_id?: string | null
          requires_berita_acara?: boolean | null
          status?: string
          submitted_by?: string | null
          submitted_to_finance_at?: string | null
          total_invoiced?: number | null
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
          has_berita_acara?: boolean | null
          has_surat_jalan?: boolean | null
          id?: string
          invoice_terms?: Json | null
          invoiceable_amount?: number | null
          jo_number?: string
          pjo_id?: string | null
          project_id?: string | null
          requires_berita_acara?: boolean | null
          status?: string
          submitted_by?: string | null
          submitted_to_finance_at?: string | null
          total_invoiced?: number | null
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
      payments: {
        Row: {
          amount: number
          bank_account: string | null
          bank_name: string | null
          created_at: string | null
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string
          payment_method: string
          recorded_by: string | null
          reference_number: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          bank_account?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          payment_date?: string
          payment_method: string
          recorded_by?: string | null
          reference_number?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bank_account?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          recorded_by?: string | null
          reference_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
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
          vendor_equipment_id: string | null
          vendor_id: string | null
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
          vendor_equipment_id?: string | null
          vendor_id?: string | null
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
          vendor_equipment_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pjo_cost_items_pjo_id_fkey"
            columns: ["pjo_id"]
            isOneToOne: false
            referencedRelation: "proforma_job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjo_cost_items_vendor_equipment_id_fkey"
            columns: ["vendor_equipment_id"]
            isOneToOne: false
            referencedRelation: "vendor_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pjo_cost_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
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
          cargo_height_m: number | null
          cargo_length_m: number | null
          cargo_value: number | null
          cargo_weight_kg: number | null
          cargo_width_m: number | null
          carrier_type: string | null
          commodity: string | null
          complexity_factors: Json | null
          complexity_score: number | null
          converted_to_jo: boolean | null
          converted_to_jo_at: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string
          description: string
          duration_days: number | null
          estimated_amount: number
          eta: string | null
          etd: string | null
          has_cost_overruns: boolean | null
          id: string
          is_active: boolean | null
          is_hazardous: boolean | null
          is_new_route: boolean | null
          jo_date: string | null
          job_order_id: string | null
          market_type: string | null
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
          pricing_approach: string | null
          pricing_notes: string | null
          profit: number | null
          project_id: string | null
          quantity: number | null
          quantity_unit: string | null
          rejection_reason: string | null
          requires_special_permit: boolean | null
          status: string
          terrain_type: string | null
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
          cargo_height_m?: number | null
          cargo_length_m?: number | null
          cargo_value?: number | null
          cargo_weight_kg?: number | null
          cargo_width_m?: number | null
          carrier_type?: string | null
          commodity?: string | null
          complexity_factors?: Json | null
          complexity_score?: number | null
          converted_to_jo?: boolean | null
          converted_to_jo_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          description: string
          duration_days?: number | null
          estimated_amount?: number
          eta?: string | null
          etd?: string | null
          has_cost_overruns?: boolean | null
          id?: string
          is_active?: boolean | null
          is_hazardous?: boolean | null
          is_new_route?: boolean | null
          jo_date?: string | null
          job_order_id?: string | null
          market_type?: string | null
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
          pricing_approach?: string | null
          pricing_notes?: string | null
          profit?: number | null
          project_id?: string | null
          quantity?: number | null
          quantity_unit?: string | null
          rejection_reason?: string | null
          requires_special_permit?: boolean | null
          status?: string
          terrain_type?: string | null
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
          cargo_height_m?: number | null
          cargo_length_m?: number | null
          cargo_value?: number | null
          cargo_weight_kg?: number | null
          cargo_width_m?: number | null
          carrier_type?: string | null
          commodity?: string | null
          complexity_factors?: Json | null
          complexity_score?: number | null
          converted_to_jo?: boolean | null
          converted_to_jo_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          description?: string
          duration_days?: number | null
          estimated_amount?: number
          eta?: string | null
          etd?: string | null
          has_cost_overruns?: boolean | null
          id?: string
          is_active?: boolean | null
          is_hazardous?: boolean | null
          is_new_route?: boolean | null
          jo_date?: string | null
          job_order_id?: string | null
          market_type?: string | null
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
          pricing_approach?: string | null
          pricing_notes?: string | null
          profit?: number | null
          project_id?: string | null
          quantity?: number | null
          quantity_unit?: string | null
          rejection_reason?: string | null
          requires_special_permit?: boolean | null
          status?: string
          terrain_type?: string | null
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
      surat_jalan: {
        Row: {
          cargo_description: string | null
          created_at: string | null
          created_by: string | null
          delivered_at: string | null
          delivery_date: string
          destination: string | null
          driver_name: string | null
          driver_phone: string | null
          id: string
          issued_at: string | null
          jo_id: string
          notes: string | null
          origin: string | null
          quantity: number | null
          quantity_unit: string | null
          receiver_name: string | null
          receiver_signature_url: string | null
          sender_name: string | null
          sender_signature_url: string | null
          sj_number: string
          status: string | null
          updated_at: string | null
          vehicle_plate: string | null
          weight_kg: number | null
        }
        Insert: {
          cargo_description?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_at?: string | null
          delivery_date: string
          destination?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          issued_at?: string | null
          jo_id: string
          notes?: string | null
          origin?: string | null
          quantity?: number | null
          quantity_unit?: string | null
          receiver_name?: string | null
          receiver_signature_url?: string | null
          sender_name?: string | null
          sender_signature_url?: string | null
          sj_number: string
          status?: string | null
          updated_at?: string | null
          vehicle_plate?: string | null
          weight_kg?: number | null
        }
        Update: {
          cargo_description?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_at?: string | null
          delivery_date?: string
          destination?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          issued_at?: string | null
          jo_id?: string
          notes?: string | null
          origin?: string | null
          quantity?: number | null
          quantity_unit?: string | null
          receiver_name?: string | null
          receiver_signature_url?: string | null
          sender_name?: string | null
          sender_signature_url?: string | null
          sj_number?: string
          status?: string | null
          updated_at?: string | null
          vehicle_plate?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "surat_jalan_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surat_jalan_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
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
      vendor_contacts: {
        Row: {
          contact_name: string
          created_at: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          notes: string | null
          phone: string | null
          position: string | null
          vendor_id: string
          whatsapp: string | null
        }
        Insert: {
          contact_name: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          vendor_id: string
          whatsapp?: string | null
        }
        Update: {
          contact_name?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          vendor_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_contacts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_documents: {
        Row: {
          created_at: string | null
          document_name: string | null
          document_type: string
          expiry_date: string | null
          file_url: string | null
          id: string
          uploaded_by: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          document_name?: string | null
          document_type: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          uploaded_by?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          document_name?: string | null
          document_type?: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          uploaded_by?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_documents_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_equipment: {
        Row: {
          brand: string | null
          capacity_description: string | null
          capacity_kg: number | null
          capacity_m3: number | null
          condition: string | null
          created_at: string | null
          daily_rate: number | null
          equipment_type: string
          height_m: number | null
          id: string
          insurance_expiry: string | null
          is_available: boolean | null
          kir_expiry: string | null
          length_m: number | null
          model: string | null
          notes: string | null
          plate_number: string | null
          rate_notes: string | null
          stnk_expiry: string | null
          updated_at: string | null
          vendor_id: string
          width_m: number | null
          year_made: number | null
        }
        Insert: {
          brand?: string | null
          capacity_description?: string | null
          capacity_kg?: number | null
          capacity_m3?: number | null
          condition?: string | null
          created_at?: string | null
          daily_rate?: number | null
          equipment_type: string
          height_m?: number | null
          id?: string
          insurance_expiry?: string | null
          is_available?: boolean | null
          kir_expiry?: string | null
          length_m?: number | null
          model?: string | null
          notes?: string | null
          plate_number?: string | null
          rate_notes?: string | null
          stnk_expiry?: string | null
          updated_at?: string | null
          vendor_id: string
          width_m?: number | null
          year_made?: number | null
        }
        Update: {
          brand?: string | null
          capacity_description?: string | null
          capacity_kg?: number | null
          capacity_m3?: number | null
          condition?: string | null
          created_at?: string | null
          daily_rate?: number | null
          equipment_type?: string
          height_m?: number | null
          id?: string
          insurance_expiry?: string | null
          is_available?: boolean | null
          kir_expiry?: string | null
          length_m?: number | null
          model?: string | null
          notes?: string | null
          plate_number?: string | null
          rate_notes?: string | null
          stnk_expiry?: string | null
          updated_at?: string | null
          vendor_id?: string
          width_m?: number | null
          year_made?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_equipment_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_ratings: {
        Row: {
          bkk_id: string | null
          comments: string | null
          communication_rating: number | null
          created_at: string | null
          had_issues: boolean | null
          id: string
          issue_description: string | null
          jo_id: string | null
          overall_rating: number | null
          price_rating: number | null
          punctuality_rating: number | null
          quality_rating: number | null
          rated_by: string | null
          vendor_id: string
          was_on_time: boolean | null
        }
        Insert: {
          bkk_id?: string | null
          comments?: string | null
          communication_rating?: number | null
          created_at?: string | null
          had_issues?: boolean | null
          id?: string
          issue_description?: string | null
          jo_id?: string | null
          overall_rating?: number | null
          price_rating?: number | null
          punctuality_rating?: number | null
          quality_rating?: number | null
          rated_by?: string | null
          vendor_id: string
          was_on_time?: boolean | null
        }
        Update: {
          bkk_id?: string | null
          comments?: string | null
          communication_rating?: number | null
          created_at?: string | null
          had_issues?: boolean | null
          id?: string
          issue_description?: string | null
          jo_id?: string | null
          overall_rating?: number | null
          price_rating?: number | null
          punctuality_rating?: number | null
          quality_rating?: number | null
          rated_by?: string | null
          vendor_id?: string
          was_on_time?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_ratings_bkk_id_fkey"
            columns: ["bkk_id"]
            isOneToOne: false
            referencedRelation: "bukti_kas_keluar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_ratings_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_ratings_rated_by_fkey"
            columns: ["rated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_ratings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          average_rating: number | null
          bank_account: string | null
          bank_account_name: string | null
          bank_branch: string | null
          bank_name: string | null
          business_license: string | null
          city: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          contact_position: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_preferred: boolean | null
          is_verified: boolean | null
          legal_name: string | null
          notes: string | null
          on_time_rate: number | null
          phone: string | null
          postal_code: string | null
          province: string | null
          registration_method: string | null
          tax_id: string | null
          total_jobs: number | null
          total_value: number | null
          updated_at: string | null
          vendor_code: string
          vendor_name: string
          vendor_type: string
          verified_at: string | null
          verified_by: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          average_rating?: number | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          business_license?: string | null
          city?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contact_position?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          is_verified?: boolean | null
          legal_name?: string | null
          notes?: string | null
          on_time_rate?: number | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          registration_method?: string | null
          tax_id?: string | null
          total_jobs?: number | null
          total_value?: number | null
          updated_at?: string | null
          vendor_code: string
          vendor_name: string
          vendor_type: string
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          average_rating?: number | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          business_license?: string | null
          city?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contact_position?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          is_verified?: boolean | null
          legal_name?: string | null
          notes?: string | null
          on_time_rate?: number | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          registration_method?: string | null
          tax_id?: string | null
          total_jobs?: number | null
          total_value?: number | null
          updated_at?: string | null
          vendor_code?: string
          vendor_name?: string
          vendor_type?: string
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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