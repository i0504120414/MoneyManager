import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * @typedef {Object} BankAccount
 * @property {string} id
 * @property {string} bank_type
 * @property {Record<string, string>} credentials
 * @property {string} created_at
 * @property {string} last_updated
 * @property {boolean} is_active
 */

/**
 * @typedef {Object} Transaction
 * @property {string} id
 * @property {string} account_id
 * @property {string} date
 * @property {string} description
 * @property {number} amount
 * @property {'debit' | 'credit'} type
 * @property {string} [category]
 * @property {Record<string, any>} raw_data
 * @property {string} created_at
 */
