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
      boosting_orders: {
        Row: {
          created_at: string
          failure_reason: string | null
          game: string
          id: string
          note: string | null
          package: string
          price: number
          seen_by_admin: boolean
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          failure_reason?: string | null
          game: string
          id?: string
          note?: string | null
          package: string
          price: number
          seen_by_admin?: boolean
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          failure_reason?: string | null
          game?: string
          id?: string
          note?: string | null
          package?: string
          price?: number
          seen_by_admin?: boolean
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      card_recharges: {
        Row: {
          created_at: string
          credited_amount: number
          denomination: number
          discount_rate: number
          id: string
          network: string
          pin: string
          serial: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credited_amount: number
          denomination: number
          discount_rate: number
          id?: string
          network: string
          pin: string
          serial: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credited_amount?: number
          denomination?: number
          discount_rate?: number
          id?: string
          network?: string
          pin?: string
          serial?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      game_plays: {
        Row: {
          bet: number
          created_at: string
          game: string
          id: string
          outcome: string | null
          reward: number
          user_id: string
        }
        Insert: {
          bet: number
          created_at?: string
          game: string
          id?: string
          outcome?: string | null
          reward: number
          user_id: string
        }
        Update: {
          bet?: number
          created_at?: string
          game?: string
          id?: string
          outcome?: string | null
          reward?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          background_url: string | null
          balance: number
          created_at: string
          display_name: string
          id: string
          total_deposited: number
          updated_at: string
        }
        Insert: {
          background_url?: string | null
          balance?: number
          created_at?: string
          display_name: string
          id: string
          total_deposited?: number
          updated_at?: string
        }
        Update: {
          background_url?: string | null
          balance?: number
          created_at?: string
          display_name?: string
          id?: string
          total_deposited?: number
          updated_at?: string
        }
        Relationships: []
      }
      robux_orders: {
        Row: {
          created_at: string
          failure_reason: string | null
          id: string
          package_robux: number
          price: number
          roblox_username: string
          seen_by_admin: boolean
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          failure_reason?: string | null
          id?: string
          package_robux: number
          price: number
          roblox_username: string
          seen_by_admin?: boolean
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          failure_reason?: string | null
          id?: string
          package_robux?: number
          price?: number
          roblox_username?: string
          seen_by_admin?: boolean
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          type?: string
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
      adjust_balance: {
        Args: { _delta: number; _description: string; _type: string }
        Returns: number
      }
      admin_complete_boost_order: { Args: { _id: string }; Returns: undefined }
      admin_complete_robux_order: { Args: { _id: string }; Returns: undefined }
      admin_fail_boost_order: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      admin_fail_robux_order: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      admin_mark_seen_boost: { Args: { _id: string }; Returns: undefined }
      admin_mark_seen_robux: { Args: { _id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      place_boosting_order: {
        Args: { _game: string; _note: string; _package: string; _price: number }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
