import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your actual Supabase URL and Anon Key from your project settings
const supabaseUrl = 'https://zqfulrwysdtnvogicldy.supabase.co';
const supabaseAnonKey = 'sb_secret_2EzZnYFmW11rgD3dnWcthQ_InEm4ULL';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
