'use client';

import useSWR from 'swr';
import { api, Account, Transaction, Category, Recurring } from './supabase';

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

export function useDashboardData() {
  const { accounts, isLoading: accountsLoading, refresh: refreshAccounts } = useAccounts();
  const { transactions, isLoading: transactionsLoading, refresh: refreshTransactions } = useTransactions();
  const { categories, isLoading: categoriesLoading, refresh: refreshCategories } = useCategories();
  const { recurring, isLoading: recurringLoading, refresh: refreshRecurring } = useRecurring();
  
  const isLoading = accountsLoading || transactionsLoading || categoriesLoading || recurringLoading;
  
  const refreshAll = () => {
    refreshAccounts();
    refreshTransactions();
    refreshCategories();
    refreshRecurring();
  };
  
  return {
    accounts,
    transactions,
    categories,
    recurring,
    isLoading,
    refresh: refreshAll,
  };
}
