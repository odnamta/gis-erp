export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          }
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
          }
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
          }
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
          }
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
          custom_homepage: string | null
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
          can_approve_pjo?: boolean
          can_create_pjo?: boolean
          can_fill_costs?: boolean
          can_manage_invoices?: boolean
          can_manage_users?: boolean
          can_see_profit?: boolean
          can_see_revenue?: boolean
          created_at?: string | null
          custom_dashboard?: string | null
          custom_homepage?: string | null
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
          can_approve_pjo?: boolean
          can_create_pjo?: boolean
          can_fill_costs?: boolean
          can_manage_invoices?: boolean
          can_manage_users?: boolean
          can_see_profit?: boolean
          can_see_revenue?: boolean
          created_at?: string | null
          custom_dashboard?: string | null
          custom_homepage?: string | null
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
