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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      closeness_attempts: {
        Row: {
          attempt: number
          created_at: string
          id: string
          passed: boolean
          reference: string
          score: number
          scorer: string
          user_id: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          id?: string
          passed: boolean
          reference: string
          score: number
          scorer?: string
          user_id: string
        }
        Update: {
          attempt?: number
          created_at?: string
          id?: string
          passed?: boolean
          reference?: string
          score?: number
          scorer?: string
          user_id?: string
        }
        Relationships: []
      }
      language_interest: {
        Row: {
          created_at: string
          id: string
          language_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          language_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          language_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_confirmed: boolean
          avatar_path: string | null
          created_at: string
          display_name: string | null
          id: string
          last_active_day: string | null
          onboarded_at: string | null
          relative: string | null
          streak: number
          updated_at: string
          xp: number
        }
        Insert: {
          age_confirmed?: boolean
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          last_active_day?: string | null
          onboarded_at?: string | null
          relative?: string | null
          streak?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          age_confirmed?: boolean
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_active_day?: string | null
          onboarded_at?: string | null
          relative?: string | null
          streak?: number
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      reward_grants: {
        Row: {
          created_at: string
          day: string
          kind: string
          ref: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          kind: string
          ref: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          kind?: string
          ref?: string
          user_id?: string
        }
        Relationships: []
      }
      scenario_progress: {
        Row: {
          completed_count: number
          phrases_done: boolean
          resume: Json | null
          scenario_id: string
          updated_at: string
          user_id: string
          warmup_done: boolean
        }
        Insert: {
          completed_count?: number
          phrases_done?: boolean
          resume?: Json | null
          scenario_id: string
          updated_at?: string
          user_id: string
          warmup_done?: boolean
        }
        Update: {
          completed_count?: number
          phrases_done?: boolean
          resume?: Json | null
          scenario_id?: string
          updated_at?: string
          user_id?: string
          warmup_done?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      award_xp:
        | {
            Args: { _kind: string; _ref: string; _today: string }
            Returns: {
              last_active_day: string
              streak: number
              xp: number
            }[]
          }
        | {
            Args: { _kind: string; _today: string }
            Returns: {
              last_active_day: string
              streak: number
              xp: number
            }[]
          }
      complete_lesson: {
        Args: { _scenario: string; _step: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      save_resume: {
        Args: { _resume: Json; _scenario: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
