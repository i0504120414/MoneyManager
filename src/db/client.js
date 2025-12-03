import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Account structure
export interface BankAccount {
  id: string;
  bank_type: string;
  credentials: Record<string, string>; // Encrypted in real scenario
  created_at: string;
  last_updated: string;
  is_active: boolean;
}

// Transaction structure
export interface Transaction {
  id: string;
  account_id: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  category?: string;
  raw_data: Record<string, any>;
  created_at: string;
}
