export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          display_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          created_at?: string
        }
      }
      api_keys: {
        Row: {
          id: string
          provider: string
          key_name: string
          encrypted_key: string
          is_active: boolean
          monthly_budget_usd: number | null
          created_at: string
        }
        Insert: {
          id?: string
          provider: string
          key_name: string
          encrypted_key: string
          is_active?: boolean
          monthly_budget_usd?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          provider?: string
          key_name?: string
          encrypted_key?: string
          is_active?: boolean
          monthly_budget_usd?: number | null
          created_at?: string
        }
      }
      media_generations: {
        Row: {
          id: string
          run_id: string
          user_id: string
          media_type: string
          prompt: string
          config: Record<string, unknown>
          provider: string
          model: string
          status: string
          output_url: string | null
          cost_usd: number | null
          latency_ms: number | null
          error: string | null
          created_at: string
          completed_at: string | null
          file_size_bytes: number | null
          width: number | null
          height: number | null
          duration_seconds: number | null
          thumbnail_url: string | null
          is_favorite: boolean
          project_id: string | null
        }
        Insert: {
          id?: string
          run_id: string
          user_id: string
          media_type: string
          prompt: string
          config: Record<string, unknown>
          provider: string
          model: string
          status?: string
          output_url?: string | null
          cost_usd?: number | null
          latency_ms?: number | null
          error?: string | null
          created_at?: string
          completed_at?: string | null
          file_size_bytes?: number | null
          width?: number | null
          height?: number | null
          duration_seconds?: number | null
          thumbnail_url?: string | null
          is_favorite?: boolean
          project_id?: string | null
        }
        Update: {
          id?: string
          run_id?: string
          user_id?: string
          media_type?: string
          prompt?: string
          config?: Record<string, unknown>
          provider?: string
          model?: string
          status?: string
          output_url?: string | null
          cost_usd?: number | null
          latency_ms?: number | null
          error?: string | null
          created_at?: string
          completed_at?: string | null
          file_size_bytes?: number | null
          width?: number | null
          height?: number | null
          duration_seconds?: number | null
          thumbnail_url?: string | null
          is_favorite?: boolean
          project_id?: string | null
        }
      }
      user_credits: {
        Row: {
          id: string
          user_id: string
          balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          balance?: number
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          template_id: string
          title: string
          current_step_index: number
          status: 'in_progress' | 'completed' | 'cancelled'
          step_data: Record<string, unknown>
          session_id: string | null
          thumbnail_url: string | null
          output_url: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          template_id: string
          title: string
          current_step_index?: number
          status?: 'in_progress' | 'completed' | 'cancelled'
          step_data?: Record<string, unknown>
          session_id?: string | null
          thumbnail_url?: string | null
          output_url?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          template_id?: string
          title?: string
          current_step_index?: number
          status?: 'in_progress' | 'completed' | 'cancelled'
          step_data?: Record<string, unknown>
          session_id?: string | null
          thumbnail_url?: string | null
          output_url?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
