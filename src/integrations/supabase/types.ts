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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_logs: {
        Row: {
          action: string
          agent_name: string
          article_id: string | null
          created_at: string
          id: string
          payload: Json
          status: string
        }
        Insert: {
          action: string
          agent_name: string
          article_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
          status: string
        }
        Update: {
          action?: string
          agent_name?: string
          article_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
          status?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          category: string
          content_html: string
          created_at: string
          headline: string
          id: string
          image_url: string | null
          is_flagship: boolean
          published_at: string | null
          read_time_minutes: number | null
          related_entity_ids: string[] | null
          source_signal_id: string | null
          status: string
          subtype: string | null
          summary: string
          tags: string[] | null
        }
        Insert: {
          category: string
          content_html: string
          created_at?: string
          headline: string
          id?: string
          image_url?: string | null
          is_flagship?: boolean
          published_at?: string | null
          read_time_minutes?: number | null
          related_entity_ids?: string[] | null
          source_signal_id?: string | null
          status?: string
          subtype?: string | null
          summary: string
          tags?: string[] | null
        }
        Update: {
          category?: string
          content_html?: string
          created_at?: string
          headline?: string
          id?: string
          image_url?: string | null
          is_flagship?: boolean
          published_at?: string | null
          read_time_minutes?: number | null
          related_entity_ids?: string[] | null
          source_signal_id?: string | null
          status?: string
          subtype?: string | null
          summary?: string
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_source_signal_id_fkey"
            columns: ["source_signal_id"]
            isOneToOne: false
            referencedRelation: "raw_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_event_investors: {
        Row: {
          capital_event_id: string
          investor_entity_id: string
          is_lead: boolean
        }
        Insert: {
          capital_event_id: string
          investor_entity_id: string
          is_lead?: boolean
        }
        Update: {
          capital_event_id?: string
          investor_entity_id?: string
          is_lead?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "capital_event_investors_capital_event_id_fkey"
            columns: ["capital_event_id"]
            isOneToOne: false
            referencedRelation: "capital_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_event_investors_investor_entity_id_fkey"
            columns: ["investor_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_events: {
        Row: {
          amount_usd: number | null
          announced_at: string
          counterparty_entity_id: string | null
          created_at: string
          event_type: string
          id: string
          one_liner: string
          primary_entity_id: string
          round_type: string | null
          source_url: string | null
          valuation_usd: number | null
        }
        Insert: {
          amount_usd?: number | null
          announced_at: string
          counterparty_entity_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          one_liner: string
          primary_entity_id: string
          round_type?: string | null
          source_url?: string | null
          valuation_usd?: number | null
        }
        Update: {
          amount_usd?: number | null
          announced_at?: string
          counterparty_entity_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          one_liner?: string
          primary_entity_id?: string
          round_type?: string | null
          source_url?: string | null
          valuation_usd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "capital_events_counterparty_entity_id_fkey"
            columns: ["counterparty_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_events_primary_entity_id_fkey"
            columns: ["primary_entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          collection_type: string
          created_at: string
          description: string | null
          entity_ids: string[] | null
          generated_at: string | null
          id: string
          slug: string
          title: string
        }
        Insert: {
          collection_type: string
          created_at?: string
          description?: string | null
          entity_ids?: string[] | null
          generated_at?: string | null
          id?: string
          slug: string
          title: string
        }
        Update: {
          collection_type?: string
          created_at?: string
          description?: string | null
          entity_ids?: string[] | null
          generated_at?: string | null
          id?: string
          slug?: string
          title?: string
        }
        Relationships: []
      }
      entities: {
        Row: {
          created_at: string
          description: string | null
          employee_count_estimate: number | null
          entity_type: string
          founded_year: number | null
          headquarters: string | null
          id: string
          last_funding_stage: string | null
          logo_url: string | null
          name: string
          sector: string | null
          slug: string
          tags: string[] | null
          total_funding_raised: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          employee_count_estimate?: number | null
          entity_type: string
          founded_year?: number | null
          headquarters?: string | null
          id?: string
          last_funding_stage?: string | null
          logo_url?: string | null
          name: string
          sector?: string | null
          slug: string
          tags?: string[] | null
          total_funding_raised?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          employee_count_estimate?: number | null
          entity_type?: string
          founded_year?: number | null
          headquarters?: string | null
          id?: string
          last_funding_stage?: string | null
          logo_url?: string | null
          name?: string
          sector?: string | null
          slug?: string
          tags?: string[] | null
          total_funding_raised?: number | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      pipeline_stats: {
        Row: {
          articles_generated: number
          date: string
          last_updated: string
          requests_made: number
          tokens_used: number
        }
        Insert: {
          articles_generated?: number
          date?: string
          last_updated?: string
          requests_made?: number
          tokens_used?: number
        }
        Update: {
          articles_generated?: number
          date?: string
          last_updated?: string
          requests_made?: number
          tokens_used?: number
        }
        Relationships: []
      }
      raw_signals: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          image_url: string | null
          processed_at: string | null
          raw_content: string | null
          source_name: string | null
          source_url: string | null
          status: string
          title: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          image_url?: string | null
          processed_at?: string | null
          raw_content?: string | null
          source_name?: string | null
          source_url?: string | null
          status?: string
          title?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          image_url?: string | null
          processed_at?: string | null
          raw_content?: string | null
          source_name?: string | null
          source_url?: string | null
          status?: string
          title?: string | null
        }
        Relationships: []
      }
      scheduled_events: {
        Row: {
          city: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          event_type: string
          id: string
          image_url: string | null
          is_virtual: boolean
          location: string | null
          region: string | null
          registration_url: string | null
          rejection_reason: string | null
          relevance_category: string | null
          relevance_reason: string | null
          reviewed_at: string | null
          slug: string | null
          source: string | null
          source_id: string | null
          source_url: string | null
          starts_at: string
          status: string
          submitted_at: string | null
          submitted_by_email: string | null
          title: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          event_type: string
          id?: string
          image_url?: string | null
          is_virtual?: boolean
          location?: string | null
          region?: string | null
          registration_url?: string | null
          rejection_reason?: string | null
          relevance_category?: string | null
          relevance_reason?: string | null
          reviewed_at?: string | null
          slug?: string | null
          source?: string | null
          source_id?: string | null
          source_url?: string | null
          starts_at: string
          status?: string
          submitted_at?: string | null
          submitted_by_email?: string | null
          title: string
        }
        Update: {
          city?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          event_type?: string
          id?: string
          image_url?: string | null
          is_virtual?: boolean
          location?: string | null
          region?: string | null
          registration_url?: string | null
          rejection_reason?: string | null
          relevance_category?: string | null
          relevance_reason?: string | null
          reviewed_at?: string | null
          slug?: string | null
          source?: string | null
          source_id?: string | null
          source_url?: string | null
          starts_at?: string
          status?: string
          submitted_at?: string | null
          submitted_by_email?: string | null
          title?: string
        }
        Relationships: []
      }
      event_submission_ledger: {
        Row: {
          id: string
          ip_hash: string
          submitted_at: string
        }
        Insert: {
          id?: string
          ip_hash: string
          submitted_at?: string
        }
        Update: {
          id?: string
          ip_hash?: string
          submitted_at?: string
        }
        Relationships: []
      }
      glossary_terms: {
        Row: {
          category: string | null
          created_at: string
          id: string
          long_definition: string | null
          related_terms: string[] | null
          short_definition: string
          slug: string
          term: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          long_definition?: string | null
          related_terms?: string[] | null
          short_definition: string
          slug: string
          term: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          long_definition?: string | null
          related_terms?: string[] | null
          short_definition?: string
          slug?: string
          term?: string
          updated_at?: string
        }
        Relationships: []
      }
      learning_tracks: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          slug: string
          steps: Json
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          slug: string
          steps?: Json
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          slug?: string
          steps?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_pipeline_stats_safe: {
        Args: {
          p_articles: number
          p_date: string
          p_requests: number
          p_tokens: number
        }
        Returns: undefined
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
