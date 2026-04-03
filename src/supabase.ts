import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase credentials missing! The app will show a blank screen or fail to load data. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your deployment environment variables.");
}

// Create client even if empty to avoid crashing the module load, 
// but it will fail on actual requests which we handle in components.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);
