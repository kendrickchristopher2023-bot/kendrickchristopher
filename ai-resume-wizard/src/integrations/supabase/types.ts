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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          email: string
          full_name: string | null
          id: string
          reason: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["access_request_status"]
        }
        Insert: {
          email: string
          full_name?: string | null
          id?: string
          reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["access_request_status"]
        }
        Update: {
          email?: string
          full_name?: string | null
          id?: string
          reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["access_request_status"]
        }
        Relationships: []
      }
      api_tokens: {
        Row: {
          created_at: string
          id: string
          label: string
          last_used_at: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string
          last_used_at?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          last_used_at?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          applied_at: string
          company: string
          created_at: string
          id: string
          jd_url: string | null
          notes: string | null
          response_at: string | null
          role: string
          source: Database["public"]["Enums"]["application_source"]
          stage: Database["public"]["Enums"]["application_stage"]
          tailor_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          company: string
          created_at?: string
          id?: string
          jd_url?: string | null
          notes?: string | null
          response_at?: string | null
          role: string
          source?: Database["public"]["Enums"]["application_source"]
          stage?: Database["public"]["Enums"]["application_stage"]
          tailor_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string
          company?: string
          created_at?: string
          id?: string
          jd_url?: string | null
          notes?: string | null
          response_at?: string | null
          role?: string
          source?: Database["public"]["Enums"]["application_source"]
          stage?: Database["public"]["Enums"]["application_stage"]
          tailor_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_tailor_session_id_fkey"
            columns: ["tailor_session_id"]
            isOneToOne: false
            referencedRelation: "tailor_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_matches: {
        Row: {
          company: string
          created_at: string
          id: string
          location: string | null
          notes: string | null
          role: string
          role_url: string | null
          tier: string | null
          user_id: string
        }
        Insert: {
          company: string
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          role: string
          role_url?: string | null
          tier?: string | null
          user_id: string
        }
        Update: {
          company?: string
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          role?: string
          role_url?: string | null
          tier?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          onboarded_at: string | null
          plan: Database["public"]["Enums"]["plan_tier"]
          screener_answers: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          onboarded_at?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          screener_answers?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          onboarded_at?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          screener_answers?: Json
          updated_at?: string
        }
        Relationships: []
      }
      resumes: {
        Row: {
          created_at: string
          data: Json
          id: string
          is_primary: boolean
          name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          is_primary?: boolean
          name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          is_primary?: boolean
          name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tailor_sessions: {
        Row: {
          company: string | null
          cover_letter: string | null
          created_at: string
          id: string
          interview_prep: Json | null
          jd_text: string | null
          jd_url: string | null
          linkedin_rewrite: Json | null
          referral_dm: string | null
          role: string | null
          tailored_resume: Json | null
          user_id: string
        }
        Insert: {
          company?: string | null
          cover_letter?: string | null
          created_at?: string
          id?: string
          interview_prep?: Json | null
          jd_text?: string | null
          jd_url?: string | null
          linkedin_rewrite?: Json | null
          referral_dm?: string | null
          role?: string | null
          tailored_resume?: Json | null
          user_id: string
        }
        Update: {
          company?: string | null
          cover_letter?: string | null
          created_at?: string
          id?: string
          interview_prep?: Json | null
          jd_text?: string | null
          jd_url?: string | null
          linkedin_rewrite?: Json | null
          referral_dm?: string | null
          role?: string | null
          tailored_resume?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      usage_daily: {
        Row: {
          cover_letter_count: number
          day: string
          interview_prep_count: number
          linkedin_count: number
          parse_resume_count: number
          referral_dm_count: number
          tailor_count: number
          user_id: string
        }
        Insert: {
          cover_letter_count?: number
          day?: string
          interview_prep_count?: number
          linkedin_count?: number
          parse_resume_count?: number
          referral_dm_count?: number
          tailor_count?: number
          user_id: string
        }
        Update: {
          cover_letter_count?: number
          day?: string
          interview_prep_count?: number
          linkedin_count?: number
          parse_resume_count?: number
          referral_dm_count?: number
          tailor_count?: number
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_usage: {
        Args: { _action: string; _cap: number }
        Returns: {
          allowed: boolean
          cap: number
          used: number
        }[]
      }
    }
    Enums: {
      access_request_status: "pending" | "approved" | "denied"
      app_role: "admin" | "user"
      application_source: "cold" | "referral" | "recruiter" | "event" | "other"
      application_stage:
        | "applied"
        | "response"
        | "screen"
        | "onsite"
        | "offer"
        | "rejected"
        | "withdrawn"
      plan_tier: "founder" | "free" | "pro"
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
    Enums: {
      access_request_status: ["pending", "approved", "denied"],
      app_role: ["admin", "user"],
      application_source: ["cold", "referral", "recruiter", "event", "other"],
      application_stage: [
        "applied",
        "response",
        "screen",
        "onsite",
        "offer",
        "rejected",
        "withdrawn",
      ],
      plan_tier: ["founder", "free", "pro"],
    },
  },
} as const
