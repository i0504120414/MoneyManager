import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for database tables
export interface Account {
  id: string;
  user_account_id: string;
  bank_name: string;
  bank_type: string;
  account_number?: string;
  description?: string;
  last_sync?: string;
  last_updated: string;
  status: 'active' | 'inactive' | 'error';
  current_balance?: number;
  balance?: number;
  is_cancelled?: boolean;
}

export interface Transaction {
  id: string;
  account_id: string;
  date: string;
  processed_date?: string;
  original_amount: number;
  original_currency: string;
  charged_amount: number;
  description: string;
  memo?: string;
  type: string;
  category_id?: string;
  installment_number?: number;
  installment_total?: number;
  hash: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  target_amount?: number;
  icon?: string;
  color?: string;
}

export interface Recurring {
  id: string;
  account_id: string;
  type: 'installment' | 'direct_debit' | 'detected';
  average_amount: number;
  amount_avg: number;
  expected_day?: number;
  day_of_month?: number;
  description: string;
  is_confirmed: boolean;
  installment_total?: number; // Total installments
  installment_current?: number; // Current installment when first detected
  first_detected_date?: string; // Date when first detected
}

export type RecurringItem = Recurring;

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AssignmentRule {
  id: string;
  user_id: string;
  pattern: string;
  category_id: string;
  is_active: boolean;
}

// Credit card types that should show upcoming charges instead of balance
export const CREDIT_CARD_TYPES = ['isracard', 'amex', 'max', 'visaCal'];

// API functions
export const api = {
  // Accounts
  async getAccounts() {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('is_active', true)
      .or('is_cancelled.is.null,is_cancelled.eq.false'); // Filter out cancelled cards
    if (error) throw error;
    return data;
  },

  // Get upcoming credit card charges (sum of charged_amount for pending transactions)
  async getCreditCardUpcomingCharges(accountId: string) {
    // Get transactions from current month that haven't been processed yet
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();
    
    const { data, error } = await supabase
      .from('transactions')
      .select('charged_amount')
      .eq('account_id', accountId)
      .gte('date', startOfMonth)
      .lte('date', endOfNextMonth);
    
    if (error) throw error;
    
    // Sum all charged amounts (they are negative for expenses)
    const total = (data || []).reduce((sum, tx) => sum + (tx.charged_amount || 0), 0);
    return Math.abs(total); // Return as positive number
  },

  // Transactions
  async getTransactions(filters?: {
    accountId?: string;
    startDate?: string;
    endDate?: string;
    category?: string;
    search?: string;
  }) {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        bank_accounts!inner(bank_type)
      `)
      .order('date', { ascending: false });

    if (filters?.accountId) {
      query = query.eq('account_id', filters.accountId);
    }
    if (filters?.startDate) {
      query = query.gte('date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('date', filters.endDate);
    }
    if (filters?.search) {
      query = query.ilike('description', `%${filters.search}%`);
    }

    const { data, error } = await query.limit(500);
    if (error) throw error;
    return data;
  },

  async updateTransactionCategory(transactionIds: string[], categoryId: string) {
    const { error } = await supabase
      .from('transactions')
      .update({ category_id: categoryId })
      .in('id', transactionIds);
    if (error) throw error;
  },

  // Categories
  async getCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  },

  async createCategory(category: Partial<Category>) {
    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('categories')
      .insert([{ ...category, user_id: user?.user?.id }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateCategory(id: string, updates: Partial<Category>) {
    const { error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  // Recurring
  async getRecurring() {
    const { data, error } = await supabase
      .from('recurring')
      .select('*')
      .order('amount_avg', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getPendingRecurringCount() {
    // Only count non-installment recurring as pending (installments are auto-approved)
    const { count, error } = await supabase
      .from('recurring')
      .select('*', { count: 'exact', head: true })
      .eq('is_confirmed', false)
      .neq('type', 'installment');
    if (error) throw error;
    return count || 0;
  },

  async confirmRecurring(id: string, confirmed: boolean) {
    const { error } = await supabase
      .from('recurring')
      .update({ is_confirmed: confirmed })
      .eq('id', id);
    if (error) throw error;
  },

  // Notifications
  async getNotifications() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data;
  },

  async markNotificationRead(id: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    if (error) throw error;
  },

  // Assignment Rules
  async getAssignmentRules() {
    const { data, error } = await supabase
      .from('assignment_rules')
      .select('*, categories(name)')
      .order('pattern');
    if (error) throw error;
    return data;
  },

  async createAssignmentRule(rule: { pattern: string; category_id: string }) {
    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('assignment_rules')
      .insert([{ ...rule, user_id: user?.user?.id, is_active: true }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteAssignmentRule(id: string) {
    const { error } = await supabase
      .from('assignment_rules')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async updateAssignmentRule(id: string, updates: { pattern?: string; category_id?: string }) {
    const { error } = await supabase
      .from('assignment_rules')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  // Stats
  async getCategoryStats(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        category_id,
        charged_amount,
        categories(name, target_amount)
      `)
      .gte('date', startDate)
      .lte('date', endDate);
    if (error) throw error;
    return data;
  },

  // Reset all data (keeps bank_user_accounts credentials)
  async resetAllData() {
    // Delete in order due to foreign key constraints
    // 1. Delete recurring (references bank_accounts)
    const { error: recurringError } = await supabase
      .from('recurring')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (recurringError) throw recurringError;

    // 2. Delete transactions (references bank_accounts)
    const { error: txError } = await supabase
      .from('transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (txError) throw txError;

    // 3. Delete bank_accounts (references bank_user_accounts)
    const { error: accountsError } = await supabase
      .from('bank_accounts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (accountsError) throw accountsError;

    // 4. Delete categories
    const { error: catError } = await supabase
      .from('categories')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (catError) throw catError;

    // 5. Delete notifications
    const { error: notifError } = await supabase
      .from('notifications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (notifError) throw notifError;

    // 6. Reset last_updated in bank_user_accounts to trigger full re-sync
    const { error: updateError } = await supabase
      .from('bank_user_accounts')
      .update({ last_updated: null })
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (updateError) throw updateError;
  },

  // Delete a bank user account and all its data
  async deleteBankUserAccount(userAccountId: string) {
    // CASCADE will handle bank_accounts, transactions, recurring
    const { error } = await supabase
      .from('bank_user_accounts')
      .delete()
      .eq('id', userAccountId);
    if (error) throw error;
  },

  // Get bank user accounts (for listing accounts to delete)
  async getBankUserAccounts() {
    const { data, error } = await supabase
      .from('bank_user_accounts')
      .select('id, bank_type, created_at');
    if (error) throw error;
    return data;
  },
};
