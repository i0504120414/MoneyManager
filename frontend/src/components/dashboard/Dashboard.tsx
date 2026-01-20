'use client';

import { useEffect, useState } from 'react';
import { api, Account, Transaction, Category, Recurring } from '@/lib/supabase';
import AccountCards from './AccountCards';
import BalanceChart from './BalanceChart';
import BudgetTable from './BudgetTable';
import RecentTransactions from './RecentTransactions';
import { Loader2, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [accountsData, transactionsData, categoriesData, recurringData] = await Promise.all([
        api.getAccounts(),
        api.getTransactions(),
        api.getCategories(),
        api.getRecurring(),
      ]);
      setAccounts(accountsData || []);
      setTransactions(transactionsData || []);
      setCategories(categoriesData || []);
      setRecurring(recurringData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-blue-600 spinner" />
      </div>
    );
  }

  // Calculate total balance
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">דשבורד</h1>
          <p className="text-slate-500">סקירה כללית של המצב הפיננסי שלך</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'spinner' : ''}`} />
          <span>רענן</span>
        </button>
      </div>

      {/* Total Balance Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <p className="text-blue-100 text-sm">סה"כ יתרה</p>
        <p className="text-4xl font-bold mt-1 ltr-number">
          ₪{totalBalance.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
        </p>
        <p className="text-blue-200 text-sm mt-2">
          {accounts.length} חשבונות פעילים
        </p>
      </div>

      {/* Account Cards */}
      <AccountCards accounts={accounts} />

      {/* Balance Timeline Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">תחזית יתרה</h2>
        <BalanceChart
          currentBalance={totalBalance}
          recurring={recurring.filter(r => r.is_confirmed)}
        />
      </div>

      {/* Budget Overview */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">ניהול תקציב</h2>
        <BudgetTable categories={categories} transactions={transactions} />
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">עסקאות אחרונות</h2>
        <RecentTransactions transactions={transactions.slice(0, 10)} />
      </div>
    </div>
  );
}
