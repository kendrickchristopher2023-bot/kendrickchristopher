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
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json
          id?: string
          target_user_id?: string | null
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
      app_status: {
        Row: {
          active: boolean
          id: boolean
          message: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          id?: boolean
          message?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          id?: boolean
          message?: string | null
          updated_at?: string
          updated_by?: string | null
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
      changelog: {
        Row: {
          body: string
          category: string
          created_at: string
          created_by: string | null
          id: string
          published: boolean
          published_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cron_secret: {
        Row: {
          created_at: string
          id: boolean
          token: string
        }
        Insert: {
          created_at?: string
          id?: boolean
          token?: string
        }
        Update: {
          created_at?: string
          id?: boolean
          token?: string
        }
        Relationships: []
      }
      job_listings: {
        Row: {
          city: string | null
          company: string
          country: string | null
          created_at: string
          description: string | null
          experience_level: string | null
          fetched_at: string
          id: string
          location: string | null
          posted_at: string | null
          region: string | null
          remote: boolean | null
          role: string
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          salary_period: string | null
          search_vector: unknown
          source: string
          source_id: string
          source_slug: string | null
          url: string
        }
        Insert: {
          city?: string | null
          company: string
          country?: string | null
          created_at?: string
          description?: string | null
          experience_level?: string | null
          fetched_at?: string
          id?: string
          location?: string | null
          posted_at?: string | null
          region?: string | null
          remote?: boolean | null
          role: string
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          search_vector?: unknown
          source: string
          source_id: string
          source_slug?: string | null
          url: string
        }
        Update: {
          city?: string | null
          company?: string
          country?: string | null
          created_at?: string
          description?: string | null
          experience_level?: string | null
          fetched_at?: string
          id?: string
          location?: string | null
          posted_at?: string | null
          region?: string | null
          remote?: boolean | null
          role?: string
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          search_vector?: unknown
          source?: string
          source_id?: string
          source_slug?: string | null
          url?: string
        }
        Relationships: []
      }
      personal_matches: {
        Row: {
          city: string | null
          company: string
          country: string | null
          created_at: string
          id: string
          job_listing_id: string | null
          location: string | null
          notes: string | null
          role: string
          role_url: string | null
          source: string
          state: string | null
          status: string
          tier: string | null
          user_id: string
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          company: string
          country?: string | null
          created_at?: string
          id?: string
          job_listing_id?: string | null
          location?: string | null
          notes?: string | null
          role: string
          role_url?: string | null
          source?: string
          state?: string | null
          status?: string
          tier?: string | null
          user_id: string
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          company?: string
          country?: string | null
          created_at?: string
          id?: string
          job_listing_id?: string | null
          location?: string | null
          notes?: string | null
          role?: string
          role_url?: string | null
          source?: string
          state?: string | null
          status?: string
          tier?: string | null
          user_id?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_matches_job_listing_id_fkey"
            columns: ["job_listing_id"]
            isOneToOne: false
            referencedRelation: "job_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          changelog_seen_at: string | null
          created_at: string
          email: string
          email_notifications: boolean
          enabled_feeds: string[] | null
          free_resume_rewrite_used: boolean
          full_name: string | null
          id: string
          is_demo: boolean
          last_active_at: string | null
          onboarded_at: string | null
          plan: Database["public"]["Enums"]["plan_tier"]
          plan_expires_at: string | null
          screener_answers: Json
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          unsubscribe_token: string
          updated_at: string
        }
        Insert: {
          changelog_seen_at?: string | null
          created_at?: string
          email: string
          email_notifications?: boolean
          enabled_feeds?: string[] | null
          free_resume_rewrite_used?: boolean
          full_name?: string | null
          id: string
          is_demo?: boolean
          last_active_at?: string | null
          onboarded_at?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          plan_expires_at?: string | null
          screener_answers?: Json
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          unsubscribe_token?: string
          updated_at?: string
        }
        Update: {
          changelog_seen_at?: string | null
          created_at?: string
          email?: string
          email_notifications?: boolean
          enabled_feeds?: string[] | null
          free_resume_rewrite_used?: boolean
          full_name?: string | null
          id?: string
          is_demo?: boolean
          last_active_at?: string | null
          onboarded_at?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          plan_expires_at?: string | null
          screener_answers?: Json
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          unsubscribe_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      refresh_runs: {
        Row: {
          companies_failed: number
          companies_ok: number
          error: string | null
          finished_at: string | null
          id: string
          jobs_upserted: number
          ms: number | null
          ok: boolean | null
          slice: string
          started_at: string
        }
        Insert: {
          companies_failed?: number
          companies_ok?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          jobs_upserted?: number
          ms?: number | null
          ok?: boolean | null
          slice: string
          started_at?: string
        }
        Update: {
          companies_failed?: number
          companies_ok?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          jobs_upserted?: number
          ms?: number | null
          ok?: boolean | null
          slice?: string
          started_at?: string
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
          input_hash: string | null
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
          input_hash?: string | null
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
          input_hash?: string | null
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
          chat_count: number
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
          chat_count?: number
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
          chat_count?: number
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
      watched_companies: {
        Row: {
          active: boolean
          added_by: string
          auto_heal_from: string | null
          auto_healed_at: string | null
          company_name: string
          consecutive_failures: number
          created_at: string
          disabled_at: string | null
          id: string
          last_fetch_count: number | null
          last_fetch_status: string | null
          last_fetched_at: string | null
          slug: string
          source: string
          suggestions: Json
        }
        Insert: {
          active?: boolean
          added_by: string
          auto_heal_from?: string | null
          auto_healed_at?: string | null
          company_name: string
          consecutive_failures?: number
          created_at?: string
          disabled_at?: string | null
          id?: string
          last_fetch_count?: number | null
          last_fetch_status?: string | null
          last_fetched_at?: string | null
          slug: string
          source: string
          suggestions?: Json
        }
        Update: {
          active?: boolean
          added_by?: string
          auto_heal_from?: string | null
          auto_healed_at?: string | null
          company_name?: string
          consecutive_failures?: number
          created_at?: string
          disabled_at?: string | null
          id?: string
          last_fetch_count?: number | null
          last_fetch_status?: string | null
          last_fetched_at?: string | null
          slug?: string
          source?: string
          suggestions?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      dispatch_refresh_slices: { Args: never; Returns: Json }
      effective_plan: { Args: { _user_id: string }; Returns: string }
      increment_usage: {
        Args: { _action: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
