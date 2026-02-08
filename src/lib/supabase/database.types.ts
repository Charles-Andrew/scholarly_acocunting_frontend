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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_titles_billing_invoices: {
        Row: {
          billing_invoice_id: string
          created_at: string | null
          id: string
          journal_entry_category_id: string | null
          journal_entry_id: string
        }
        Insert: {
          billing_invoice_id: string
          created_at?: string | null
          id?: string
          journal_entry_category_id?: string | null
          journal_entry_id: string
        }
        Update: {
          billing_invoice_id?: string
          created_at?: string | null
          id?: string
          journal_entry_category_id?: string | null
          journal_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_titles_billing_invoices_billing_invoice_id_fkey"
            columns: ["billing_invoice_id"]
            isOneToOne: false
            referencedRelation: "billing_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_titles_billing_invoices_journal_entry_category_id_fkey"
            columns: ["journal_entry_category_id"]
            isOneToOne: false
            referencedRelation: "journal_entry_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          description: string
          id: string
          ip_address: unknown
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          action: string
          created_at?: string | null
          description: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_number: string
          bank_name: string
          check_name: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          account_number: string
          bank_name: string
          check_name?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          account_number?: string
          bank_name?: string
          check_name?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      billing_invoice_items: {
        Row: {
          amount: number
          created_at: string | null
          description: string
          id: string
          invoice_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          description: string
          id?: string
          invoice_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "billing_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_invoices: {
        Row: {
          amount_due: number
          approved_by: string | null
          bank_account_id: string | null
          client_id: string | null
          created_at: string | null
          date: string
          discount: number
          grand_total: number
          id: string
          income_category_id: string | null
          invoice_number: string
          prepared_by: string | null
          sent_to_client_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount_due?: number
          approved_by?: string | null
          bank_account_id?: string | null
          client_id?: string | null
          created_at?: string | null
          date: string
          discount?: number
          grand_total?: number
          id?: string
          income_category_id?: string | null
          invoice_number: string
          prepared_by?: string | null
          sent_to_client_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_due?: number
          approved_by?: string | null
          bank_account_id?: string | null
          client_id?: string | null
          created_at?: string | null
          date?: string
          discount?: number
          grand_total?: number
          id?: string
          income_category_id?: string | null
          invoice_number?: string
          prepared_by?: string | null
          sent_to_client_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_invoices_income_category_id_fkey"
            columns: ["income_category_id"]
            isOneToOne: false
            referencedRelation: "income_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_approved_by_user"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_prepared_by_user"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          accounts_receivable_code: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          accounts_receivable_code: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          accounts_receivable_code?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      general_voucher_journal_entries: {
        Row: {
          created_at: string | null
          general_voucher_id: string
          id: string
          journal_entry_category_id: string
        }
        Insert: {
          created_at?: string | null
          general_voucher_id: string
          id?: string
          journal_entry_category_id: string
        }
        Update: {
          created_at?: string | null
          general_voucher_id?: string
          id?: string
          journal_entry_category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "general_voucher_journal_entries_general_voucher_id_fkey"
            columns: ["general_voucher_id"]
            isOneToOne: false
            referencedRelation: "general_vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_voucher_journal_entries_journal_entry_category_id_fkey"
            columns: ["journal_entry_category_id"]
            isOneToOne: false
            referencedRelation: "journal_entry_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      general_vouchers: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          date: string
          gv_id: string | null
          id: string
          particulars: string
          recipient_id: string | null
          reference: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          date: string
          gv_id?: string | null
          id?: string
          particulars: string
          recipient_id?: string | null
          reference?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          date?: string
          gv_id?: string | null
          id?: string
          particulars?: string
          recipient_id?: string | null
          reference?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      income_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_number_sequences: {
        Row: {
          date_str: string
          last_sequence: number
        }
        Insert: {
          date_str: string
          last_sequence?: number
        }
        Update: {
          date_str?: string
          last_sequence?: number
        }
        Relationships: []
      }
      invoice_signatures: {
        Row: {
          id: string
          invoice_id: string
          signature_image: string
          signature_type: string
          signed_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          invoice_id: string
          signature_image: string
          signature_type: string
          signed_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          invoice_id?: string
          signature_image?: string
          signature_type?: string
          signed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_signatures_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "billing_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_signatures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          date: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      journal_entry_categories: {
        Row: {
          category_name: string
          created_at: string | null
          id: string
          journal_entry_id: string
          reference: string | null
          remarks: string | null
          updated_at: string | null
        }
        Insert: {
          category_name: string
          created_at?: string | null
          id?: string
          journal_entry_id: string
          reference?: string | null
          remarks?: string | null
          updated_at?: string | null
        }
        Update: {
          category_name?: string
          created_at?: string | null
          id?: string
          journal_entry_id?: string
          reference?: string | null
          remarks?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_categories_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          read: boolean | null
          read_at: string | null
          resource_id: string | null
          resource_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          read?: boolean | null
          read_at?: string | null
          resource_id?: string | null
          resource_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          read?: boolean | null
          read_at?: string | null
          resource_id?: string | null
          resource_type?: string | null
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
      user_profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          position: string | null
          signature_image: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          position?: string | null
          signature_image?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          position?: string | null
          signature_image?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_user: { Args: { target_user_id: string }; Returns: undefined }
      generate_gv_id: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      get_users_for_invoices: {
        Args: never
        Returns: {
          email: string
          id: string
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
