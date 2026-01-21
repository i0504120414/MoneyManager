'use client';

import useSWR from 'swr';
import { api, Account, Transaction, Category, Recurring, CREDIT_CARD_TYPES } from './supabase';

// SWR configuration for caching
const swrConfig = {
  revalidateOnFocus: false,      // Don't refetch when window gets focus
  revalidateOnReconnect: false,  // Don't refetch on reconnect
  dedupingInterval: 60000,       // Dedupe requests within 60 seconds
  keepPreviousData: true,        // Keep showing old data while fetching new
};

// Custom hooks for data fetching with caching

export function useAccounts() {
  const { data, error, isLoading, mutate } = useSWR(
    'accounts',
    () => api.getAccounts(),
    swrConfig
  );
  
  return {
    accounts: data || [],
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

export function useTransactions(filters?: {
  startDate?: string;
  endDate?: string;
  search?: string;
}) {
  const key = filters 
    ? `transactions-${filters.startDate}-${filters.endDate}-${filters.search || ''}`
    : 'transactions';
    
  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => api.getTransactions(filters),
    swrConfig
  );
  
  return {
    transactions: data || [],
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

export function useCategories() {
  const { data, error, isLoading, mutate } = useSWR(
    'categories',
    () => api.getCategories(),
    {
      ...swrConfig,
      dedupingInterval: 300000, // Categories change less often, cache for 5 min
    }
  );
  
  return {
    categories: data || [],
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

export function useRecurring() {
  const { data, error, isLoading, mutate } = useSWR(
    'recurring',
    () => api.getRecurring(),
    swrConfig
  );
  
  return {
    recurring: data || [],
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

// Credit card transaction for chart display
interface CreditCardTransaction {
  charged_amount: number;
  processed_date: string;
  description?: string;
  account_id: string;
}

// Fetch credit card transactions for all credit card accounts
async function fetchCreditCardTransactions(accounts: Account[]): Promise<CreditCardTransaction[]> {
  const creditCards = accounts.filter(acc => CREDIT_CARD_TYPES.includes(acc.bank_type));
  const allTransactions: CreditCardTransaction[] = [];
  
  for (const card of creditCards) {
    try {
      const transactions = await api.getCreditCardTransactionsWithProcessedDate(card.id);
      allTransactions.push(...transactions.map(tx => ({ ...tx, account_id: card.id })));
    } catch (error) {
      console.error('Error fetching credit card transactions:', error);
    }
  }
  
  return allTransactions;
}

export function useCreditCardTransactions(accounts: Account[]) {
  const accountIds = accounts
    .filter(acc => CREDIT_CARD_TYPES.includes(acc.bank_type))
    .map(acc => acc.id)
    .sort()
    .join(',');
  
  const { data, error, isLoading, mutate } = useSWR(
    accountIds ? `cc-transactions-${accountIds}` : null,
    () => fetchCreditCardTransactions(accounts),
    swrConfig
  );
  
  return {
    creditCardTransactions: data || [],
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

export function useDashboardData() {
  const { accounts, isLoading: accountsLoading, refresh: refreshAccounts } = useAccounts();
  const { transactions, isLoading: transactionsLoading, refresh: refreshTransactions } = useTransactions();
  const { categories, isLoading: categoriesLoading, refresh: refreshCategories } = useCategories();
  const { recurring, isLoading: recurringLoading, refresh: refreshRecurring } = useRecurring();
  const { creditCardTransactions, isLoading: ccLoading, refresh: refreshCC } = useCreditCardTransactions(accounts);
  
  const isLoading = accountsLoading || transactionsLoading || categoriesLoading || recurringLoading || ccLoading;
  
  const refreshAll = () => {
    refreshAccounts();
    refreshTransactions();
    refreshCategories();
    refreshRecurring();
    refreshCC();
  };
  
  return {
    accounts,
    transactions,
    categories,
    recurring,
    creditCardTransactions,
    isLoading,
    refresh: refreshAll,
  };
}
