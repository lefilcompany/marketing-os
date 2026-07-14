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
          application_id: string
          created_at: string
          id: string
          organization_id: string
          reason: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["access_request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          organization_id: string
          reason?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["access_request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          reason?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["access_request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_requests_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          action_url: string | null
          audience_data: Json
          audience_type: Database["public"]["Enums"]["announcement_audience"]
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          priority: Database["public"]["Enums"]["announcement_priority"]
          published_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at: string
        }
        Insert: {
          action_url?: string | null
          audience_data?: Json
          audience_type?: Database["public"]["Enums"]["announcement_audience"]
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["announcement_priority"]
          published_at?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
        }
        Update: {
          action_url?: string | null
          audience_data?: Json
          audience_type?: Database["public"]["Enums"]["announcement_audience"]
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["announcement_priority"]
          published_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
        }
        Relationships: []
      }
      application_access_logs: {
        Row: {
          application_id: string | null
          created_at: string
          event_type: Database["public"]["Enums"]["access_log_event"]
          id: string
          metadata: Json
          organization_id: string | null
          user_id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          event_type: Database["public"]["Enums"]["access_log_event"]
          id?: string
          metadata?: Json
          organization_id?: string | null
          user_id: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          event_type?: Database["public"]["Enums"]["access_log_event"]
          id?: string
          metadata?: Json
          organization_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_access_logs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_access_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          accent_color: string | null
          allowed_domains: string[]
          benefits: string | null
          category: Database["public"]["Enums"]["application_category"]
          connection_mode: Database["public"]["Enums"]["connection_mode"]
          created_at: string
          external_url: string
          features: Json
          full_description: string | null
          icon: string | null
          id: string
          is_featured: boolean
          is_new: boolean
          is_visible: boolean
          logo_url: string | null
          name: string
          open_mode: Database["public"]["Enums"]["open_mode"]
          released_at: string | null
          short_description: string | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["application_status"]
          support_url: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          allowed_domains?: string[]
          benefits?: string | null
          category?: Database["public"]["Enums"]["application_category"]
          connection_mode?: Database["public"]["Enums"]["connection_mode"]
          created_at?: string
          external_url: string
          features?: Json
          full_description?: string | null
          icon?: string | null
          id?: string
          is_featured?: boolean
          is_new?: boolean
          is_visible?: boolean
          logo_url?: string | null
          name: string
          open_mode?: Database["public"]["Enums"]["open_mode"]
          released_at?: string | null
          short_description?: string | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["application_status"]
          support_url?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          allowed_domains?: string[]
          benefits?: string | null
          category?: Database["public"]["Enums"]["application_category"]
          connection_mode?: Database["public"]["Enums"]["connection_mode"]
          created_at?: string
          external_url?: string
          features?: Json
          full_description?: string | null
          icon?: string | null
          id?: string
          is_featured?: boolean
          is_new?: boolean
          is_visible?: boolean
          logo_url?: string | null
          name?: string
          open_mode?: Database["public"]["Enums"]["open_mode"]
          released_at?: string | null
          short_description?: string | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["application_status"]
          support_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      audience_segments: {
        Row: {
          characteristics: Json
          color: string | null
          created_at: string
          created_by: string
          hypothesis: string | null
          id: string
          name: string
          organization_id: string
          persona_id: string | null
          priority: string
          size_estimate: string | null
          source_refs: Json
          updated_at: string
        }
        Insert: {
          characteristics?: Json
          color?: string | null
          created_at?: string
          created_by: string
          hypothesis?: string | null
          id?: string
          name: string
          organization_id: string
          persona_id?: string | null
          priority?: string
          size_estimate?: string | null
          source_refs?: Json
          updated_at?: string
        }
        Update: {
          characteristics?: Json
          color?: string | null
          created_at?: string
          created_by?: string
          hypothesis?: string | null
          id?: string
          name?: string
          organization_id?: string
          persona_id?: string | null
          priority?: string
          size_estimate?: string | null
          source_refs?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audience_segments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audience_segments_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
          organization_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          organization_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          channel: string | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          kpis: Json
          name: string
          objective: string | null
          organization_id: string
          starts_at: string | null
          status: string
          strategy_id: string | null
          updated_at: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          kpis?: Json
          name: string
          objective?: string | null
          organization_id: string
          starts_at?: string | null
          status?: string
          strategy_id?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          kpis?: Json
          name?: string
          objective?: string | null
          organization_id?: string
          starts_at?: string | null
          status?: string
          strategy_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          community_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          members_estimated: number
          name: string
          organization_id: string
          platform: string | null
          status: string
          updated_at: string
        }
        Insert: {
          community_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          members_estimated?: number
          name: string
          organization_id: string
          platform?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          community_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          members_estimated?: number
          name?: string
          organization_id?: string
          platform?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_recommendations: {
        Row: {
          action_hint: string | null
          body: string
          created_at: string
          dismissed_at: string | null
          dismissed_by: string | null
          generated_at: string
          id: string
          module: string | null
          organization_id: string
          severity: string
          title: string
          updated_at: string
        }
        Insert: {
          action_hint?: string | null
          body: string
          created_at?: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          generated_at?: string
          id?: string
          module?: string | null
          organization_id: string
          severity?: string
          title: string
          updated_at?: string
        }
        Update: {
          action_hint?: string | null
          body?: string
          created_at?: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          generated_at?: string
          id?: string
          module?: string | null
          organization_id?: string
          severity?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      csd_items: {
        Row: {
          category: Database["public"]["Enums"]["csd_category"]
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          source: string
          text: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["csd_category"]
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          source?: string
          text: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["csd_category"]
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          source?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "csd_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          application_id: string
          created_at: string
          id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          organization_id: string
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_snapshots: {
        Row: {
          created_at: string
          id: string
          label: string
          metric_key: string
          module: string | null
          organization_id: string
          period_end: string | null
          period_start: string | null
          target: number | null
          unit: string | null
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          metric_key: string
          module?: string | null
          organization_id: string
          period_end?: string | null
          period_start?: string | null
          target?: number | null
          unit?: string | null
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          metric_key?: string
          module?: string | null
          organization_id?: string
          period_end?: string | null
          period_start?: string | null
          target?: number | null
          unit?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      library_items: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          item_type: string
          name: string
          organization_id: string
          payload: Json
          tags: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          item_type: string
          name: string
          organization_id: string
          payload?: Json
          tags?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          item_type?: string
          name?: string
          organization_id?: string
          payload?: Json
          tags?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_connections: {
        Row: {
          access_token: string
          access_token_ciphertext: string | null
          authorization_server: string
          client_id: string
          created_at: string
          expires_at: string | null
          id: string
          provider: string
          refresh_token: string | null
          refresh_token_ciphertext: string | null
          resource: string
          scope: string | null
          token_encryption_version: number | null
          token_type: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          access_token: string
          access_token_ciphertext?: string | null
          authorization_server: string
          client_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          provider: string
          refresh_token?: string | null
          refresh_token_ciphertext?: string | null
          resource: string
          scope?: string | null
          token_encryption_version?: number | null
          token_type?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          access_token?: string
          access_token_ciphertext?: string | null
          authorization_server?: string
          client_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: string
          refresh_token?: string | null
          refresh_token_ciphertext?: string | null
          resource?: string
          scope?: string | null
          token_encryption_version?: number | null
          token_type?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcp_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_oauth_states: {
        Row: {
          client_id: string
          code_verifier: string
          created_at: string
          expires_at: string
          provider: string
          redirect_uri: string
          return_to: string | null
          state: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          client_id: string
          code_verifier: string
          created_at?: string
          expires_at?: string
          provider: string
          redirect_uri: string
          return_to?: string | null
          state: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          client_id?: string
          code_verifier?: string
          created_at?: string
          expires_at?: string
          provider?: string
          redirect_uri?: string
          return_to?: string | null
          state?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcp_oauth_states_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          message: string | null
          organization_id: string | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          message?: string | null
          organization_id?: string | null
          read_at?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          message?: string | null
          organization_id?: string | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_applications: {
        Row: {
          application_id: string
          created_at: string
          enabled_at: string
          expires_at: string | null
          id: string
          organization_id: string
          plan_metadata: Json
          status: Database["public"]["Enums"]["org_app_status"]
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          enabled_at?: string
          expires_at?: string | null
          id?: string
          organization_id: string
          plan_metadata?: Json
          status?: Database["public"]["Enums"]["org_app_status"]
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          enabled_at?: string
          expires_at?: string | null
          id?: string
          organization_id?: string
          plan_metadata?: Json
          status?: Database["public"]["Enums"]["org_app_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_applications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          joined_at: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          plan: string | null
          settings: Json
          slug: string
          status: Database["public"]["Enums"]["org_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          plan?: string | null
          settings?: Json
          slug: string
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          plan?: string | null
          settings?: Json
          slug?: string
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
        }
        Relationships: []
      }
      persona_agents: {
        Row: {
          capabilities: Json
          created_at: string
          created_by: string | null
          id: string
          name: string
          organization_id: string
          persona_id: string
          role: string | null
          starter_questions: Json
          status: string
          system_prompt: string
          tone: string | null
          updated_at: string
        }
        Insert: {
          capabilities?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          organization_id: string
          persona_id: string
          role?: string | null
          starter_questions?: Json
          status?: string
          system_prompt: string
          tone?: string | null
          updated_at?: string
        }
        Update: {
          capabilities?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string
          persona_id?: string
          role?: string | null
          starter_questions?: Json
          status?: string
          system_prompt?: string
          tone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "persona_agents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_agents_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          age: number | null
          avatar_seed: string | null
          behaviors: Json
          bio: string | null
          channels: Json
          created_at: string
          created_by: string | null
          demographics: Json
          description: string | null
          gains: Json
          icp: Json
          id: string
          image_url: string | null
          importance: number | null
          insights: Json
          journey: Json
          jtbd: Json
          kpis: Json
          motivations: Json
          name: string
          objections: Json
          occupation: string | null
          organization_id: string
          pains: Json
          priority_notes: string | null
          quote: string | null
          role: string | null
          stage: string
          status: string
          triggers: Json
          updated_at: string
          urgency: number | null
          values: Json
        }
        Insert: {
          age?: number | null
          avatar_seed?: string | null
          behaviors?: Json
          bio?: string | null
          channels?: Json
          created_at?: string
          created_by?: string | null
          demographics?: Json
          description?: string | null
          gains?: Json
          icp?: Json
          id?: string
          image_url?: string | null
          importance?: number | null
          insights?: Json
          journey?: Json
          jtbd?: Json
          kpis?: Json
          motivations?: Json
          name: string
          objections?: Json
          occupation?: string | null
          organization_id: string
          pains?: Json
          priority_notes?: string | null
          quote?: string | null
          role?: string | null
          stage?: string
          status?: string
          triggers?: Json
          updated_at?: string
          urgency?: number | null
          values?: Json
        }
        Update: {
          age?: number | null
          avatar_seed?: string | null
          behaviors?: Json
          bio?: string | null
          channels?: Json
          created_at?: string
          created_by?: string | null
          demographics?: Json
          description?: string | null
          gains?: Json
          icp?: Json
          id?: string
          image_url?: string | null
          importance?: number | null
          insights?: Json
          journey?: Json
          jtbd?: Json
          kpis?: Json
          motivations?: Json
          name?: string
          objections?: Json
          occupation?: string | null
          organization_id?: string
          pains?: Json
          priority_notes?: string | null
          quote?: string | null
          role?: string | null
          stage?: string
          status?: string
          triggers?: Json
          updated_at?: string
          urgency?: number | null
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "personas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_status_history: {
        Row: {
          application_id: string
          created_at: string
          created_by: string | null
          id: string
          message: string | null
          resolved_at: string | null
          started_at: string
          status: Database["public"]["Enums"]["application_status"]
        }
        Insert: {
          application_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string | null
          resolved_at?: string | null
          started_at?: string
          status: Database["public"]["Enums"]["application_status"]
        }
        Update: {
          application_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string | null
          resolved_at?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["application_status"]
        }
        Relationships: [
          {
            foreignKeyName: "platform_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          job_title: string | null
          onboarding_completed: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          job_title?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          campaign_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string
          name: string
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          name: string
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      research_sources: {
        Row: {
          created_at: string
          created_by: string
          csd_item_id: string | null
          id: string
          insights: Json
          kind: string
          notes: string | null
          organization_id: string
          status: string
          summary: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          csd_item_id?: string | null
          id?: string
          insights?: Json
          kind?: string
          notes?: string | null
          organization_id: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          csd_item_id?: string | null
          id?: string
          insights?: Json
          kind?: string
          notes?: string | null
          organization_id?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_sources_csd_item_id_fkey"
            columns: ["csd_item_id"]
            isOneToOne: false
            referencedRelation: "csd_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      strategies: {
        Row: {
          channels: Json
          created_at: string
          created_by: string | null
          frameworks: Json
          id: string
          name: string
          objective: string | null
          organization_id: string
          persona_id: string | null
          positioning: string | null
          status: string
          updated_at: string
          value_proposition: string | null
        }
        Insert: {
          channels?: Json
          created_at?: string
          created_by?: string | null
          frameworks?: Json
          id?: string
          name: string
          objective?: string | null
          organization_id: string
          persona_id?: string | null
          positioning?: string | null
          status?: string
          updated_at?: string
          value_proposition?: string | null
        }
        Update: {
          channels?: Json
          created_at?: string
          created_by?: string | null
          frameworks?: Json
          id?: string
          name?: string
          objective?: string | null
          organization_id?: string
          persona_id?: string | null
          positioning?: string | null
          status?: string
          updated_at?: string
          value_proposition?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strategies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategies_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string
          organization_id: string
          project_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          organization_id: string
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          organization_id?: string
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_application_permissions: {
        Row: {
          application_id: string
          can_access: boolean
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          organization_member_id: string
          updated_at: string
        }
        Insert: {
          application_id: string
          can_access?: boolean
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          organization_member_id: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          can_access?: boolean
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          organization_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_application_permissions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_application_permissions_organization_member_id_fkey"
            columns: ["organization_member_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["id"]
          },
        ]
      }
      user_global_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_global_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_global_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_global_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
      org_has_app: {
        Args: { _app_id: string; _org_id: string }
        Returns: boolean
      }
    }
    Enums: {
      access_log_event:
        | "login"
        | "logout"
        | "app_open"
        | "app_open_denied"
        | "access_requested"
        | "access_approved"
        | "access_rejected"
        | "invite_sent"
        | "invite_accepted"
        | "invite_cancelled"
        | "role_changed"
        | "app_granted"
        | "app_revoked"
        | "org_created"
        | "org_updated"
        | "org_suspended"
        | "org_activated"
        | "app_created"
        | "app_updated"
        | "app_status_changed"
        | "settings_updated"
      access_request_status: "pending" | "approved" | "rejected" | "cancelled"
      announcement_audience:
        | "all"
        | "organizations"
        | "admins"
        | "app_users"
        | "roles"
      announcement_priority: "low" | "normal" | "high" | "critical"
      app_global_role: "superadmin"
      application_category:
        | "strategy"
        | "content"
        | "operations"
        | "data_performance"
        | "artificial_intelligence"
        | "research_audience"
      application_status:
        | "available"
        | "unstable"
        | "maintenance"
        | "unavailable"
        | "coming_soon"
      connection_mode: "external_link" | "authenticated_link" | "sso"
      csd_category: "certainty" | "assumption" | "doubt"
      invitation_status: "pending" | "accepted" | "expired" | "cancelled"
      member_status: "active" | "invited" | "disabled"
      notification_type:
        | "info"
        | "success"
        | "warning"
        | "error"
        | "announcement"
      open_mode: "new_tab" | "same_tab"
      org_app_status: "enabled" | "disabled" | "trial"
      org_role: "org_admin" | "member" | "viewer"
      org_status: "active" | "suspended" | "trial"
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
      access_log_event: [
        "login",
        "logout",
        "app_open",
        "app_open_denied",
        "access_requested",
        "access_approved",
        "access_rejected",
        "invite_sent",
        "invite_accepted",
        "invite_cancelled",
        "role_changed",
        "app_granted",
        "app_revoked",
        "org_created",
        "org_updated",
        "org_suspended",
        "org_activated",
        "app_created",
        "app_updated",
        "app_status_changed",
        "settings_updated",
      ],
      access_request_status: ["pending", "approved", "rejected", "cancelled"],
      announcement_audience: [
        "all",
        "organizations",
        "admins",
        "app_users",
        "roles",
      ],
      announcement_priority: ["low", "normal", "high", "critical"],
      app_global_role: ["superadmin"],
      application_category: [
        "strategy",
        "content",
        "operations",
        "data_performance",
        "artificial_intelligence",
        "research_audience",
      ],
      application_status: [
        "available",
        "unstable",
        "maintenance",
        "unavailable",
        "coming_soon",
      ],
      connection_mode: ["external_link", "authenticated_link", "sso"],
      csd_category: ["certainty", "assumption", "doubt"],
      invitation_status: ["pending", "accepted", "expired", "cancelled"],
      member_status: ["active", "invited", "disabled"],
      notification_type: [
        "info",
        "success",
        "warning",
        "error",
        "announcement",
      ],
      open_mode: ["new_tab", "same_tab"],
      org_app_status: ["enabled", "disabled", "trial"],
      org_role: ["org_admin", "member", "viewer"],
      org_status: ["active", "suspended", "trial"],
    },
  },
} as const
