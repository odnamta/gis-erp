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
      agency_charge_types: {
        Row: {
          charge_category: string
          charge_code: string
          charge_name: string
          charge_type: string
          created_at: string | null
          default_currency: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_taxable: boolean | null
        }
        Insert: {
          charge_category: string
          charge_code: string
          charge_name: string
          charge_type: string
          created_at?: string | null
          default_currency?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_taxable?: boolean | null
        }
        Update: {
          charge_category?: string
          charge_code?: string
          charge_name?: string
          charge_type?: string
          created_at?: string | null
          default_currency?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_taxable?: boolean | null
        }
        Relationships: []
      }
      agency_service_providers: {
        Row: {
          address: string | null
          city: string | null
          contacts: Json | null
          country: string | null
          coverage_areas: Json | null
          created_at: string | null
          documents: Json | null
          email: string | null
          id: string
          is_active: boolean | null
          is_preferred: boolean | null
          notes: string | null
          npwp: string | null
          payment_terms: string | null
          phone: string | null
          provider_code: string
          provider_name: string
          provider_type: string
          province: string | null
          service_rating: number | null
          services_detail: Json | null
          siup: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contacts?: Json | null
          country?: string | null
          coverage_areas?: Json | null
          created_at?: string | null
          documents?: Json | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          notes?: string | null
          npwp?: string | null
          payment_terms?: string | null
          phone?: string | null
          provider_code: string
          provider_name: string
          provider_type: string
          province?: string | null
          service_rating?: number | null
          services_detail?: Json | null
          siup?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contacts?: Json | null
          country?: string | null
          coverage_areas?: Json | null
          created_at?: string | null
          documents?: Json | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          notes?: string | null
          npwp?: string | null
          payment_terms?: string | null
          phone?: string | null
          provider_code?: string
          provider_name?: string
          provider_type?: string
          province?: string | null
          service_rating?: number | null
          services_detail?: Json | null
          siup?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      agency_vendor_invoices: {
        Row: {
          cost_ids: Json | null
          created_at: string | null
          currency: string | null
          document_url: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          paid_amount: number | null
          payment_status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          vendor_id: string
          vendor_name: string | null
        }
        Insert: {
          cost_ids?: Json | null
          created_at?: string | null
          currency?: string | null
          document_url?: string | null
          due_date?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          notes?: string | null
          paid_amount?: number | null
          payment_status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          vendor_id: string
          vendor_name?: string | null
        }
        Update: {
          cost_ids?: Json | null
          created_at?: string | null
          currency?: string | null
          document_url?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          paid_amount?: number | null
          payment_status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          vendor_id?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_vendor_invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "agency_service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_feedback: {
        Row: {
          agent_id: string
          created_at: string | null
          created_by: string | null
          feedback: string | null
          id: string
          rating: number
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          created_by?: string | null
          feedback?: string | null
          id?: string
          rating: number
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          created_by?: string | null
          feedback?: string | null
          id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_feedback_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "port_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_predictions: {
        Row: {
          actual_value: number | null
          confidence_level: number | null
          contributing_factors: Json | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          model_id: string
          predicted_value: number | null
          prediction_date: string
          prediction_error: number | null
          prediction_range_high: number | null
          prediction_range_low: number | null
          prediction_type: string
          risk_level: string | null
          risk_score: number | null
          target_date: string | null
        }
        Insert: {
          actual_value?: number | null
          confidence_level?: number | null
          contributing_factors?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          model_id: string
          predicted_value?: number | null
          prediction_date: string
          prediction_error?: number | null
          prediction_range_high?: number | null
          prediction_range_low?: number | null
          prediction_type: string
          risk_level?: string | null
          risk_score?: number | null
          target_date?: string | null
        }
        Update: {
          actual_value?: number | null
          confidence_level?: number | null
          contributing_factors?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          model_id?: string
          predicted_value?: number | null
          prediction_date?: string
          prediction_error?: number | null
          prediction_range_high?: number | null
          prediction_range_low?: number | null
          prediction_type?: string
          risk_level?: string | null
          risk_score?: number | null
          target_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_predictions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "prediction_models"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_query_history: {
        Row: {
          created_at: string | null
          execution_time_ms: number | null
          feedback_notes: string | null
          generated_sql: string | null
          id: string
          natural_query: string
          response_data: Json | null
          response_text: string | null
          response_type: string | null
          user_id: string
          was_helpful: boolean | null
        }
        Insert: {
          created_at?: string | null
          execution_time_ms?: number | null
          feedback_notes?: string | null
          generated_sql?: string | null
          id?: string
          natural_query: string
          response_data?: Json | null
          response_text?: string | null
          response_type?: string | null
          user_id: string
          was_helpful?: boolean | null
        }
        Update: {
          created_at?: string | null
          execution_time_ms?: number | null
          feedback_notes?: string | null
          generated_sql?: string | null
          id?: string
          natural_query?: string
          response_data?: Json | null
          response_text?: string | null
          response_type?: string | null
          user_id?: string
          was_helpful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_query_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_query_templates: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          parameters: Json | null
          response_format: string | null
          response_template: string | null
          sample_questions: Json | null
          sql_template: string
          template_category: string
          template_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          parameters?: Json | null
          response_format?: string | null
          response_template?: string | null
          sample_questions?: Json | null
          sql_template: string
          template_category: string
          template_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          parameters?: Json | null
          response_format?: string | null
          response_template?: string | null
          sample_questions?: Json | null
          sql_template?: string
          template_category?: string
          template_name?: string
        }
        Relationships: []
      }
      alert_instances: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_message: string
          context_data: Json | null
          created_at: string | null
          current_value: number | null
          id: string
          notifications_sent: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          rule_id: string
          status: string | null
          threshold_value: number | null
          triggered_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_message: string
          context_data?: Json | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          notifications_sent?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          rule_id: string
          status?: string | null
          threshold_value?: number | null
          triggered_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_message?: string
          context_data?: Json | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          notifications_sent?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          rule_id?: string
          status?: string | null
          threshold_value?: number | null
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_instances_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_instances_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          anomaly_std_deviations: number | null
          check_frequency: string | null
          comparison_operator: string | null
          cooldown_minutes: number | null
          created_at: string | null
          custom_condition_sql: string | null
          description: string | null
          id: string
          is_active: boolean | null
          kpi_id: string | null
          notification_channels: Json | null
          notify_roles: Json | null
          notify_users: Json | null
          rule_code: string
          rule_name: string
          rule_type: string
          severity: string | null
          threshold_value: number | null
          trend_direction: string | null
          trend_periods: number | null
          trend_threshold_pct: number | null
        }
        Insert: {
          anomaly_std_deviations?: number | null
          check_frequency?: string | null
          comparison_operator?: string | null
          cooldown_minutes?: number | null
          created_at?: string | null
          custom_condition_sql?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          kpi_id?: string | null
          notification_channels?: Json | null
          notify_roles?: Json | null
          notify_users?: Json | null
          rule_code: string
          rule_name: string
          rule_type: string
          severity?: string | null
          threshold_value?: number | null
          trend_direction?: string | null
          trend_periods?: number | null
          trend_threshold_pct?: number | null
        }
        Update: {
          anomaly_std_deviations?: number | null
          check_frequency?: string | null
          comparison_operator?: string | null
          cooldown_minutes?: number | null
          created_at?: string | null
          custom_condition_sql?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          kpi_id?: string | null
          notification_channels?: Json | null
          notify_roles?: Json | null
          notify_users?: Json | null
          rule_code?: string
          rule_name?: string
          rule_type?: string
          severity?: string | null
          threshold_value?: number | null
          trend_direction?: string | null
          trend_periods?: number | null
          trend_threshold_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_rules_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: Json | null
          rate_limit_per_minute: number | null
          updated_at: string | null
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          permissions?: Json | null
          rate_limit_per_minute?: number | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: Json | null
          rate_limit_per_minute?: number | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          description: string | null
          environment: string
          id: string
          is_sensitive: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string
          description?: string | null
          environment?: string
          id?: string
          is_sensitive?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          description?: string | null
          environment?: string
          id?: string
          is_sensitive?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      arrival_notices: {
        Row: {
          ata: string | null
          berth: string | null
          bl_id: string
          booking_id: string | null
          cargo_description: string | null
          cleared_at: string | null
          consignee_notified: boolean
          container_numbers: Json
          created_at: string
          delivered_at: string | null
          delivery_address: string | null
          delivery_instructions: string | null
          estimated_charges: Json
          eta: string
          free_time_days: number
          free_time_expires: string | null
          id: string
          notes: string | null
          notice_number: string
          notified_at: string | null
          notified_by: string | null
          port_of_discharge: string
          status: string
          terminal: string | null
          vessel_name: string
          voyage_number: string | null
        }
        Insert: {
          ata?: string | null
          berth?: string | null
          bl_id: string
          booking_id?: string | null
          cargo_description?: string | null
          cleared_at?: string | null
          consignee_notified?: boolean
          container_numbers?: Json
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_instructions?: string | null
          estimated_charges?: Json
          eta: string
          free_time_days?: number
          free_time_expires?: string | null
          id?: string
          notes?: string | null
          notice_number: string
          notified_at?: string | null
          notified_by?: string | null
          port_of_discharge: string
          status?: string
          terminal?: string | null
          vessel_name: string
          voyage_number?: string | null
        }
        Update: {
          ata?: string | null
          berth?: string | null
          bl_id?: string
          booking_id?: string | null
          cargo_description?: string | null
          cleared_at?: string | null
          consignee_notified?: boolean
          container_numbers?: Json
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_instructions?: string | null
          estimated_charges?: Json
          eta?: string
          free_time_days?: number
          free_time_expires?: string | null
          id?: string
          notes?: string | null
          notice_number?: string
          notified_at?: string | null
          notified_by?: string | null
          port_of_discharge?: string
          status?: string
          terminal?: string | null
          vessel_name?: string
          voyage_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arrival_notices_bl_id_fkey"
            columns: ["bl_id"]
            isOneToOne: false
            referencedRelation: "bills_of_lading"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_notices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "active_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_notices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "freight_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_notices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "shipment_profitability"
            referencedColumns: ["booking_id"]
          },
        ]
      }
      asset_assignments: {
        Row: {
          asset_id: string
          assigned_by: string | null
          assigned_from: string
          assigned_to: string | null
          assignment_type: string
          created_at: string | null
          employee_id: string | null
          end_hours: number | null
          end_km: number | null
          hours_used: number | null
          id: string
          job_order_id: string | null
          km_used: number | null
          location_id: string | null
          notes: string | null
          project_id: string | null
          start_hours: number | null
          start_km: number | null
        }
        Insert: {
          asset_id: string
          assigned_by?: string | null
          assigned_from: string
          assigned_to?: string | null
          assignment_type: string
          created_at?: string | null
          employee_id?: string | null
          end_hours?: number | null
          end_km?: number | null
          hours_used?: number | null
          id?: string
          job_order_id?: string | null
          km_used?: number | null
          location_id?: string | null
          notes?: string | null
          project_id?: string | null
          start_hours?: number | null
          start_km?: number | null
        }
        Update: {
          asset_id?: string
          assigned_by?: string | null
          assigned_from?: string
          assigned_to?: string | null
          assignment_type?: string
          created_at?: string | null
          employee_id?: string | null
          end_hours?: number | null
          end_km?: number | null
          hours_used?: number | null
          id?: string
          job_order_id?: string | null
          km_used?: number | null
          location_id?: string | null
          notes?: string | null
          project_id?: string | null
          start_hours?: number | null
          start_km?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_assignments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_assignments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_assignments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization_monthly"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_assignments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_assignments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "maintenance_cost_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_assignments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "upcoming_maintenance"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "asset_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "asset_assignments_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "asset_assignments_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "asset_assignments_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_assignments_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_assignments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "asset_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_categories: {
        Row: {
          category_code: string
          category_name: string
          created_at: string | null
          default_depreciation_method: string | null
          default_total_units: number | null
          default_useful_life_years: number | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          parent_category_id: string | null
        }
        Insert: {
          category_code: string
          category_name: string
          created_at?: string | null
          default_depreciation_method?: string | null
          default_total_units?: number | null
          default_useful_life_years?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          parent_category_id?: string | null
        }
        Update: {
          category_code?: string
          category_name?: string
          created_at?: string | null
          default_depreciation_method?: string | null
          default_total_units?: number | null
          default_useful_life_years?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          parent_category_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_cost_tracking: {
        Row: {
          amount: number
          asset_id: string
          cost_date: string
          cost_type: string
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          amount: number
          asset_id: string
          cost_date: string
          cost_type: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          amount?: number
          asset_id?: string
          cost_date?: string
          cost_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_cost_tracking_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_cost_tracking_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_cost_tracking_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization_monthly"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_cost_tracking_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_cost_tracking_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "maintenance_cost_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_cost_tracking_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "upcoming_maintenance"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_cost_tracking_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_daily_logs: {
        Row: {
          asset_id: string
          created_at: string | null
          end_hours: number | null
          end_km: number | null
          fuel_cost: number | null
          fuel_liters: number | null
          hours_today: number | null
          id: string
          job_order_id: string | null
          km_today: number | null
          log_date: string
          logged_by: string | null
          notes: string | null
          operator_employee_id: string | null
          operator_name: string | null
          start_hours: number | null
          start_km: number | null
          status: string
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          end_hours?: number | null
          end_km?: number | null
          fuel_cost?: number | null
          fuel_liters?: number | null
          hours_today?: number | null
          id?: string
          job_order_id?: string | null
          km_today?: number | null
          log_date: string
          logged_by?: string | null
          notes?: string | null
          operator_employee_id?: string | null
          operator_name?: string | null
          start_hours?: number | null
          start_km?: number | null
          status: string
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          end_hours?: number | null
          end_km?: number | null
          fuel_cost?: number | null
          fuel_liters?: number | null
          hours_today?: number | null
          id?: string
          job_order_id?: string | null
          km_today?: number | null
          log_date?: string
          logged_by?: string | null
          notes?: string | null
          operator_employee_id?: string | null
          operator_name?: string | null
          start_hours?: number | null
          start_km?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_daily_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_daily_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_daily_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization_monthly"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_daily_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_daily_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "maintenance_cost_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_daily_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "upcoming_maintenance"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_daily_logs_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "asset_daily_logs_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "asset_daily_logs_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_daily_logs_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_daily_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_daily_logs_operator_employee_id_fkey"
            columns: ["operator_employee_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "asset_daily_logs_operator_employee_id_fkey"
            columns: ["operator_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_daily_logs_operator_employee_id_fkey"
            columns: ["operator_employee_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      asset_depreciation: {
        Row: {
          accumulated_depreciation: number
          asset_id: string
          beginning_book_value: number
          created_at: string | null
          created_by: string | null
          depreciation_amount: number
          depreciation_date: string
          depreciation_method: string
          ending_book_value: number
          id: string
          notes: string | null
          period_end: string
          period_start: string
        }
        Insert: {
          accumulated_depreciation: number
          asset_id: string
          beginning_book_value: number
          created_at?: string | null
          created_by?: string | null
          depreciation_amount: number
          depreciation_date?: string
          depreciation_method: string
          ending_book_value: number
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
        }
        Update: {
          accumulated_depreciation?: number
          asset_id?: string
          beginning_book_value?: number
          created_at?: string | null
          created_by?: string | null
          depreciation_amount?: number
          depreciation_date?: string
          depreciation_method?: string
          ending_book_value?: number
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_depreciation_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_depreciation_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_depreciation_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization_monthly"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_depreciation_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_depreciation_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "maintenance_cost_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_depreciation_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "upcoming_maintenance"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_depreciation_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_documents: {
        Row: {
          asset_id: string
          document_name: string
          document_type: string
          document_url: string | null
          expiry_date: string | null
          id: string
          issue_date: string | null
          notes: string | null
          reminder_days: number | null
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          asset_id: string
          document_name: string
          document_type: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          notes?: string | null
          reminder_days?: number | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          asset_id?: string
          document_name?: string
          document_type?: string
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          notes?: string | null
          reminder_days?: number | null
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization_monthly"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "maintenance_cost_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "upcoming_maintenance"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_locations: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          location_code: string
          location_name: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_code: string
          location_name: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_code?: string
          location_name?: string
        }
        Relationships: []
      }
      asset_status_history: {
        Row: {
          asset_id: string
          changed_at: string | null
          changed_by: string | null
          id: string
          new_location_id: string | null
          new_status: string
          notes: string | null
          previous_location_id: string | null
          previous_status: string | null
          reason: string | null
        }
        Insert: {
          asset_id: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_location_id?: string | null
          new_status: string
          notes?: string | null
          previous_location_id?: string | null
          previous_status?: string | null
          reason?: string | null
        }
        Update: {
          asset_id?: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_location_id?: string | null
          new_status?: string
          notes?: string | null
          previous_location_id?: string | null
          previous_status?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_status_history_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_status_history_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_status_history_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization_monthly"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_status_history_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_status_history_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "maintenance_cost_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_status_history_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "upcoming_maintenance"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_status_history_new_location_id_fkey"
            columns: ["new_location_id"]
            isOneToOne: false
            referencedRelation: "asset_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_status_history_previous_location_id_fkey"
            columns: ["previous_location_id"]
            isOneToOne: false
            referencedRelation: "asset_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          accumulated_depreciation: number | null
          asset_code: string
          asset_name: string
          assigned_to_employee_id: string | null
          assigned_to_job_id: string | null
          axle_configuration: string | null
          book_value: number | null
          brand: string | null
          capacity_cbm: number | null
          capacity_tons: number | null
          category_id: string
          chassis_number: string | null
          color: string | null
          created_at: string | null
          created_by: string | null
          current_location_id: string | null
          current_units: number | null
          depreciation_method: string | null
          depreciation_start_date: string | null
          description: string | null
          documents: Json | null
          engine_number: string | null
          height_m: number | null
          id: string
          insurance_expiry_date: string | null
          insurance_policy_number: string | null
          insurance_provider: string | null
          insurance_value: number | null
          kir_expiry_date: string | null
          length_m: number | null
          model: string | null
          notes: string | null
          photos: Json | null
          purchase_date: string | null
          purchase_invoice: string | null
          purchase_price: number | null
          purchase_vendor: string | null
          registration_expiry_date: string | null
          registration_number: string | null
          salvage_value: number | null
          status: string | null
          total_expected_units: number | null
          updated_at: string | null
          useful_life_years: number | null
          vin_number: string | null
          weight_kg: number | null
          width_m: number | null
          year_manufactured: number | null
        }
        Insert: {
          accumulated_depreciation?: number | null
          asset_code: string
          asset_name: string
          assigned_to_employee_id?: string | null
          assigned_to_job_id?: string | null
          axle_configuration?: string | null
          book_value?: number | null
          brand?: string | null
          capacity_cbm?: number | null
          capacity_tons?: number | null
          category_id: string
          chassis_number?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          current_location_id?: string | null
          current_units?: number | null
          depreciation_method?: string | null
          depreciation_start_date?: string | null
          description?: string | null
          documents?: Json | null
          engine_number?: string | null
          height_m?: number | null
          id?: string
          insurance_expiry_date?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          insurance_value?: number | null
          kir_expiry_date?: string | null
          length_m?: number | null
          model?: string | null
          notes?: string | null
          photos?: Json | null
          purchase_date?: string | null
          purchase_invoice?: string | null
          purchase_price?: number | null
          purchase_vendor?: string | null
          registration_expiry_date?: string | null
          registration_number?: string | null
          salvage_value?: number | null
          status?: string | null
          total_expected_units?: number | null
          updated_at?: string | null
          useful_life_years?: number | null
          vin_number?: string | null
          weight_kg?: number | null
          width_m?: number | null
          year_manufactured?: number | null
        }
        Update: {
          accumulated_depreciation?: number | null
          asset_code?: string
          asset_name?: string
          assigned_to_employee_id?: string | null
          assigned_to_job_id?: string | null
          axle_configuration?: string | null
          book_value?: number | null
          brand?: string | null
          capacity_cbm?: number | null
          capacity_tons?: number | null
          category_id?: string
          chassis_number?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          current_location_id?: string | null
          current_units?: number | null
          depreciation_method?: string | null
          depreciation_start_date?: string | null
          description?: string | null
          documents?: Json | null
          engine_number?: string | null
          height_m?: number | null
          id?: string
          insurance_expiry_date?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          insurance_value?: number | null
          kir_expiry_date?: string | null
          length_m?: number | null
          model?: string | null
          notes?: string | null
          photos?: Json | null
          purchase_date?: string | null
          purchase_invoice?: string | null
          purchase_price?: number | null
          purchase_vendor?: string | null
          registration_expiry_date?: string | null
          registration_number?: string | null
          salvage_value?: number | null
          status?: string | null
          total_expected_units?: number | null
          updated_at?: string | null
          useful_life_years?: number | null
          vin_number?: string | null
          weight_kg?: number | null
          width_m?: number | null
          year_manufactured?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_assigned_to_employee_id_fkey"
            columns: ["assigned_to_employee_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "assets_assigned_to_employee_id_fkey"
            columns: ["assigned_to_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_assigned_to_employee_id_fkey"
            columns: ["assigned_to_employee_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "assets_assigned_to_job_id_fkey"
            columns: ["assigned_to_job_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "assets_assigned_to_job_id_fkey"
            columns: ["assigned_to_job_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "assets_assigned_to_job_id_fkey"
            columns: ["assigned_to_job_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_assigned_to_job_id_fkey"
            columns: ["assigned_to_job_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_current_location_id_fkey"
            columns: ["current_location_id"]
            isOneToOne: false
            referencedRelation: "asset_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          attendance_date: string
          clock_in: string | null
          clock_in_location: string | null
          clock_out: string | null
          clock_out_location: string | null
          corrected_by: string | null
          correction_reason: string | null
          created_at: string | null
          early_leave_minutes: number | null
          employee_id: string
          id: string
          is_corrected: boolean | null
          late_minutes: number | null
          notes: string | null
          overtime_hours: number | null
          status: string | null
          updated_at: string | null
          work_hours: number | null
        }
        Insert: {
          attendance_date: string
          clock_in?: string | null
          clock_in_location?: string | null
          clock_out?: string | null
          clock_out_location?: string | null
          corrected_by?: string | null
          correction_reason?: string | null
          created_at?: string | null
          early_leave_minutes?: number | null
          employee_id: string
          id?: string
          is_corrected?: boolean | null
          late_minutes?: number | null
          notes?: string | null
          overtime_hours?: number | null
          status?: string | null
          updated_at?: string | null
          work_hours?: number | null
        }
        Update: {
          attendance_date?: string
          clock_in?: string | null
          clock_in_location?: string | null
          clock_out?: string | null
          clock_out_location?: string | null
          corrected_by?: string | null
          correction_reason?: string | null
          created_at?: string | null
          early_leave_minutes?: number | null
          employee_id?: string
          id?: string
          is_corrected?: boolean | null
          late_minutes?: number | null
          notes?: string | null
          overtime_hours?: number | null
          status?: string | null
          updated_at?: string | null
          work_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_corrected_by_fkey"
            columns: ["corrected_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      audit_findings: {
        Row: {
          audit_id: string
          category: string | null
          closed_at: string | null
          closed_by: string | null
          closure_evidence: string | null
          corrective_action: string | null
          created_at: string | null
          due_date: string | null
          finding_description: string
          finding_number: number
          id: string
          location_detail: string | null
          photos: Json | null
          potential_consequence: string | null
          responsible_id: string | null
          risk_level: string | null
          severity: string
          status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          audit_id: string
          category?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closure_evidence?: string | null
          corrective_action?: string | null
          created_at?: string | null
          due_date?: string | null
          finding_description: string
          finding_number: number
          id?: string
          location_detail?: string | null
          photos?: Json | null
          potential_consequence?: string | null
          responsible_id?: string | null
          risk_level?: string | null
          severity: string
          status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          audit_id?: string
          category?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closure_evidence?: string | null
          corrective_action?: string | null
          created_at?: string | null
          due_date?: string | null
          finding_description?: string
          finding_number?: number
          id?: string
          location_detail?: string | null
          photos?: Json | null
          potential_consequence?: string | null
          responsible_id?: string | null
          risk_level?: string | null
          severity?: string
          status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_findings_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "audit_findings_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "audit_findings_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          changed_fields: string[] | null
          description: string | null
          entity_id: string | null
          entity_reference: string | null
          entity_type: string
          error_message: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          module: string
          new_values: Json | null
          old_values: Json | null
          request_method: string | null
          request_path: string | null
          session_id: string | null
          status: string | null
          timestamp: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          description?: string | null
          entity_id?: string | null
          entity_reference?: string | null
          entity_type: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          module: string
          new_values?: Json | null
          old_values?: Json | null
          request_method?: string | null
          request_path?: string | null
          session_id?: string | null
          status?: string | null
          timestamp?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          description?: string | null
          entity_id?: string | null
          entity_reference?: string | null
          entity_type?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          module?: string
          new_values?: Json | null
          old_values?: Json | null
          request_method?: string | null
          request_path?: string | null
          session_id?: string | null
          status?: string | null
          timestamp?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changes_summary: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          module: string
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          record_number: string | null
          record_type: string | null
          session_id: string | null
          user_agent: string | null
          user_email: string
          user_id: string
          user_name: string
          user_role: string
          workflow_status_from: string | null
          workflow_status_to: string | null
        }
        Insert: {
          action: string
          changes_summary?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          module: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          record_number?: string | null
          record_type?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_email: string
          user_id: string
          user_name: string
          user_role: string
          workflow_status_from?: string | null
          workflow_status_to?: string | null
        }
        Update: {
          action?: string
          changes_summary?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          module?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          record_number?: string | null
          record_type?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_email?: string
          user_id?: string
          user_name?: string
          user_role?: string
          workflow_status_from?: string | null
          workflow_status_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_types: {
        Row: {
          category: string
          checklist_template: Json | null
          created_at: string | null
          description: string | null
          frequency_days: number | null
          id: string
          is_active: boolean | null
          type_code: string
          type_name: string
        }
        Insert: {
          category: string
          checklist_template?: Json | null
          created_at?: string | null
          description?: string | null
          frequency_days?: number | null
          id?: string
          is_active?: boolean | null
          type_code: string
          type_name: string
        }
        Update: {
          category?: string
          checklist_template?: Json | null
          created_at?: string | null
          description?: string | null
          frequency_days?: number | null
          id?: string
          is_active?: boolean | null
          type_code?: string
          type_name?: string
        }
        Relationships: []
      }
      audits: {
        Row: {
          asset_id: string | null
          audit_number: string
          audit_type_id: string
          auditor_id: string | null
          auditor_name: string | null
          checklist_responses: Json | null
          completed_at: string | null
          conducted_date: string | null
          created_at: string | null
          created_by: string | null
          critical_findings: number | null
          department_id: string | null
          documents: Json | null
          id: string
          job_order_id: string | null
          location: string | null
          major_findings: number | null
          minor_findings: number | null
          observations: number | null
          overall_rating: string | null
          overall_score: number | null
          photos: Json | null
          scheduled_date: string | null
          status: string | null
          summary: string | null
        }
        Insert: {
          asset_id?: string | null
          audit_number: string
          audit_type_id: string
          auditor_id?: string | null
          auditor_name?: string | null
          checklist_responses?: Json | null
          completed_at?: string | null
          conducted_date?: string | null
          created_at?: string | null
          created_by?: string | null
          critical_findings?: number | null
          department_id?: string | null
          documents?: Json | null
          id?: string
          job_order_id?: string | null
          location?: string | null
          major_findings?: number | null
          minor_findings?: number | null
          observations?: number | null
          overall_rating?: string | null
          overall_score?: number | null
          photos?: Json | null
          scheduled_date?: string | null
          status?: string | null
          summary?: string | null
        }
        Update: {
          asset_id?: string | null
          audit_number?: string
          audit_type_id?: string
          auditor_id?: string | null
          auditor_name?: string | null
          checklist_responses?: Json | null
          completed_at?: string | null
          conducted_date?: string | null
          created_at?: string | null
          created_by?: string | null
          critical_findings?: number | null
          department_id?: string | null
          documents?: Json | null
          id?: string
          job_order_id?: string | null
          location?: string | null
          major_findings?: number | null
          minor_findings?: number | null
          observations?: number | null
          overall_rating?: string | null
          overall_score?: number | null
          photos?: Json | null
          scheduled_date?: string | null
          status?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audits_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "audits_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization_monthly"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "audits_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "maintenance_cost_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "audits_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "upcoming_maintenance"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "audits_audit_type_id_fkey"
            columns: ["audit_type_id"]
            isOneToOne: false
            referencedRelation: "audit_schedule"
            referencedColumns: ["audit_type_id"]
          },
          {
            foreignKeyName: "audits_audit_type_id_fkey"
            columns: ["audit_type_id"]
            isOneToOne: false
            referencedRelation: "audit_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "audits_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "audits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "audits_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "audits_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          endpoint_id: string | null
          error_message: string | null
          execution_id: string | null
          execution_time_ms: number | null
          id: string
          n8n_execution_id: string | null
          result_data: Json | null
          status: string | null
          trigger_data: Json | null
          trigger_type: string | null
          triggered_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          endpoint_id?: string | null
          error_message?: string | null
          execution_id?: string | null
          execution_time_ms?: number | null
          id?: string
          n8n_execution_id?: string | null
          result_data?: Json | null
          status?: string | null
          trigger_data?: Json | null
          trigger_type?: string | null
          triggered_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          endpoint_id?: string | null
          error_message?: string | null
          execution_id?: string | null
          execution_time_ms?: number | null
          id?: string
          n8n_execution_id?: string | null
          result_data?: Json | null
          status?: string | null
          trigger_data?: Json | null
          trigger_type?: string | null
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_templates: {
        Row: {
          category: string
          config_schema: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          required_credentials: Json | null
          template_code: string
          template_name: string
          workflow_json: Json | null
        }
        Insert: {
          category: string
          config_schema?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          required_credentials?: Json | null
          template_code: string
          template_name: string
          workflow_json?: Json | null
        }
        Update: {
          category?: string
          config_schema?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          required_credentials?: Json | null
          template_code?: string
          template_name?: string
          workflow_json?: Json | null
        }
        Relationships: []
      }
      axle_load_calculations: {
        Row: {
          assessment_id: string
          axle_loads: Json | null
          cargo_cog_from_front_m: number | null
          cargo_weight_tons: number | null
          configuration_name: string | null
          created_at: string | null
          id: string
          max_single_axle_load_tons: number | null
          max_tandem_axle_load_tons: number | null
          notes: string | null
          permit_required: boolean | null
          prime_mover_axle_count: number | null
          prime_mover_type: string | null
          prime_mover_weight_tons: number | null
          total_weight_tons: number | null
          trailer_axle_count: number | null
          trailer_axle_spacing_m: number | null
          trailer_tare_weight_tons: number | null
          trailer_type: string | null
          within_legal_limits: boolean | null
        }
        Insert: {
          assessment_id: string
          axle_loads?: Json | null
          cargo_cog_from_front_m?: number | null
          cargo_weight_tons?: number | null
          configuration_name?: string | null
          created_at?: string | null
          id?: string
          max_single_axle_load_tons?: number | null
          max_tandem_axle_load_tons?: number | null
          notes?: string | null
          permit_required?: boolean | null
          prime_mover_axle_count?: number | null
          prime_mover_type?: string | null
          prime_mover_weight_tons?: number | null
          total_weight_tons?: number | null
          trailer_axle_count?: number | null
          trailer_axle_spacing_m?: number | null
          trailer_tare_weight_tons?: number | null
          trailer_type?: string | null
          within_legal_limits?: boolean | null
        }
        Update: {
          assessment_id?: string
          axle_loads?: Json | null
          cargo_cog_from_front_m?: number | null
          cargo_weight_tons?: number | null
          configuration_name?: string | null
          created_at?: string | null
          id?: string
          max_single_axle_load_tons?: number | null
          max_tandem_axle_load_tons?: number | null
          notes?: string | null
          permit_required?: boolean | null
          prime_mover_axle_count?: number | null
          prime_mover_type?: string | null
          prime_mover_weight_tons?: number | null
          total_weight_tons?: number | null
          trailer_axle_count?: number | null
          trailer_axle_spacing_m?: number | null
          trailer_tare_weight_tons?: number | null
          trailer_type?: string | null
          within_legal_limits?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "axle_load_calculations_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "technical_assessments"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "berita_acara_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "berita_acara_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "berita_acara_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
        ]
      }
      bills_of_lading: {
        Row: {
          bl_date: string | null
          bl_number: string
          bl_type: string
          booking_id: string
          cargo_description: string
          carrier_bl_number: string | null
          consignee_address: string | null
          consignee_name: string | null
          consignee_to_order: boolean
          containers: Json
          created_at: string
          created_by: string | null
          draft_bl_url: string | null
          final_bl_url: string | null
          flag: string | null
          freight_amount: number | null
          freight_currency: string | null
          freight_terms: string
          gross_weight_kg: number | null
          id: string
          issued_at: string | null
          job_order_id: string | null
          marks_and_numbers: string | null
          measurement_cbm: number | null
          notify_party_address: string | null
          notify_party_name: string | null
          number_of_packages: number | null
          original_count: number
          package_type: string | null
          place_of_delivery: string | null
          place_of_receipt: string | null
          port_of_discharge: string
          port_of_loading: string
          released_at: string | null
          remarks: string | null
          shipped_on_board_date: string | null
          shipper_address: string | null
          shipper_name: string
          shipping_line_id: string | null
          status: string
          updated_at: string
          vessel_name: string
          voyage_number: string | null
        }
        Insert: {
          bl_date?: string | null
          bl_number: string
          bl_type?: string
          booking_id: string
          cargo_description: string
          carrier_bl_number?: string | null
          consignee_address?: string | null
          consignee_name?: string | null
          consignee_to_order?: boolean
          containers?: Json
          created_at?: string
          created_by?: string | null
          draft_bl_url?: string | null
          final_bl_url?: string | null
          flag?: string | null
          freight_amount?: number | null
          freight_currency?: string | null
          freight_terms?: string
          gross_weight_kg?: number | null
          id?: string
          issued_at?: string | null
          job_order_id?: string | null
          marks_and_numbers?: string | null
          measurement_cbm?: number | null
          notify_party_address?: string | null
          notify_party_name?: string | null
          number_of_packages?: number | null
          original_count?: number
          package_type?: string | null
          place_of_delivery?: string | null
          place_of_receipt?: string | null
          port_of_discharge: string
          port_of_loading: string
          released_at?: string | null
          remarks?: string | null
          shipped_on_board_date?: string | null
          shipper_address?: string | null
          shipper_name: string
          shipping_line_id?: string | null
          status?: string
          updated_at?: string
          vessel_name: string
          voyage_number?: string | null
        }
        Update: {
          bl_date?: string | null
          bl_number?: string
          bl_type?: string
          booking_id?: string
          cargo_description?: string
          carrier_bl_number?: string | null
          consignee_address?: string | null
          consignee_name?: string | null
          consignee_to_order?: boolean
          containers?: Json
          created_at?: string
          created_by?: string | null
          draft_bl_url?: string | null
          final_bl_url?: string | null
          flag?: string | null
          freight_amount?: number | null
          freight_currency?: string | null
          freight_terms?: string
          gross_weight_kg?: number | null
          id?: string
          issued_at?: string | null
          job_order_id?: string | null
          marks_and_numbers?: string | null
          measurement_cbm?: number | null
          notify_party_address?: string | null
          notify_party_name?: string | null
          number_of_packages?: number | null
          original_count?: number
          package_type?: string | null
          place_of_delivery?: string | null
          place_of_receipt?: string | null
          port_of_discharge?: string
          port_of_loading?: string
          released_at?: string | null
          remarks?: string | null
          shipped_on_board_date?: string | null
          shipper_address?: string | null
          shipper_name?: string
          shipping_line_id?: string | null
          status?: string
          updated_at?: string
          vessel_name?: string
          voyage_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bills_of_lading_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "active_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_of_lading_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "freight_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_of_lading_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "shipment_profitability"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "bills_of_lading_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "bills_of_lading_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "bills_of_lading_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_of_lading_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_of_lading_shipping_line_id_fkey"
            columns: ["shipping_line_id"]
            isOneToOne: false
            referencedRelation: "shipping_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_ips: {
        Row: {
          blocked_at: string | null
          blocked_by: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          ip_address: unknown
          is_active: boolean | null
          reason: string
        }
        Insert: {
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address: unknown
          is_active?: boolean | null
          reason: string
        }
        Update: {
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_ips_blocked_by_fkey"
            columns: ["blocked_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_amendments: {
        Row: {
          amendment_number: number
          amendment_type: string
          approved_at: string | null
          approved_by: string | null
          booking_id: string
          description: string
          id: string
          new_values: Json | null
          notes: string | null
          old_values: Json | null
          requested_at: string | null
          requested_by: string | null
          status: string | null
        }
        Insert: {
          amendment_number: number
          amendment_type: string
          approved_at?: string | null
          approved_by?: string | null
          booking_id: string
          description: string
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          requested_at?: string | null
          requested_by?: string | null
          status?: string | null
        }
        Update: {
          amendment_number?: number
          amendment_type?: string
          approved_at?: string | null
          approved_by?: string | null
          booking_id?: string
          description?: string
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          requested_at?: string | null
          requested_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_amendments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_amendments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "active_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_amendments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "freight_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_amendments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "shipment_profitability"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_amendments_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_containers: {
        Row: {
          booking_id: string
          cargo_description: string | null
          cargo_dimensions: Json | null
          container_number: string | null
          container_type: string
          created_at: string | null
          current_location: string | null
          gross_weight_kg: number | null
          id: string
          package_type: string | null
          packages_count: number | null
          seal_number: string | null
          status: string | null
        }
        Insert: {
          booking_id: string
          cargo_description?: string | null
          cargo_dimensions?: Json | null
          container_number?: string | null
          container_type: string
          created_at?: string | null
          current_location?: string | null
          gross_weight_kg?: number | null
          id?: string
          package_type?: string | null
          packages_count?: number | null
          seal_number?: string | null
          status?: string | null
        }
        Update: {
          booking_id?: string
          cargo_description?: string | null
          cargo_dimensions?: Json | null
          container_number?: string | null
          container_type?: string
          created_at?: string | null
          current_location?: string | null
          gross_weight_kg?: number | null
          id?: string
          package_type?: string | null
          packages_count?: number | null
          seal_number?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_containers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "active_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_containers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "freight_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_containers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "shipment_profitability"
            referencedColumns: ["booking_id"]
          },
        ]
      }
      booking_status_history: {
        Row: {
          booking_id: string
          changed_at: string | null
          changed_by: string | null
          id: string
          new_status: string
          notes: string | null
          old_status: string | null
        }
        Insert: {
          booking_id: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status: string
          notes?: string | null
          old_status?: string | null
        }
        Update: {
          booking_id?: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "active_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "freight_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "shipment_profitability"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_items: {
        Row: {
          budget_amount: number
          budget_month: number
          budget_year: number
          category: string
          created_at: string | null
          created_by: string | null
          department: string | null
          description: string
          id: string
          notes: string | null
          project_id: string | null
          subcategory: string | null
        }
        Insert: {
          budget_amount: number
          budget_month: number
          budget_year: number
          category: string
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description: string
          id?: string
          notes?: string | null
          project_id?: string | null
          subcategory?: string | null
        }
        Update: {
          budget_amount?: number
          budget_month?: number
          budget_year?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string
          id?: string
          notes?: string | null
          project_id?: string | null
          subcategory?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          vendor_invoice_id: string | null
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
          vendor_invoice_id?: string | null
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
          vendor_invoice_id?: string | null
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
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "bukti_kas_keluar_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "bukti_kas_keluar_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bukti_kas_keluar_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
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
          {
            foreignKeyName: "bukti_kas_keluar_vendor_invoice_id_fkey"
            columns: ["vendor_invoice_id"]
            isOneToOne: false
            referencedRelation: "vendor_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      cargo_manifests: {
        Row: {
          arrival_date: string | null
          bl_ids: Json
          created_at: string
          departure_date: string | null
          document_url: string | null
          id: string
          manifest_number: string
          manifest_type: string
          port_of_discharge: string | null
          port_of_loading: string | null
          status: string
          submitted_at: string | null
          submitted_to: string | null
          total_bls: number
          total_cbm: number
          total_containers: number
          total_packages: number
          total_weight_kg: number
          vessel_name: string
          voyage_number: string | null
        }
        Insert: {
          arrival_date?: string | null
          bl_ids?: Json
          created_at?: string
          departure_date?: string | null
          document_url?: string | null
          id?: string
          manifest_number: string
          manifest_type: string
          port_of_discharge?: string | null
          port_of_loading?: string | null
          status?: string
          submitted_at?: string | null
          submitted_to?: string | null
          total_bls?: number
          total_cbm?: number
          total_containers?: number
          total_packages?: number
          total_weight_kg?: number
          vessel_name: string
          voyage_number?: string | null
        }
        Update: {
          arrival_date?: string | null
          bl_ids?: Json
          created_at?: string
          departure_date?: string | null
          document_url?: string | null
          id?: string
          manifest_number?: string
          manifest_type?: string
          port_of_discharge?: string | null
          port_of_loading?: string | null
          status?: string
          submitted_at?: string | null
          submitted_to?: string | null
          total_bls?: number
          total_cbm?: number
          total_containers?: number
          total_packages?: number
          total_weight_kg?: number
          vessel_name?: string
          voyage_number?: string | null
        }
        Relationships: []
      }
      cash_flow_forecast: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          expected_amount: number
          flow_type: string
          forecast_date: string
          id: string
          invoice_id: string | null
          notes: string | null
          probability_percentage: number | null
          recurring_item: boolean | null
          weighted_amount: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          expected_amount: number
          flow_type: string
          forecast_date: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          probability_percentage?: number | null
          recurring_item?: boolean | null
          weighted_amount?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          expected_amount?: number
          flow_type?: string
          forecast_date?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          probability_percentage?: number | null
          recurring_item?: boolean | null
          weighted_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_forecast_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_transactions: {
        Row: {
          amount: number
          bank_account: string | null
          bkk_id: string | null
          bkm_id: string | null
          category: string
          created_at: string | null
          description: string | null
          flow_type: string
          id: string
          invoice_id: string | null
          transaction_date: string
        }
        Insert: {
          amount: number
          bank_account?: string | null
          bkk_id?: string | null
          bkm_id?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          flow_type: string
          id?: string
          invoice_id?: string | null
          transaction_date: string
        }
        Update: {
          amount?: number
          bank_account?: string | null
          bkk_id?: string | null
          bkm_id?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          flow_type?: string
          id?: string
          invoice_id?: string | null
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
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
      container_tracking: {
        Row: {
          arrival_date: string | null
          container_number: string
          container_size: string | null
          container_type: string | null
          created_at: string | null
          daily_rate: number | null
          free_time_days: number | null
          free_time_end: string | null
          gate_out_date: string | null
          id: string
          job_order_id: string | null
          peb_id: string | null
          pib_id: string | null
          seal_number: string | null
          status: string | null
          storage_days: number | null
          terminal: string | null
          total_storage_fee: number | null
          updated_at: string | null
        }
        Insert: {
          arrival_date?: string | null
          container_number: string
          container_size?: string | null
          container_type?: string | null
          created_at?: string | null
          daily_rate?: number | null
          free_time_days?: number | null
          free_time_end?: string | null
          gate_out_date?: string | null
          id?: string
          job_order_id?: string | null
          peb_id?: string | null
          pib_id?: string | null
          seal_number?: string | null
          status?: string | null
          storage_days?: number | null
          terminal?: string | null
          total_storage_fee?: number | null
          updated_at?: string | null
        }
        Update: {
          arrival_date?: string | null
          container_number?: string
          container_size?: string | null
          container_type?: string | null
          created_at?: string | null
          daily_rate?: number | null
          free_time_days?: number | null
          free_time_end?: string | null
          gate_out_date?: string | null
          id?: string
          job_order_id?: string | null
          peb_id?: string | null
          pib_id?: string | null
          seal_number?: string | null
          status?: string | null
          storage_days?: number | null
          terminal?: string | null
          total_storage_fee?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "container_tracking_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "container_tracking_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "container_tracking_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "container_tracking_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "container_tracking_peb_id_fkey"
            columns: ["peb_id"]
            isOneToOne: false
            referencedRelation: "peb_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "container_tracking_pib_id_fkey"
            columns: ["pib_id"]
            isOneToOne: false
            referencedRelation: "active_pib_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "container_tracking_pib_id_fkey"
            columns: ["pib_id"]
            isOneToOne: false
            referencedRelation: "pib_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_churn_risk: {
        Row: {
          action_date: string | null
          action_taken: string | null
          assessment_date: string
          churn_risk_score: number | null
          contributing_factors: Json | null
          created_at: string | null
          customer_id: string
          days_since_last_job: number | null
          engagement_score: number | null
          id: string
          payment_behavior_score: number | null
          recommended_actions: Json | null
          revenue_trend: string | null
          risk_level: string | null
        }
        Insert: {
          action_date?: string | null
          action_taken?: string | null
          assessment_date: string
          churn_risk_score?: number | null
          contributing_factors?: Json | null
          created_at?: string | null
          customer_id: string
          days_since_last_job?: number | null
          engagement_score?: number | null
          id?: string
          payment_behavior_score?: number | null
          recommended_actions?: Json | null
          revenue_trend?: string | null
          risk_level?: string | null
        }
        Update: {
          action_date?: string | null
          action_taken?: string | null
          assessment_date?: string
          churn_risk_score?: number | null
          contributing_factors?: Json | null
          created_at?: string | null
          customer_id?: string
          days_since_last_job?: number | null
          engagement_score?: number | null
          id?: string
          payment_behavior_score?: number | null
          recommended_actions?: Json | null
          revenue_trend?: string | null
          risk_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_churn_risk_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profitability"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_churn_risk_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_churn_risk_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_churn_risk_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_revenue"
            referencedColumns: ["customer_id"]
          },
        ]
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
      customs_document_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          document_type: string
          id: string
          include_company_header: boolean | null
          is_active: boolean | null
          orientation: string | null
          paper_size: string | null
          placeholders: Json | null
          template_code: string
          template_html: string
          template_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_type: string
          id?: string
          include_company_header?: boolean | null
          is_active?: boolean | null
          orientation?: string | null
          paper_size?: string | null
          placeholders?: Json | null
          template_code: string
          template_html: string
          template_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_type?: string
          id?: string
          include_company_header?: boolean | null
          is_active?: boolean | null
          orientation?: string | null
          paper_size?: string | null
          placeholders?: Json | null
          template_code?: string
          template_html?: string
          template_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customs_document_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customs_fee_types: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          fee_category: string
          fee_code: string
          fee_name: string
          id: string
          is_active: boolean | null
          is_government_fee: boolean | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          fee_category: string
          fee_code: string
          fee_name: string
          id?: string
          is_active?: boolean | null
          is_government_fee?: boolean | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          fee_category?: string
          fee_code?: string
          fee_name?: string
          id?: string
          is_active?: boolean | null
          is_government_fee?: boolean | null
        }
        Relationships: []
      }
      customs_fees: {
        Row: {
          amount: number
          billing_code: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          document_type: string
          fee_type_id: string
          id: string
          job_order_id: string | null
          notes: string | null
          ntb: string | null
          ntpn: string | null
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          peb_id: string | null
          pib_id: string | null
          receipt_url: string | null
          updated_at: string | null
          vendor_id: string | null
          vendor_invoice_number: string | null
        }
        Insert: {
          amount: number
          billing_code?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          document_type: string
          fee_type_id: string
          id?: string
          job_order_id?: string | null
          notes?: string | null
          ntb?: string | null
          ntpn?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          peb_id?: string | null
          pib_id?: string | null
          receipt_url?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          vendor_invoice_number?: string | null
        }
        Update: {
          amount?: number
          billing_code?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          document_type?: string
          fee_type_id?: string
          id?: string
          job_order_id?: string | null
          notes?: string | null
          ntb?: string | null
          ntpn?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          peb_id?: string | null
          pib_id?: string | null
          receipt_url?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          vendor_invoice_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customs_fees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customs_fees_fee_type_id_fkey"
            columns: ["fee_type_id"]
            isOneToOne: false
            referencedRelation: "customs_fee_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customs_fees_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "customs_fees_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "customs_fees_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customs_fees_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customs_fees_peb_id_fkey"
            columns: ["peb_id"]
            isOneToOne: false
            referencedRelation: "peb_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customs_fees_pib_id_fkey"
            columns: ["pib_id"]
            isOneToOne: false
            referencedRelation: "active_pib_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customs_fees_pib_id_fkey"
            columns: ["pib_id"]
            isOneToOne: false
            referencedRelation: "pib_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customs_fees_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      customs_offices: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          office_code: string
          office_name: string
          office_type: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          office_code: string
          office_name: string
          office_type: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          office_code?: string
          office_name?: string
          office_type?: string
          phone?: string | null
        }
        Relationships: []
      }
      dashboard_configs: {
        Row: {
          created_at: string | null
          id: string
          layout: Json | null
          refresh_interval: number | null
          role: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          layout?: Json | null
          refresh_interval?: number | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          layout?: Json | null
          refresh_interval?: number | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_configs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_layouts: {
        Row: {
          created_at: string | null
          dashboard_type: string
          id: string
          is_default: boolean | null
          layout_name: string | null
          role: string | null
          updated_at: string | null
          user_id: string | null
          widgets: Json
        }
        Insert: {
          created_at?: string | null
          dashboard_type: string
          id?: string
          is_default?: boolean | null
          layout_name?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
          widgets: Json
        }
        Update: {
          created_at?: string | null
          dashboard_type?: string
          id?: string
          is_default?: boolean | null
          layout_name?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
          widgets?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_layouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_widgets: {
        Row: {
          allowed_roles: string[] | null
          created_at: string | null
          data_source: string | null
          default_height: number | null
          default_width: number | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          settings_schema: Json | null
          widget_code: string
          widget_name: string
          widget_type: string
        }
        Insert: {
          allowed_roles?: string[] | null
          created_at?: string | null
          data_source?: string | null
          default_height?: number | null
          default_width?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          settings_schema?: Json | null
          widget_code: string
          widget_name: string
          widget_type: string
        }
        Update: {
          allowed_roles?: string[] | null
          created_at?: string | null
          data_source?: string | null
          default_height?: number | null
          default_width?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          settings_schema?: Json | null
          widget_code?: string
          widget_name?: string
          widget_type?: string
        }
        Relationships: []
      }
      data_access_log: {
        Row: {
          access_type: string
          data_type: string
          entity_id: string | null
          entity_type: string | null
          file_format: string | null
          id: string
          ip_address: unknown
          reason: string | null
          records_count: number | null
          timestamp: string
          user_id: string
        }
        Insert: {
          access_type: string
          data_type: string
          entity_id?: string | null
          entity_type?: string | null
          file_format?: string | null
          id?: string
          ip_address?: unknown
          reason?: string | null
          records_count?: number | null
          timestamp?: string
          user_id: string
        }
        Update: {
          access_type?: string
          data_type?: string
          entity_id?: string | null
          entity_type?: string | null
          file_format?: string | null
          id?: string
          ip_address?: unknown
          reason?: string | null
          records_count?: number | null
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_access_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      default_widget_layouts: {
        Row: {
          height: number | null
          id: string
          position_x: number | null
          position_y: number | null
          role: string
          widget_id: string
          width: number | null
        }
        Insert: {
          height?: number | null
          id?: string
          position_x?: number | null
          position_y?: number | null
          role: string
          widget_id: string
          width?: number | null
        }
        Update: {
          height?: number | null
          id?: string
          position_x?: number | null
          position_y?: number | null
          role?: string
          widget_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "default_widget_layouts_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "dashboard_widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_records: {
        Row: {
          deleted_at: string
          deleted_by: string | null
          id: string
          purge_after: string | null
          record_data: Json
          recovered_at: string | null
          recovered_by: string | null
          source_id: string
          source_table: string
        }
        Insert: {
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          purge_after?: string | null
          record_data: Json
          recovered_at?: string | null
          recovered_by?: string | null
          source_id: string
          source_table: string
        }
        Update: {
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          purge_after?: string | null
          record_data?: Json
          recovered_at?: string | null
          recovered_by?: string | null
          source_id?: string
          source_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "deleted_records_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deleted_records_recovered_by_fkey"
            columns: ["recovered_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          department_code: string
          department_name: string
          id: string
          is_active: boolean | null
          manager_id: string | null
          parent_department_id: string | null
        }
        Insert: {
          created_at?: string | null
          department_code: string
          department_name: string
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          parent_department_id?: string | null
        }
        Update: {
          created_at?: string | null
          department_code?: string
          department_name?: string
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          parent_department_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_parent_department_id_fkey"
            columns: ["parent_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_department_manager"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "fk_department_manager"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_department_manager"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      deployment_history: {
        Row: {
          build_number: string | null
          changelog: string | null
          commit_hash: string | null
          deployed_at: string
          deployed_by: string | null
          deployed_by_name: string | null
          environment: string
          id: string
          is_rollback: boolean
          metadata: Json | null
          rollback_reason: string | null
          rollback_target_version: string | null
          status: string
          version: string
        }
        Insert: {
          build_number?: string | null
          changelog?: string | null
          commit_hash?: string | null
          deployed_at?: string
          deployed_by?: string | null
          deployed_by_name?: string | null
          environment: string
          id?: string
          is_rollback?: boolean
          metadata?: Json | null
          rollback_reason?: string | null
          rollback_target_version?: string | null
          status?: string
          version: string
        }
        Update: {
          build_number?: string | null
          changelog?: string | null
          commit_hash?: string | null
          deployed_at?: string
          deployed_by?: string | null
          deployed_by_name?: string | null
          environment?: string
          id?: string
          is_rollback?: boolean
          metadata?: Json | null
          rollback_reason?: string | null
          rollback_target_version?: string | null
          status?: string
          version?: string
        }
        Relationships: []
      }
      disbursements: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          bank_account: string | null
          bkk_number: string
          checked_at: string | null
          checked_by: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          id: string
          is_active: boolean | null
          job_order_id: string | null
          paid_at: string | null
          paid_by: string | null
          payment_method: string | null
          reference_number: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          updated_at: string | null
          vendor_id: string | null
          vendor_invoice_id: string | null
          workflow_status: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account?: string | null
          bkk_number: string
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          job_order_id?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string | null
          reference_number?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          vendor_invoice_id?: string | null
          workflow_status?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account?: string | null
          bkk_number?: string
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          job_order_id?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string | null
          reference_number?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          vendor_invoice_id?: string | null
          workflow_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disbursements_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursements_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursements_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "disbursements_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "disbursements_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursements_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursements_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursements_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      document_templates: {
        Row: {
          available_variables: Json | null
          created_at: string | null
          css_styles: string | null
          document_type: string
          footer_html: string | null
          header_html: string | null
          html_template: string
          id: string
          include_letterhead: boolean | null
          is_active: boolean | null
          margins: Json | null
          orientation: string | null
          page_size: string | null
          template_code: string
          template_name: string
        }
        Insert: {
          available_variables?: Json | null
          created_at?: string | null
          css_styles?: string | null
          document_type: string
          footer_html?: string | null
          header_html?: string | null
          html_template: string
          id?: string
          include_letterhead?: boolean | null
          is_active?: boolean | null
          margins?: Json | null
          orientation?: string | null
          page_size?: string | null
          template_code: string
          template_name: string
        }
        Update: {
          available_variables?: Json | null
          created_at?: string | null
          css_styles?: string | null
          document_type?: string
          footer_html?: string | null
          header_html?: string | null
          html_template?: string
          id?: string
          include_letterhead?: boolean | null
          is_active?: boolean | null
          margins?: Json | null
          orientation?: string | null
          page_size?: string | null
          template_code?: string
          template_name?: string
        }
        Relationships: []
      }
      drawing_categories: {
        Row: {
          category_code: string
          category_name: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          numbering_prefix: string | null
        }
        Insert: {
          category_code: string
          category_name: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          numbering_prefix?: string | null
        }
        Update: {
          category_code?: string
          category_name?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          numbering_prefix?: string | null
        }
        Relationships: []
      }
      drawing_revisions: {
        Row: {
          approved_by: string | null
          change_description: string
          change_reason: string | null
          checked_by: string | null
          created_at: string | null
          drafted_by: string | null
          drawing_id: string
          file_url: string | null
          id: string
          is_current: boolean | null
          revision_date: string | null
          revision_number: string
        }
        Insert: {
          approved_by?: string | null
          change_description: string
          change_reason?: string | null
          checked_by?: string | null
          created_at?: string | null
          drafted_by?: string | null
          drawing_id: string
          file_url?: string | null
          id?: string
          is_current?: boolean | null
          revision_date?: string | null
          revision_number: string
        }
        Update: {
          approved_by?: string | null
          change_description?: string
          change_reason?: string | null
          checked_by?: string | null
          created_at?: string | null
          drafted_by?: string | null
          drawing_id?: string
          file_url?: string | null
          id?: string
          is_current?: boolean | null
          revision_date?: string | null
          revision_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "drawing_revisions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "drawing_revisions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_revisions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "drawing_revisions_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "drawing_revisions_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_revisions_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "drawing_revisions_drafted_by_fkey"
            columns: ["drafted_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "drawing_revisions_drafted_by_fkey"
            columns: ["drafted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_revisions_drafted_by_fkey"
            columns: ["drafted_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "drawing_revisions_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawing_register"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_revisions_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawings"
            referencedColumns: ["id"]
          },
        ]
      }
      drawing_transmittals: {
        Row: {
          acknowledged_at: string | null
          cover_letter: string | null
          created_at: string | null
          drawings: Json
          id: string
          job_order_id: string | null
          notes: string | null
          project_id: string | null
          purpose: string
          recipient_company: string
          recipient_email: string | null
          recipient_name: string | null
          sent_at: string | null
          sent_by: string | null
          status: string | null
          transmittal_number: string
        }
        Insert: {
          acknowledged_at?: string | null
          cover_letter?: string | null
          created_at?: string | null
          drawings?: Json
          id?: string
          job_order_id?: string | null
          notes?: string | null
          project_id?: string | null
          purpose: string
          recipient_company: string
          recipient_email?: string | null
          recipient_name?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          transmittal_number: string
        }
        Update: {
          acknowledged_at?: string | null
          cover_letter?: string | null
          created_at?: string | null
          drawings?: Json
          id?: string
          job_order_id?: string | null
          notes?: string | null
          project_id?: string | null
          purpose?: string
          recipient_company?: string
          recipient_email?: string | null
          recipient_name?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          transmittal_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "drawing_transmittals_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "drawing_transmittals_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "drawing_transmittals_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_transmittals_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawing_transmittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      drawings: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assessment_id: string | null
          category_id: string
          checked_at: string | null
          checked_by: string | null
          created_at: string | null
          created_by: string | null
          current_revision: string | null
          description: string | null
          distribution_list: Json | null
          drafted_at: string | null
          drafted_by: string | null
          drawing_number: string
          file_size_kb: number | null
          file_type: string | null
          file_url: string | null
          id: string
          issued_at: string | null
          issued_by: string | null
          jmp_id: string | null
          job_order_id: string | null
          notes: string | null
          paper_size: string | null
          project_id: string | null
          revision_count: number | null
          route_survey_id: string | null
          scale: string | null
          status: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assessment_id?: string | null
          category_id: string
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          created_by?: string | null
          current_revision?: string | null
          description?: string | null
          distribution_list?: Json | null
          drafted_at?: string | null
          drafted_by?: string | null
          drawing_number: string
          file_size_kb?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          jmp_id?: string | null
          job_order_id?: string | null
          notes?: string | null
          paper_size?: string | null
          project_id?: string | null
          revision_count?: number | null
          route_survey_id?: string | null
          scale?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assessment_id?: string | null
          category_id?: string
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          created_by?: string | null
          current_revision?: string | null
          description?: string | null
          distribution_list?: Json | null
          drafted_at?: string | null
          drafted_by?: string | null
          drawing_number?: string
          file_size_kb?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          jmp_id?: string | null
          job_order_id?: string | null
          notes?: string | null
          paper_size?: string | null
          project_id?: string | null
          revision_count?: number | null
          route_survey_id?: string | null
          scale?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drawings_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "drawings_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "drawings_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "technical_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "drawing_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "drawings_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "drawings_drafted_by_fkey"
            columns: ["drafted_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "drawings_drafted_by_fkey"
            columns: ["drafted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_drafted_by_fkey"
            columns: ["drafted_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "drawings_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "drawings_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "drawings_jmp_id_fkey"
            columns: ["jmp_id"]
            isOneToOne: false
            referencedRelation: "active_journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_jmp_id_fkey"
            columns: ["jmp_id"]
            isOneToOne: false
            referencedRelation: "journey_management_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "drawings_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "drawings_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_route_survey_id_fkey"
            columns: ["route_survey_id"]
            isOneToOne: false
            referencedRelation: "route_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_payroll_setup: {
        Row: {
          component_id: string
          created_at: string | null
          custom_amount: number | null
          custom_rate: number | null
          effective_from: string | null
          effective_to: string | null
          employee_id: string
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          component_id: string
          created_at?: string | null
          custom_amount?: number | null
          custom_rate?: number | null
          effective_from?: string | null
          effective_to?: string | null
          employee_id: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          component_id?: string
          created_at?: string | null
          custom_amount?: number | null
          custom_rate?: number | null
          effective_from?: string | null
          effective_to?: string | null
          employee_id?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_payroll_setup_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "payroll_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_payroll_setup_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_payroll_setup_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_payroll_setup_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      employee_skills: {
        Row: {
          certificate_url: string | null
          certification_date: string | null
          certification_number: string | null
          created_at: string | null
          employee_id: string
          expiry_date: string | null
          id: string
          is_certified: boolean | null
          level: string | null
          notes: string | null
          skill_id: string
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          certificate_url?: string | null
          certification_date?: string | null
          certification_number?: string | null
          created_at?: string | null
          employee_id: string
          expiry_date?: string | null
          id?: string
          is_certified?: boolean | null
          level?: string | null
          notes?: string | null
          skill_id: string
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          certificate_url?: string | null
          certification_date?: string | null
          certification_number?: string | null
          created_at?: string | null
          employee_id?: string
          expiry_date?: string | null
          id?: string
          is_certified?: boolean | null
          level?: string | null
          notes?: string | null
          skill_id?: string
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_gap_analysis"
            referencedColumns: ["skill_id"]
          },
          {
            foreignKeyName: "employee_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skills_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_training_records: {
        Row: {
          assessment_passed: boolean | null
          assessment_score: number | null
          certificate_number: string | null
          certificate_url: string | null
          completion_date: string | null
          course_id: string
          created_at: string | null
          employee_id: string
          id: string
          notes: string | null
          recorded_by: string | null
          status: string | null
          trainer_name: string | null
          training_cost: number | null
          training_date: string
          training_location: string | null
          training_provider: string | null
          updated_at: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          assessment_passed?: boolean | null
          assessment_score?: number | null
          certificate_number?: string | null
          certificate_url?: string | null
          completion_date?: string | null
          course_id: string
          created_at?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: string | null
          trainer_name?: string | null
          training_cost?: number | null
          training_date: string
          training_location?: string | null
          training_provider?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          assessment_passed?: boolean | null
          assessment_score?: number | null
          certificate_number?: string | null
          certificate_url?: string | null
          completion_date?: string | null
          course_id?: string
          created_at?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: string | null
          trainer_name?: string | null
          training_cost?: number | null
          training_date?: string
          training_location?: string | null
          training_provider?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_training_records_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "safety_training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_training_records_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "employee_training_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_training_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_training_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_training_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_account_name: string | null
          bank_name: string | null
          base_salary: number | null
          city: string | null
          created_at: string | null
          created_by: string | null
          date_of_birth: string | null
          department_id: string | null
          documents: Json | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          employee_code: string
          employment_type: string | null
          end_date: string | null
          full_name: string
          gender: string | null
          id: string
          id_number: string | null
          join_date: string
          marital_status: string | null
          nickname: string | null
          notes: string | null
          phone: string | null
          photo_url: string | null
          place_of_birth: string | null
          position_id: string | null
          religion: string | null
          reporting_to: string | null
          resignation_date: string | null
          resignation_reason: string | null
          salary_currency: string | null
          schedule_id: string | null
          status: string | null
          tax_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_name?: string | null
          base_salary?: number | null
          city?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          documents?: Json | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          employee_code: string
          employment_type?: string | null
          end_date?: string | null
          full_name: string
          gender?: string | null
          id?: string
          id_number?: string | null
          join_date: string
          marital_status?: string | null
          nickname?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          place_of_birth?: string | null
          position_id?: string | null
          religion?: string | null
          reporting_to?: string | null
          resignation_date?: string | null
          resignation_reason?: string | null
          salary_currency?: string | null
          schedule_id?: string | null
          status?: string | null
          tax_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_name?: string | null
          base_salary?: number | null
          city?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          documents?: Json | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          employee_code?: string
          employment_type?: string | null
          end_date?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          id_number?: string | null
          join_date?: string
          marital_status?: string | null
          nickname?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          place_of_birth?: string | null
          position_id?: string | null
          religion?: string | null
          reporting_to?: string | null
          resignation_date?: string | null
          resignation_reason?: string | null
          salary_currency?: string | null
          schedule_id?: string | null
          status?: string | null
          tax_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_reporting_to_fkey"
            columns: ["reporting_to"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employees_reporting_to_fkey"
            columns: ["reporting_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_reporting_to_fkey"
            columns: ["reporting_to"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employees_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "work_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      engineering_assessments: {
        Row: {
          additional_cost_estimate: number | null
          assessment_type: string
          assigned_at: string | null
          assigned_to: string | null
          attachment_urls: Json | null
          completed_at: string | null
          completed_by: string | null
          cost_justification: string | null
          created_at: string | null
          findings: string | null
          id: string
          notes: string | null
          pjo_id: string | null
          quotation_id: string | null
          recommendations: string | null
          risk_level: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          additional_cost_estimate?: number | null
          assessment_type: string
          assigned_at?: string | null
          assigned_to?: string | null
          attachment_urls?: Json | null
          completed_at?: string | null
          completed_by?: string | null
          cost_justification?: string | null
          created_at?: string | null
          findings?: string | null
          id?: string
          notes?: string | null
          pjo_id?: string | null
          quotation_id?: string | null
          recommendations?: string | null
          risk_level?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          additional_cost_estimate?: number | null
          assessment_type?: string
          assigned_at?: string | null
          assigned_to?: string | null
          attachment_urls?: Json | null
          completed_at?: string | null
          completed_by?: string | null
          cost_justification?: string | null
          created_at?: string | null
          findings?: string | null
          id?: string
          notes?: string | null
          pjo_id?: string | null
          quotation_id?: string | null
          recommendations?: string | null
          risk_level?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engineering_assessments_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engineering_assessments_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engineering_assessments_pjo_id_fkey"
            columns: ["pjo_id"]
            isOneToOne: false
            referencedRelation: "proforma_job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engineering_assessments_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotation_dashboard_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engineering_assessments_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      engineering_resources: {
        Row: {
          asset_id: string | null
          base_location: string | null
          capacity_unit: string | null
          certifications: Json | null
          created_at: string | null
          daily_capacity: number | null
          daily_rate: number | null
          description: string | null
          employee_id: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          is_available: boolean | null
          resource_code: string
          resource_name: string
          resource_type: string
          skills: Json | null
          unavailable_reason: string | null
          unavailable_until: string | null
          updated_at: string | null
        }
        Insert: {
          asset_id?: string | null
          base_location?: string | null
          capacity_unit?: string | null
          certifications?: Json | null
          created_at?: string | null
          daily_capacity?: number | null
          daily_rate?: number | null
          description?: string | null
          employee_id?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          resource_code: string
          resource_name: string
          resource_type: string
          skills?: Json | null
          unavailable_reason?: string | null
          unavailable_until?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string | null
          base_location?: string | null
          capacity_unit?: string | null
          certifications?: Json | null
          created_at?: string | null
          daily_capacity?: number | null
          daily_rate?: number | null
          description?: string | null
          employee_id?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_available?: boolean | null
          resource_code?: string
          resource_name?: string
          resource_type?: string
          skills?: Json | null
          unavailable_reason?: string | null
          unavailable_until?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engineering_resources_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engineering_resources_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "engineering_resources_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization_monthly"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "engineering_resources_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engineering_resources_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "maintenance_cost_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "engineering_resources_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "upcoming_maintenance"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "engineering_resources_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "engineering_resources_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engineering_resources_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      equipment_rates: {
        Row: {
          asset_id: string | null
          category_id: string | null
          created_at: string | null
          effective_from: string
          effective_to: string | null
          id: string
          includes_fuel: boolean | null
          includes_operator: boolean | null
          is_active: boolean | null
          min_days: number | null
          rate_amount: number
          rate_type: string
        }
        Insert: {
          asset_id?: string | null
          category_id?: string | null
          created_at?: string | null
          effective_from: string
          effective_to?: string | null
          id?: string
          includes_fuel?: boolean | null
          includes_operator?: boolean | null
          is_active?: boolean | null
          min_days?: number | null
          rate_amount: number
          rate_type: string
        }
        Update: {
          asset_id?: string | null
          category_id?: string | null
          created_at?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          includes_fuel?: boolean | null
          includes_operator?: boolean | null
          is_active?: boolean | null
          min_days?: number | null
          rate_amount?: number
          rate_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_rates_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_rates_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "equipment_rates_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization_monthly"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "equipment_rates_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_rates_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "maintenance_cost_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "equipment_rates_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "upcoming_maintenance"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "equipment_rates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      error_tracking: {
        Row: {
          environment: string | null
          error_code: string
          error_hash: string | null
          error_message: string
          error_stack: string | null
          error_type: string
          first_seen_at: string | null
          function_name: string | null
          id: string
          last_seen_at: string | null
          module: string | null
          occurrence_count: number | null
          request_body: Json | null
          request_method: string | null
          request_params: Json | null
          request_path: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          session_id: string | null
          status: string | null
          timestamp: string
          user_id: string | null
          version: string | null
        }
        Insert: {
          environment?: string | null
          error_code: string
          error_hash?: string | null
          error_message: string
          error_stack?: string | null
          error_type: string
          first_seen_at?: string | null
          function_name?: string | null
          id?: string
          last_seen_at?: string | null
          module?: string | null
          occurrence_count?: number | null
          request_body?: Json | null
          request_method?: string | null
          request_params?: Json | null
          request_path?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          status?: string | null
          timestamp?: string
          user_id?: string | null
          version?: string | null
        }
        Update: {
          environment?: string | null
          error_code?: string
          error_hash?: string | null
          error_message?: string
          error_stack?: string | null
          error_type?: string
          first_seen_at?: string | null
          function_name?: string | null
          id?: string
          last_seen_at?: string | null
          module?: string | null
          occurrence_count?: number | null
          request_body?: Json | null
          request_method?: string | null
          request_params?: Json | null
          request_path?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          session_id?: string | null
          status?: string | null
          timestamp?: string
          user_id?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_tracking_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_queue: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_source: string
          event_type: string
          id: string
          max_retries: number | null
          payload: Json
          processed_at: string | null
          retry_count: number | null
          scheduled_for: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_source: string
          event_type: string
          id?: string
          max_retries?: number | null
          payload: Json
          processed_at?: string | null
          retry_count?: number | null
          scheduled_for?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_source?: string
          event_type?: string
          id?: string
          max_retries?: number | null
          payload?: Json
          processed_at?: string | null
          retry_count?: number | null
          scheduled_for?: string | null
          status?: string | null
        }
        Relationships: []
      }
      export_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          permit_type: string | null
          requires_export_duty: boolean | null
          requires_permit: boolean | null
          type_code: string
          type_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          permit_type?: string | null
          requires_export_duty?: boolean | null
          requires_permit?: boolean | null
          type_code: string
          type_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          permit_type?: string | null
          requires_export_duty?: boolean | null
          requires_permit?: boolean | null
          type_code?: string
          type_name?: string
        }
        Relationships: []
      }
      external_id_mappings: {
        Row: {
          connection_id: string
          external_data: Json | null
          external_id: string
          id: string
          local_id: string
          local_table: string
          synced_at: string | null
        }
        Insert: {
          connection_id: string
          external_data?: Json | null
          external_id: string
          id?: string
          local_id: string
          local_table: string
          synced_at?: string | null
        }
        Update: {
          connection_id?: string
          external_data?: Json | null
          external_id?: string
          id?: string
          local_id?: string
          local_table?: string
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_id_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          disable_at: string | null
          enable_at: string | null
          flag_key: string
          id: string
          is_enabled: boolean
          metadata: Json | null
          name: string
          rollout_percentage: number | null
          target_roles: string[] | null
          target_users: string[] | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          disable_at?: string | null
          enable_at?: string | null
          flag_key: string
          id?: string
          is_enabled?: boolean
          metadata?: Json | null
          name: string
          rollout_percentage?: number | null
          target_roles?: string[] | null
          target_users?: string[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          disable_at?: string | null
          enable_at?: string | null
          flag_key?: string
          id?: string
          is_enabled?: boolean
          metadata?: Json | null
          name?: string
          rollout_percentage?: number | null
          target_roles?: string[] | null
          target_users?: string[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      feedback_comments: {
        Row: {
          comment_by: string | null
          comment_by_name: string | null
          comment_text: string
          created_at: string | null
          feedback_id: string
          id: string
          is_internal: boolean | null
        }
        Insert: {
          comment_by?: string | null
          comment_by_name?: string | null
          comment_text: string
          created_at?: string | null
          feedback_id: string
          id?: string
          is_internal?: boolean | null
        }
        Update: {
          comment_by?: string | null
          comment_by_name?: string | null
          comment_text?: string
          created_at?: string | null
          feedback_id?: string
          id?: string
          is_internal?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_comments_comment_by_fkey"
            columns: ["comment_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_comments_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback_list_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_comments_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_status_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          changed_by_name: string | null
          feedback_id: string
          id: string
          new_status: string
          notes: string | null
          old_status: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          changed_by_name?: string | null
          feedback_id: string
          id?: string
          new_status: string
          notes?: string | null
          old_status?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          changed_by_name?: string | null
          feedback_id?: string
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_status_history_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback_list_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_status_history_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_submissions: {
        Row: {
          actual_behavior: string | null
          affected_module: string | null
          assigned_at: string | null
          assigned_to: string | null
          browser_info: Json | null
          business_justification: string | null
          console_logs: string | null
          created_at: string | null
          current_behavior: string | null
          description: string
          desired_behavior: string | null
          duplicate_of: string | null
          error_message: string | null
          expected_behavior: string | null
          feedback_type: string
          id: string
          module: string | null
          page_title: string | null
          page_url: string | null
          priority_suggested: string | null
          related_tickets: string[] | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_in_version: string | null
          screen_resolution: string | null
          screenshots: Json | null
          severity: string | null
          status: string | null
          steps_to_reproduce: string | null
          submitted_by: string | null
          submitted_by_department: string | null
          submitted_by_email: string | null
          submitted_by_name: string | null
          submitted_by_role: string | null
          tags: string[] | null
          ticket_number: string
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_behavior?: string | null
          affected_module?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          browser_info?: Json | null
          business_justification?: string | null
          console_logs?: string | null
          created_at?: string | null
          current_behavior?: string | null
          description: string
          desired_behavior?: string | null
          duplicate_of?: string | null
          error_message?: string | null
          expected_behavior?: string | null
          feedback_type: string
          id?: string
          module?: string | null
          page_title?: string | null
          page_url?: string | null
          priority_suggested?: string | null
          related_tickets?: string[] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_in_version?: string | null
          screen_resolution?: string | null
          screenshots?: Json | null
          severity?: string | null
          status?: string | null
          steps_to_reproduce?: string | null
          submitted_by?: string | null
          submitted_by_department?: string | null
          submitted_by_email?: string | null
          submitted_by_name?: string | null
          submitted_by_role?: string | null
          tags?: string[] | null
          ticket_number: string
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_behavior?: string | null
          affected_module?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          browser_info?: Json | null
          business_justification?: string | null
          console_logs?: string | null
          created_at?: string | null
          current_behavior?: string | null
          description?: string
          desired_behavior?: string | null
          duplicate_of?: string | null
          error_message?: string | null
          expected_behavior?: string | null
          feedback_type?: string
          id?: string
          module?: string | null
          page_title?: string | null
          page_url?: string | null
          priority_suggested?: string | null
          related_tickets?: string[] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_in_version?: string | null
          screen_resolution?: string | null
          screenshots?: Json | null
          severity?: string | null
          status?: string | null
          steps_to_reproduce?: string | null
          submitted_by?: string | null
          submitted_by_department?: string | null
          submitted_by_email?: string | null
          submitted_by_name?: string | null
          submitted_by_role?: string | null
          tags?: string[] | null
          ticket_number?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_submissions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_submissions_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "feedback_list_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_submissions_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "feedback_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_submissions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      freight_bookings: {
        Row: {
          booking_number: string
          cargo_description: string
          cargo_height_m: number | null
          cargo_length_m: number | null
          cargo_width_m: number | null
          carrier_booking_number: string | null
          commodity_type: string | null
          confirmed_at: string | null
          consignee_address: string | null
          consignee_name: string | null
          container_quantity: number | null
          container_type: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          cutoff_date: string | null
          cutoff_time: string | null
          dangerous_goods: Json | null
          destination_port_id: string
          documents: Json | null
          eta: string | null
          etd: string | null
          freight_currency: string | null
          freight_rate: number | null
          freight_terms: string | null
          gross_weight_kg: number | null
          hs_code: string | null
          id: string
          incoterm: string | null
          job_order_id: string | null
          notes: string | null
          notify_address: string | null
          notify_party: string | null
          origin_port_id: string
          packages_count: number | null
          quotation_id: string | null
          shipper_address: string | null
          shipper_name: string | null
          shipping_line_id: string
          si_cutoff: string | null
          special_requirements: string | null
          status: string | null
          total_freight: number | null
          updated_at: string | null
          vessel_name: string | null
          volume_cbm: number | null
          voyage_number: string | null
        }
        Insert: {
          booking_number: string
          cargo_description: string
          cargo_height_m?: number | null
          cargo_length_m?: number | null
          cargo_width_m?: number | null
          carrier_booking_number?: string | null
          commodity_type?: string | null
          confirmed_at?: string | null
          consignee_address?: string | null
          consignee_name?: string | null
          container_quantity?: number | null
          container_type?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          cutoff_date?: string | null
          cutoff_time?: string | null
          dangerous_goods?: Json | null
          destination_port_id: string
          documents?: Json | null
          eta?: string | null
          etd?: string | null
          freight_currency?: string | null
          freight_rate?: number | null
          freight_terms?: string | null
          gross_weight_kg?: number | null
          hs_code?: string | null
          id?: string
          incoterm?: string | null
          job_order_id?: string | null
          notes?: string | null
          notify_address?: string | null
          notify_party?: string | null
          origin_port_id: string
          packages_count?: number | null
          quotation_id?: string | null
          shipper_address?: string | null
          shipper_name?: string | null
          shipping_line_id: string
          si_cutoff?: string | null
          special_requirements?: string | null
          status?: string | null
          total_freight?: number | null
          updated_at?: string | null
          vessel_name?: string | null
          volume_cbm?: number | null
          voyage_number?: string | null
        }
        Update: {
          booking_number?: string
          cargo_description?: string
          cargo_height_m?: number | null
          cargo_length_m?: number | null
          cargo_width_m?: number | null
          carrier_booking_number?: string | null
          commodity_type?: string | null
          confirmed_at?: string | null
          consignee_address?: string | null
          consignee_name?: string | null
          container_quantity?: number | null
          container_type?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          cutoff_date?: string | null
          cutoff_time?: string | null
          dangerous_goods?: Json | null
          destination_port_id?: string
          documents?: Json | null
          eta?: string | null
          etd?: string | null
          freight_currency?: string | null
          freight_rate?: number | null
          freight_terms?: string | null
          gross_weight_kg?: number | null
          hs_code?: string | null
          id?: string
          incoterm?: string | null
          job_order_id?: string | null
          notes?: string | null
          notify_address?: string | null
          notify_party?: string | null
          origin_port_id?: string
          packages_count?: number | null
          quotation_id?: string | null
          shipper_address?: string | null
          shipper_name?: string | null
          shipping_line_id?: string
          si_cutoff?: string | null
          special_requirements?: string | null
          status?: string | null
          total_freight?: number | null
          updated_at?: string | null
          vessel_name?: string | null
          volume_cbm?: number | null
          voyage_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freight_bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profitability"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "freight_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "freight_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_revenue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "freight_bookings_destination_port_id_fkey"
            columns: ["destination_port_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_bookings_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "freight_bookings_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "freight_bookings_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_bookings_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_bookings_origin_port_id_fkey"
            columns: ["origin_port_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_bookings_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotation_dashboard_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_bookings_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_bookings_shipping_line_id_fkey"
            columns: ["shipping_line_id"]
            isOneToOne: false
            referencedRelation: "shipping_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_customs_documents: {
        Row: {
          created_at: string | null
          created_by: string | null
          document_data: Json
          document_number: string
          id: string
          job_order_id: string | null
          pdf_url: string | null
          peb_id: string | null
          pib_id: string | null
          status: string | null
          template_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          document_data: Json
          document_number: string
          id?: string
          job_order_id?: string | null
          pdf_url?: string | null
          peb_id?: string | null
          pib_id?: string | null
          status?: string | null
          template_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          document_data?: Json
          document_number?: string
          id?: string
          job_order_id?: string | null
          pdf_url?: string | null
          peb_id?: string | null
          pib_id?: string | null
          status?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_customs_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_customs_documents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "generated_customs_documents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "generated_customs_documents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_customs_documents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_customs_documents_peb_id_fkey"
            columns: ["peb_id"]
            isOneToOne: false
            referencedRelation: "peb_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_customs_documents_pib_id_fkey"
            columns: ["pib_id"]
            isOneToOne: false
            referencedRelation: "active_pib_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_customs_documents_pib_id_fkey"
            columns: ["pib_id"]
            isOneToOne: false
            referencedRelation: "pib_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_customs_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "customs_document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          created_at: string | null
          document_number: string | null
          document_type: string
          entity_id: string | null
          entity_type: string | null
          file_name: string | null
          file_size_kb: number | null
          file_url: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          sent_at: string | null
          sent_to_email: string | null
          template_id: string | null
          variables_data: Json | null
        }
        Insert: {
          created_at?: string | null
          document_number?: string | null
          document_type: string
          entity_id?: string | null
          entity_type?: string | null
          file_name?: string | null
          file_size_kb?: number | null
          file_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          sent_at?: string | null
          sent_to_email?: string | null
          template_id?: string | null
          variables_data?: Json | null
        }
        Update: {
          created_at?: string | null
          document_number?: string | null
          document_type?: string
          entity_id?: string | null
          entity_type?: string | null
          file_name?: string | null
          file_size_kb?: number | null
          file_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          sent_at?: string | null
          sent_to_email?: string | null
          template_id?: string | null
          variables_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      guided_tours: {
        Row: {
          applicable_roles: string[] | null
          created_at: string | null
          description: string | null
          display_order: number | null
          estimated_minutes: number | null
          id: string
          is_active: boolean | null
          start_route: string
          steps: Json
          tour_code: string
          tour_name: string
        }
        Insert: {
          applicable_roles?: string[] | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          estimated_minutes?: number | null
          id?: string
          is_active?: boolean | null
          start_route: string
          steps?: Json
          tour_code: string
          tour_name: string
        }
        Update: {
          applicable_roles?: string[] | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          estimated_minutes?: number | null
          id?: string
          is_active?: boolean | null
          start_route?: string
          steps?: Json
          tour_code?: string
          tour_name?: string
        }
        Relationships: []
      }
      help_articles: {
        Row: {
          applicable_roles: string[] | null
          article_slug: string
          category: string
          content: string
          created_at: string | null
          display_order: number | null
          helpful_count: number | null
          id: string
          is_published: boolean | null
          not_helpful_count: number | null
          related_articles: string[] | null
          related_routes: string[] | null
          summary: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          applicable_roles?: string[] | null
          article_slug: string
          category: string
          content: string
          created_at?: string | null
          display_order?: number | null
          helpful_count?: number | null
          id?: string
          is_published?: boolean | null
          not_helpful_count?: number | null
          related_articles?: string[] | null
          related_routes?: string[] | null
          summary?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          applicable_roles?: string[] | null
          article_slug?: string
          category?: string
          content?: string
          created_at?: string | null
          display_order?: number | null
          helpful_count?: number | null
          id?: string
          is_published?: boolean | null
          not_helpful_count?: number | null
          related_articles?: string[] | null
          related_routes?: string[] | null
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      help_faqs: {
        Row: {
          answer: string
          applicable_roles: string[] | null
          category: string
          created_at: string | null
          display_order: number | null
          id: string
          question: string
        }
        Insert: {
          answer: string
          applicable_roles?: string[] | null
          category: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          question: string
        }
        Update: {
          answer?: string
          applicable_roles?: string[] | null
          category?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          question?: string
        }
        Relationships: []
      }
      holidays: {
        Row: {
          created_at: string | null
          holiday_date: string
          holiday_name: string
          id: string
          is_company: boolean | null
          is_national: boolean | null
        }
        Insert: {
          created_at?: string | null
          holiday_date: string
          holiday_name: string
          id?: string
          is_company?: boolean | null
          is_national?: boolean | null
        }
        Update: {
          created_at?: string | null
          holiday_date?: string
          holiday_name?: string
          id?: string
          is_company?: boolean | null
          is_national?: boolean | null
        }
        Relationships: []
      }
      hs_chapters: {
        Row: {
          chapter_code: string
          chapter_name: string
          chapter_name_id: string | null
          created_at: string | null
          id: string
          section_name: string | null
          section_number: number | null
        }
        Insert: {
          chapter_code: string
          chapter_name: string
          chapter_name_id?: string | null
          created_at?: string | null
          id?: string
          section_name?: string | null
          section_number?: number | null
        }
        Update: {
          chapter_code?: string
          chapter_name?: string
          chapter_name_id?: string | null
          created_at?: string | null
          id?: string
          section_name?: string | null
          section_number?: number | null
        }
        Relationships: []
      }
      hs_code_search_history: {
        Row: {
          id: string
          search_term: string | null
          searched_at: string | null
          selected_hs_code: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          search_term?: string | null
          searched_at?: string | null
          selected_hs_code?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          search_term?: string | null
          searched_at?: string | null
          selected_hs_code?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hs_code_search_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hs_codes: {
        Row: {
          created_at: string | null
          description: string
          description_id: string | null
          export_restriction_type: string | null
          has_export_restrictions: boolean | null
          has_restrictions: boolean | null
          heading_id: string | null
          hs_code: string
          id: string
          is_active: boolean | null
          issuing_authority: string | null
          mfn_rate: number | null
          pph_import_rate: number | null
          ppn_rate: number | null
          ppnbm_rate: number | null
          restriction_type: string | null
          statistical_unit: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          description_id?: string | null
          export_restriction_type?: string | null
          has_export_restrictions?: boolean | null
          has_restrictions?: boolean | null
          heading_id?: string | null
          hs_code: string
          id?: string
          is_active?: boolean | null
          issuing_authority?: string | null
          mfn_rate?: number | null
          pph_import_rate?: number | null
          ppn_rate?: number | null
          ppnbm_rate?: number | null
          restriction_type?: string | null
          statistical_unit?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          description_id?: string | null
          export_restriction_type?: string | null
          has_export_restrictions?: boolean | null
          has_restrictions?: boolean | null
          heading_id?: string | null
          hs_code?: string
          id?: string
          is_active?: boolean | null
          issuing_authority?: string | null
          mfn_rate?: number | null
          pph_import_rate?: number | null
          ppn_rate?: number | null
          ppnbm_rate?: number | null
          restriction_type?: string | null
          statistical_unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hs_codes_heading_id_fkey"
            columns: ["heading_id"]
            isOneToOne: false
            referencedRelation: "hs_headings"
            referencedColumns: ["id"]
          },
        ]
      }
      hs_headings: {
        Row: {
          chapter_id: string | null
          created_at: string | null
          heading_code: string
          heading_name: string
          heading_name_id: string | null
          id: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string | null
          heading_code: string
          heading_name: string
          heading_name_id?: string | null
          id?: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string | null
          heading_code?: string
          heading_name?: string
          heading_name_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hs_headings_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "hs_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      hs_preferential_rates: {
        Row: {
          created_at: string | null
          effective_from: string | null
          effective_to: string | null
          fta_code: string
          hs_code_id: string
          id: string
          preferential_rate: number | null
          requires_coo: boolean | null
        }
        Insert: {
          created_at?: string | null
          effective_from?: string | null
          effective_to?: string | null
          fta_code: string
          hs_code_id: string
          id?: string
          preferential_rate?: number | null
          requires_coo?: boolean | null
        }
        Update: {
          created_at?: string | null
          effective_from?: string | null
          effective_to?: string | null
          fta_code?: string
          hs_code_id?: string
          id?: string
          preferential_rate?: number | null
          requires_coo?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "hs_preferential_rates_hs_code_id_fkey"
            columns: ["hs_code_id"]
            isOneToOne: false
            referencedRelation: "hs_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      import_types: {
        Row: {
          created_at: string | null
          default_bm_rate: number | null
          default_pph_rate: number | null
          default_ppn_rate: number | null
          description: string | null
          id: string
          is_active: boolean | null
          permit_type: string | null
          requires_permit: boolean | null
          type_code: string
          type_name: string
        }
        Insert: {
          created_at?: string | null
          default_bm_rate?: number | null
          default_pph_rate?: number | null
          default_ppn_rate?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          permit_type?: string | null
          requires_permit?: boolean | null
          type_code: string
          type_name: string
        }
        Update: {
          created_at?: string | null
          default_bm_rate?: number | null
          default_pph_rate?: number | null
          default_ppn_rate?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          permit_type?: string | null
          requires_permit?: boolean | null
          type_code?: string
          type_name?: string
        }
        Relationships: []
      }
      incident_categories: {
        Row: {
          category_code: string
          category_name: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          requires_investigation: boolean | null
          requires_regulatory_report: boolean | null
          severity_default: string | null
        }
        Insert: {
          category_code: string
          category_name: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          requires_investigation?: boolean | null
          requires_regulatory_report?: boolean | null
          severity_default?: string | null
        }
        Update: {
          category_code?: string
          category_name?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          requires_investigation?: boolean | null
          requires_regulatory_report?: boolean | null
          severity_default?: string | null
        }
        Relationships: []
      }
      incident_history: {
        Row: {
          action_type: string
          description: string
          id: string
          incident_id: string
          new_value: string | null
          performed_at: string | null
          performed_by: string | null
          previous_value: string | null
        }
        Insert: {
          action_type: string
          description: string
          id?: string
          incident_id: string
          new_value?: string | null
          performed_at?: string | null
          performed_by?: string | null
          previous_value?: string | null
        }
        Update: {
          action_type?: string
          description?: string
          id?: string
          incident_id?: string
          new_value?: string | null
          performed_at?: string | null
          performed_by?: string | null
          previous_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_history_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_history_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "open_investigations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_history_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_persons: {
        Row: {
          body_part: string | null
          created_at: string | null
          days_lost: number | null
          employee_id: string | null
          id: string
          incident_id: string
          injury_description: string | null
          injury_type: string | null
          person_company: string | null
          person_name: string | null
          person_phone: string | null
          person_type: string
          statement: string | null
          treatment: string | null
        }
        Insert: {
          body_part?: string | null
          created_at?: string | null
          days_lost?: number | null
          employee_id?: string | null
          id?: string
          incident_id: string
          injury_description?: string | null
          injury_type?: string | null
          person_company?: string | null
          person_name?: string | null
          person_phone?: string | null
          person_type: string
          statement?: string | null
          treatment?: string | null
        }
        Update: {
          body_part?: string | null
          created_at?: string | null
          days_lost?: number | null
          employee_id?: string | null
          id?: string
          incident_id?: string
          injury_description?: string | null
          injury_type?: string | null
          person_company?: string | null
          person_name?: string | null
          person_phone?: string | null
          person_type?: string
          statement?: string | null
          treatment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_persons_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "incident_persons_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_persons_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "incident_persons_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_persons_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "open_investigations"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          actual_cost: number | null
          asset_id: string | null
          authority_reference: string | null
          authority_report_date: string | null
          category_id: string
          closed_at: string | null
          closed_by: string | null
          closure_notes: string | null
          contributing_factors: Json | null
          corrective_actions: Json | null
          created_at: string | null
          description: string
          documents: Json | null
          estimated_cost: number | null
          gps_coordinates: string | null
          id: string
          immediate_actions: string | null
          incident_date: string
          incident_number: string
          incident_time: string | null
          incident_type: string
          insurance_claim_number: string | null
          insurance_claim_status: string | null
          investigation_completed_at: string | null
          investigation_required: boolean | null
          investigation_started_at: string | null
          investigator_id: string | null
          job_order_id: string | null
          location_address: string | null
          location_name: string | null
          location_type: string
          photos: Json | null
          preventive_actions: Json | null
          reported_at: string | null
          reported_by: string
          reported_to_authority: boolean | null
          root_cause: string | null
          severity: string
          status: string | null
          supervisor_id: string | null
          supervisor_notified_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_cost?: number | null
          asset_id?: string | null
          authority_reference?: string | null
          authority_report_date?: string | null
          category_id: string
          closed_at?: string | null
          closed_by?: string | null
          closure_notes?: string | null
          contributing_factors?: Json | null
          corrective_actions?: Json | null
          created_at?: string | null
          description: string
          documents?: Json | null
          estimated_cost?: number | null
          gps_coordinates?: string | null
          id?: string
          immediate_actions?: string | null
          incident_date: string
          incident_number: string
          incident_time?: string | null
          incident_type: string
          insurance_claim_number?: string | null
          insurance_claim_status?: string | null
          investigation_completed_at?: string | null
          investigation_required?: boolean | null
          investigation_started_at?: string | null
          investigator_id?: string | null
          job_order_id?: string | null
          location_address?: string | null
          location_name?: string | null
          location_type: string
          photos?: Json | null
          preventive_actions?: Json | null
          reported_at?: string | null
          reported_by: string
          reported_to_authority?: boolean | null
          root_cause?: string | null
          severity?: string
          status?: string | null
          supervisor_id?: string | null
          supervisor_notified_at?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_cost?: number | null
          asset_id?: string | null
          authority_reference?: string | null
          authority_report_date?: string | null
          category_id?: string
          closed_at?: string | null
          closed_by?: string | null
          closure_notes?: string | null
          contributing_factors?: Json | null
          corrective_actions?: Json | null
          created_at?: string | null
          description?: string
          documents?: Json | null
          estimated_cost?: number | null
          gps_coordinates?: string | null
          id?: string
          immediate_actions?: string | null
          incident_date?: string
          incident_number?: string
          incident_time?: string | null
          incident_type?: string
          insurance_claim_number?: string | null
          insurance_claim_status?: string | null
          investigation_completed_at?: string | null
          investigation_required?: boolean | null
          investigation_started_at?: string | null
          investigator_id?: string | null
          job_order_id?: string | null
          location_address?: string | null
          location_name?: string | null
          location_type?: string
          photos?: Json | null
          preventive_actions?: Json | null
          reported_at?: string | null
          reported_by?: string
          reported_to_authority?: boolean | null
          root_cause?: string | null
          severity?: string
          status?: string | null
          supervisor_id?: string | null
          supervisor_notified_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "incidents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization_monthly"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "incidents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "maintenance_cost_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "incidents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "upcoming_maintenance"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "incidents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "incident_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_investigator_id_fkey"
            columns: ["investigator_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "incidents_investigator_id_fkey"
            columns: ["investigator_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_investigator_id_fkey"
            columns: ["investigator_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "incidents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "incidents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "incidents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "incidents_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "incidents_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          access_token: string | null
          config: Json | null
          connection_code: string
          connection_name: string
          created_at: string | null
          created_by: string | null
          credentials: Json | null
          id: string
          integration_type: string
          is_active: boolean | null
          last_error: string | null
          last_sync_at: string | null
          provider: string
          refresh_token: string | null
          token_expires_at: string | null
        }
        Insert: {
          access_token?: string | null
          config?: Json | null
          connection_code: string
          connection_name: string
          created_at?: string | null
          created_by?: string | null
          credentials?: Json | null
          id?: string
          integration_type: string
          is_active?: boolean | null
          last_error?: string | null
          last_sync_at?: string | null
          provider: string
          refresh_token?: string | null
          token_expires_at?: string | null
        }
        Update: {
          access_token?: string | null
          config?: Json | null
          connection_code?: string
          connection_name?: string
          created_at?: string | null
          created_by?: string | null
          credentials?: Json | null
          id?: string
          integration_type?: string
          is_active?: boolean | null
          last_error?: string | null
          last_sync_at?: string | null
          provider?: string
          refresh_token?: string | null
          token_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_created_by_fkey"
            columns: ["created_by"]
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
            referencedRelation: "customer_profitability"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_revenue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoices_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "invoices_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "invoices_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
        ]
      }
      jmp_checkpoints: {
        Row: {
          activities: string | null
          actual_arrival: string | null
          actual_departure: string | null
          checkpoint_order: number
          coordinates: string | null
          created_at: string | null
          id: string
          jmp_id: string
          km_from_start: number | null
          location_name: string
          location_type: string | null
          notes: string | null
          planned_arrival: string | null
          planned_departure: string | null
          report_required: boolean | null
          report_to: string | null
          status: string | null
          stop_duration_minutes: number | null
        }
        Insert: {
          activities?: string | null
          actual_arrival?: string | null
          actual_departure?: string | null
          checkpoint_order: number
          coordinates?: string | null
          created_at?: string | null
          id?: string
          jmp_id: string
          km_from_start?: number | null
          location_name: string
          location_type?: string | null
          notes?: string | null
          planned_arrival?: string | null
          planned_departure?: string | null
          report_required?: boolean | null
          report_to?: string | null
          status?: string | null
          stop_duration_minutes?: number | null
        }
        Update: {
          activities?: string | null
          actual_arrival?: string | null
          actual_departure?: string | null
          checkpoint_order?: number
          coordinates?: string | null
          created_at?: string | null
          id?: string
          jmp_id?: string
          km_from_start?: number | null
          location_name?: string
          location_type?: string | null
          notes?: string | null
          planned_arrival?: string | null
          planned_departure?: string | null
          report_required?: boolean | null
          report_to?: string | null
          status?: string | null
          stop_duration_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jmp_checkpoints_jmp_id_fkey"
            columns: ["jmp_id"]
            isOneToOne: false
            referencedRelation: "active_journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jmp_checkpoints_jmp_id_fkey"
            columns: ["jmp_id"]
            isOneToOne: false
            referencedRelation: "journey_management_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      jmp_risk_assessment: {
        Row: {
          consequence: string
          control_measures: string
          created_at: string | null
          id: string
          jmp_id: string
          likelihood: string
          residual_risk_level: string | null
          responsible: string | null
          risk_category: string
          risk_description: string
          risk_level: string | null
        }
        Insert: {
          consequence: string
          control_measures: string
          created_at?: string | null
          id?: string
          jmp_id: string
          likelihood: string
          residual_risk_level?: string | null
          responsible?: string | null
          risk_category: string
          risk_description: string
          risk_level?: string | null
        }
        Update: {
          consequence?: string
          control_measures?: string
          created_at?: string | null
          id?: string
          jmp_id?: string
          likelihood?: string
          residual_risk_level?: string | null
          responsible?: string | null
          risk_category?: string
          risk_description?: string
          risk_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jmp_risk_assessment_jmp_id_fkey"
            columns: ["jmp_id"]
            isOneToOne: false
            referencedRelation: "active_journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jmp_risk_assessment_jmp_id_fkey"
            columns: ["jmp_id"]
            isOneToOne: false
            referencedRelation: "journey_management_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      job_equipment_usage: {
        Row: {
          asset_id: string
          assignment_id: string | null
          billing_amount: number | null
          created_at: string | null
          created_by: string | null
          daily_rate: number | null
          depreciation_cost: number | null
          end_hours: number | null
          end_km: number | null
          fuel_cost: number | null
          hours_used: number | null
          id: string
          is_billable: boolean | null
          job_order_id: string
          km_used: number | null
          maintenance_cost: number | null
          notes: string | null
          operator_cost: number | null
          rate_type: string | null
          start_hours: number | null
          start_km: number | null
          total_cost: number | null
          updated_at: string | null
          usage_end: string | null
          usage_start: string
        }
        Insert: {
          asset_id: string
          assignment_id?: string | null
          billing_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          daily_rate?: number | null
          depreciation_cost?: number | null
          end_hours?: number | null
          end_km?: number | null
          fuel_cost?: number | null
          hours_used?: number | null
          id?: string
          is_billable?: boolean | null
          job_order_id: string
          km_used?: number | null
          maintenance_cost?: number | null
          notes?: string | null
          operator_cost?: number | null
          rate_type?: string | null
          start_hours?: number | null
          start_km?: number | null
          total_cost?: number | null
          updated_at?: string | null
          usage_end?: string | null
          usage_start: string
        }
        Update: {
          asset_id?: string
          assignment_id?: string | null
          billing_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          daily_rate?: number | null
          depreciation_cost?: number | null
          end_hours?: number | null
          end_km?: number | null
          fuel_cost?: number | null
          hours_used?: number | null
          id?: string
          is_billable?: boolean | null
          job_order_id?: string
          km_used?: number | null
          maintenance_cost?: number | null
          notes?: string | null
          operator_cost?: number | null
          rate_type?: string | null
          start_hours?: number | null
          start_km?: number | null
          total_cost?: number | null
          updated_at?: string | null
          usage_end?: string | null
          usage_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_equipment_usage_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_equipment_usage_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "job_equipment_usage_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization_monthly"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "job_equipment_usage_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_equipment_usage_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "maintenance_cost_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "job_equipment_usage_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "upcoming_maintenance"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "job_equipment_usage_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "asset_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_equipment_usage_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "current_asset_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_equipment_usage_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_equipment_usage_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "job_equipment_usage_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "job_equipment_usage_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_equipment_usage_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
        ]
      }
      job_failures: {
        Row: {
          error_message: string
          error_stack: string | null
          failed_at: string
          id: string
          job_data: Json | null
          job_id: string | null
          job_type: string
          max_retries: number | null
          next_retry_at: string | null
          resolved_at: string | null
          retry_count: number | null
          status: string | null
        }
        Insert: {
          error_message: string
          error_stack?: string | null
          failed_at?: string
          id?: string
          job_data?: Json | null
          job_id?: string | null
          job_type: string
          max_retries?: number | null
          next_retry_at?: string | null
          resolved_at?: string | null
          retry_count?: number | null
          status?: string | null
        }
        Update: {
          error_message?: string
          error_stack?: string | null
          failed_at?: string
          id?: string
          job_data?: Json | null
          job_id?: string | null
          job_type?: string
          max_retries?: number | null
          next_retry_at?: string | null
          resolved_at?: string | null
          retry_count?: number | null
          status?: string | null
        }
        Relationships: []
      }
      job_orders: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          checked_at: string | null
          checked_by: string | null
          completed_at: string | null
          converted_from_pjo_at: string | null
          created_at: string | null
          customer_id: string
          description: string
          equipment_cost: number | null
          final_cost: number | null
          final_revenue: number | null
          has_berita_acara: boolean | null
          has_surat_jalan: boolean | null
          id: string
          invoice_terms: Json | null
          invoiceable_amount: number | null
          jo_number: string
          net_margin: number | null
          net_profit: number | null
          pjo_id: string | null
          project_id: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requires_berita_acara: boolean | null
          status: string
          submitted_by: string | null
          submitted_to_finance_at: string | null
          total_invoiced: number | null
          total_overhead: number | null
          updated_at: string | null
          workflow_status: string | null
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          checked_at?: string | null
          checked_by?: string | null
          completed_at?: string | null
          converted_from_pjo_at?: string | null
          created_at?: string | null
          customer_id: string
          description: string
          equipment_cost?: number | null
          final_cost?: number | null
          final_revenue?: number | null
          has_berita_acara?: boolean | null
          has_surat_jalan?: boolean | null
          id?: string
          invoice_terms?: Json | null
          invoiceable_amount?: number | null
          jo_number: string
          net_margin?: number | null
          net_profit?: number | null
          pjo_id?: string | null
          project_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requires_berita_acara?: boolean | null
          status?: string
          submitted_by?: string | null
          submitted_to_finance_at?: string | null
          total_invoiced?: number | null
          total_overhead?: number | null
          updated_at?: string | null
          workflow_status?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          checked_at?: string | null
          checked_by?: string | null
          completed_at?: string | null
          converted_from_pjo_at?: string | null
          created_at?: string | null
          customer_id?: string
          description?: string
          equipment_cost?: number | null
          final_cost?: number | null
          final_revenue?: number | null
          has_berita_acara?: boolean | null
          has_surat_jalan?: boolean | null
          id?: string
          invoice_terms?: Json | null
          invoiceable_amount?: number | null
          jo_number?: string
          net_margin?: number | null
          net_profit?: number | null
          pjo_id?: string | null
          project_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requires_berita_acara?: boolean | null
          status?: string
          submitted_by?: string | null
          submitted_to_finance_at?: string | null
          total_invoiced?: number | null
          total_overhead?: number | null
          updated_at?: string | null
          workflow_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_orders_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profitability"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "job_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "job_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_revenue"
            referencedColumns: ["customer_id"]
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
          {
            foreignKeyName: "job_orders_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_overhead_allocations: {
        Row: {
          allocated_amount: number
          allocation_method: string
          allocation_rate: number | null
          base_amount: number | null
          category_id: string
          created_at: string | null
          id: string
          jo_id: string
          notes: string | null
          period_month: number | null
          period_year: number | null
        }
        Insert: {
          allocated_amount: number
          allocation_method: string
          allocation_rate?: number | null
          base_amount?: number | null
          category_id: string
          created_at?: string | null
          id?: string
          jo_id: string
          notes?: string | null
          period_month?: number | null
          period_year?: number | null
        }
        Update: {
          allocated_amount?: number
          allocation_method?: string
          allocation_rate?: number | null
          base_amount?: number | null
          category_id?: string
          created_at?: string | null
          id?: string
          jo_id?: string
          notes?: string | null
          period_month?: number | null
          period_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_overhead_allocations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "overhead_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_overhead_allocations_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "job_overhead_allocations_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "job_overhead_allocations_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_overhead_allocations_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_management_plans: {
        Row: {
          actual_arrival: string | null
          actual_departure: string | null
          approved_at: string | null
          approved_by: string | null
          cargo_description: string
          contingency_plans: Json | null
          convoy_commander_id: string | null
          convoy_configuration: Json | null
          created_at: string | null
          customer_id: string | null
          destination_location: string
          documents: Json | null
          drivers: Json | null
          emergency_contacts: Json | null
          emergency_procedures: string | null
          escort_details: Json | null
          go_no_go_criteria: string | null
          id: string
          incident_summary: string | null
          incidents_occurred: boolean | null
          jmp_number: string
          job_order_id: string | null
          journey_description: string | null
          journey_duration_hours: number | null
          journey_log: string | null
          journey_title: string
          lessons_learned: string | null
          movement_windows: Json | null
          nearest_hospitals: Json | null
          nearest_workshops: Json | null
          origin_location: string
          permits: Json | null
          planned_arrival: string | null
          planned_departure: string | null
          prepared_at: string | null
          prepared_by: string | null
          project_id: string | null
          radio_frequencies: Json | null
          reporting_schedule: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          route_distance_km: number | null
          route_survey_id: string | null
          status: string | null
          total_height_m: number | null
          total_length_m: number | null
          total_weight_tons: number | null
          total_width_m: number | null
          updated_at: string | null
          weather_restrictions: string | null
        }
        Insert: {
          actual_arrival?: string | null
          actual_departure?: string | null
          approved_at?: string | null
          approved_by?: string | null
          cargo_description: string
          contingency_plans?: Json | null
          convoy_commander_id?: string | null
          convoy_configuration?: Json | null
          created_at?: string | null
          customer_id?: string | null
          destination_location: string
          documents?: Json | null
          drivers?: Json | null
          emergency_contacts?: Json | null
          emergency_procedures?: string | null
          escort_details?: Json | null
          go_no_go_criteria?: string | null
          id?: string
          incident_summary?: string | null
          incidents_occurred?: boolean | null
          jmp_number: string
          job_order_id?: string | null
          journey_description?: string | null
          journey_duration_hours?: number | null
          journey_log?: string | null
          journey_title: string
          lessons_learned?: string | null
          movement_windows?: Json | null
          nearest_hospitals?: Json | null
          nearest_workshops?: Json | null
          origin_location: string
          permits?: Json | null
          planned_arrival?: string | null
          planned_departure?: string | null
          prepared_at?: string | null
          prepared_by?: string | null
          project_id?: string | null
          radio_frequencies?: Json | null
          reporting_schedule?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          route_distance_km?: number | null
          route_survey_id?: string | null
          status?: string | null
          total_height_m?: number | null
          total_length_m?: number | null
          total_weight_tons?: number | null
          total_width_m?: number | null
          updated_at?: string | null
          weather_restrictions?: string | null
        }
        Update: {
          actual_arrival?: string | null
          actual_departure?: string | null
          approved_at?: string | null
          approved_by?: string | null
          cargo_description?: string
          contingency_plans?: Json | null
          convoy_commander_id?: string | null
          convoy_configuration?: Json | null
          created_at?: string | null
          customer_id?: string | null
          destination_location?: string
          documents?: Json | null
          drivers?: Json | null
          emergency_contacts?: Json | null
          emergency_procedures?: string | null
          escort_details?: Json | null
          go_no_go_criteria?: string | null
          id?: string
          incident_summary?: string | null
          incidents_occurred?: boolean | null
          jmp_number?: string
          job_order_id?: string | null
          journey_description?: string | null
          journey_duration_hours?: number | null
          journey_log?: string | null
          journey_title?: string
          lessons_learned?: string | null
          movement_windows?: Json | null
          nearest_hospitals?: Json | null
          nearest_workshops?: Json | null
          origin_location?: string
          permits?: Json | null
          planned_arrival?: string | null
          planned_departure?: string | null
          prepared_at?: string | null
          prepared_by?: string | null
          project_id?: string | null
          radio_frequencies?: Json | null
          reporting_schedule?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          route_distance_km?: number | null
          route_survey_id?: string | null
          status?: string | null
          total_height_m?: number | null
          total_length_m?: number | null
          total_weight_tons?: number | null
          total_width_m?: number | null
          updated_at?: string | null
          weather_restrictions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journey_management_plans_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "journey_management_plans_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_management_plans_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "journey_management_plans_convoy_commander_id_fkey"
            columns: ["convoy_commander_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "journey_management_plans_convoy_commander_id_fkey"
            columns: ["convoy_commander_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_management_plans_convoy_commander_id_fkey"
            columns: ["convoy_commander_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "journey_management_plans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profitability"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "journey_management_plans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_management_plans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "journey_management_plans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_revenue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "journey_management_plans_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "journey_management_plans_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "journey_management_plans_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_management_plans_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_management_plans_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "journey_management_plans_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_management_plans_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "journey_management_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_management_plans_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "journey_management_plans_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_management_plans_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "journey_management_plans_route_survey_id_fkey"
            columns: ["route_survey_id"]
            isOneToOne: false
            referencedRelation: "route_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      jsa_hazards: {
        Row: {
          consequences: string | null
          control_measures: string
          created_at: string
          document_id: string
          hazards: string
          id: string
          responsible: string | null
          risk_level: string | null
          step_number: number
          updated_at: string
          work_step: string
        }
        Insert: {
          consequences?: string | null
          control_measures: string
          created_at?: string
          document_id: string
          hazards: string
          id?: string
          responsible?: string | null
          risk_level?: string | null
          step_number: number
          updated_at?: string
          work_step: string
        }
        Update: {
          consequences?: string | null
          control_measures?: string
          created_at?: string
          document_id?: string
          hazards?: string
          id?: string
          responsible?: string | null
          risk_level?: string | null
          step_number?: number
          updated_at?: string
          work_step?: string
        }
        Relationships: [
          {
            foreignKeyName: "jsa_hazards_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "expiring_safety_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jsa_hazards_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "safety_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_definitions: {
        Row: {
          calculation_type: string
          category: string
          comparison_period: string | null
          created_at: string | null
          critical_threshold: number | null
          custom_query: string | null
          data_source: string | null
          decimal_places: number | null
          default_target: number | null
          denominator_query: string | null
          description: string | null
          display_order: number | null
          filter_conditions: Json | null
          id: string
          is_active: boolean | null
          kpi_code: string
          kpi_name: string
          numerator_query: string | null
          show_trend: boolean | null
          target_type: string | null
          unit: string | null
          value_field: string | null
          visible_to_roles: Json | null
          warning_threshold: number | null
        }
        Insert: {
          calculation_type: string
          category: string
          comparison_period?: string | null
          created_at?: string | null
          critical_threshold?: number | null
          custom_query?: string | null
          data_source?: string | null
          decimal_places?: number | null
          default_target?: number | null
          denominator_query?: string | null
          description?: string | null
          display_order?: number | null
          filter_conditions?: Json | null
          id?: string
          is_active?: boolean | null
          kpi_code: string
          kpi_name: string
          numerator_query?: string | null
          show_trend?: boolean | null
          target_type?: string | null
          unit?: string | null
          value_field?: string | null
          visible_to_roles?: Json | null
          warning_threshold?: number | null
        }
        Update: {
          calculation_type?: string
          category?: string
          comparison_period?: string | null
          created_at?: string | null
          critical_threshold?: number | null
          custom_query?: string | null
          data_source?: string | null
          decimal_places?: number | null
          default_target?: number | null
          denominator_query?: string | null
          description?: string | null
          display_order?: number | null
          filter_conditions?: Json | null
          id?: string
          is_active?: boolean | null
          kpi_code?: string
          kpi_name?: string
          numerator_query?: string | null
          show_trend?: boolean | null
          target_type?: string | null
          unit?: string | null
          value_field?: string | null
          visible_to_roles?: Json | null
          warning_threshold?: number | null
        }
        Relationships: []
      }
      kpi_snapshots: {
        Row: {
          actual_value: number | null
          change_percentage: number | null
          change_value: number | null
          created_at: string | null
          id: string
          kpi_id: string
          period_type: string
          previous_value: number | null
          snapshot_date: string
          status: string | null
          target_value: number | null
        }
        Insert: {
          actual_value?: number | null
          change_percentage?: number | null
          change_value?: number | null
          created_at?: string | null
          id?: string
          kpi_id: string
          period_type: string
          previous_value?: number | null
          snapshot_date: string
          status?: string | null
          target_value?: number | null
        }
        Update: {
          actual_value?: number | null
          change_percentage?: number | null
          change_value?: number | null
          created_at?: string | null
          id?: string
          kpi_id?: string
          period_type?: string
          previous_value?: number | null
          snapshot_date?: string
          status?: string | null
          target_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_snapshots_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_targets: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          kpi_id: string
          notes: string | null
          period_month: number | null
          period_quarter: number | null
          period_type: string
          period_year: number
          stretch_target: number | null
          target_value: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          kpi_id: string
          notes?: string | null
          period_month?: number | null
          period_quarter?: number | null
          period_type: string
          period_year: number
          stretch_target?: number | null
          target_value: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          kpi_id?: string
          notes?: string | null
          period_month?: number | null
          period_quarter?: number | null
          period_type?: string
          period_year?: number
          stretch_target?: number | null
          target_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_targets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_targets_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          available_days: number | null
          carried_over_days: number | null
          created_at: string | null
          employee_id: string
          entitled_days: number
          id: string
          leave_type_id: string
          pending_days: number | null
          updated_at: string | null
          used_days: number | null
          year: number
        }
        Insert: {
          available_days?: number | null
          carried_over_days?: number | null
          created_at?: string | null
          employee_id: string
          entitled_days: number
          id?: string
          leave_type_id: string
          pending_days?: number | null
          updated_at?: string | null
          used_days?: number | null
          year: number
        }
        Update: {
          available_days?: number | null
          carried_over_days?: number | null
          created_at?: string | null
          employee_id?: string
          entitled_days?: number
          id?: string
          leave_type_id?: string
          pending_days?: number | null
          updated_at?: string | null
          used_days?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attachment_url: string | null
          created_at: string | null
          emergency_contact: string | null
          employee_id: string
          end_date: string
          half_day_type: string | null
          handover_notes: string | null
          handover_to: string | null
          id: string
          is_half_day: boolean | null
          leave_type_id: string
          reason: string | null
          rejection_reason: string | null
          request_number: string | null
          start_date: string
          status: string | null
          total_days: number
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attachment_url?: string | null
          created_at?: string | null
          emergency_contact?: string | null
          employee_id: string
          end_date: string
          half_day_type?: string | null
          handover_notes?: string | null
          handover_to?: string | null
          id?: string
          is_half_day?: boolean | null
          leave_type_id: string
          reason?: string | null
          rejection_reason?: string | null
          request_number?: string | null
          start_date: string
          status?: string | null
          total_days: number
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attachment_url?: string | null
          created_at?: string | null
          emergency_contact?: string | null
          employee_id?: string
          end_date?: string
          half_day_type?: string | null
          handover_notes?: string | null
          handover_to?: string | null
          id?: string
          is_half_day?: boolean | null
          leave_type_id?: string
          reason?: string | null
          rejection_reason?: string | null
          request_number?: string | null
          start_date?: string
          status?: string | null
          total_days?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "leave_requests_handover_to_fkey"
            columns: ["handover_to"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "leave_requests_handover_to_fkey"
            columns: ["handover_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_handover_to_fkey"
            columns: ["handover_to"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          allow_carry_over: boolean | null
          created_at: string | null
          default_days_per_year: number | null
          id: string
          is_active: boolean | null
          is_paid: boolean | null
          max_carry_over_days: number | null
          min_days_advance: number | null
          requires_approval: boolean | null
          requires_attachment: boolean | null
          type_code: string
          type_name: string
        }
        Insert: {
          allow_carry_over?: boolean | null
          created_at?: string | null
          default_days_per_year?: number | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          max_carry_over_days?: number | null
          min_days_advance?: number | null
          requires_approval?: boolean | null
          requires_attachment?: boolean | null
          type_code: string
          type_name: string
        }
        Update: {
          allow_carry_over?: boolean | null
          created_at?: string | null
          default_days_per_year?: number | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          max_carry_over_days?: number | null
          min_days_advance?: number | null
          requires_approval?: boolean | null
          requires_attachment?: boolean | null
          type_code?: string
          type_name?: string
        }
        Relationships: []
      }
      lifting_plans: {
        Row: {
          assessment_id: string
          crane_boom_length_m: number | null
          crane_capacity_at_radius_tons: number | null
          crane_capacity_tons: number | null
          crane_position: string | null
          crane_radius_m: number | null
          crane_type: string | null
          created_at: string | null
          ground_bearing_required_kpa: number | null
          ground_preparation: string | null
          id: string
          lift_description: string | null
          lift_drawing_url: string | null
          lift_number: number | null
          load_pickup_position: string | null
          load_set_position: string | null
          load_weight_tons: number
          mat_size: string | null
          notes: string | null
          outrigger_mats: boolean | null
          rigging_configuration: string | null
          rigging_weight_tons: number | null
          sling_capacity_tons: number | null
          sling_quantity: number | null
          sling_type: string | null
          spreader_beam: boolean | null
          spreader_capacity_tons: number | null
          swing_clear: boolean | null
          swing_radius_m: number | null
          total_lifted_weight_tons: number | null
          utilization_percentage: number | null
        }
        Insert: {
          assessment_id: string
          crane_boom_length_m?: number | null
          crane_capacity_at_radius_tons?: number | null
          crane_capacity_tons?: number | null
          crane_position?: string | null
          crane_radius_m?: number | null
          crane_type?: string | null
          created_at?: string | null
          ground_bearing_required_kpa?: number | null
          ground_preparation?: string | null
          id?: string
          lift_description?: string | null
          lift_drawing_url?: string | null
          lift_number?: number | null
          load_pickup_position?: string | null
          load_set_position?: string | null
          load_weight_tons: number
          mat_size?: string | null
          notes?: string | null
          outrigger_mats?: boolean | null
          rigging_configuration?: string | null
          rigging_weight_tons?: number | null
          sling_capacity_tons?: number | null
          sling_quantity?: number | null
          sling_type?: string | null
          spreader_beam?: boolean | null
          spreader_capacity_tons?: number | null
          swing_clear?: boolean | null
          swing_radius_m?: number | null
          total_lifted_weight_tons?: number | null
          utilization_percentage?: number | null
        }
        Update: {
          assessment_id?: string
          crane_boom_length_m?: number | null
          crane_capacity_at_radius_tons?: number | null
          crane_capacity_tons?: number | null
          crane_position?: string | null
          crane_radius_m?: number | null
          crane_type?: string | null
          created_at?: string | null
          ground_bearing_required_kpa?: number | null
          ground_preparation?: string | null
          id?: string
          lift_description?: string | null
          lift_drawing_url?: string | null
          lift_number?: number | null
          load_pickup_position?: string | null
          load_set_position?: string | null
          load_weight_tons?: number
          mat_size?: string | null
          notes?: string | null
          outrigger_mats?: boolean | null
          rigging_configuration?: string | null
          rigging_weight_tons?: number | null
          sling_capacity_tons?: number | null
          sling_quantity?: number | null
          sling_type?: string | null
          spreader_beam?: boolean | null
          spreader_capacity_tons?: number | null
          swing_clear?: boolean | null
          swing_radius_m?: number | null
          total_lifted_weight_tons?: number | null
          utilization_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lifting_plans_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "technical_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      login_history: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          device_type: string | null
          failure_reason: string | null
          id: string
          ip_address: unknown
          login_at: string
          login_method: string | null
          logout_at: string | null
          os: string | null
          session_duration_minutes: number | null
          status: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          device_type?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          login_at?: string
          login_method?: string | null
          logout_at?: string | null
          os?: string | null
          session_duration_minutes?: number | null
          status?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          device_type?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          login_at?: string
          login_method?: string | null
          logout_at?: string | null
          os?: string | null
          session_duration_minutes?: number | null
          status?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "login_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_parts: {
        Row: {
          created_at: string | null
          id: string
          maintenance_record_id: string
          part_name: string
          part_number: string | null
          quantity: number
          supplier: string | null
          total_price: number | null
          unit: string | null
          unit_price: number
          warranty_months: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          maintenance_record_id: string
          part_name: string
          part_number?: string | null
          quantity: number
          supplier?: string | null
          total_price?: number | null
          unit?: string | null
          unit_price: number
          warranty_months?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          maintenance_record_id?: string
          part_name?: string
          part_number?: string | null
          quantity?: number
          supplier?: string | null
          total_price?: number | null
          unit?: string | null
          unit_price?: number
          warranty_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_parts_maintenance_record_id_fkey"
            columns: ["maintenance_record_id"]
            isOneToOne: false
            referencedRelation: "maintenance_records"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          asset_id: string
          bkk_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string
          documents: Json | null
          external_cost: number | null
          findings: string | null
          hour_meter: number | null
          id: string
          labor_cost: number | null
          maintenance_date: string
          maintenance_type_id: string
          notes: string | null
          odometer_km: number | null
          parts_cost: number | null
          performed_at: string | null
          photos: Json | null
          recommendations: string | null
          record_number: string
          schedule_id: string | null
          started_at: string | null
          status: string | null
          technician_employee_id: string | null
          technician_name: string | null
          total_cost: number | null
          updated_at: string | null
          workshop_address: string | null
          workshop_name: string | null
        }
        Insert: {
          asset_id: string
          bkk_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          documents?: Json | null
          external_cost?: number | null
          findings?: string | null
          hour_meter?: number | null
          id?: string
          labor_cost?: number | null
          maintenance_date: string
          maintenance_type_id: string
          notes?: string | null
          odometer_km?: number | null
          parts_cost?: number | null
          performed_at?: string | null
          photos?: Json | null
          recommendations?: string | null
          record_number: string
          schedule_id?: string | null
          started_at?: string | null
          status?: string | null
          technician_employee_id?: string | null
          technician_name?: string | null
          total_cost?: number | null
          updated_at?: string | null
          workshop_address?: string | null
          workshop_name?: string | null
        }
        Update: {
          asset_id?: string
          bkk_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          documents?: Json | null
          external_cost?: number | null
          findings?: string | null
          hour_meter?: number | null
          id?: string
          labor_cost?: number | null
          maintenance_date?: string
          maintenance_type_id?: string
          notes?: string | null
          odometer_km?: number | null
          parts_cost?: number | null
          performed_at?: string | null
          photos?: Json | null
          recommendations?: string | null
          record_number?: string
          schedule_id?: string | null
          started_at?: string | null
          status?: string | null
          technician_employee_id?: string | null
          technician_name?: string | null
          total_cost?: number | null
          updated_at?: string | null
          workshop_address?: string | null
          workshop_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "maintenance_records_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization_monthly"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "maintenance_records_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "maintenance_cost_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "maintenance_records_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "upcoming_maintenance"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "maintenance_records_bkk_id_fkey"
            columns: ["bkk_id"]
            isOneToOne: false
            referencedRelation: "bukti_kas_keluar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_maintenance_type_id_fkey"
            columns: ["maintenance_type_id"]
            isOneToOne: false
            referencedRelation: "maintenance_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_maintenance_type_id_fkey"
            columns: ["maintenance_type_id"]
            isOneToOne: false
            referencedRelation: "upcoming_maintenance"
            referencedColumns: ["maintenance_type_id"]
          },
          {
            foreignKeyName: "maintenance_records_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "maintenance_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "upcoming_maintenance"
            referencedColumns: ["schedule_id"]
          },
          {
            foreignKeyName: "maintenance_records_technician_employee_id_fkey"
            columns: ["technician_employee_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "maintenance_records_technician_employee_id_fkey"
            columns: ["technician_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_technician_employee_id_fkey"
            columns: ["technician_employee_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      maintenance_schedules: {
        Row: {
          asset_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          maintenance_type_id: string
          next_due_date: string | null
          next_due_hours: number | null
          next_due_km: number | null
          trigger_date: string | null
          trigger_type: string
          trigger_value: number | null
          updated_at: string | null
          warning_days: number | null
          warning_km: number | null
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          maintenance_type_id: string
          next_due_date?: string | null
          next_due_hours?: number | null
          next_due_km?: number | null
          trigger_date?: string | null
          trigger_type: string
          trigger_value?: number | null
          updated_at?: string | null
          warning_days?: number | null
          warning_km?: number | null
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          maintenance_type_id?: string
          next_due_date?: string | null
          next_due_hours?: number | null
          next_due_km?: number | null
          trigger_date?: string | null
          trigger_type?: string
          trigger_value?: number | null
          updated_at?: string | null
          warning_days?: number | null
          warning_km?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "maintenance_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization_monthly"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "maintenance_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "maintenance_cost_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "maintenance_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "upcoming_maintenance"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "maintenance_schedules_maintenance_type_id_fkey"
            columns: ["maintenance_type_id"]
            isOneToOne: false
            referencedRelation: "maintenance_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedules_maintenance_type_id_fkey"
            columns: ["maintenance_type_id"]
            isOneToOne: false
            referencedRelation: "upcoming_maintenance"
            referencedColumns: ["maintenance_type_id"]
          },
        ]
      }
      maintenance_types: {
        Row: {
          applicable_categories: string[] | null
          created_at: string | null
          default_interval_days: number | null
          default_interval_hours: number | null
          default_interval_km: number | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_scheduled: boolean | null
          type_code: string
          type_name: string
        }
        Insert: {
          applicable_categories?: string[] | null
          created_at?: string | null
          default_interval_days?: number | null
          default_interval_hours?: number | null
          default_interval_km?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_scheduled?: boolean | null
          type_code: string
          type_name: string
        }
        Update: {
          applicable_categories?: string[] | null
          created_at?: string | null
          default_interval_days?: number | null
          default_interval_hours?: number | null
          default_interval_km?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_scheduled?: boolean | null
          type_code?: string
          type_name?: string
        }
        Relationships: []
      }
      manpower_cost_summary: {
        Row: {
          avg_salary: number | null
          calculated_at: string | null
          cost_per_employee: number | null
          created_at: string | null
          department_id: string
          employee_count: number | null
          id: string
          period_month: number
          period_year: number
          total_allowances: number | null
          total_base_salary: number | null
          total_company_contributions: number | null
          total_company_cost: number | null
          total_deductions: number | null
          total_gross: number | null
          total_net: number | null
          total_overtime: number | null
        }
        Insert: {
          avg_salary?: number | null
          calculated_at?: string | null
          cost_per_employee?: number | null
          created_at?: string | null
          department_id: string
          employee_count?: number | null
          id?: string
          period_month: number
          period_year: number
          total_allowances?: number | null
          total_base_salary?: number | null
          total_company_contributions?: number | null
          total_company_cost?: number | null
          total_deductions?: number | null
          total_gross?: number | null
          total_net?: number | null
          total_overtime?: number | null
        }
        Update: {
          avg_salary?: number | null
          calculated_at?: string | null
          cost_per_employee?: number | null
          created_at?: string | null
          department_id?: string
          employee_count?: number | null
          id?: string
          period_month?: number
          period_year?: number
          total_allowances?: number | null
          total_base_salary?: number | null
          total_company_contributions?: number | null
          total_company_cost?: number | null
          total_deductions?: number | null
          total_gross?: number | null
          total_net?: number | null
          total_overtime?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "manpower_cost_summary_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_actuals: {
        Row: {
          actual_amount: number
          actual_month: number
          actual_year: number
          category: string
          department: string | null
          id: string
          last_updated: string | null
          subcategory: string | null
        }
        Insert: {
          actual_amount: number
          actual_month: number
          actual_year: number
          category: string
          department?: string | null
          id?: string
          last_updated?: string | null
          subcategory?: string | null
        }
        Update: {
          actual_amount?: number
          actual_month?: number
          actual_year?: number
          category?: string
          department?: string | null
          id?: string
          last_updated?: string | null
          subcategory?: string | null
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          body: string | null
          channel: string
          created_at: string | null
          delivered_at: string | null
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          external_id: string | null
          id: string
          recipient_email: string | null
          recipient_phone: string | null
          recipient_user_id: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          template_id: string | null
        }
        Insert: {
          body?: string | null
          channel: string
          created_at?: string | null
          delivered_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_id?: string | null
        }
        Update: {
          body?: string | null
          channel?: string
          created_at?: string | null
          delivered_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
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
      notification_templates: {
        Row: {
          created_at: string | null
          email_body_html: string | null
          email_body_text: string | null
          email_subject: string | null
          event_type: string
          id: string
          in_app_action_url: string | null
          in_app_body: string | null
          in_app_title: string | null
          is_active: boolean | null
          placeholders: Json | null
          push_body: string | null
          push_title: string | null
          template_code: string
          template_name: string
          whatsapp_body: string | null
          whatsapp_template_id: string | null
        }
        Insert: {
          created_at?: string | null
          email_body_html?: string | null
          email_body_text?: string | null
          email_subject?: string | null
          event_type: string
          id?: string
          in_app_action_url?: string | null
          in_app_body?: string | null
          in_app_title?: string | null
          is_active?: boolean | null
          placeholders?: Json | null
          push_body?: string | null
          push_title?: string | null
          template_code: string
          template_name: string
          whatsapp_body?: string | null
          whatsapp_template_id?: string | null
        }
        Update: {
          created_at?: string | null
          email_body_html?: string | null
          email_body_text?: string | null
          email_subject?: string | null
          event_type?: string
          id?: string
          in_app_action_url?: string | null
          in_app_body?: string | null
          in_app_title?: string | null
          is_active?: boolean | null
          placeholders?: Json | null
          push_body?: string | null
          push_title?: string | null
          template_code?: string
          template_name?: string
          whatsapp_body?: string | null
          whatsapp_template_id?: string | null
        }
        Relationships: []
      }
      notification_types: {
        Row: {
          applicable_roles: string[] | null
          category: string
          created_at: string | null
          default_email: boolean | null
          default_in_app: boolean | null
          default_push: boolean | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          type_code: string
          type_name: string
        }
        Insert: {
          applicable_roles?: string[] | null
          category: string
          created_at?: string | null
          default_email?: boolean | null
          default_in_app?: boolean | null
          default_push?: boolean | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          type_code: string
          type_name: string
        }
        Update: {
          applicable_roles?: string[] | null
          category?: string
          created_at?: string | null
          default_email?: boolean | null
          default_in_app?: boolean | null
          default_push?: boolean | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          type_code?: string
          type_name?: string
        }
        Relationships: []
      }
      notification_workflow_preferences: {
        Row: {
          created_at: string | null
          digest_frequency: string | null
          email_enabled: boolean | null
          event_type: string
          id: string
          in_app_enabled: boolean | null
          push_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string | null
          user_id: string
          whatsapp_enabled: boolean | null
        }
        Insert: {
          created_at?: string | null
          digest_frequency?: string | null
          email_enabled?: boolean | null
          event_type: string
          id?: string
          in_app_enabled?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id: string
          whatsapp_enabled?: boolean | null
        }
        Update: {
          created_at?: string | null
          digest_frequency?: string | null
          email_enabled?: boolean | null
          event_type?: string
          id?: string
          in_app_enabled?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id?: string
          whatsapp_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_workflow_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          archived_at: string | null
          category: string | null
          created_at: string | null
          deleted_at: string | null
          email_sent: boolean | null
          email_sent_at: string | null
          entity_id: string | null
          entity_type: string | null
          expires_at: string | null
          id: string
          is_archived: boolean | null
          is_read: boolean | null
          message: string
          metadata: Json | null
          priority: string | null
          push_sent: boolean | null
          push_sent_at: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          archived_at?: string | null
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          priority?: string | null
          push_sent?: boolean | null
          push_sent_at?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          archived_at?: string | null
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          priority?: string | null
          push_sent?: boolean | null
          push_sent_at?: string | null
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
      onboarding_steps: {
        Row: {
          action_label: string | null
          action_route: string | null
          applicable_roles: string[] | null
          badge_on_complete: string | null
          category: string
          completion_action: string | null
          completion_count: number | null
          completion_route: string | null
          completion_table: string | null
          completion_type: string
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          points: number | null
          step_code: string
          step_name: string
          step_order: number
        }
        Insert: {
          action_label?: string | null
          action_route?: string | null
          applicable_roles?: string[] | null
          badge_on_complete?: string | null
          category: string
          completion_action?: string | null
          completion_count?: number | null
          completion_route?: string | null
          completion_table?: string | null
          completion_type: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          points?: number | null
          step_code: string
          step_name: string
          step_order: number
        }
        Update: {
          action_label?: string | null
          action_route?: string | null
          applicable_roles?: string[] | null
          badge_on_complete?: string | null
          category?: string
          completion_action?: string | null
          completion_count?: number | null
          completion_route?: string | null
          completion_table?: string | null
          completion_type?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          points?: number | null
          step_code?: string
          step_name?: string
          step_order?: number
        }
        Relationships: []
      }
      overhead_actuals: {
        Row: {
          actual_amount: number
          category_id: string
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          period_month: number
          period_year: number
        }
        Insert: {
          actual_amount: number
          category_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          period_month: number
          period_year: number
        }
        Update: {
          actual_amount?: number
          category_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          period_month?: number
          period_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "overhead_actuals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "overhead_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overhead_actuals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      overhead_categories: {
        Row: {
          allocation_method: string | null
          category_code: string
          category_name: string
          created_at: string | null
          default_rate: number | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
        }
        Insert: {
          allocation_method?: string | null
          category_code: string
          category_name: string
          created_at?: string | null
          default_rate?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
        }
        Update: {
          allocation_method?: string | null
          category_code?: string
          category_name?: string
          created_at?: string | null
          default_rate?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      payment_predictions: {
        Row: {
          actual_payment_date: string | null
          confidence_level: number | null
          created_at: string | null
          days_to_payment_predicted: number | null
          id: string
          invoice_id: string
          late_payment_risk: string | null
          predicted_payment_date: string | null
          prediction_accuracy_days: number | null
          prediction_date: string
          risk_factors: Json | null
        }
        Insert: {
          actual_payment_date?: string | null
          confidence_level?: number | null
          created_at?: string | null
          days_to_payment_predicted?: number | null
          id?: string
          invoice_id: string
          late_payment_risk?: string | null
          predicted_payment_date?: string | null
          prediction_accuracy_days?: number | null
          prediction_date: string
          risk_factors?: Json | null
        }
        Update: {
          actual_payment_date?: string | null
          confidence_level?: number | null
          created_at?: string | null
          days_to_payment_predicted?: number | null
          id?: string
          invoice_id?: string
          late_payment_risk?: string | null
          predicted_payment_date?: string | null
          prediction_accuracy_days?: number | null
          prediction_date?: string
          risk_factors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_predictions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
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
      payroll_components: {
        Row: {
          calculation_type: string | null
          component_code: string
          component_name: string
          component_type: string
          created_at: string | null
          default_amount: number | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_mandatory: boolean | null
          is_taxable: boolean | null
          percentage_of: string | null
          percentage_rate: number | null
        }
        Insert: {
          calculation_type?: string | null
          component_code: string
          component_name: string
          component_type: string
          created_at?: string | null
          default_amount?: number | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          is_taxable?: boolean | null
          percentage_of?: string | null
          percentage_rate?: number | null
        }
        Update: {
          calculation_type?: string | null
          component_code?: string
          component_name?: string
          component_type?: string
          created_at?: string | null
          default_amount?: number | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          is_taxable?: boolean | null
          percentage_of?: string | null
          percentage_rate?: number | null
        }
        Relationships: []
      }
      payroll_periods: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          employee_count: number | null
          end_date: string
          id: string
          pay_date: string
          period_month: number
          period_name: string
          period_year: number
          processed_at: string | null
          processed_by: string | null
          start_date: string
          status: string | null
          total_company_cost: number | null
          total_deductions: number | null
          total_gross: number | null
          total_net: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_count?: number | null
          end_date: string
          id?: string
          pay_date: string
          period_month: number
          period_name: string
          period_year: number
          processed_at?: string | null
          processed_by?: string | null
          start_date: string
          status?: string | null
          total_company_cost?: number | null
          total_deductions?: number | null
          total_gross?: number | null
          total_net?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          employee_count?: number | null
          end_date?: string
          id?: string
          pay_date?: string
          period_month?: number
          period_name?: string
          period_year?: number
          processed_at?: string | null
          processed_by?: string | null
          start_date?: string
          status?: string | null
          total_company_cost?: number | null
          total_deductions?: number | null
          total_gross?: number | null
          total_net?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_periods_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          absent_days: number | null
          bank_account: string | null
          bank_account_name: string | null
          bank_name: string | null
          company_contributions: Json | null
          created_at: string | null
          deductions: Json | null
          earnings: Json | null
          employee_id: string
          gross_salary: number | null
          id: string
          leave_days: number | null
          net_salary: number | null
          notes: string | null
          overtime_hours: number | null
          period_id: string
          present_days: number | null
          status: string | null
          total_company_cost: number | null
          total_deductions: number | null
          updated_at: string | null
          work_days: number | null
        }
        Insert: {
          absent_days?: number | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_name?: string | null
          company_contributions?: Json | null
          created_at?: string | null
          deductions?: Json | null
          earnings?: Json | null
          employee_id: string
          gross_salary?: number | null
          id?: string
          leave_days?: number | null
          net_salary?: number | null
          notes?: string | null
          overtime_hours?: number | null
          period_id: string
          present_days?: number | null
          status?: string | null
          total_company_cost?: number | null
          total_deductions?: number | null
          updated_at?: string | null
          work_days?: number | null
        }
        Update: {
          absent_days?: number | null
          bank_account?: string | null
          bank_account_name?: string | null
          bank_name?: string | null
          company_contributions?: Json | null
          created_at?: string | null
          deductions?: Json | null
          earnings?: Json | null
          employee_id?: string
          gross_salary?: number | null
          id?: string
          leave_days?: number | null
          net_salary?: number | null
          notes?: string | null
          overtime_hours?: number | null
          period_id?: string
          present_days?: number | null
          status?: string | null
          total_company_cost?: number | null
          total_deductions?: number | null
          updated_at?: string | null
          work_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payroll_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "payroll_records_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      peb_documents: {
        Row: {
          aju_number: string | null
          approved_at: string | null
          atd_date: string | null
          awb_number: string | null
          bill_of_lading: string | null
          consignee_address: string | null
          consignee_country: string | null
          consignee_name: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_id: string | null
          customs_office_id: string | null
          documents: Json | null
          etd_date: string | null
          export_type_id: string | null
          exporter_address: string | null
          exporter_name: string
          exporter_npwp: string | null
          final_destination: string | null
          fob_value: number | null
          gross_weight_kg: number | null
          id: string
          internal_ref: string
          job_order_id: string | null
          loaded_at: string | null
          notes: string | null
          npe_date: string | null
          npe_number: string | null
          package_type: string | null
          peb_number: string | null
          port_of_discharge: string | null
          port_of_loading: string | null
          status: string | null
          submitted_at: string | null
          total_packages: number | null
          transport_mode: string | null
          updated_at: string | null
          vessel_name: string | null
          voyage_number: string | null
        }
        Insert: {
          aju_number?: string | null
          approved_at?: string | null
          atd_date?: string | null
          awb_number?: string | null
          bill_of_lading?: string | null
          consignee_address?: string | null
          consignee_country?: string | null
          consignee_name?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          customs_office_id?: string | null
          documents?: Json | null
          etd_date?: string | null
          export_type_id?: string | null
          exporter_address?: string | null
          exporter_name: string
          exporter_npwp?: string | null
          final_destination?: string | null
          fob_value?: number | null
          gross_weight_kg?: number | null
          id?: string
          internal_ref: string
          job_order_id?: string | null
          loaded_at?: string | null
          notes?: string | null
          npe_date?: string | null
          npe_number?: string | null
          package_type?: string | null
          peb_number?: string | null
          port_of_discharge?: string | null
          port_of_loading?: string | null
          status?: string | null
          submitted_at?: string | null
          total_packages?: number | null
          transport_mode?: string | null
          updated_at?: string | null
          vessel_name?: string | null
          voyage_number?: string | null
        }
        Update: {
          aju_number?: string | null
          approved_at?: string | null
          atd_date?: string | null
          awb_number?: string | null
          bill_of_lading?: string | null
          consignee_address?: string | null
          consignee_country?: string | null
          consignee_name?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          customs_office_id?: string | null
          documents?: Json | null
          etd_date?: string | null
          export_type_id?: string | null
          exporter_address?: string | null
          exporter_name?: string
          exporter_npwp?: string | null
          final_destination?: string | null
          fob_value?: number | null
          gross_weight_kg?: number | null
          id?: string
          internal_ref?: string
          job_order_id?: string | null
          loaded_at?: string | null
          notes?: string | null
          npe_date?: string | null
          npe_number?: string | null
          package_type?: string | null
          peb_number?: string | null
          port_of_discharge?: string | null
          port_of_loading?: string | null
          status?: string | null
          submitted_at?: string | null
          total_packages?: number | null
          transport_mode?: string | null
          updated_at?: string | null
          vessel_name?: string | null
          voyage_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "peb_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peb_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profitability"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "peb_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peb_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "peb_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_revenue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "peb_documents_customs_office_id_fkey"
            columns: ["customs_office_id"]
            isOneToOne: false
            referencedRelation: "customs_offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peb_documents_export_type_id_fkey"
            columns: ["export_type_id"]
            isOneToOne: false
            referencedRelation: "export_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peb_documents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "peb_documents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "peb_documents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peb_documents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
        ]
      }
      peb_items: {
        Row: {
          brand: string | null
          created_at: string | null
          currency: string | null
          goods_description: string
          gross_weight_kg: number | null
          hs_code: string
          hs_description: string | null
          id: string
          item_number: number
          net_weight_kg: number | null
          peb_id: string
          quantity: number
          specifications: string | null
          total_price: number | null
          unit: string
          unit_price: number | null
        }
        Insert: {
          brand?: string | null
          created_at?: string | null
          currency?: string | null
          goods_description: string
          gross_weight_kg?: number | null
          hs_code: string
          hs_description?: string | null
          id?: string
          item_number: number
          net_weight_kg?: number | null
          peb_id: string
          quantity: number
          specifications?: string | null
          total_price?: number | null
          unit: string
          unit_price?: number | null
        }
        Update: {
          brand?: string | null
          created_at?: string | null
          currency?: string | null
          goods_description?: string
          gross_weight_kg?: number | null
          hs_code?: string
          hs_description?: string | null
          id?: string
          item_number?: number
          net_weight_kg?: number | null
          peb_id?: string
          quantity?: number
          specifications?: string | null
          total_price?: number | null
          unit?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "peb_items_peb_id_fkey"
            columns: ["peb_id"]
            isOneToOne: false
            referencedRelation: "peb_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      peb_status_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_status: string
          notes: string | null
          peb_id: string
          previous_status: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status: string
          notes?: string | null
          peb_id: string
          previous_status?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status?: string
          notes?: string | null
          peb_id?: string
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "peb_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peb_status_history_peb_id_fkey"
            columns: ["peb_id"]
            isOneToOne: false
            referencedRelation: "peb_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      pib_documents: {
        Row: {
          aju_number: string | null
          ata_date: string | null
          awb_number: string | null
          bea_masuk: number | null
          bill_of_lading: string | null
          cif_value: number | null
          cif_value_idr: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_id: string | null
          customs_office_id: string | null
          documents: Json | null
          duties_paid_at: string | null
          eta_date: string | null
          exchange_rate: number | null
          fob_value: number | null
          freight_value: number | null
          gross_weight_kg: number | null
          id: string
          import_type_id: string | null
          importer_address: string | null
          importer_name: string
          importer_npwp: string | null
          insurance_value: number | null
          internal_ref: string
          job_order_id: string | null
          notes: string | null
          package_type: string | null
          pib_number: string | null
          port_of_discharge: string | null
          port_of_loading: string | null
          pph_import: number | null
          ppn: number | null
          released_at: string | null
          sppb_date: string | null
          sppb_number: string | null
          status: string | null
          submitted_at: string | null
          supplier_country: string | null
          supplier_name: string | null
          total_duties: number | null
          total_packages: number | null
          transport_mode: string | null
          updated_at: string | null
          vessel_name: string | null
          voyage_number: string | null
        }
        Insert: {
          aju_number?: string | null
          ata_date?: string | null
          awb_number?: string | null
          bea_masuk?: number | null
          bill_of_lading?: string | null
          cif_value?: number | null
          cif_value_idr?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          customs_office_id?: string | null
          documents?: Json | null
          duties_paid_at?: string | null
          eta_date?: string | null
          exchange_rate?: number | null
          fob_value?: number | null
          freight_value?: number | null
          gross_weight_kg?: number | null
          id?: string
          import_type_id?: string | null
          importer_address?: string | null
          importer_name: string
          importer_npwp?: string | null
          insurance_value?: number | null
          internal_ref: string
          job_order_id?: string | null
          notes?: string | null
          package_type?: string | null
          pib_number?: string | null
          port_of_discharge?: string | null
          port_of_loading?: string | null
          pph_import?: number | null
          ppn?: number | null
          released_at?: string | null
          sppb_date?: string | null
          sppb_number?: string | null
          status?: string | null
          submitted_at?: string | null
          supplier_country?: string | null
          supplier_name?: string | null
          total_duties?: number | null
          total_packages?: number | null
          transport_mode?: string | null
          updated_at?: string | null
          vessel_name?: string | null
          voyage_number?: string | null
        }
        Update: {
          aju_number?: string | null
          ata_date?: string | null
          awb_number?: string | null
          bea_masuk?: number | null
          bill_of_lading?: string | null
          cif_value?: number | null
          cif_value_idr?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          customs_office_id?: string | null
          documents?: Json | null
          duties_paid_at?: string | null
          eta_date?: string | null
          exchange_rate?: number | null
          fob_value?: number | null
          freight_value?: number | null
          gross_weight_kg?: number | null
          id?: string
          import_type_id?: string | null
          importer_address?: string | null
          importer_name?: string
          importer_npwp?: string | null
          insurance_value?: number | null
          internal_ref?: string
          job_order_id?: string | null
          notes?: string | null
          package_type?: string | null
          pib_number?: string | null
          port_of_discharge?: string | null
          port_of_loading?: string | null
          pph_import?: number | null
          ppn?: number | null
          released_at?: string | null
          sppb_date?: string | null
          sppb_number?: string | null
          status?: string | null
          submitted_at?: string | null
          supplier_country?: string | null
          supplier_name?: string | null
          total_duties?: number | null
          total_packages?: number | null
          transport_mode?: string | null
          updated_at?: string | null
          vessel_name?: string | null
          voyage_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pib_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pib_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profitability"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "pib_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pib_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "pib_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_revenue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "pib_documents_customs_office_id_fkey"
            columns: ["customs_office_id"]
            isOneToOne: false
            referencedRelation: "customs_offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pib_documents_import_type_id_fkey"
            columns: ["import_type_id"]
            isOneToOne: false
            referencedRelation: "import_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pib_documents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "pib_documents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "pib_documents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pib_documents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
        ]
      }
      pib_items: {
        Row: {
          bea_masuk: number | null
          bm_rate: number | null
          brand: string | null
          country_of_origin: string | null
          created_at: string | null
          currency: string | null
          goods_description: string
          gross_weight_kg: number | null
          hs_code: string
          hs_description: string | null
          id: string
          item_number: number
          net_weight_kg: number | null
          permit_date: string | null
          permit_number: string | null
          permit_type: string | null
          pib_id: string
          pph_import: number | null
          pph_rate: number | null
          ppn: number | null
          ppn_rate: number | null
          quantity: number
          requires_permit: boolean | null
          specifications: string | null
          total_price: number | null
          type_model: string | null
          unit: string
          unit_price: number | null
        }
        Insert: {
          bea_masuk?: number | null
          bm_rate?: number | null
          brand?: string | null
          country_of_origin?: string | null
          created_at?: string | null
          currency?: string | null
          goods_description: string
          gross_weight_kg?: number | null
          hs_code: string
          hs_description?: string | null
          id?: string
          item_number: number
          net_weight_kg?: number | null
          permit_date?: string | null
          permit_number?: string | null
          permit_type?: string | null
          pib_id: string
          pph_import?: number | null
          pph_rate?: number | null
          ppn?: number | null
          ppn_rate?: number | null
          quantity: number
          requires_permit?: boolean | null
          specifications?: string | null
          total_price?: number | null
          type_model?: string | null
          unit: string
          unit_price?: number | null
        }
        Update: {
          bea_masuk?: number | null
          bm_rate?: number | null
          brand?: string | null
          country_of_origin?: string | null
          created_at?: string | null
          currency?: string | null
          goods_description?: string
          gross_weight_kg?: number | null
          hs_code?: string
          hs_description?: string | null
          id?: string
          item_number?: number
          net_weight_kg?: number | null
          permit_date?: string | null
          permit_number?: string | null
          permit_type?: string | null
          pib_id?: string
          pph_import?: number | null
          pph_rate?: number | null
          ppn?: number | null
          ppn_rate?: number | null
          quantity?: number
          requires_permit?: boolean | null
          specifications?: string | null
          total_price?: number | null
          type_model?: string | null
          unit?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pib_items_pib_id_fkey"
            columns: ["pib_id"]
            isOneToOne: false
            referencedRelation: "active_pib_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pib_items_pib_id_fkey"
            columns: ["pib_id"]
            isOneToOne: false
            referencedRelation: "pib_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      pib_status_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_status: string
          notes: string | null
          pib_id: string
          previous_status: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status: string
          notes?: string | null
          pib_id: string
          previous_status?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status?: string
          notes?: string | null
          pib_id?: string
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pib_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pib_status_history_pib_id_fkey"
            columns: ["pib_id"]
            isOneToOne: false
            referencedRelation: "active_pib_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pib_status_history_pib_id_fkey"
            columns: ["pib_id"]
            isOneToOne: false
            referencedRelation: "pib_documents"
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
      port_agents: {
        Row: {
          address: string | null
          agent_code: string
          agent_name: string
          bank_account: string | null
          bank_name: string | null
          bank_swift: string | null
          contacts: Json | null
          created_at: string | null
          currency: string | null
          customs_license: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_preferred: boolean | null
          notes: string | null
          other_licenses: Json | null
          payment_terms: string | null
          phone: string | null
          port_country: string
          port_id: string | null
          port_name: string
          ppjk_license: string | null
          rating_count: number | null
          response_time_hours: number | null
          service_rating: number | null
          services: Json | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          agent_code: string
          agent_name: string
          bank_account?: string | null
          bank_name?: string | null
          bank_swift?: string | null
          contacts?: Json | null
          created_at?: string | null
          currency?: string | null
          customs_license?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          notes?: string | null
          other_licenses?: Json | null
          payment_terms?: string | null
          phone?: string | null
          port_country: string
          port_id?: string | null
          port_name: string
          ppjk_license?: string | null
          rating_count?: number | null
          response_time_hours?: number | null
          service_rating?: number | null
          services?: Json | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          agent_code?: string
          agent_name?: string
          bank_account?: string | null
          bank_name?: string | null
          bank_swift?: string | null
          contacts?: Json | null
          created_at?: string | null
          currency?: string | null
          customs_license?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          notes?: string | null
          other_licenses?: Json | null
          payment_terms?: string | null
          phone?: string | null
          port_country?: string
          port_id?: string | null
          port_name?: string
          ppjk_license?: string | null
          rating_count?: number | null
          response_time_hours?: number | null
          service_rating?: number | null
          services?: Json | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      ports: {
        Row: {
          city: string | null
          country_code: string
          country_name: string
          created_at: string | null
          has_breakbulk_facility: boolean | null
          has_container_terminal: boolean | null
          has_ro_ro: boolean | null
          id: string
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          max_draft_m: number | null
          max_vessel_loa_m: number | null
          port_code: string
          port_name: string
          port_type: string | null
          primary_agent_id: string | null
          timezone: string | null
        }
        Insert: {
          city?: string | null
          country_code: string
          country_name: string
          created_at?: string | null
          has_breakbulk_facility?: boolean | null
          has_container_terminal?: boolean | null
          has_ro_ro?: boolean | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_draft_m?: number | null
          max_vessel_loa_m?: number | null
          port_code: string
          port_name: string
          port_type?: string | null
          primary_agent_id?: string | null
          timezone?: string | null
        }
        Update: {
          city?: string | null
          country_code?: string
          country_name?: string
          created_at?: string | null
          has_breakbulk_facility?: boolean | null
          has_container_terminal?: boolean | null
          has_ro_ro?: boolean | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_draft_m?: number | null
          max_vessel_loa_m?: number | null
          port_code?: string
          port_name?: string
          port_type?: string | null
          primary_agent_id?: string | null
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ports_primary_agent_id_fkey"
            columns: ["primary_agent_id"]
            isOneToOne: false
            referencedRelation: "port_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string | null
          department_id: string | null
          id: string
          is_active: boolean | null
          level: number | null
          position_code: string
          position_name: string
          salary_max: number | null
          salary_min: number | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          position_code: string
          position_name: string
          salary_max?: number | null
          salary_min?: number | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          level?: number | null
          position_code?: string
          position_name?: string
          salary_max?: number | null
          salary_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      ppe_inspections: {
        Row: {
          action_required: string | null
          action_taken: string | null
          condition: string
          created_at: string | null
          findings: string | null
          id: string
          inspected_by: string | null
          inspection_date: string
          issuance_id: string
        }
        Insert: {
          action_required?: string | null
          action_taken?: string | null
          condition: string
          created_at?: string | null
          findings?: string | null
          id?: string
          inspected_by?: string | null
          inspection_date: string
          issuance_id: string
        }
        Update: {
          action_required?: string | null
          action_taken?: string | null
          condition?: string
          created_at?: string | null
          findings?: string | null
          id?: string
          inspected_by?: string | null
          inspection_date?: string
          issuance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ppe_inspections_inspected_by_fkey"
            columns: ["inspected_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppe_inspections_issuance_id_fkey"
            columns: ["issuance_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["issuance_id"]
          },
          {
            foreignKeyName: "ppe_inspections_issuance_id_fkey"
            columns: ["issuance_id"]
            isOneToOne: false
            referencedRelation: "ppe_issuance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppe_inspections_issuance_id_fkey"
            columns: ["issuance_id"]
            isOneToOne: false
            referencedRelation: "ppe_replacement_due"
            referencedColumns: ["id"]
          },
        ]
      }
      ppe_inventory: {
        Row: {
          id: string
          last_purchase_cost: number | null
          last_purchase_date: string | null
          last_purchase_qty: number | null
          ppe_type_id: string
          quantity_in_stock: number | null
          reorder_level: number | null
          size: string | null
          storage_location: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          last_purchase_cost?: number | null
          last_purchase_date?: string | null
          last_purchase_qty?: number | null
          ppe_type_id: string
          quantity_in_stock?: number | null
          reorder_level?: number | null
          size?: string | null
          storage_location?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          last_purchase_cost?: number | null
          last_purchase_date?: string | null
          last_purchase_qty?: number | null
          ppe_type_id?: string
          quantity_in_stock?: number | null
          reorder_level?: number | null
          size?: string | null
          storage_location?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ppe_inventory_ppe_type_id_fkey"
            columns: ["ppe_type_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["ppe_type_id"]
          },
          {
            foreignKeyName: "ppe_inventory_ppe_type_id_fkey"
            columns: ["ppe_type_id"]
            isOneToOne: false
            referencedRelation: "ppe_types"
            referencedColumns: ["id"]
          },
        ]
      }
      ppe_issuance: {
        Row: {
          condition_at_issue: string | null
          created_at: string | null
          employee_id: string
          expected_replacement_date: string | null
          id: string
          issued_by: string | null
          issued_date: string
          notes: string | null
          ppe_type_id: string
          quantity: number | null
          replacement_reason: string | null
          returned_condition: string | null
          returned_date: string | null
          serial_number: string | null
          size: string | null
          status: string | null
        }
        Insert: {
          condition_at_issue?: string | null
          created_at?: string | null
          employee_id: string
          expected_replacement_date?: string | null
          id?: string
          issued_by?: string | null
          issued_date: string
          notes?: string | null
          ppe_type_id: string
          quantity?: number | null
          replacement_reason?: string | null
          returned_condition?: string | null
          returned_date?: string | null
          serial_number?: string | null
          size?: string | null
          status?: string | null
        }
        Update: {
          condition_at_issue?: string | null
          created_at?: string | null
          employee_id?: string
          expected_replacement_date?: string | null
          id?: string
          issued_by?: string | null
          issued_date?: string
          notes?: string | null
          ppe_type_id?: string
          quantity?: number | null
          replacement_reason?: string | null
          returned_condition?: string | null
          returned_date?: string | null
          serial_number?: string | null
          size?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ppe_issuance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "ppe_issuance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppe_issuance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "ppe_issuance_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ppe_issuance_ppe_type_id_fkey"
            columns: ["ppe_type_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["ppe_type_id"]
          },
          {
            foreignKeyName: "ppe_issuance_ppe_type_id_fkey"
            columns: ["ppe_type_id"]
            isOneToOne: false
            referencedRelation: "ppe_types"
            referencedColumns: ["id"]
          },
        ]
      }
      ppe_types: {
        Row: {
          available_sizes: string[] | null
          category: string
          created_at: string | null
          description: string | null
          display_order: number | null
          has_sizes: boolean | null
          id: string
          is_active: boolean | null
          is_mandatory: boolean | null
          ppe_code: string
          ppe_name: string
          replacement_interval_days: number | null
          required_for_activities: string[] | null
          required_for_roles: string[] | null
          unit_cost: number | null
        }
        Insert: {
          available_sizes?: string[] | null
          category: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          has_sizes?: boolean | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          ppe_code: string
          ppe_name: string
          replacement_interval_days?: number | null
          required_for_activities?: string[] | null
          required_for_roles?: string[] | null
          unit_cost?: number | null
        }
        Update: {
          available_sizes?: string[] | null
          category?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          has_sizes?: boolean | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          ppe_code?: string
          ppe_name?: string
          replacement_interval_days?: number | null
          required_for_activities?: string[] | null
          required_for_roles?: string[] | null
          unit_cost?: number | null
        }
        Relationships: []
      }
      prediction_models: {
        Row: {
          accuracy_metrics: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_trained_at: string | null
          model_code: string
          model_name: string
          model_type: string
          parameters: Json | null
          training_data_range: Json | null
        }
        Insert: {
          accuracy_metrics?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_trained_at?: string | null
          model_code: string
          model_name: string
          model_type: string
          parameters?: Json | null
          training_data_range?: Json | null
        }
        Update: {
          accuracy_metrics?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_trained_at?: string | null
          model_code?: string
          model_name?: string
          model_type?: string
          parameters?: Json | null
          training_data_range?: Json | null
        }
        Relationships: []
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
          checked_at: string | null
          checked_by: string | null
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
          engineering_assigned_at: string | null
          engineering_assigned_to: string | null
          engineering_completed_at: string | null
          engineering_completed_by: string | null
          engineering_notes: string | null
          engineering_status: string | null
          engineering_waived_reason: string | null
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
          quotation_id: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requires_engineering: boolean | null
          requires_special_permit: boolean | null
          status: string
          terrain_type: string | null
          total_cost_actual: number | null
          total_cost_estimated: number | null
          total_expenses: number | null
          total_revenue: number | null
          total_revenue_calculated: number | null
          updated_at: string | null
          workflow_status: string | null
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
          checked_at?: string | null
          checked_by?: string | null
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
          engineering_assigned_at?: string | null
          engineering_assigned_to?: string | null
          engineering_completed_at?: string | null
          engineering_completed_by?: string | null
          engineering_notes?: string | null
          engineering_status?: string | null
          engineering_waived_reason?: string | null
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
          quotation_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requires_engineering?: boolean | null
          requires_special_permit?: boolean | null
          status?: string
          terrain_type?: string | null
          total_cost_actual?: number | null
          total_cost_estimated?: number | null
          total_expenses?: number | null
          total_revenue?: number | null
          total_revenue_calculated?: number | null
          updated_at?: string | null
          workflow_status?: string | null
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
          checked_at?: string | null
          checked_by?: string | null
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
          engineering_assigned_at?: string | null
          engineering_assigned_to?: string | null
          engineering_completed_at?: string | null
          engineering_completed_by?: string | null
          engineering_notes?: string | null
          engineering_status?: string | null
          engineering_waived_reason?: string | null
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
          quotation_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requires_engineering?: boolean | null
          requires_special_permit?: boolean | null
          status?: string
          terrain_type?: string | null
          total_cost_actual?: number | null
          total_cost_estimated?: number | null
          total_expenses?: number | null
          total_revenue?: number | null
          total_revenue_calculated?: number | null
          updated_at?: string | null
          workflow_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proforma_job_orders_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proforma_job_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profitability"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "proforma_job_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proforma_job_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "proforma_job_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_revenue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "proforma_job_orders_engineering_assigned_to_fkey"
            columns: ["engineering_assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proforma_job_orders_engineering_completed_by_fkey"
            columns: ["engineering_completed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proforma_job_orders_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "proforma_job_orders_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "proforma_job_orders_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proforma_job_orders_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proforma_job_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proforma_job_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotation_dashboard_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proforma_job_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proforma_job_orders_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
            referencedRelation: "customer_profitability"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_revenue"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      pursuit_costs: {
        Row: {
          amount: number
          category: string
          cost_date: string
          created_at: string | null
          description: string
          engineering_portion: number | null
          id: string
          incurred_by: string | null
          marketing_portion: number | null
          notes: string | null
          quotation_id: string
          receipt_url: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          category: string
          cost_date: string
          created_at?: string | null
          description: string
          engineering_portion?: number | null
          id?: string
          incurred_by?: string | null
          marketing_portion?: number | null
          notes?: string | null
          quotation_id: string
          receipt_url?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          cost_date?: string
          created_at?: string | null
          description?: string
          engineering_portion?: number | null
          id?: string
          incurred_by?: string | null
          marketing_portion?: number | null
          notes?: string | null
          quotation_id?: string
          receipt_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pursuit_costs_incurred_by_fkey"
            columns: ["incurred_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pursuit_costs_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotation_dashboard_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pursuit_costs_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_cost_items: {
        Row: {
          category: string
          created_at: string | null
          description: string
          display_order: number | null
          estimated_amount: number
          id: string
          notes: string | null
          quotation_id: string
          updated_at: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          display_order?: number | null
          estimated_amount: number
          id?: string
          notes?: string | null
          quotation_id: string
          updated_at?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          display_order?: number | null
          estimated_amount?: number
          id?: string
          notes?: string | null
          quotation_id?: string
          updated_at?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_cost_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotation_dashboard_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_cost_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_cost_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_revenue_items: {
        Row: {
          category: string
          created_at: string | null
          description: string
          display_order: number | null
          id: string
          notes: string | null
          quantity: number | null
          quotation_id: string
          subtotal: number | null
          unit: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          display_order?: number | null
          id?: string
          notes?: string | null
          quantity?: number | null
          quotation_id: string
          subtotal?: number | null
          unit?: string | null
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          display_order?: number | null
          id?: string
          notes?: string | null
          quantity?: number | null
          quotation_id?: string
          subtotal?: number | null
          unit?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_revenue_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotation_dashboard_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_revenue_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          cargo_height_m: number | null
          cargo_length_m: number | null
          cargo_value: number | null
          cargo_weight_kg: number | null
          cargo_width_m: number | null
          commodity: string | null
          complexity_factors: Json | null
          complexity_score: number | null
          created_at: string | null
          created_by: string | null
          customer_id: string
          destination: string
          destination_lat: number | null
          destination_lng: number | null
          destination_place_id: string | null
          duration_days: number | null
          engineering_assigned_at: string | null
          engineering_assigned_to: string | null
          engineering_completed_at: string | null
          engineering_completed_by: string | null
          engineering_notes: string | null
          engineering_status: string | null
          engineering_waived_reason: string | null
          estimated_shipments: number | null
          gross_profit: number | null
          id: string
          is_active: boolean | null
          is_hazardous: boolean | null
          is_new_route: boolean | null
          market_type: string | null
          notes: string | null
          origin: string
          origin_lat: number | null
          origin_lng: number | null
          origin_place_id: string | null
          outcome_date: string | null
          outcome_reason: string | null
          profit_margin: number | null
          project_id: string | null
          quotation_number: string
          requires_engineering: boolean | null
          requires_special_permit: boolean | null
          rfq_date: string | null
          rfq_deadline: string | null
          rfq_number: string | null
          rfq_received_date: string | null
          status: string | null
          submitted_at: string | null
          submitted_to: string | null
          terrain_type: string | null
          title: string
          total_cost: number | null
          total_pursuit_cost: number | null
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          cargo_height_m?: number | null
          cargo_length_m?: number | null
          cargo_value?: number | null
          cargo_weight_kg?: number | null
          cargo_width_m?: number | null
          commodity?: string | null
          complexity_factors?: Json | null
          complexity_score?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          destination: string
          destination_lat?: number | null
          destination_lng?: number | null
          destination_place_id?: string | null
          duration_days?: number | null
          engineering_assigned_at?: string | null
          engineering_assigned_to?: string | null
          engineering_completed_at?: string | null
          engineering_completed_by?: string | null
          engineering_notes?: string | null
          engineering_status?: string | null
          engineering_waived_reason?: string | null
          estimated_shipments?: number | null
          gross_profit?: number | null
          id?: string
          is_active?: boolean | null
          is_hazardous?: boolean | null
          is_new_route?: boolean | null
          market_type?: string | null
          notes?: string | null
          origin: string
          origin_lat?: number | null
          origin_lng?: number | null
          origin_place_id?: string | null
          outcome_date?: string | null
          outcome_reason?: string | null
          profit_margin?: number | null
          project_id?: string | null
          quotation_number: string
          requires_engineering?: boolean | null
          requires_special_permit?: boolean | null
          rfq_date?: string | null
          rfq_deadline?: string | null
          rfq_number?: string | null
          rfq_received_date?: string | null
          status?: string | null
          submitted_at?: string | null
          submitted_to?: string | null
          terrain_type?: string | null
          title: string
          total_cost?: number | null
          total_pursuit_cost?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          cargo_height_m?: number | null
          cargo_length_m?: number | null
          cargo_value?: number | null
          cargo_weight_kg?: number | null
          cargo_width_m?: number | null
          commodity?: string | null
          complexity_factors?: Json | null
          complexity_score?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          destination?: string
          destination_lat?: number | null
          destination_lng?: number | null
          destination_place_id?: string | null
          duration_days?: number | null
          engineering_assigned_at?: string | null
          engineering_assigned_to?: string | null
          engineering_completed_at?: string | null
          engineering_completed_by?: string | null
          engineering_notes?: string | null
          engineering_status?: string | null
          engineering_waived_reason?: string | null
          estimated_shipments?: number | null
          gross_profit?: number | null
          id?: string
          is_active?: boolean | null
          is_hazardous?: boolean | null
          is_new_route?: boolean | null
          market_type?: string | null
          notes?: string | null
          origin?: string
          origin_lat?: number | null
          origin_lng?: number | null
          origin_place_id?: string | null
          outcome_date?: string | null
          outcome_reason?: string | null
          profit_margin?: number | null
          project_id?: string | null
          quotation_number?: string
          requires_engineering?: boolean | null
          requires_special_permit?: boolean | null
          rfq_date?: string | null
          rfq_deadline?: string | null
          rfq_number?: string | null
          rfq_received_date?: string | null
          status?: string | null
          submitted_at?: string | null
          submitted_to?: string | null
          terrain_type?: string | null
          title?: string
          total_cost?: number | null
          total_pursuit_cost?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profitability"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_revenue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "quotations_engineering_assigned_to_fkey"
            columns: ["engineering_assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_engineering_completed_by_fkey"
            columns: ["engineering_completed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_log: {
        Row: {
          blocked_until: string | null
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          blocked_until?: string | null
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      report_configurations: {
        Row: {
          allowed_roles: string[] | null
          columns: Json | null
          created_at: string | null
          default_filters: Json | null
          description: string | null
          display_order: number | null
          href: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          report_category: string
          report_code: string
          report_name: string
          updated_at: string | null
        }
        Insert: {
          allowed_roles?: string[] | null
          columns?: Json | null
          created_at?: string | null
          default_filters?: Json | null
          description?: string | null
          display_order?: number | null
          href?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          report_category: string
          report_code: string
          report_name: string
          updated_at?: string | null
        }
        Update: {
          allowed_roles?: string[] | null
          columns?: Json | null
          created_at?: string | null
          default_filters?: Json | null
          description?: string | null
          display_order?: number | null
          href?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          report_category?: string
          report_code?: string
          report_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      report_executions: {
        Row: {
          executed_at: string | null
          executed_by: string | null
          export_format: string | null
          export_url: string | null
          id: string
          parameters: Json | null
          report_code: string
        }
        Insert: {
          executed_at?: string | null
          executed_by?: string | null
          export_format?: string | null
          export_url?: string | null
          id?: string
          parameters?: Json | null
          report_code: string
        }
        Update: {
          executed_at?: string | null
          executed_by?: string | null
          export_format?: string | null
          export_url?: string | null
          id?: string
          parameters?: Json | null
          report_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_executions_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_history: {
        Row: {
          created_at: string | null
          delivery_details: Json | null
          delivery_status: string | null
          error_message: string | null
          excel_url: string | null
          generated_at: string
          id: string
          pdf_url: string | null
          recipients_count: number | null
          report_period_end: string | null
          report_period_start: string | null
          scheduled_report_id: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_details?: Json | null
          delivery_status?: string | null
          error_message?: string | null
          excel_url?: string | null
          generated_at?: string
          id?: string
          pdf_url?: string | null
          recipients_count?: number | null
          report_period_end?: string | null
          report_period_start?: string | null
          scheduled_report_id?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_details?: Json | null
          delivery_status?: string | null
          error_message?: string | null
          excel_url?: string | null
          generated_at?: string
          id?: string
          pdf_url?: string | null
          recipients_count?: number | null
          report_period_end?: string | null
          report_period_start?: string | null
          scheduled_report_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_history_scheduled_report_id_fkey"
            columns: ["scheduled_report_id"]
            isOneToOne: false
            referencedRelation: "scheduled_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_assignments: {
        Row: {
          actual_hours: number | null
          assessment_id: string | null
          assigned_by: string | null
          created_at: string | null
          end_date: string
          end_time: string | null
          id: string
          jmp_id: string | null
          job_order_id: string | null
          notes: string | null
          planned_hours: number | null
          project_id: string | null
          resource_id: string
          route_survey_id: string | null
          start_date: string
          start_time: string | null
          status: string | null
          task_description: string | null
          updated_at: string | null
          work_location: string | null
        }
        Insert: {
          actual_hours?: number | null
          assessment_id?: string | null
          assigned_by?: string | null
          created_at?: string | null
          end_date: string
          end_time?: string | null
          id?: string
          jmp_id?: string | null
          job_order_id?: string | null
          notes?: string | null
          planned_hours?: number | null
          project_id?: string | null
          resource_id: string
          route_survey_id?: string | null
          start_date: string
          start_time?: string | null
          status?: string | null
          task_description?: string | null
          updated_at?: string | null
          work_location?: string | null
        }
        Update: {
          actual_hours?: number | null
          assessment_id?: string | null
          assigned_by?: string | null
          created_at?: string | null
          end_date?: string
          end_time?: string | null
          id?: string
          jmp_id?: string | null
          job_order_id?: string | null
          notes?: string | null
          planned_hours?: number | null
          project_id?: string | null
          resource_id?: string
          route_survey_id?: string | null
          start_date?: string
          start_time?: string | null
          status?: string | null
          task_description?: string | null
          updated_at?: string | null
          work_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_assignments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "technical_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_assignments_jmp_id_fkey"
            columns: ["jmp_id"]
            isOneToOne: false
            referencedRelation: "active_journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_assignments_jmp_id_fkey"
            columns: ["jmp_id"]
            isOneToOne: false
            referencedRelation: "journey_management_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_assignments_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "resource_assignments_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "resource_assignments_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_assignments_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_assignments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "engineering_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_assignments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resource_calendar"
            referencedColumns: ["resource_id"]
          },
          {
            foreignKeyName: "resource_assignments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resource_utilization"
            referencedColumns: ["resource_id"]
          },
          {
            foreignKeyName: "resource_assignments_route_survey_id_fkey"
            columns: ["route_survey_id"]
            isOneToOne: false
            referencedRelation: "route_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_availability: {
        Row: {
          available_hours: number | null
          date: string
          id: string
          is_available: boolean | null
          notes: string | null
          resource_id: string
          unavailability_type: string | null
        }
        Insert: {
          available_hours?: number | null
          date: string
          id?: string
          is_available?: boolean | null
          notes?: string | null
          resource_id: string
          unavailability_type?: string | null
        }
        Update: {
          available_hours?: number | null
          date?: string
          id?: string
          is_available?: boolean | null
          notes?: string | null
          resource_id?: string
          unavailability_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_availability_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "engineering_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_availability_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resource_calendar"
            referencedColumns: ["resource_id"]
          },
          {
            foreignKeyName: "resource_availability_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resource_utilization"
            referencedColumns: ["resource_id"]
          },
        ]
      }
      resource_skills: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          skill_category: string | null
          skill_code: string
          skill_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          skill_category?: string | null
          skill_code: string
          skill_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          skill_category?: string | null
          skill_code?: string
          skill_name?: string
        }
        Relationships: []
      }
      revenue_forecast: {
        Row: {
          actual_revenue: number | null
          confidence_high: number | null
          confidence_level: number | null
          confidence_low: number | null
          created_at: string | null
          forecast_date: string
          id: string
          new_business_revenue: number | null
          notes: string | null
          pipeline_revenue: number | null
          predicted_revenue: number
          recurring_revenue: number | null
          target_month: string
        }
        Insert: {
          actual_revenue?: number | null
          confidence_high?: number | null
          confidence_level?: number | null
          confidence_low?: number | null
          created_at?: string | null
          forecast_date: string
          id?: string
          new_business_revenue?: number | null
          notes?: string | null
          pipeline_revenue?: number | null
          predicted_revenue: number
          recurring_revenue?: number | null
          target_month: string
        }
        Update: {
          actual_revenue?: number | null
          confidence_high?: number | null
          confidence_level?: number | null
          confidence_low?: number | null
          created_at?: string | null
          forecast_date?: string
          id?: string
          new_business_revenue?: number | null
          notes?: string | null
          pipeline_revenue?: number | null
          predicted_revenue?: number
          recurring_revenue?: number | null
          target_month?: string
        }
        Relationships: []
      }
      role_homepages: {
        Row: {
          created_at: string | null
          fallback_route: string | null
          homepage_route: string
          id: string
          redirect_rules: Json | null
          role: string
        }
        Insert: {
          created_at?: string | null
          fallback_route?: string | null
          homepage_route: string
          id?: string
          redirect_rules?: Json | null
          role: string
        }
        Update: {
          created_at?: string | null
          fallback_route?: string | null
          homepage_route?: string
          id?: string
          redirect_rules?: Json | null
          role?: string
        }
        Relationships: []
      }
      route_survey_checklist: {
        Row: {
          category: string
          check_item: string
          checked_at: string | null
          checked_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          status: string | null
          survey_id: string
        }
        Insert: {
          category: string
          check_item: string
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          survey_id: string
        }
        Update: {
          category?: string
          check_item?: string
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_survey_checklist_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_survey_checklist_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "route_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      route_survey_checklist_template: {
        Row: {
          category: string
          check_item: string
          display_order: number | null
          id: string
          is_active: boolean | null
          is_mandatory: boolean | null
        }
        Insert: {
          category: string
          check_item: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
        }
        Update: {
          category?: string
          check_item?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
        }
        Relationships: []
      }
      route_surveys: {
        Row: {
          alternative_routes: Json | null
          axle_configuration: string | null
          cargo_description: string
          cargo_height_m: number | null
          cargo_length_m: number | null
          cargo_weight_tons: number | null
          cargo_width_m: number | null
          completed_at: string | null
          created_at: string | null
          customer_id: string | null
          destination_address: string | null
          destination_coordinates: string | null
          destination_location: string
          documents: Json | null
          escort_cost_estimate: number | null
          escort_required: boolean | null
          escort_type: string | null
          escort_vehicles_count: number | null
          estimated_travel_time_hours: number | null
          feasibility: string | null
          feasibility_notes: string | null
          ground_clearance_m: number | null
          id: string
          job_order_id: string | null
          notes: string | null
          origin_address: string | null
          origin_coordinates: string | null
          origin_location: string
          permit_cost_estimate: number | null
          permits_required: Json | null
          photos: Json | null
          primary_route: string | null
          project_id: string | null
          quotation_id: string | null
          requested_at: string | null
          requested_by: string | null
          road_repair_cost_estimate: number | null
          route_distance_km: number | null
          status: string | null
          survey_cost: number | null
          survey_date: string | null
          survey_number: string
          surveyor_id: string | null
          surveyor_name: string | null
          total_height_m: number | null
          total_length_m: number | null
          total_route_cost_estimate: number | null
          total_weight_tons: number | null
          total_width_m: number | null
          transport_config: string | null
          travel_time_restrictions: string | null
          turning_radius_m: number | null
          updated_at: string | null
        }
        Insert: {
          alternative_routes?: Json | null
          axle_configuration?: string | null
          cargo_description: string
          cargo_height_m?: number | null
          cargo_length_m?: number | null
          cargo_weight_tons?: number | null
          cargo_width_m?: number | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          destination_address?: string | null
          destination_coordinates?: string | null
          destination_location: string
          documents?: Json | null
          escort_cost_estimate?: number | null
          escort_required?: boolean | null
          escort_type?: string | null
          escort_vehicles_count?: number | null
          estimated_travel_time_hours?: number | null
          feasibility?: string | null
          feasibility_notes?: string | null
          ground_clearance_m?: number | null
          id?: string
          job_order_id?: string | null
          notes?: string | null
          origin_address?: string | null
          origin_coordinates?: string | null
          origin_location: string
          permit_cost_estimate?: number | null
          permits_required?: Json | null
          photos?: Json | null
          primary_route?: string | null
          project_id?: string | null
          quotation_id?: string | null
          requested_at?: string | null
          requested_by?: string | null
          road_repair_cost_estimate?: number | null
          route_distance_km?: number | null
          status?: string | null
          survey_cost?: number | null
          survey_date?: string | null
          survey_number: string
          surveyor_id?: string | null
          surveyor_name?: string | null
          total_height_m?: number | null
          total_length_m?: number | null
          total_route_cost_estimate?: number | null
          total_weight_tons?: number | null
          total_width_m?: number | null
          transport_config?: string | null
          travel_time_restrictions?: string | null
          turning_radius_m?: number | null
          updated_at?: string | null
        }
        Update: {
          alternative_routes?: Json | null
          axle_configuration?: string | null
          cargo_description?: string
          cargo_height_m?: number | null
          cargo_length_m?: number | null
          cargo_weight_tons?: number | null
          cargo_width_m?: number | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          destination_address?: string | null
          destination_coordinates?: string | null
          destination_location?: string
          documents?: Json | null
          escort_cost_estimate?: number | null
          escort_required?: boolean | null
          escort_type?: string | null
          escort_vehicles_count?: number | null
          estimated_travel_time_hours?: number | null
          feasibility?: string | null
          feasibility_notes?: string | null
          ground_clearance_m?: number | null
          id?: string
          job_order_id?: string | null
          notes?: string | null
          origin_address?: string | null
          origin_coordinates?: string | null
          origin_location?: string
          permit_cost_estimate?: number | null
          permits_required?: Json | null
          photos?: Json | null
          primary_route?: string | null
          project_id?: string | null
          quotation_id?: string | null
          requested_at?: string | null
          requested_by?: string | null
          road_repair_cost_estimate?: number | null
          route_distance_km?: number | null
          status?: string | null
          survey_cost?: number | null
          survey_date?: string | null
          survey_number?: string
          surveyor_id?: string | null
          surveyor_name?: string | null
          total_height_m?: number | null
          total_length_m?: number | null
          total_route_cost_estimate?: number | null
          total_weight_tons?: number | null
          total_width_m?: number | null
          transport_config?: string | null
          travel_time_restrictions?: string | null
          turning_radius_m?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_surveys_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profitability"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "route_surveys_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_surveys_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "route_surveys_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_revenue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "route_surveys_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "route_surveys_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "route_surveys_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_surveys_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_surveys_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_surveys_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotation_dashboard_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_surveys_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_surveys_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_surveys_surveyor_id_fkey"
            columns: ["surveyor_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "route_surveys_surveyor_id_fkey"
            columns: ["surveyor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_surveys_surveyor_id_fkey"
            columns: ["surveyor_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      route_waypoints: {
        Row: {
          action_cost_estimate: number | null
          action_required: string | null
          action_responsible: string | null
          bridge_capacity_tons: number | null
          bridge_length_m: number | null
          bridge_name: string | null
          bridge_width_m: number | null
          coordinates: string | null
          created_at: string | null
          horizontal_clearance_m: number | null
          id: string
          is_passable: boolean | null
          km_from_start: number | null
          location_name: string | null
          obstacle_description: string | null
          obstacle_type: string | null
          passable_notes: string | null
          photos: Json | null
          road_condition: string | null
          road_surface: string | null
          road_width_m: number | null
          survey_id: string
          turn_feasible: boolean | null
          turn_radius_available_m: number | null
          vertical_clearance_m: number | null
          waypoint_order: number
          waypoint_type: string
        }
        Insert: {
          action_cost_estimate?: number | null
          action_required?: string | null
          action_responsible?: string | null
          bridge_capacity_tons?: number | null
          bridge_length_m?: number | null
          bridge_name?: string | null
          bridge_width_m?: number | null
          coordinates?: string | null
          created_at?: string | null
          horizontal_clearance_m?: number | null
          id?: string
          is_passable?: boolean | null
          km_from_start?: number | null
          location_name?: string | null
          obstacle_description?: string | null
          obstacle_type?: string | null
          passable_notes?: string | null
          photos?: Json | null
          road_condition?: string | null
          road_surface?: string | null
          road_width_m?: number | null
          survey_id: string
          turn_feasible?: boolean | null
          turn_radius_available_m?: number | null
          vertical_clearance_m?: number | null
          waypoint_order: number
          waypoint_type: string
        }
        Update: {
          action_cost_estimate?: number | null
          action_required?: string | null
          action_responsible?: string | null
          bridge_capacity_tons?: number | null
          bridge_length_m?: number | null
          bridge_name?: string | null
          bridge_width_m?: number | null
          coordinates?: string | null
          created_at?: string | null
          horizontal_clearance_m?: number | null
          id?: string
          is_passable?: boolean | null
          km_from_start?: number | null
          location_name?: string | null
          obstacle_description?: string | null
          obstacle_type?: string | null
          passable_notes?: string | null
          photos?: Json | null
          road_condition?: string | null
          road_surface?: string | null
          road_width_m?: number | null
          survey_id?: string
          turn_feasible?: boolean | null
          turn_radius_available_m?: number | null
          vertical_clearance_m?: number | null
          waypoint_order?: number
          waypoint_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_waypoints_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "route_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_document_acknowledgments: {
        Row: {
          acknowledged_at: string
          created_at: string
          document_id: string
          employee_id: string
          id: string
          quiz_passed: boolean | null
          quiz_score: number | null
        }
        Insert: {
          acknowledged_at?: string
          created_at?: string
          document_id: string
          employee_id: string
          id?: string
          quiz_passed?: boolean | null
          quiz_score?: number | null
        }
        Update: {
          acknowledged_at?: string
          created_at?: string
          document_id?: string
          employee_id?: string
          id?: string
          quiz_passed?: boolean | null
          quiz_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_document_acknowledgments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "expiring_safety_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_document_acknowledgments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "safety_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_document_acknowledgments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "safety_document_acknowledgments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_document_acknowledgments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      safety_document_categories: {
        Row: {
          category_code: string
          category_name: string
          created_at: string
          default_validity_days: number | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          requires_approval: boolean
          requires_expiry: boolean
          updated_at: string
        }
        Insert: {
          category_code: string
          category_name: string
          created_at?: string
          default_validity_days?: number | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          requires_approval?: boolean
          requires_expiry?: boolean
          updated_at?: string
        }
        Update: {
          category_code?: string
          category_name?: string
          created_at?: string
          default_validity_days?: number | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          requires_approval?: boolean
          requires_expiry?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      safety_documents: {
        Row: {
          applicable_departments: string[] | null
          applicable_job_types: string[] | null
          applicable_locations: string[] | null
          approved_at: string | null
          approved_by: string | null
          category_id: string
          content: string | null
          created_at: string
          created_by: string | null
          description: string | null
          document_number: string
          effective_date: string
          expiry_date: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          prepared_at: string | null
          prepared_by: string | null
          previous_version_id: string | null
          related_documents: string[] | null
          requires_acknowledgment: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          revision_number: number
          status: string
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          applicable_departments?: string[] | null
          applicable_job_types?: string[] | null
          applicable_locations?: string[] | null
          approved_at?: string | null
          approved_by?: string | null
          category_id: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_number: string
          effective_date: string
          expiry_date?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          prepared_at?: string | null
          prepared_by?: string | null
          previous_version_id?: string | null
          related_documents?: string[] | null
          requires_acknowledgment?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_number?: number
          status?: string
          title: string
          updated_at?: string
          version?: string
        }
        Update: {
          applicable_departments?: string[] | null
          applicable_job_types?: string[] | null
          applicable_locations?: string[] | null
          approved_at?: string | null
          approved_by?: string | null
          category_id?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_number?: string
          effective_date?: string
          expiry_date?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          prepared_at?: string | null
          prepared_by?: string | null
          previous_version_id?: string | null
          related_documents?: string[] | null
          requires_acknowledgment?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_number?: number
          status?: string
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "safety_documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "safety_documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "safety_document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_documents_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "safety_documents_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_documents_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "safety_documents_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "expiring_safety_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_documents_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "safety_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "safety_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      safety_permits: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closure_notes: string | null
          created_at: string
          document_id: string | null
          emergency_procedures: string | null
          hse_approved_at: string | null
          hse_approved_by: string | null
          id: string
          job_order_id: string | null
          permit_number: string
          permit_type: string
          requested_at: string
          requested_by: string
          required_ppe: string[] | null
          special_precautions: string | null
          status: string
          supervisor_approved_at: string | null
          supervisor_approved_by: string | null
          updated_at: string
          valid_from: string
          valid_to: string
          work_description: string
          work_location: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closure_notes?: string | null
          created_at?: string
          document_id?: string | null
          emergency_procedures?: string | null
          hse_approved_at?: string | null
          hse_approved_by?: string | null
          id?: string
          job_order_id?: string | null
          permit_number: string
          permit_type: string
          requested_at?: string
          requested_by: string
          required_ppe?: string[] | null
          special_precautions?: string | null
          status?: string
          supervisor_approved_at?: string | null
          supervisor_approved_by?: string | null
          updated_at?: string
          valid_from: string
          valid_to: string
          work_description: string
          work_location: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closure_notes?: string | null
          created_at?: string
          document_id?: string | null
          emergency_procedures?: string | null
          hse_approved_at?: string | null
          hse_approved_by?: string | null
          id?: string
          job_order_id?: string | null
          permit_number?: string
          permit_type?: string
          requested_at?: string
          requested_by?: string
          required_ppe?: string[] | null
          special_precautions?: string | null
          status?: string
          supervisor_approved_at?: string | null
          supervisor_approved_by?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string
          work_description?: string
          work_location?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_permits_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "safety_permits_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_permits_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "safety_permits_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "expiring_safety_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_permits_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "safety_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_permits_hse_approved_by_fkey"
            columns: ["hse_approved_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "safety_permits_hse_approved_by_fkey"
            columns: ["hse_approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_permits_hse_approved_by_fkey"
            columns: ["hse_approved_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "safety_permits_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "safety_permits_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "safety_permits_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_permits_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_permits_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "safety_permits_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_permits_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "safety_permits_supervisor_approved_by_fkey"
            columns: ["supervisor_approved_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "safety_permits_supervisor_approved_by_fkey"
            columns: ["supervisor_approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_permits_supervisor_approved_by_fkey"
            columns: ["supervisor_approved_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      safety_training_courses: {
        Row: {
          applicable_departments: string[] | null
          applicable_roles: string[] | null
          course_code: string
          course_name: string
          created_at: string | null
          description: string | null
          duration_hours: number | null
          external_provider: string | null
          id: string
          internal_training: boolean | null
          is_active: boolean | null
          is_mandatory: boolean | null
          passing_score: number | null
          prerequisite_courses: string[] | null
          requires_assessment: boolean | null
          training_type: string
          validity_months: number | null
        }
        Insert: {
          applicable_departments?: string[] | null
          applicable_roles?: string[] | null
          course_code: string
          course_name: string
          created_at?: string | null
          description?: string | null
          duration_hours?: number | null
          external_provider?: string | null
          id?: string
          internal_training?: boolean | null
          is_active?: boolean | null
          is_mandatory?: boolean | null
          passing_score?: number | null
          prerequisite_courses?: string[] | null
          requires_assessment?: boolean | null
          training_type: string
          validity_months?: number | null
        }
        Update: {
          applicable_departments?: string[] | null
          applicable_roles?: string[] | null
          course_code?: string
          course_name?: string
          created_at?: string | null
          description?: string | null
          duration_hours?: number | null
          external_provider?: string | null
          id?: string
          internal_training?: boolean | null
          is_active?: boolean | null
          is_mandatory?: boolean | null
          passing_score?: number | null
          prerequisite_courses?: string[] | null
          requires_assessment?: boolean | null
          training_type?: string
          validity_months?: number | null
        }
        Relationships: []
      }
      salary_slips: {
        Row: {
          generated_at: string | null
          id: string
          payroll_record_id: string
          pdf_url: string | null
          slip_number: string
        }
        Insert: {
          generated_at?: string | null
          id?: string
          payroll_record_id: string
          pdf_url?: string | null
          slip_number: string
        }
        Update: {
          generated_at?: string | null
          id?: string
          payroll_record_id?: string
          pdf_url?: string | null
          slip_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_slips_payroll_record_id_fkey"
            columns: ["payroll_record_id"]
            isOneToOne: false
            referencedRelation: "payroll_records"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reports: {
        Row: {
          attachment_format: string | null
          created_at: string | null
          created_by: string | null
          delivery_channels: Json | null
          description: string | null
          email_subject_template: string | null
          id: string
          include_attachments: boolean | null
          is_active: boolean | null
          last_run_at: string | null
          next_run_at: string | null
          recipients: Json | null
          report_code: string
          report_config: Json
          report_name: string
          report_type: string
          schedule_day: number | null
          schedule_time: string | null
          schedule_type: string
          timezone: string | null
        }
        Insert: {
          attachment_format?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_channels?: Json | null
          description?: string | null
          email_subject_template?: string | null
          id?: string
          include_attachments?: boolean | null
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          recipients?: Json | null
          report_code: string
          report_config: Json
          report_name: string
          report_type: string
          schedule_day?: number | null
          schedule_time?: string | null
          schedule_type: string
          timezone?: string | null
        }
        Update: {
          attachment_format?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_channels?: Json | null
          description?: string | null
          email_subject_template?: string | null
          id?: string
          include_attachments?: boolean | null
          is_active?: boolean | null
          last_run_at?: string | null
          next_run_at?: string | null
          recipients?: Json | null
          report_code?: string
          report_config?: Json
          report_name?: string
          report_type?: string
          schedule_day?: number | null
          schedule_time?: string | null
          schedule_type?: string
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_tasks: {
        Row: {
          created_at: string | null
          cron_expression: string
          description: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          last_run_duration_ms: number | null
          last_run_status: string | null
          n8n_workflow_id: string | null
          next_run_at: string | null
          task_code: string
          task_name: string
          task_parameters: Json | null
          timezone: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          cron_expression: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          last_run_duration_ms?: number | null
          last_run_status?: string | null
          n8n_workflow_id?: string | null
          next_run_at?: string | null
          task_code: string
          task_name: string
          task_parameters?: Json | null
          timezone?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          cron_expression?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          last_run_duration_ms?: number | null
          last_run_status?: string | null
          n8n_workflow_id?: string | null
          next_run_at?: string | null
          task_code?: string
          task_name?: string
          task_parameters?: Json | null
          timezone?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          action_taken: string | null
          created_at: string | null
          description: string
          event_type: string
          id: string
          investigated: boolean | null
          investigated_by: string | null
          investigation_notes: string | null
          ip_address: unknown
          payload_sample: string | null
          request_method: string | null
          request_path: string | null
          severity: string
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          description: string
          event_type: string
          id?: string
          investigated?: boolean | null
          investigated_by?: string | null
          investigation_notes?: string | null
          ip_address?: unknown
          payload_sample?: string | null
          request_method?: string | null
          request_path?: string | null
          severity: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          description?: string
          event_type?: string
          id?: string
          investigated?: boolean | null
          investigated_by?: string | null
          investigation_notes?: string | null
          ip_address?: unknown
          payload_sample?: string | null
          request_method?: string | null
          request_path?: string | null
          severity?: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_investigated_by_fkey"
            columns: ["investigated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_costs: {
        Row: {
          amount: number
          amount_idr: number | null
          bl_id: string | null
          booking_id: string | null
          charge_type_id: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          exchange_rate: number | null
          id: string
          is_taxable: boolean | null
          job_order_id: string | null
          notes: string | null
          paid_amount: number | null
          paid_date: string | null
          payment_reference: string | null
          payment_status: string | null
          quantity: number | null
          tax_amount: number | null
          tax_rate: number | null
          total_amount: number | null
          unit_price: number
          vendor_id: string | null
          vendor_invoice_date: string | null
          vendor_invoice_number: string | null
          vendor_name: string | null
        }
        Insert: {
          amount: number
          amount_idr?: number | null
          bl_id?: string | null
          booking_id?: string | null
          charge_type_id: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          exchange_rate?: number | null
          id?: string
          is_taxable?: boolean | null
          job_order_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          quantity?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number | null
          unit_price: number
          vendor_id?: string | null
          vendor_invoice_date?: string | null
          vendor_invoice_number?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          amount_idr?: number | null
          bl_id?: string | null
          booking_id?: string | null
          charge_type_id?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          exchange_rate?: number | null
          id?: string
          is_taxable?: boolean | null
          job_order_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          quantity?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number | null
          unit_price?: number
          vendor_id?: string | null
          vendor_invoice_date?: string | null
          vendor_invoice_number?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_costs_bl_id_fkey"
            columns: ["bl_id"]
            isOneToOne: false
            referencedRelation: "bills_of_lading"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_costs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "active_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_costs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "freight_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_costs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "shipment_profitability"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "shipment_costs_charge_type_id_fkey"
            columns: ["charge_type_id"]
            isOneToOne: false
            referencedRelation: "agency_charge_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_costs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_costs_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "shipment_costs_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "shipment_costs_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_costs_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_costs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "agency_service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_revenue: {
        Row: {
          amount: number
          amount_idr: number | null
          billing_status: string | null
          bl_id: string | null
          booking_id: string | null
          charge_type_id: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          exchange_rate: number | null
          id: string
          invoice_id: string | null
          is_taxable: boolean | null
          job_order_id: string | null
          notes: string | null
          quantity: number | null
          tax_amount: number | null
          tax_rate: number | null
          total_amount: number | null
          unit_price: number
        }
        Insert: {
          amount: number
          amount_idr?: number | null
          billing_status?: string | null
          bl_id?: string | null
          booking_id?: string | null
          charge_type_id: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          exchange_rate?: number | null
          id?: string
          invoice_id?: string | null
          is_taxable?: boolean | null
          job_order_id?: string | null
          notes?: string | null
          quantity?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number | null
          unit_price: number
        }
        Update: {
          amount?: number
          amount_idr?: number | null
          billing_status?: string | null
          bl_id?: string | null
          booking_id?: string | null
          charge_type_id?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          exchange_rate?: number | null
          id?: string
          invoice_id?: string | null
          is_taxable?: boolean | null
          job_order_id?: string | null
          notes?: string | null
          quantity?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "shipment_revenue_bl_id_fkey"
            columns: ["bl_id"]
            isOneToOne: false
            referencedRelation: "bills_of_lading"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_revenue_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "active_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_revenue_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "freight_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_revenue_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "shipment_profitability"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "shipment_revenue_charge_type_id_fkey"
            columns: ["charge_type_id"]
            isOneToOne: false
            referencedRelation: "agency_charge_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_revenue_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_revenue_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_revenue_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "shipment_revenue_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "shipment_revenue_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_revenue_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_tracking: {
        Row: {
          bl_id: string | null
          booking_id: string | null
          container_id: string | null
          container_number: string | null
          created_at: string | null
          description: string | null
          event_timestamp: string
          event_type: string
          id: string
          is_actual: boolean | null
          location_code: string | null
          location_name: string | null
          source: string | null
          terminal: string | null
          tracking_number: string | null
          vessel_name: string | null
          voyage_number: string | null
        }
        Insert: {
          bl_id?: string | null
          booking_id?: string | null
          container_id?: string | null
          container_number?: string | null
          created_at?: string | null
          description?: string | null
          event_timestamp: string
          event_type: string
          id?: string
          is_actual?: boolean | null
          location_code?: string | null
          location_name?: string | null
          source?: string | null
          terminal?: string | null
          tracking_number?: string | null
          vessel_name?: string | null
          voyage_number?: string | null
        }
        Update: {
          bl_id?: string | null
          booking_id?: string | null
          container_id?: string | null
          container_number?: string | null
          created_at?: string | null
          description?: string | null
          event_timestamp?: string
          event_type?: string
          id?: string
          is_actual?: boolean | null
          location_code?: string | null
          location_name?: string | null
          source?: string | null
          terminal?: string | null
          tracking_number?: string | null
          vessel_name?: string | null
          voyage_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_tracking_bl_id_fkey"
            columns: ["bl_id"]
            isOneToOne: false
            referencedRelation: "bills_of_lading"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_tracking_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "active_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_tracking_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "freight_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_tracking_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "shipment_profitability"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "shipment_tracking_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "booking_containers"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_instructions: {
        Row: {
          bl_id: string | null
          bl_type_requested: string | null
          booking_id: string
          cargo_description: string
          confirmed_at: string | null
          consignee_address: string | null
          consignee_name: string | null
          consignee_to_order: boolean
          copies_required: number
          created_at: string
          created_by: string | null
          documents_required: Json
          freight_terms: string
          gross_weight_kg: number | null
          hs_code: string | null
          id: string
          lc_issuing_bank: string | null
          lc_number: string | null
          lc_terms: string | null
          marks_and_numbers: string | null
          measurement_cbm: number | null
          net_weight_kg: number | null
          notify_party_address: string | null
          notify_party_name: string | null
          number_of_packages: number | null
          originals_required: number
          package_type: string | null
          second_notify_address: string | null
          second_notify_name: string | null
          shipper_address: string
          shipper_contact: string | null
          shipper_name: string
          si_number: string
          special_instructions: string | null
          status: string
          submitted_at: string | null
          to_order_text: string | null
          updated_at: string
        }
        Insert: {
          bl_id?: string | null
          bl_type_requested?: string | null
          booking_id: string
          cargo_description: string
          confirmed_at?: string | null
          consignee_address?: string | null
          consignee_name?: string | null
          consignee_to_order?: boolean
          copies_required?: number
          created_at?: string
          created_by?: string | null
          documents_required?: Json
          freight_terms?: string
          gross_weight_kg?: number | null
          hs_code?: string | null
          id?: string
          lc_issuing_bank?: string | null
          lc_number?: string | null
          lc_terms?: string | null
          marks_and_numbers?: string | null
          measurement_cbm?: number | null
          net_weight_kg?: number | null
          notify_party_address?: string | null
          notify_party_name?: string | null
          number_of_packages?: number | null
          originals_required?: number
          package_type?: string | null
          second_notify_address?: string | null
          second_notify_name?: string | null
          shipper_address: string
          shipper_contact?: string | null
          shipper_name: string
          si_number: string
          special_instructions?: string | null
          status?: string
          submitted_at?: string | null
          to_order_text?: string | null
          updated_at?: string
        }
        Update: {
          bl_id?: string | null
          bl_type_requested?: string | null
          booking_id?: string
          cargo_description?: string
          confirmed_at?: string | null
          consignee_address?: string | null
          consignee_name?: string | null
          consignee_to_order?: boolean
          copies_required?: number
          created_at?: string
          created_by?: string | null
          documents_required?: Json
          freight_terms?: string
          gross_weight_kg?: number | null
          hs_code?: string | null
          id?: string
          lc_issuing_bank?: string | null
          lc_number?: string | null
          lc_terms?: string | null
          marks_and_numbers?: string | null
          measurement_cbm?: number | null
          net_weight_kg?: number | null
          notify_party_address?: string | null
          notify_party_name?: string | null
          number_of_packages?: number | null
          originals_required?: number
          package_type?: string | null
          second_notify_address?: string | null
          second_notify_name?: string | null
          shipper_address?: string
          shipper_contact?: string | null
          shipper_name?: string
          si_number?: string
          special_instructions?: string | null
          status?: string
          submitted_at?: string | null
          to_order_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_instructions_bl_id_fkey"
            columns: ["bl_id"]
            isOneToOne: false
            referencedRelation: "bills_of_lading"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_instructions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "active_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_instructions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "freight_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_instructions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "shipment_profitability"
            referencedColumns: ["booking_id"]
          },
        ]
      }
      shipping_lines: {
        Row: {
          booking_portal_url: string | null
          contacts: Json | null
          created_at: string | null
          credit_days: number | null
          credit_limit: number | null
          head_office_address: string | null
          head_office_country: string | null
          id: string
          is_active: boolean | null
          is_preferred: boolean | null
          line_code: string
          line_name: string
          local_agent_address: string | null
          local_agent_email: string | null
          local_agent_name: string | null
          local_agent_phone: string | null
          notes: string | null
          payment_terms: string | null
          reliability_score: number | null
          routes_served: Json | null
          service_rating: number | null
          services_offered: Json | null
          tracking_url: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          booking_portal_url?: string | null
          contacts?: Json | null
          created_at?: string | null
          credit_days?: number | null
          credit_limit?: number | null
          head_office_address?: string | null
          head_office_country?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          line_code: string
          line_name: string
          local_agent_address?: string | null
          local_agent_email?: string | null
          local_agent_name?: string | null
          local_agent_phone?: string | null
          notes?: string | null
          payment_terms?: string | null
          reliability_score?: number | null
          routes_served?: Json | null
          service_rating?: number | null
          services_offered?: Json | null
          tracking_url?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          booking_portal_url?: string | null
          contacts?: Json | null
          created_at?: string | null
          credit_days?: number | null
          credit_limit?: number | null
          head_office_address?: string | null
          head_office_country?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          line_code?: string
          line_name?: string
          local_agent_address?: string | null
          local_agent_email?: string | null
          local_agent_name?: string | null
          local_agent_phone?: string | null
          notes?: string | null
          payment_terms?: string | null
          reliability_score?: number | null
          routes_served?: Json | null
          service_rating?: number | null
          services_offered?: Json | null
          tracking_url?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      shipping_rates: {
        Row: {
          baf: number | null
          caf: number | null
          container_type: string
          created_at: string | null
          currency: string | null
          destination_port_id: string
          ens: number | null
          frequency: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          ocean_freight: number
          origin_port_id: string
          other_surcharges: Json | null
          pss: number | null
          shipping_line_id: string
          terms: string | null
          total_rate: number | null
          transit_days: number | null
          valid_from: string
          valid_to: string
        }
        Insert: {
          baf?: number | null
          caf?: number | null
          container_type: string
          created_at?: string | null
          currency?: string | null
          destination_port_id: string
          ens?: number | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          ocean_freight: number
          origin_port_id: string
          other_surcharges?: Json | null
          pss?: number | null
          shipping_line_id: string
          terms?: string | null
          total_rate?: number | null
          transit_days?: number | null
          valid_from: string
          valid_to: string
        }
        Update: {
          baf?: number | null
          caf?: number | null
          container_type?: string
          created_at?: string | null
          currency?: string | null
          destination_port_id?: string
          ens?: number | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          ocean_freight?: number
          origin_port_id?: string
          other_surcharges?: Json | null
          pss?: number | null
          shipping_line_id?: string
          terms?: string | null
          total_rate?: number | null
          transit_days?: number | null
          valid_from?: string
          valid_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_rates_destination_port_id_fkey"
            columns: ["destination_port_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_rates_origin_port_id_fkey"
            columns: ["origin_port_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_rates_shipping_line_id_fkey"
            columns: ["shipping_line_id"]
            isOneToOne: false
            referencedRelation: "shipping_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_categories: {
        Row: {
          category_code: string
          category_name: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
        }
        Insert: {
          category_code: string
          category_name: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
        }
        Update: {
          category_code?: string
          category_name?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
        }
        Relationships: []
      }
      skills: {
        Row: {
          category_id: string | null
          certification_validity_months: number | null
          created_at: string | null
          criticality: string | null
          description: string | null
          id: string
          is_active: boolean | null
          requires_certification: boolean | null
          skill_code: string
          skill_name: string
          target_coverage_percent: number | null
        }
        Insert: {
          category_id?: string | null
          certification_validity_months?: number | null
          created_at?: string | null
          criticality?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          requires_certification?: boolean | null
          skill_code: string
          skill_name: string
          target_coverage_percent?: number | null
        }
        Update: {
          category_id?: string | null
          certification_validity_months?: number | null
          created_at?: string | null
          criticality?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          requires_certification?: boolean | null
          skill_code?: string
          skill_name?: string
          target_coverage_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "skills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "skill_categories"
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
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "surat_jalan_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "surat_jalan_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surat_jalan_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_log: {
        Row: {
          completed_at: string | null
          connection_id: string
          created_at: string | null
          error_details: Json | null
          id: string
          mapping_id: string | null
          records_created: number | null
          records_failed: number | null
          records_processed: number | null
          records_updated: number | null
          started_at: string | null
          status: string | null
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          connection_id: string
          created_at?: string | null
          error_details?: Json | null
          id?: string
          mapping_id?: string | null
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string | null
          status?: string | null
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          connection_id?: string
          created_at?: string | null
          error_details?: Json | null
          id?: string
          mapping_id?: string | null
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string | null
          status?: string | null
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_log_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_log_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "sync_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_mappings: {
        Row: {
          connection_id: string
          created_at: string | null
          field_mappings: Json
          filter_conditions: Json | null
          id: string
          is_active: boolean | null
          local_table: string
          remote_entity: string
          sync_direction: string | null
          sync_frequency: string | null
        }
        Insert: {
          connection_id: string
          created_at?: string | null
          field_mappings?: Json
          filter_conditions?: Json | null
          id?: string
          is_active?: boolean | null
          local_table: string
          remote_entity: string
          sync_direction?: string | null
          sync_frequency?: string | null
        }
        Update: {
          connection_id?: string
          created_at?: string | null
          field_mappings?: Json
          filter_conditions?: Json | null
          id?: string
          is_active?: boolean | null
          local_table?: string
          remote_entity?: string
          sync_direction?: string | null
          sync_frequency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health: {
        Row: {
          avg_query_time_ms: number | null
          cache_hit_rate: number | null
          db_connections_active: number | null
          db_connections_idle: number | null
          db_size_mb: number | null
          errors_last_hour: number | null
          failed_jobs: number | null
          id: string
          largest_tables: Json | null
          metrics: Json | null
          pending_jobs: number | null
          slow_queries_count: number | null
          timestamp: string
        }
        Insert: {
          avg_query_time_ms?: number | null
          cache_hit_rate?: number | null
          db_connections_active?: number | null
          db_connections_idle?: number | null
          db_size_mb?: number | null
          errors_last_hour?: number | null
          failed_jobs?: number | null
          id?: string
          largest_tables?: Json | null
          metrics?: Json | null
          pending_jobs?: number | null
          slow_queries_count?: number | null
          timestamp?: string
        }
        Update: {
          avg_query_time_ms?: number | null
          cache_hit_rate?: number | null
          db_connections_active?: number | null
          db_connections_idle?: number | null
          db_size_mb?: number | null
          errors_last_hour?: number | null
          failed_jobs?: number | null
          id?: string
          largest_tables?: Json | null
          metrics?: Json | null
          pending_jobs?: number | null
          slow_queries_count?: number | null
          timestamp?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          data: Json | null
          error_stack: string | null
          error_type: string | null
          function_name: string | null
          id: string
          level: string
          message: string
          module: string | null
          request_id: string | null
          source: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          data?: Json | null
          error_stack?: string | null
          error_type?: string | null
          function_name?: string | null
          id?: string
          level: string
          message: string
          module?: string | null
          request_id?: string | null
          source: string
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          data?: Json | null
          error_stack?: string | null
          error_type?: string | null
          function_name?: string | null
          id?: string
          level?: string
          message?: string
          module?: string | null
          request_id?: string | null
          source?: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_executions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          records_processed: number | null
          result_summary: Json | null
          started_at: string | null
          status: string | null
          task_id: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          records_processed?: number | null
          result_summary?: Json | null
          started_at?: string | null
          status?: string | null
          task_id: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          records_processed?: number | null
          result_summary?: Json | null
          started_at?: string | null
          status?: string | null
          task_id?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_executions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "scheduled_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_assessment_types: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          template_sections: Json | null
          type_code: string
          type_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          template_sections?: Json | null
          type_code: string
          type_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          template_sections?: Json | null
          type_code?: string
          type_name?: string
        }
        Relationships: []
      }
      technical_assessments: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assessment_data: Json | null
          assessment_number: string
          assessment_type_id: string
          assumptions: string | null
          calculations: Json | null
          cargo_description: string | null
          cargo_dimensions: Json | null
          cargo_weight_tons: number | null
          conclusion: string | null
          conclusion_notes: string | null
          created_at: string | null
          customer_id: string | null
          description: string | null
          documents: Json | null
          drawings: Json | null
          equipment_recommended: Json | null
          id: string
          job_order_id: string | null
          limitations: string | null
          prepared_at: string | null
          prepared_by: string | null
          previous_revision_id: string | null
          project_id: string | null
          quotation_id: string | null
          recommendations: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision_notes: string | null
          revision_number: number | null
          route_survey_id: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assessment_data?: Json | null
          assessment_number: string
          assessment_type_id: string
          assumptions?: string | null
          calculations?: Json | null
          cargo_description?: string | null
          cargo_dimensions?: Json | null
          cargo_weight_tons?: number | null
          conclusion?: string | null
          conclusion_notes?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          documents?: Json | null
          drawings?: Json | null
          equipment_recommended?: Json | null
          id?: string
          job_order_id?: string | null
          limitations?: string | null
          prepared_at?: string | null
          prepared_by?: string | null
          previous_revision_id?: string | null
          project_id?: string | null
          quotation_id?: string | null
          recommendations?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_notes?: string | null
          revision_number?: number | null
          route_survey_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assessment_data?: Json | null
          assessment_number?: string
          assessment_type_id?: string
          assumptions?: string | null
          calculations?: Json | null
          cargo_description?: string | null
          cargo_dimensions?: Json | null
          cargo_weight_tons?: number | null
          conclusion?: string | null
          conclusion_notes?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          documents?: Json | null
          drawings?: Json | null
          equipment_recommended?: Json | null
          id?: string
          job_order_id?: string | null
          limitations?: string | null
          prepared_at?: string | null
          prepared_by?: string | null
          previous_revision_id?: string | null
          project_id?: string | null
          quotation_id?: string | null
          recommendations?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_notes?: string | null
          revision_number?: number | null
          route_survey_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technical_assessments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "technical_assessments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_assessments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "technical_assessments_assessment_type_id_fkey"
            columns: ["assessment_type_id"]
            isOneToOne: false
            referencedRelation: "technical_assessment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_assessments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profitability"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "technical_assessments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_assessments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "technical_assessments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_revenue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "technical_assessments_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "technical_assessments_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "technical_assessments_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_assessments_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_assessments_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "technical_assessments_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_assessments_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "technical_assessments_previous_revision_id_fkey"
            columns: ["previous_revision_id"]
            isOneToOne: false
            referencedRelation: "technical_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_assessments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_assessments_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotation_dashboard_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_assessments_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_assessments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "technical_assessments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_assessments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "technical_assessments_route_survey_id_fkey"
            columns: ["route_survey_id"]
            isOneToOne: false
            referencedRelation: "route_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_subscriptions: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          notify_arrival: boolean | null
          notify_delay: boolean | null
          notify_departure: boolean | null
          notify_milestone: boolean | null
          reference_id: string
          reference_number: string | null
          tracking_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          notify_arrival?: boolean | null
          notify_delay?: boolean | null
          notify_departure?: boolean | null
          notify_milestone?: boolean | null
          reference_id: string
          reference_number?: string | null
          tracking_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          notify_arrival?: boolean | null
          notify_delay?: boolean | null
          notify_departure?: boolean | null
          notify_milestone?: boolean | null
          reference_id?: string
          reference_number?: string | null
          tracking_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_session_participants: {
        Row: {
          attendance_status: string | null
          employee_id: string
          id: string
          session_id: string
          training_record_id: string | null
        }
        Insert: {
          attendance_status?: string | null
          employee_id: string
          id?: string
          session_id: string
          training_record_id?: string | null
        }
        Update: {
          attendance_status?: string | null
          employee_id?: string
          id?: string
          session_id?: string
          training_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_session_participants_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "training_session_participants_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_session_participants_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "training_session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_session_participants_training_record_id_fkey"
            columns: ["training_record_id"]
            isOneToOne: false
            referencedRelation: "employee_training_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_session_participants_training_record_id_fkey"
            columns: ["training_record_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["training_record_id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          course_id: string
          created_at: string | null
          created_by: string | null
          end_time: string | null
          id: string
          location: string | null
          max_participants: number | null
          notes: string | null
          session_code: string
          session_date: string
          start_time: string | null
          status: string | null
          trainer_employee_id: string | null
          trainer_name: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          max_participants?: number | null
          notes?: string | null
          session_code: string
          session_date: string
          start_time?: string | null
          status?: string | null
          trainer_employee_id?: string | null
          trainer_name?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          max_participants?: number | null
          notes?: string | null
          session_code?: string
          session_date?: string
          start_time?: string | null
          status?: string | null
          trainer_employee_id?: string | null
          trainer_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "safety_training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "training_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_trainer_employee_id_fkey"
            columns: ["trainer_employee_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "training_sessions_trainer_employee_id_fkey"
            columns: ["trainer_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_trainer_employee_id_fkey"
            columns: ["trainer_employee_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      user_notification_type_preferences: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          notification_type: string
          push_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          notification_type: string
          push_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          notification_type?: string
          push_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_type_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_onboarding_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_count: number | null
          id: string
          started_at: string | null
          status: string | null
          step_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_count?: number | null
          id?: string
          started_at?: string | null
          status?: string | null
          step_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_count?: number | null
          id?: string
          started_at?: string | null
          status?: string | null
          step_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_onboarding_progress_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "onboarding_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_onboarding_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_onboarding_status: {
        Row: {
          completed_steps: number | null
          created_at: string | null
          id: string
          is_onboarding_complete: boolean | null
          onboarding_completed_at: string | null
          show_onboarding_widget: boolean | null
          show_welcome_modal: boolean | null
          skipped_steps: number | null
          total_points: number | null
          total_steps: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_steps?: number | null
          created_at?: string | null
          id?: string
          is_onboarding_complete?: boolean | null
          onboarding_completed_at?: string | null
          show_onboarding_widget?: boolean | null
          show_welcome_modal?: boolean | null
          skipped_steps?: number | null
          total_points?: number | null
          total_steps?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_steps?: number | null
          created_at?: string | null
          id?: string
          is_onboarding_complete?: boolean | null
          onboarding_completed_at?: string | null
          show_onboarding_widget?: boolean | null
          show_welcome_modal?: boolean | null
          skipped_steps?: number | null
          total_points?: number | null
          total_steps?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_onboarding_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          can_approve_bkk: boolean | null
          can_approve_jo: boolean | null
          can_approve_pjo: boolean
          can_check_bkk: boolean | null
          can_check_jo: boolean | null
          can_check_pjo: boolean | null
          can_create_pjo: boolean
          can_estimate_costs: boolean | null
          can_fill_costs: boolean
          can_manage_invoices: boolean
          can_manage_users: boolean
          can_see_actual_costs: boolean | null
          can_see_profit: boolean
          can_see_revenue: boolean
          created_at: string | null
          custom_dashboard: string | null
          custom_homepage: string | null
          department_scope: string[] | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          preferences: Json | null
          role: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          can_approve_bkk?: boolean | null
          can_approve_jo?: boolean | null
          can_approve_pjo?: boolean
          can_check_bkk?: boolean | null
          can_check_jo?: boolean | null
          can_check_pjo?: boolean | null
          can_create_pjo?: boolean
          can_estimate_costs?: boolean | null
          can_fill_costs?: boolean
          can_manage_invoices?: boolean
          can_manage_users?: boolean
          can_see_actual_costs?: boolean | null
          can_see_profit?: boolean
          can_see_revenue?: boolean
          created_at?: string | null
          custom_dashboard?: string | null
          custom_homepage?: string | null
          department_scope?: string[] | null
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          preferences?: Json | null
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          can_approve_bkk?: boolean | null
          can_approve_jo?: boolean | null
          can_approve_pjo?: boolean
          can_check_bkk?: boolean | null
          can_check_jo?: boolean | null
          can_check_pjo?: boolean | null
          can_create_pjo?: boolean
          can_estimate_costs?: boolean | null
          can_fill_costs?: boolean
          can_manage_invoices?: boolean
          can_manage_users?: boolean
          can_see_actual_costs?: boolean | null
          can_see_profit?: boolean
          can_see_revenue?: boolean
          created_at?: string | null
          custom_dashboard?: string | null
          custom_homepage?: string | null
          department_scope?: string[] | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          preferences?: Json | null
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_fingerprint: string | null
          expires_at: string
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_activity: string | null
          session_token_hash: string
          terminated_at: string | null
          terminated_reason: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_fingerprint?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity?: string | null
          session_token_hash: string
          terminated_at?: string | null
          terminated_reason?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity?: string | null
          session_token_hash?: string
          terminated_at?: string | null
          terminated_reason?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tour_progress: {
        Row: {
          completed_at: string | null
          current_step: number | null
          id: string
          started_at: string | null
          status: string | null
          tour_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          current_step?: number | null
          id?: string
          started_at?: string | null
          status?: string | null
          tour_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          current_step?: number | null
          id?: string
          started_at?: string | null
          status?: string | null
          tour_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tour_progress_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "guided_tours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tour_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_widget_configs: {
        Row: {
          created_at: string | null
          height: number | null
          id: string
          is_visible: boolean | null
          position_x: number | null
          position_y: number | null
          settings: Json | null
          updated_at: string | null
          user_id: string
          widget_id: string
          width: number | null
        }
        Insert: {
          created_at?: string | null
          height?: number | null
          id?: string
          is_visible?: boolean | null
          position_x?: number | null
          position_y?: number | null
          settings?: Json | null
          updated_at?: string | null
          user_id: string
          widget_id: string
          width?: number | null
        }
        Update: {
          created_at?: string | null
          height?: number | null
          id?: string
          is_visible?: boolean | null
          position_x?: number | null
          position_y?: number | null
          settings?: Json | null
          updated_at?: string | null
          user_id?: string
          widget_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_widget_configs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_widget_configs_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "dashboard_widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_errors: {
        Row: {
          corrected: boolean | null
          corrected_at: string | null
          entity_id: string | null
          entity_type: string
          error_message: string
          field_name: string
          field_value: string | null
          id: string
          timestamp: string
          user_id: string | null
          validation_rule: string
        }
        Insert: {
          corrected?: boolean | null
          corrected_at?: string | null
          entity_id?: string | null
          entity_type: string
          error_message: string
          field_name: string
          field_value?: string | null
          id?: string
          timestamp?: string
          user_id?: string | null
          validation_rule: string
        }
        Update: {
          corrected?: boolean | null
          corrected_at?: string | null
          entity_id?: string | null
          entity_type?: string
          error_message?: string
          field_name?: string
          field_value?: string | null
          id?: string
          timestamp?: string
          user_id?: string | null
          validation_rule?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_errors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      vendor_invoices: {
        Row: {
          amount_due: number | null
          amount_paid: number | null
          approved_at: string | null
          approved_by: string | null
          bkk_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          document_url: string | null
          due_date: string | null
          expense_category: string | null
          id: string
          internal_ref: string | null
          invoice_date: string
          invoice_number: string
          jo_id: string | null
          notes: string | null
          pjo_id: string | null
          received_date: string | null
          status: string | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
          vendor_id: string
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount_due?: number | null
          amount_paid?: number | null
          approved_at?: string | null
          approved_by?: string | null
          bkk_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_url?: string | null
          due_date?: string | null
          expense_category?: string | null
          id?: string
          internal_ref?: string | null
          invoice_date: string
          invoice_number: string
          jo_id?: string | null
          notes?: string | null
          pjo_id?: string | null
          received_date?: string | null
          status?: string | null
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          updated_at?: string | null
          vendor_id: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount_due?: number | null
          amount_paid?: number | null
          approved_at?: string | null
          approved_by?: string | null
          bkk_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_url?: string | null
          due_date?: string | null
          expense_category?: string | null
          id?: string
          internal_ref?: string | null
          invoice_date?: string
          invoice_number?: string
          jo_id?: string | null
          notes?: string | null
          pjo_id?: string | null
          received_date?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
          vendor_id?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_invoices_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invoices_bkk_id_fkey"
            columns: ["bkk_id"]
            isOneToOne: false
            referencedRelation: "bukti_kas_keluar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invoices_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "vendor_invoices_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "vendor_invoices_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invoices_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invoices_pjo_id_fkey"
            columns: ["pjo_id"]
            isOneToOne: false
            referencedRelation: "proforma_job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_invoices_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_payments: {
        Row: {
          amount: number
          bank_account: string | null
          bank_name: string | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          proof_url: string | null
          reference_number: string | null
          vendor_invoice_id: string
        }
        Insert: {
          amount: number
          bank_account?: string | null
          bank_name?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date: string
          payment_method: string
          proof_url?: string | null
          reference_number?: string | null
          vendor_invoice_id: string
        }
        Update: {
          amount?: number
          bank_account?: string | null
          bank_name?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          proof_url?: string | null
          reference_number?: string | null
          vendor_invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_payments_vendor_invoice_id_fkey"
            columns: ["vendor_invoice_id"]
            isOneToOne: false
            referencedRelation: "vendor_invoices"
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
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "vendor_ratings_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "vendor_ratings_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_ratings_jo_id_fkey"
            columns: ["jo_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
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
      vessel_positions: {
        Row: {
          course: number | null
          created_at: string | null
          heading: number | null
          id: string
          latitude: number
          longitude: number
          navigation_status: string | null
          received_at: string
          source: string
          speed: number | null
          timestamp: string
          vessel_id: string
        }
        Insert: {
          course?: number | null
          created_at?: string | null
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          navigation_status?: string | null
          received_at?: string
          source?: string
          speed?: number | null
          timestamp?: string
          vessel_id: string
        }
        Update: {
          course?: number | null
          created_at?: string | null
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          navigation_status?: string | null
          received_at?: string
          source?: string
          speed?: number | null
          timestamp?: string
          vessel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vessel_positions_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      vessel_schedules: {
        Row: {
          actual_arrival: string | null
          actual_departure: string | null
          berth_number: string | null
          cargo_cutoff: string | null
          created_at: string | null
          delay_minutes: number | null
          delay_reason: string | null
          documentation_cutoff: string | null
          hazmat_cutoff: string | null
          id: string
          port_id: string
          port_sequence: number
          reefer_cutoff: string | null
          remarks: string | null
          scheduled_arrival: string
          scheduled_departure: string | null
          service_name: string | null
          status: string
          terminal_name: string | null
          trade_lane: string | null
          updated_at: string | null
          user_id: string | null
          vessel_id: string
          vgm_cutoff: string | null
          voyage_number: string
        }
        Insert: {
          actual_arrival?: string | null
          actual_departure?: string | null
          berth_number?: string | null
          cargo_cutoff?: string | null
          created_at?: string | null
          delay_minutes?: number | null
          delay_reason?: string | null
          documentation_cutoff?: string | null
          hazmat_cutoff?: string | null
          id?: string
          port_id: string
          port_sequence?: number
          reefer_cutoff?: string | null
          remarks?: string | null
          scheduled_arrival: string
          scheduled_departure?: string | null
          service_name?: string | null
          status?: string
          terminal_name?: string | null
          trade_lane?: string | null
          updated_at?: string | null
          user_id?: string | null
          vessel_id: string
          vgm_cutoff?: string | null
          voyage_number: string
        }
        Update: {
          actual_arrival?: string | null
          actual_departure?: string | null
          berth_number?: string | null
          cargo_cutoff?: string | null
          created_at?: string | null
          delay_minutes?: number | null
          delay_reason?: string | null
          documentation_cutoff?: string | null
          hazmat_cutoff?: string | null
          id?: string
          port_id?: string
          port_sequence?: number
          reefer_cutoff?: string | null
          remarks?: string | null
          scheduled_arrival?: string
          scheduled_departure?: string | null
          service_name?: string | null
          status?: string
          terminal_name?: string | null
          trade_lane?: string | null
          updated_at?: string | null
          user_id?: string | null
          vessel_id?: string
          vgm_cutoff?: string | null
          voyage_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "vessel_schedules_port_id_fkey"
            columns: ["port_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vessel_schedules_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      vessels: {
        Row: {
          beam: number | null
          call_sign: string | null
          commercial_manager: string | null
          created_at: string | null
          current_port_id: string | null
          current_position: Json | null
          current_status: string
          current_voyage_number: string | null
          deadweight: number | null
          draft: number | null
          flag_country: string
          flag_country_code: string | null
          gross_tonnage: number | null
          id: string
          imo_number: string
          last_position_update: string | null
          length_overall: number | null
          mmsi: string
          net_tonnage: number | null
          operator_name: string | null
          owner_name: string | null
          port_of_registry: string | null
          technical_manager: string | null
          teu_capacity: number | null
          updated_at: string | null
          user_id: string | null
          vessel_name: string
          vessel_subtype: string | null
          vessel_type: string
        }
        Insert: {
          beam?: number | null
          call_sign?: string | null
          commercial_manager?: string | null
          created_at?: string | null
          current_port_id?: string | null
          current_position?: Json | null
          current_status?: string
          current_voyage_number?: string | null
          deadweight?: number | null
          draft?: number | null
          flag_country: string
          flag_country_code?: string | null
          gross_tonnage?: number | null
          id?: string
          imo_number: string
          last_position_update?: string | null
          length_overall?: number | null
          mmsi: string
          net_tonnage?: number | null
          operator_name?: string | null
          owner_name?: string | null
          port_of_registry?: string | null
          technical_manager?: string | null
          teu_capacity?: number | null
          updated_at?: string | null
          user_id?: string | null
          vessel_name: string
          vessel_subtype?: string | null
          vessel_type?: string
        }
        Update: {
          beam?: number | null
          call_sign?: string | null
          commercial_manager?: string | null
          created_at?: string | null
          current_port_id?: string | null
          current_position?: Json | null
          current_status?: string
          current_voyage_number?: string | null
          deadweight?: number | null
          draft?: number | null
          flag_country?: string
          flag_country_code?: string | null
          gross_tonnage?: number | null
          id?: string
          imo_number?: string
          last_position_update?: string | null
          length_overall?: number | null
          mmsi?: string
          net_tonnage?: number | null
          operator_name?: string | null
          owner_name?: string | null
          port_of_registry?: string | null
          technical_manager?: string | null
          teu_capacity?: number | null
          updated_at?: string | null
          user_id?: string | null
          vessel_name?: string
          vessel_subtype?: string | null
          vessel_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vessels_current_port_id_fkey"
            columns: ["current_port_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          allowed_ips: Json | null
          created_at: string | null
          cron_expression: string | null
          description: string | null
          endpoint_code: string
          endpoint_name: string
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          n8n_workflow_id: string | null
          n8n_workflow_name: string | null
          requires_auth: boolean | null
          trigger_conditions: Json | null
          trigger_count: number | null
          trigger_event: string | null
          trigger_table: string | null
          trigger_type: string
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          allowed_ips?: Json | null
          created_at?: string | null
          cron_expression?: string | null
          description?: string | null
          endpoint_code: string
          endpoint_name: string
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          n8n_workflow_id?: string | null
          n8n_workflow_name?: string | null
          requires_auth?: boolean | null
          trigger_conditions?: Json | null
          trigger_count?: number | null
          trigger_event?: string | null
          trigger_table?: string | null
          trigger_type: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          allowed_ips?: Json | null
          created_at?: string | null
          cron_expression?: string | null
          description?: string | null
          endpoint_code?: string
          endpoint_name?: string
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          n8n_workflow_id?: string | null
          n8n_workflow_name?: string | null
          requires_auth?: boolean | null
          trigger_conditions?: Json | null
          trigger_count?: number | null
          trigger_event?: string | null
          trigger_table?: string | null
          trigger_type?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      weekly_kpi_snapshots: {
        Row: {
          created_at: string | null
          financial_metrics: Json
          id: string
          operational_metrics: Json
          revenue_metrics: Json
          snapshot_date: string
          week_number: number
          year: number
        }
        Insert: {
          created_at?: string | null
          financial_metrics?: Json
          id?: string
          operational_metrics?: Json
          revenue_metrics?: Json
          snapshot_date: string
          week_number: number
          year: number
        }
        Update: {
          created_at?: string | null
          financial_metrics?: Json
          id?: string
          operational_metrics?: Json
          revenue_metrics?: Json
          snapshot_date?: string
          week_number?: number
          year?: number
        }
        Relationships: []
      }
      work_schedules: {
        Row: {
          break_end: string | null
          break_start: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          late_grace_minutes: number | null
          schedule_name: string
          work_days: number[] | null
          work_end: string
          work_start: string
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          late_grace_minutes?: number | null
          schedule_name: string
          work_days?: number[] | null
          work_end?: string
          work_start?: string
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          late_grace_minutes?: number | null
          schedule_name?: string
          work_days?: number[] | null
          work_end?: string
          work_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_bookings: {
        Row: {
          booking_number: string | null
          cargo_description: string | null
          cargo_height_m: number | null
          cargo_length_m: number | null
          cargo_width_m: number | null
          carrier_booking_number: string | null
          commodity_type: string | null
          confirmed_at: string | null
          consignee_address: string | null
          consignee_name: string | null
          container_count: number | null
          container_quantity: number | null
          container_type: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          cutoff_date: string | null
          cutoff_time: string | null
          dangerous_goods: Json | null
          destination_port_code: string | null
          destination_port_id: string | null
          destination_port_name: string | null
          documents: Json | null
          eta: string | null
          etd: string | null
          freight_currency: string | null
          freight_rate: number | null
          freight_terms: string | null
          gross_weight_kg: number | null
          hs_code: string | null
          id: string | null
          incoterm: string | null
          jo_number: string | null
          job_order_id: string | null
          notes: string | null
          notify_address: string | null
          notify_party: string | null
          origin_port_code: string | null
          origin_port_id: string | null
          origin_port_name: string | null
          packages_count: number | null
          quotation_id: string | null
          shipper_address: string | null
          shipper_name: string | null
          shipping_line_code: string | null
          shipping_line_id: string | null
          shipping_line_name: string | null
          si_cutoff: string | null
          special_requirements: string | null
          status: string | null
          total_freight: number | null
          total_weight_kg: number | null
          updated_at: string | null
          vessel_name: string | null
          volume_cbm: number | null
          voyage_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "freight_bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profitability"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "freight_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "freight_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_revenue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "freight_bookings_destination_port_id_fkey"
            columns: ["destination_port_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_bookings_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "freight_bookings_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "freight_bookings_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_bookings_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_bookings_origin_port_id_fkey"
            columns: ["origin_port_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_bookings_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotation_dashboard_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_bookings_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_bookings_shipping_line_id_fkey"
            columns: ["shipping_line_id"]
            isOneToOne: false
            referencedRelation: "shipping_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      active_journeys: {
        Row: {
          actual_arrival: string | null
          actual_departure: string | null
          approved_at: string | null
          approved_by: string | null
          cargo_description: string | null
          checkpoints_completed: number | null
          contingency_plans: Json | null
          convoy_commander_id: string | null
          convoy_commander_name: string | null
          convoy_configuration: Json | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          destination_location: string | null
          documents: Json | null
          drivers: Json | null
          emergency_contacts: Json | null
          emergency_procedures: string | null
          escort_details: Json | null
          go_no_go_criteria: string | null
          id: string | null
          incident_summary: string | null
          incidents_occurred: boolean | null
          jmp_number: string | null
          jo_number: string | null
          job_order_id: string | null
          journey_description: string | null
          journey_duration_hours: number | null
          journey_log: string | null
          journey_title: string | null
          lessons_learned: string | null
          movement_windows: Json | null
          nearest_hospitals: Json | null
          nearest_workshops: Json | null
          origin_location: string | null
          permits: Json | null
          planned_arrival: string | null
          planned_departure: string | null
          prepared_at: string | null
          prepared_by: string | null
          project_id: string | null
          radio_frequencies: Json | null
          reporting_schedule: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          route_distance_km: number | null
          route_survey_id: string | null
          status: string | null
          total_checkpoints: number | null
          total_height_m: number | null
          total_length_m: number | null
          total_weight_tons: number | null
          total_width_m: number | null
          updated_at: string | null
          weather_restrictions: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journey_management_plans_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "journey_management_plans_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_management_plans_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "journey_management_plans_convoy_commander_id_fkey"
            columns: ["convoy_commander_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "journey_management_plans_convoy_commander_id_fkey"
            columns: ["convoy_commander_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_management_plans_convoy_commander_id_fkey"
            columns: ["convoy_commander_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "journey_management_plans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profitability"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "journey_management_plans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_management_plans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "journey_management_plans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_revenue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "journey_management_plans_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "journey_management_plans_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "journey_management_plans_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_management_plans_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_management_plans_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "journey_management_plans_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_management_plans_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "journey_management_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_management_plans_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "journey_management_plans_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_management_plans_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "journey_management_plans_route_survey_id_fkey"
            columns: ["route_survey_id"]
            isOneToOne: false
            referencedRelation: "route_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      active_pib_documents: {
        Row: {
          aju_number: string | null
          ata_date: string | null
          awb_number: string | null
          bea_masuk: number | null
          bill_of_lading: string | null
          cif_value: number | null
          cif_value_idr: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_id: string | null
          customer_name: string | null
          customs_office_code: string | null
          customs_office_id: string | null
          customs_office_name: string | null
          documents: Json | null
          duties_paid_at: string | null
          eta_date: string | null
          exchange_rate: number | null
          fob_value: number | null
          freight_value: number | null
          gross_weight_kg: number | null
          id: string | null
          import_type_code: string | null
          import_type_id: string | null
          import_type_name: string | null
          importer_address: string | null
          importer_name: string | null
          importer_npwp: string | null
          insurance_value: number | null
          internal_ref: string | null
          item_count: number | null
          jo_number: string | null
          job_order_id: string | null
          notes: string | null
          package_type: string | null
          pib_number: string | null
          port_of_discharge: string | null
          port_of_loading: string | null
          pph_import: number | null
          ppn: number | null
          released_at: string | null
          sppb_date: string | null
          sppb_number: string | null
          status: string | null
          submitted_at: string | null
          supplier_country: string | null
          supplier_name: string | null
          total_duties: number | null
          total_packages: number | null
          transport_mode: string | null
          updated_at: string | null
          vessel_name: string | null
          voyage_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pib_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pib_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profitability"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "pib_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pib_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "pib_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_revenue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "pib_documents_customs_office_id_fkey"
            columns: ["customs_office_id"]
            isOneToOne: false
            referencedRelation: "customs_offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pib_documents_import_type_id_fkey"
            columns: ["import_type_id"]
            isOneToOne: false
            referencedRelation: "import_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pib_documents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "pib_documents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "pib_documents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pib_documents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
        ]
      }
      active_shipping_rates: {
        Row: {
          baf: number | null
          caf: number | null
          container_type: string | null
          created_at: string | null
          currency: string | null
          destination_code: string | null
          destination_port: string | null
          destination_port_id: string | null
          ens: number | null
          frequency: string | null
          id: string | null
          is_active: boolean | null
          line_code: string | null
          line_name: string | null
          notes: string | null
          ocean_freight: number | null
          origin_code: string | null
          origin_port: string | null
          origin_port_id: string | null
          other_surcharges: Json | null
          pss: number | null
          shipping_line_id: string | null
          terms: string | null
          total_rate: number | null
          transit_days: number | null
          valid_from: string | null
          valid_to: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_rates_destination_port_id_fkey"
            columns: ["destination_port_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_rates_origin_port_id_fkey"
            columns: ["origin_port_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_rates_shipping_line_id_fkey"
            columns: ["shipping_line_id"]
            isOneToOne: false
            referencedRelation: "shipping_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      ap_aging_breakdown: {
        Row: {
          aging_bucket: string | null
          invoice_count: number | null
          total_amount: number | null
        }
        Relationships: []
      }
      ar_aging_breakdown: {
        Row: {
          aging_bucket: string | null
          invoice_count: number | null
          total_amount: number | null
        }
        Relationships: []
      }
      asset_availability: {
        Row: {
          asset_code: string | null
          asset_name: string | null
          availability_status: string | null
          capacity_tons: number | null
          category_id: string | null
          category_name: string | null
          current_job: string | null
          current_location: string | null
          id: string | null
          registration_number: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "asset_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_expiring_documents: {
        Row: {
          asset_code: string | null
          asset_id: string | null
          asset_name: string | null
          days_until_expiry: number | null
          document_name: string | null
          document_type: string | null
          expiry_date: string | null
          id: string | null
          registration_number: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization_monthly"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "maintenance_cost_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "upcoming_maintenance"
            referencedColumns: ["asset_id"]
          },
        ]
      }
      asset_summary: {
        Row: {
          active_count: number | null
          category_name: string | null
          idle_count: number | null
          maintenance_count: number | null
          total_book_value: number | null
          total_count: number | null
          total_purchase_value: number | null
        }
        Relationships: []
      }
      asset_tco_summary: {
        Row: {
          asset_code: string | null
          asset_id: string | null
          asset_name: string | null
          category_name: string | null
          cost_per_hour: number | null
          cost_per_km: number | null
          current_book_value: number | null
          purchase_cost: number | null
          purchase_date: string | null
          purchase_price: number | null
          total_depreciation: number | null
          total_fuel_cost: number | null
          total_hours: number | null
          total_insurance_cost: number | null
          total_km: number | null
          total_maintenance_cost: number | null
          total_other_cost: number | null
          total_registration_cost: number | null
          total_tco: number | null
        }
        Relationships: []
      }
      asset_utilization_monthly: {
        Row: {
          asset_code: string | null
          asset_id: string | null
          asset_name: string | null
          idle_days: number | null
          km_per_liter: number | null
          maintenance_days: number | null
          month: string | null
          operating_days: number | null
          repair_days: number | null
          standby_days: number | null
          total_fuel_cost: number | null
          total_fuel_liters: number | null
          total_hours: number | null
          total_km: number | null
          total_logged_days: number | null
          utilization_rate: number | null
        }
        Relationships: []
      }
      audit_schedule: {
        Row: {
          audit_type_id: string | null
          frequency_days: number | null
          last_conducted: string | null
          next_due: string | null
          type_code: string | null
          type_name: string | null
        }
        Relationships: []
      }
      cost_history: {
        Row: {
          amount: number | null
          asset_code: string | null
          asset_id: string | null
          asset_name: string | null
          category_name: string | null
          cost_date: string | null
          cost_type: string | null
          created_at: string | null
          created_by: string | null
          id: string | null
          notes: string | null
          reference_id: string | null
          reference_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_cost_tracking_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_cost_tracking_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_cost_tracking_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization_monthly"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_cost_tracking_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_cost_tracking_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "maintenance_cost_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_cost_tracking_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "upcoming_maintenance"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_cost_tracking_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      current_asset_assignments: {
        Row: {
          asset_code: string | null
          asset_id: string | null
          asset_name: string | null
          assigned_by: string | null
          assigned_from: string | null
          assigned_to: string | null
          assignment_type: string | null
          created_at: string | null
          customer_name: string | null
          employee_id: string | null
          end_hours: number | null
          end_km: number | null
          hours_used: number | null
          id: string | null
          jo_number: string | null
          job_order_id: string | null
          km_used: number | null
          location_id: string | null
          notes: string | null
          project_id: string | null
          registration_number: string | null
          start_hours: number | null
          start_km: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_assignments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_assignments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_assignments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization_monthly"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_assignments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_assignments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "maintenance_cost_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_assignments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "upcoming_maintenance"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "asset_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "asset_assignments_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "asset_assignments_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "asset_assignments_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_assignments_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_assignments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "asset_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_profitability: {
        Row: {
          avg_job_revenue: number | null
          customer_id: string | null
          customer_name: string | null
          profit_margin_pct: number | null
          total_cost: number | null
          total_jobs: number | null
          total_profit: number | null
          total_revenue: number | null
          ytd_profit: number | null
          ytd_revenue: number | null
        }
        Relationships: []
      }
      delivery_schedule: {
        Row: {
          actual_arrival: string | null
          commodity: string | null
          created_at: string | null
          customer_name: string | null
          departure_date: string | null
          destination_location: string | null
          driver_name: string | null
          id: string | null
          jo_number: string | null
          origin_location: string | null
          sj_number: string | null
          status: string | null
          vehicle_number: string | null
        }
        Relationships: []
      }
      depreciation_history: {
        Row: {
          accumulated_depreciation: number | null
          asset_code: string | null
          asset_id: string | null
          asset_name: string | null
          beginning_book_value: number | null
          category_name: string | null
          created_at: string | null
          created_by: string | null
          depreciation_amount: number | null
          depreciation_date: string | null
          depreciation_method: string | null
          ending_book_value: number | null
          id: string | null
          notes: string | null
          period_end: string | null
          period_start: string | null
          salvage_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_depreciation_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_depreciation_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_depreciation_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization_monthly"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_depreciation_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_depreciation_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "maintenance_cost_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_depreciation_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "upcoming_maintenance"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "asset_depreciation_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drawing_register: {
        Row: {
          approved_at: string | null
          approved_by_name: string | null
          category_code: string | null
          category_name: string | null
          created_at: string | null
          current_revision: string | null
          description: string | null
          drafted_at: string | null
          drafted_by_name: string | null
          drawing_number: string | null
          file_type: string | null
          file_url: string | null
          id: string | null
          issued_at: string | null
          paper_size: string | null
          project_name: string | null
          scale: string | null
          status: string | null
          title: string | null
        }
        Relationships: []
      }
      employee_ppe_status: {
        Row: {
          employee_code: string | null
          employee_id: string | null
          expected_replacement_date: string | null
          full_name: string | null
          is_mandatory: boolean | null
          issuance_id: string | null
          issued_date: string | null
          ppe_code: string | null
          ppe_name: string | null
          ppe_status: string | null
          ppe_type_id: string | null
        }
        Relationships: []
      }
      engineering_workload_summary: {
        Row: {
          calculated_at: string | null
          completed_mtd: number | null
          complex_in_pipeline: number | null
          pending_assessments: number | null
          pending_jmp: number | null
          pending_permit: number | null
          pending_surveys: number | null
          pending_technical: number | null
        }
        Relationships: []
      }
      expiring_certifications: {
        Row: {
          certification_date: string | null
          certification_number: string | null
          days_until_expiry: number | null
          employee_code: string | null
          employee_id: string | null
          employee_name: string | null
          expiry_date: string | null
          expiry_status: string | null
          id: string | null
          skill_code: string | null
          skill_id: string | null
          skill_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "employee_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_gap_analysis"
            referencedColumns: ["skill_id"]
          },
          {
            foreignKeyName: "employee_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      expiring_safety_documents: {
        Row: {
          approved_by: string | null
          approved_by_name: string | null
          category_code: string | null
          category_id: string | null
          category_name: string | null
          created_at: string | null
          days_until_expiry: number | null
          document_number: string | null
          effective_date: string | null
          expiry_date: string | null
          id: string | null
          prepared_by: string | null
          prepared_by_name: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          validity_status: string | null
          version: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "safety_documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_documents_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "safety_documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "safety_document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_documents_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "safety_documents_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_documents_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      expiring_training: {
        Row: {
          course_name: string | null
          days_until_expiry: number | null
          department_name: string | null
          employee_code: string | null
          full_name: string | null
          valid_to: string | null
        }
        Relationships: []
      }
      feedback_dashboard_summary: {
        Row: {
          critical_count: number | null
          new_count: number | null
          open_bugs_count: number | null
          open_requests_count: number | null
          resolved_this_week_count: number | null
        }
        Relationships: []
      }
      feedback_list_view: {
        Row: {
          actual_behavior: string | null
          affected_module: string | null
          assigned_at: string | null
          assigned_to: string | null
          assigned_to_name: string | null
          browser_info: Json | null
          business_justification: string | null
          comment_count: number | null
          console_logs: string | null
          created_at: string | null
          current_behavior: string | null
          description: string | null
          desired_behavior: string | null
          duplicate_of: string | null
          error_message: string | null
          expected_behavior: string | null
          feedback_type: string | null
          id: string | null
          module: string | null
          page_title: string | null
          page_url: string | null
          priority_suggested: string | null
          related_tickets: string[] | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_in_version: string | null
          screen_resolution: string | null
          screenshots: Json | null
          severity: string | null
          status: string | null
          steps_to_reproduce: string | null
          submitted_by: string | null
          submitted_by_department: string | null
          submitted_by_email: string | null
          submitted_by_name: string | null
          submitted_by_role: string | null
          tags: string[] | null
          ticket_number: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_submissions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_submissions_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "feedback_list_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_submissions_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "feedback_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_submissions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_dashboard_summary: {
        Row: {
          ap_overdue: number | null
          ap_pending_verification: number | null
          ar_invoice_count: number | null
          ar_overdue: number | null
          bkk_pending_amount: number | null
          bkk_pending_approval: number | null
          calculated_at: string | null
          cash_paid_mtd: number | null
          cash_received_mtd: number | null
          profit_mtd: number | null
          revenue_mtd: number | null
          revenue_previous_month: number | null
          total_ap: number | null
          total_ar: number | null
        }
        Relationships: []
      }
      incident_summary: {
        Row: {
          category_name: string | null
          closed_count: number | null
          incident_count: number | null
          month: string | null
          near_miss_count: number | null
          open_count: number | null
          severity: string | null
          total_days_lost: number | null
        }
        Relationships: []
      }
      job_customs_costs: {
        Row: {
          customer_name: string | null
          jo_number: string | null
          job_order_id: string | null
          total_customs_cost: number | null
          total_duties: number | null
          total_paid: number | null
          total_penalties: number | null
          total_pending: number | null
          total_services: number | null
          total_storage: number | null
          total_taxes: number | null
        }
        Relationships: []
      }
      job_equipment_summary_view: {
        Row: {
          customer_name: string | null
          equipment_count: number | null
          equipment_margin: number | null
          jo_number: string | null
          job_order_id: string | null
          total_billing: number | null
          total_equipment_cost: number | null
          total_equipment_days: number | null
          total_hours: number | null
          total_km: number | null
        }
        Relationships: []
      }
      job_type_profitability: {
        Row: {
          avg_job_revenue: number | null
          cargo_type: string | null
          profit_margin_pct: number | null
          total_cost: number | null
          total_jobs: number | null
          total_profit: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      maintenance_cost_summary: {
        Row: {
          asset_code: string | null
          asset_id: string | null
          asset_name: string | null
          maintenance_count: number | null
          month: string | null
          total_cost: number | null
          total_external: number | null
          total_labor: number | null
          total_parts: number | null
        }
        Relationships: []
      }
      monthly_pl_summary: {
        Row: {
          direct_cost: number | null
          gross_margin_pct: number | null
          gross_profit: number | null
          month: string | null
          revenue: number | null
        }
        Relationships: []
      }
      monthly_revenue_trend: {
        Row: {
          collected: number | null
          month: string | null
          revenue: number | null
        }
        Relationships: []
      }
      mv_customer_summary: {
        Row: {
          completed_jobs: number | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          last_job_date: string | null
          outstanding_ar: number | null
          total_cost: number | null
          total_jobs: number | null
          total_profit: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      mv_monthly_revenue: {
        Row: {
          customer_id: string | null
          customer_name: string | null
          job_count: number | null
          month: string | null
          profit_margin_pct: number | null
          total_cost: number | null
          total_profit: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      open_audit_findings: {
        Row: {
          audit_id: string | null
          audit_number: string | null
          audit_type: string | null
          category: string | null
          closed_at: string | null
          closed_by: string | null
          closure_evidence: string | null
          corrective_action: string | null
          created_at: string | null
          days_overdue: number | null
          due_date: string | null
          finding_description: string | null
          finding_number: number | null
          id: string | null
          location: string | null
          location_detail: string | null
          photos: Json | null
          potential_consequence: string | null
          responsible_id: string | null
          responsible_name: string | null
          risk_level: string | null
          severity: string | null
          status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_findings_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "audit_findings_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "audit_findings_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      open_investigations: {
        Row: {
          actual_cost: number | null
          asset_id: string | null
          authority_reference: string | null
          authority_report_date: string | null
          category_code: string | null
          category_id: string | null
          category_name: string | null
          closed_at: string | null
          closed_by: string | null
          closure_notes: string | null
          contributing_factors: Json | null
          corrective_actions: Json | null
          created_at: string | null
          days_open: number | null
          description: string | null
          documents: Json | null
          estimated_cost: number | null
          gps_coordinates: string | null
          id: string | null
          immediate_actions: string | null
          incident_date: string | null
          incident_number: string | null
          incident_time: string | null
          incident_type: string | null
          insurance_claim_number: string | null
          insurance_claim_status: string | null
          investigation_completed_at: string | null
          investigation_required: boolean | null
          investigation_started_at: string | null
          investigator_id: string | null
          investigator_name: string | null
          job_order_id: string | null
          location_address: string | null
          location_name: string | null
          location_type: string | null
          photos: Json | null
          preventive_actions: Json | null
          reported_at: string | null
          reported_by: string | null
          reported_by_name: string | null
          reported_to_authority: boolean | null
          root_cause: string | null
          severity: string | null
          status: string | null
          supervisor_id: string | null
          supervisor_notified_at: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_tco_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "incidents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_utilization_monthly"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "incidents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "maintenance_cost_summary"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "incidents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "upcoming_maintenance"
            referencedColumns: ["asset_id"]
          },
          {
            foreignKeyName: "incidents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "incident_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_investigator_id_fkey"
            columns: ["investigator_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "incidents_investigator_id_fkey"
            columns: ["investigator_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_investigator_id_fkey"
            columns: ["investigator_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "incidents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "incidents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "incidents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "incidents_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "employee_ppe_status"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "incidents_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "training_compliance"
            referencedColumns: ["employee_id"]
          },
        ]
      }
      operations_job_list: {
        Row: {
          actual_spent: number | null
          budget: number | null
          commodity: string | null
          completed_deliveries: number | null
          created_at: string | null
          customer_name: string | null
          destination_location: string | null
          id: string | null
          jo_number: string | null
          origin_location: string | null
          pjo_number: string | null
          status: string | null
          total_deliveries: number | null
        }
        Relationships: []
      }
      pending_arrivals: {
        Row: {
          ata: string | null
          berth: string | null
          bl_cargo_description: string | null
          bl_id: string | null
          bl_number: string | null
          booking_id: string | null
          booking_number: string | null
          cargo_description: string | null
          cleared_at: string | null
          consignee_name: string | null
          consignee_notified: boolean | null
          consignee_to_order: boolean | null
          container_numbers: Json | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_instructions: string | null
          estimated_charges: Json | null
          eta: string | null
          free_time_days: number | null
          free_time_expires: string | null
          gross_weight_kg: number | null
          id: string | null
          measurement_cbm: number | null
          notes: string | null
          notice_number: string | null
          notified_at: string | null
          notified_by: string | null
          notify_party_name: string | null
          port_of_discharge: string | null
          shipper_name: string | null
          status: string | null
          terminal: string | null
          vessel_name: string | null
          voyage_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arrival_notices_bl_id_fkey"
            columns: ["bl_id"]
            isOneToOne: false
            referencedRelation: "bills_of_lading"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_notices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "active_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_notices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "freight_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_notices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "shipment_profitability"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "freight_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profitability"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "freight_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "freight_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_revenue"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      pending_customs_payments: {
        Row: {
          amount: number | null
          billing_code: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          document_type: string | null
          fee_category: string | null
          fee_name: string | null
          fee_type_id: string | null
          id: string | null
          is_government_fee: boolean | null
          jo_number: string | null
          job_order_id: string | null
          notes: string | null
          ntb: string | null
          ntpn: string | null
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          peb_id: string | null
          peb_ref: string | null
          pib_id: string | null
          pib_ref: string | null
          receipt_url: string | null
          updated_at: string | null
          vendor_id: string | null
          vendor_invoice_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customs_fees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customs_fees_fee_type_id_fkey"
            columns: ["fee_type_id"]
            isOneToOne: false
            referencedRelation: "customs_fee_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customs_fees_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "customs_fees_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "customs_fees_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customs_fees_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customs_fees_peb_id_fkey"
            columns: ["peb_id"]
            isOneToOne: false
            referencedRelation: "peb_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customs_fees_pib_id_fkey"
            columns: ["pib_id"]
            isOneToOne: false
            referencedRelation: "active_pib_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customs_fees_pib_id_fkey"
            columns: ["pib_id"]
            isOneToOne: false
            referencedRelation: "pib_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customs_fees_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      ppe_replacement_due: {
        Row: {
          days_overdue: number | null
          employee_code: string | null
          expected_replacement_date: string | null
          full_name: string | null
          id: string | null
          issued_date: string | null
          ppe_name: string | null
          size: string | null
        }
        Relationships: []
      }
      quotation_dashboard_list: {
        Row: {
          cargo_description: string | null
          created_at: string | null
          customer_name: string | null
          days_to_deadline: number | null
          engineering_status: string | null
          gross_margin: number | null
          id: string | null
          market_type: string | null
          quotation_number: string | null
          rfq_number: string | null
          status: string | null
          submission_deadline: string | null
          total_revenue: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      resource_calendar: {
        Row: {
          assigned_hours: number | null
          available_hours: number | null
          date: string | null
          is_available: boolean | null
          remaining_hours: number | null
          resource_code: string | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string | null
          unavailability_type: string | null
        }
        Relationships: []
      }
      resource_utilization: {
        Row: {
          actual_hours: number | null
          planned_hours: number | null
          resource_code: string | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string | null
          utilization_percentage: number | null
          week_start: string | null
          weekly_capacity: number | null
        }
        Relationships: []
      }
      sales_pipeline_summary: {
        Row: {
          calculated_at: string | null
          draft_count: number | null
          draft_value: number | null
          eng_review_count: number | null
          eng_review_value: number | null
          lost_mtd: number | null
          lost_value_mtd: number | null
          pursuit_costs_mtd: number | null
          ready_count: number | null
          ready_value: number | null
          submitted_count: number | null
          submitted_value: number | null
          win_rate_90d: number | null
          won_mtd: number | null
          won_value_mtd: number | null
        }
        Relationships: []
      }
      search_index: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          primary_text: string | null
          secondary_text: string | null
          url: string | null
        }
        Relationships: []
      }
      shipment_profitability: {
        Row: {
          booking_id: string | null
          booking_number: string | null
          cost_tax: number | null
          customer_id: string | null
          customer_name: string | null
          gross_profit: number | null
          jo_number: string | null
          job_order_id: string | null
          profit_margin_pct: number | null
          revenue_tax: number | null
          status: string | null
          total_cost: number | null
          total_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "freight_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_profitability"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "freight_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_customer_summary"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "freight_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "mv_monthly_revenue"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "freight_bookings_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_customs_costs"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "freight_bookings_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_equipment_summary_view"
            referencedColumns: ["job_order_id"]
          },
          {
            foreignKeyName: "freight_bookings_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freight_bookings_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "operations_job_list"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_gap_analysis: {
        Row: {
          category_name: string | null
          criticality: string | null
          current_coverage_percent: number | null
          gap_percent: number | null
          ops_staff_count: number | null
          requires_certification: boolean | null
          skill_code: string | null
          skill_id: string | null
          skill_name: string | null
          staff_with_skill: number | null
          target_coverage_percent: number | null
        }
        Relationships: []
      }
      training_compliance: {
        Row: {
          compliance_status: string | null
          course_code: string | null
          course_id: string | null
          course_name: string | null
          department_name: string | null
          employee_code: string | null
          employee_id: string | null
          full_name: string | null
          is_mandatory: boolean | null
          training_record_id: string | null
          valid_to: string | null
          validity_months: number | null
        }
        Relationships: []
      }
      upcoming_maintenance: {
        Row: {
          asset_code: string | null
          asset_id: string | null
          asset_name: string | null
          current_km: number | null
          maintenance_type: string | null
          maintenance_type_id: string | null
          next_due_date: string | null
          next_due_km: number | null
          registration_number: string | null
          remaining: number | null
          schedule_id: string | null
          status: string | null
          trigger_type: string | null
          warning_days: number | null
          warning_km: number | null
        }
        Relationships: []
      }
      upcoming_vessel_arrivals: {
        Row: {
          delay_minutes: number | null
          id: string | null
          imo_number: string | null
          our_bookings_count: number | null
          port_code: string | null
          port_name: string | null
          scheduled_arrival: string | null
          status: string | null
          terminal_name: string | null
          vessel_id: string | null
          vessel_name: string | null
          vessel_type: string | null
          voyage_number: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vessel_schedules_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "vessels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_view_salary_slip: {
        Args: { p_payroll_record_id: string }
        Returns: boolean
      }
      check_system_health: { Args: never; Returns: Json }
      cleanup_expired_blocked_ips: { Args: never; Returns: number }
      cleanup_expired_rate_limits: { Args: never; Returns: number }
      cleanup_expired_sessions: { Args: never; Returns: number }
      create_notification: {
        Args: {
          p_action_label?: string
          p_action_url?: string
          p_entity_id?: string
          p_entity_type?: string
          p_message: string
          p_priority?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      generate_bkk_number: { Args: never; Returns: string }
      generate_drawing_number: { Args: { prefix: string }; Returns: string }
      generate_transmittal_number: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      get_dashboard_stats: {
        Args: never
        Returns: {
          active_jobs: number
          ar_outstanding: number
          pending_invoices: number
          profit_mtd: number
          revenue_mtd: number
        }[]
      }
      get_user_role: { Args: never; Returns: string }
      global_search: {
        Args: { max_results?: number; search_query: string }
        Returns: {
          entity_id: string
          entity_type: string
          primary_text: string
          relevance: number
          secondary_text: string
          url: string
        }[]
      }
      has_role: { Args: { allowed_roles: string[] }; Returns: boolean }
      is_admin_or_owner: { Args: never; Returns: boolean }
      is_admin_or_super_admin: { Args: never; Returns: boolean }
      is_finance_user: { Args: never; Returns: boolean }
      is_manager: { Args: never; Returns: boolean }
      is_manager_or_above: { Args: never; Returns: boolean }
      is_ops_user: { Args: never; Returns: boolean }
      refresh_asset_tco_summary: { Args: never; Returns: undefined }
      refresh_asset_utilization: { Args: never; Returns: undefined }
      refresh_finance_dashboard: { Args: never; Returns: undefined }
      refresh_manpower_cost_summary: {
        Args: { p_month: number; p_year: number }
        Returns: undefined
      }
      refresh_materialized_views: { Args: never; Returns: undefined }
      refresh_sales_engineering_dashboard: { Args: never; Returns: undefined }
      search_help_content: {
        Args: { max_results?: number; search_query: string; user_role: string }
        Returns: {
          category: string
          id: string
          relevance: number
          snippet: string
          title: string
          type: string
          url: string
        }[]
      }
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
