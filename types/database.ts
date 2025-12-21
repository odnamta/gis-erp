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
            referencedRelation: "employees"
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
          {
            foreignKeyName: "bukti_kas_keluar_vendor_invoice_id_fkey"
            columns: ["vendor_invoice_id"]
            isOneToOne: false
            referencedRelation: "vendor_invoices"
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
            referencedRelation: "employees"
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
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
          net_margin: number | null
          net_profit: number | null
          pjo_id: string | null
          project_id: string | null
          requires_berita_acara: boolean | null
          status: string
          submitted_by: string | null
          submitted_to_finance_at: string | null
          total_invoiced: number | null
          total_overhead: number | null
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
          net_margin?: number | null
          net_profit?: number | null
          pjo_id?: string | null
          project_id?: string | null
          requires_berita_acara?: boolean | null
          status?: string
          submitted_by?: string | null
          submitted_to_finance_at?: string | null
          total_invoiced?: number | null
          total_overhead?: number | null
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
          net_margin?: number | null
          net_profit?: number | null
          pjo_id?: string | null
          project_id?: string | null
          requires_berita_acara?: boolean | null
          status?: string
          submitted_by?: string | null
          submitted_to_finance_at?: string | null
          total_invoiced?: number | null
          total_overhead?: number | null
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
            referencedRelation: "job_orders"
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
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_handover_to_fkey"
            columns: ["handover_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
            referencedRelation: "customers"
            referencedColumns: ["id"]
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
            referencedRelation: "job_orders"
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
            referencedRelation: "employees"
            referencedColumns: ["id"]
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
      monthly_revenue_trend: {
        Row: {
          collected: number | null
          month: string | null
          revenue: number | null
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
    }
    Functions: {
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
      refresh_finance_dashboard: { Args: never; Returns: undefined }
      refresh_manpower_cost_summary: {
        Args: { p_month: number; p_year: number }
        Returns: undefined
      }
      refresh_sales_engineering_dashboard: { Args: never; Returns: undefined }
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

// ============================================
// Custom Type Definitions
// ============================================

// BKK (Bukti Kas Keluar) Types
export type BKKStatus = 'pending' | 'approved' | 'rejected' | 'released' | 'settled' | 'cancelled'

export type BKK = Tables<'bukti_kas_keluar'>

export interface AvailableBudget {
  budgetAmount: number
  alreadyDisbursed: number
  pendingRequests: number
  available: number
}

export interface SettlementDifference {
  releasedAmount: number
  spentAmount: number
  difference: number
  type: 'return' | 'additional' | 'exact'
}

export interface BKKSummaryTotals {
  totalRequested: number
  totalReleased: number
  totalSettled: number
  pendingReturn: number
  count: Record<BKKStatus, number>
}

// Activity Entry type for dashboard
export interface ActivityEntry {
  action_type: 'pjo_approved' | 'jo_created' | 'invoice_paid' | 'cost_exceeded' | 'pjo_submitted' | 'invoice_sent'
  document_number: string
  user_name: string
  details?: {
    source_pjo_number?: string
    [key: string]: unknown
  }
}
