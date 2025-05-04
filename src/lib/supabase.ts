import { createClient } from '@supabase/supabase-js';

// Define your Supabase database types
export type Database = {
  public: {
    tables: {
      users: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          first_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      teller_enrollments: {
        Row: {
          id: string;
          user_id: string;
          enrollment_id: string;
          access_token: string;
          institution_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          enrollment_id: string;
          access_token: string;
          institution_name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          enrollment_id?: string;
          access_token?: string;
          institution_name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};

// Get Supabase URL and anon key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create and export the Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Export types for convenience
export type User = Database['public']['tables']['users']['Row'];
export type TellerEnrollment = Database['public']['tables']['teller_enrollments']['Row']; 