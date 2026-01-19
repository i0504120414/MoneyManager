'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { api, Transaction, Category } from '@/lib/supabase';
import Sidebar from '@/components/layout/Sidebar';
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Check,
  Tag,
  Calendar,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';

export default function TransactionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [txData, catData] = await Promise.all([
          api.getTransactions({
            startDate: dateRange.start,
            endDate: dateRange.end,
            search: search || undefined,
          }),
          api.getCategories(),
        ]);
        setTransactions(txData || []);
        setCategories(catData || []);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, dateRange, search]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (selectedCategory && t.category_id !== selectedCategory) return false;
      return true;
    });
  }, [transactions, selectedCategory]);

  const handleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map((t) => t.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkCategoryUpdate = async (categoryId: string) => {
    try {
      await api.updateTransactionCategory(Array.from(selectedIds), categoryId);
      // Refresh transactions
      const txData = await api.getTransactions({
        startDate: dateRange.start,
        endDate: dateRange.end,
      });
      setTransactions(txData || []);
      setSelectedIds(new Set());
      setShowCategoryModal(false);
    } catch (error) {
      console.error('Error updating categories:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 mr-0 lg:mr-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 spinner" />
        </main>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 mr-0 lg:mr-64">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">עסקאות</h1>
              <p className="text-slate-500">
                {filteredTransactions.length} עסקאות נמצאו
              </p>
            </div>

            <div className="flex items-center gap-3">
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
                >
                  <Tag className="w-4 h-4" />
                  <span>שנה קטגוריה ({selectedIds.size})</span>
                </button>
              )}
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">
                <Download className="w-4 h-4" />
                <span>ייצוא</span>
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="חיפוש עסקאות..."
                  className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Date Range */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="bg-transparent border-none outline-none text-sm"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="bg-transparent border-none outline-none text-sm"
                  />
                </div>
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
                  showFilters ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>סינון</span>
                <ChevronDown className={`w-4 h-4 transition ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Extended Filters */}
            {showFilters && (
              <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">כל הקטגוריות</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    setDateRange({
                      start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
                      end: format(new Date(), 'yyyy-MM-dd'),
                    });
                  }}
                  className="px-3 py-2 bg-slate-100 rounded-lg text-sm hover:bg-slate-200 transition"
                >
                  שבוע אחרון
                </button>
                <button
                  onClick={() => {
                    setDateRange({
                      start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
                      end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
                    });
                  }}
                  className="px-3 py-2 bg-slate-100 rounded-lg text-sm hover:bg-slate-200 transition"
                >
                  חודש נוכחי
                </button>
                <button
                  onClick={() => {
                    setDateRange({
                      start: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
                      end: format(new Date(), 'yyyy-MM-dd'),
                    });
                  }}
                  className="px-3 py-2 bg-slate-100 rounded-lg text-sm hover:bg-slate-200 transition"
                >
                  3 חודשים
                </button>
              </div>
            )}
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-4 text-right">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                    </th>
                    <th className="p-4 text-right text-sm font-medium text-slate-600">תאריך</th>
                    <th className="p-4 text-right text-sm font-medium text-slate-600">תיאור</th>
                    <th className="p-4 text-right text-sm font-medium text-slate-600">קטגוריה</th>
                    <th className="p-4 text-left text-sm font-medium text-slate-600">סכום</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((transaction) => {
                    const isIncome = transaction.charged_amount > 0;
                    const amount = Math.abs(transaction.charged_amount);
                    const category = categories.find((c) => c.id === transaction.category_id);

                    return (
                      <tr
                        key={transaction.id}
                        className="hover:bg-slate-50 transition"
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(transaction.id)}
                            onChange={() => handleToggleSelect(transaction.id)}
                            className="w-4 h-4 rounded border-slate-300"
                          />
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-slate-600">
                            {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: he })}
                          </p>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                isIncome ? 'bg-green-50' : 'bg-red-50'
                              }`}
                            >
                              {isIncome ? (
                                <ArrowUpRight className="w-4 h-4 text-green-600" />
                              ) : (
                                <ArrowDownRight className="w-4 h-4 text-red-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-slate-700 line-clamp-1">
                                {transaction.description}
                              </p>
                              {transaction.memo && (
                                <p className="text-xs text-slate-400 line-clamp-1">
                                  {transaction.memo}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          {category ? (
                            <span className="px-2 py-1 bg-slate-100 rounded-lg text-sm text-slate-600">
                              {category.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="p-4 text-left">
                          <span
                            className={`font-semibold ltr-number ${
                              isIncome ? 'text-green-600' : 'text-slate-800'
                            }`}
                          >
                            {isIncome ? '+' : '-'}₪{amount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredTransactions.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-400">לא נמצאו עסקאות</p>
              </div>
            )}
          </div>
        </div>

        {/* Category Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                בחר קטגוריה ({selectedIds.size} עסקאות)
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleBulkCategoryUpdate(cat.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition text-right"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Tag className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-medium text-slate-700">{cat.name}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="w-full mt-4 py-2 text-slate-600 hover:text-slate-800 transition"
              >
                ביטול
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
