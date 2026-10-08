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
      calendar_events: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          end_time: string
          ics_uid: string | null
          id: string
          is_synced: boolean
          location: string | null
          start_time: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          end_time: string
          ics_uid?: string | null
          id?: string
          is_synced?: boolean
          location?: string | null
          start_time: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          end_time?: string
          ics_uid?: string | null
          id?: string
          is_synced?: boolean
          location?: string | null
          start_time?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          contact_user_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          contact_user_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          contact_user_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          credits: number
          faculty: string
          id: string
          name: string
          semester: number
          short_name: string
          university_id: string
          updated_at: string
          year: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          credits?: number
          faculty: string
          id?: string
          name: string
          semester?: number
          short_name?: string
          university_id: string
          updated_at?: string
          year: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          credits?: number
          faculty?: string
          id?: string
          name?: string
          semester?: number
          short_name?: string
          university_id?: string
          updated_at?: string
          year?: string
        }
        Relationships: []
      }
      hub_members: {
        Row: {
          course_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_members_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_messages: {
        Row: {
          content: string
          course_id: string
          created_at: string
          id: string
          message_type: string
          sender_id: string
          voice_duration: number | null
          voice_url: string | null
        }
        Insert: {
          content: string
          course_id: string
          created_at?: string
          id?: string
          message_type?: string
          sender_id: string
          voice_duration?: number | null
          voice_url?: string | null
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string
          id?: string
          message_type?: string
          sender_id?: string
          voice_duration?: number | null
          voice_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hub_messages_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string
          read: boolean
          receiver_id: string
          sender_id: string
          voice_duration: number | null
          voice_url: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type?: string
          read?: boolean
          receiver_id: string
          sender_id: string
          voice_duration?: number | null
          voice_url?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
          voice_duration?: number | null
          voice_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          academic_year: string
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string
          email_verified: boolean
          faculty: string
          gender: string
          ics_link: string | null
          id: string
          university: string
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_year?: string
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string
          email_verified?: boolean
          faculty?: string
          gender?: string
          ics_link?: string | null
          id?: string
          university?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_year?: string
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string
          email_verified?: boolean
          faculty?: string
          gender?: string
          ics_link?: string | null
          id?: string
          university?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quest_completions: {
        Row: {
          completed_date: string
          created_at: string
          id: string
          points_earned: number
          quest_id: string
          user_id: string
        }
        Insert: {
          completed_date?: string
          created_at?: string
          id?: string
          points_earned?: number
          quest_id: string
          user_id: string
        }
        Update: {
          completed_date?: string
          created_at?: string
          id?: string
          points_earned?: number
          quest_id?: string
          user_id?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          duration: string | null
          file_path: string | null
          id: string
          pages: number | null
          questions: number | null
          source: string | null
          title: string
          type: string
          updated_at: string
          url: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          duration?: string | null
          file_path?: string | null
          id?: string
          pages?: number | null
          questions?: number | null
          source?: string | null
          title: string
          type: string
          updated_at?: string
          url?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          duration?: string | null
          file_path?: string | null
          id?: string
          pages?: number | null
          questions?: number | null
          source?: string | null
          title?: string
          type?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      thanks: {
        Row: {
          created_at: string
          given_date: string
          id: string
          message_id: string
          message_source: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          given_date?: string
          id?: string
          message_id: string
          message_source?: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          given_date?: string
          id?: string
          message_id?: string
          message_source?: string
          receiver_id?: string
          sender_id?: string
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
      verification_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          verified?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_give_star: { Args: { _user_id: string }; Returns: boolean }
      cleanup_expired_codes: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "owner"
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
      app_role: ["admin", "moderator", "user", "owner"],
    },
  },
} as const
