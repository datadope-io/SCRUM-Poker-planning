import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL and Anon Key are required. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment.');
}

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Database types (optional, for TypeScript support)
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string
          created_at: string
          story_title: string
          story_description: string
          phase: 'SETUP' | 'VOTING' | 'REVEALED'
        }
        Insert: {
          id?: string
          created_at?: string
          story_title: string
          story_description: string
          phase: 'SETUP' | 'VOTING' | 'REVEALED'
        }
        Update: {
          id?: string
          created_at?: string
          story_title?: string
          story_description?: string
          phase?: 'SETUP' | 'VOTING' | 'REVEALED'
        }
      }
      players: {
        Row: {
          id: string
          room_id: string
          name: string
          type: 'HUMAN' | 'AI'
          avatar_url: string
          persona?: string
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          name: string
          type: 'HUMAN' | 'AI'
          avatar_url: string
          persona?: string
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          name?: string
          type?: 'HUMAN' | 'AI'
          avatar_url?: string
          persona?: string
          created_at?: string
        }
      }
      votes: {
        Row: {
          id: string
          room_id: string
          player_id: string
          value: number | string
          reasoning?: string
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          player_id: string
          value: number | string
          reasoning?: string
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          player_id?: string
          value?: number | string
          reasoning?: string
          created_at?: string
        }
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
  }
}
