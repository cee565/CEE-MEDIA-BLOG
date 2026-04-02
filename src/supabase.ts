import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Please check your .env file.");
} else if (!supabaseUrl.startsWith('https://')) {
  console.error("Invalid Supabase URL: Must start with https://. Current value:", supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
