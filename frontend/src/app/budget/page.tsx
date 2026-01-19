'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { api, Category, Transaction } from '@/lib/supabase';
import Sidebar from '@/components/layout/Sidebar';
import {
  PieChart,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Target,
  TrendingUp,
  Check,
  X,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function BudgetPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', target_amount: '' });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const now = new Date();
        const [catData, txData] = await Promise.all([
          api.getCategories(),
          api.getTransactions({
            startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
            endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
          }),
        ]);
        setCategories(catData || []);
        setTransactions(txData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const calculateSpending = (categoryId: string) => {
    return transactions
      .filter((t) => t.category_id === categoryId && t.charged_amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.charged_amount), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, {
          name: formData.name,
          target_amount: parseFloat(formData.target_amount) || undefined,
        });
      } else {
        await api.createCategory({
          name: formData.name,
          target_amount: parseFloat(formData.target_amount) || undefined,
        });
      }
      // Refresh
      const catData = await api.getCategories();
      setCategories(catData || []);
      setShowModal(false);
      setEditingCategory(null);
      setFormData({ name: '', target_amount: '' });
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      target_amount: category.target_amount?.toString() || '',
    });
    setShowModal(true);
  };

  const openNewModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', target_amount: '' });
    setShowModal(true);
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

  // Calculate totals
  const totalBudget = categories.reduce((sum, c) => sum + (c.target_amount || 0), 0);
  const totalSpent = categories.reduce((sum, c) => sum + calculateSpending(c.id), 0);
  const totalRemaining = totalBudget - totalSpent;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 mr-0 lg:mr-64">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">ניהול תקציב</h1>
              <p className="text-slate-500">הגדר יעדים וצפה בניצול</p>
            </div>
            <button
              onClick={openNewModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              <span>קטגוריה חדשה</span>
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-slate-500 text-sm">סה"כ תקציב</p>
              </div>
              <p className="text-2xl font-bold text-slate-800 ltr-number">
                ₪{totalBudget.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-slate-500 text-sm">הוצאות החודש</p>
              </div>
              <p className="text-2xl font-bold text-slate-800 ltr-number">
                ₪{totalSpent.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  totalRemaining >= 0 ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  {totalRemaining >= 0 ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <X className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <p className="text-slate-500 text-sm">יתרה</p>
              </div>
              <p className={`text-2xl font-bold ltr-number ${
                totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ₪{totalRemaining.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {/* Categories List */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">קטגוריות</h2>
            </div>

            {categories.length === 0 ? (
              <div className="text-center py-12">
                <PieChart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">אין קטגוריות</h3>
                <p className="text-slate-400 text-sm">הוסף קטגוריות להתחיל לנהל תקציב</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {categories.map((category) => {
                  const spent = calculateSpending(category.id);
                  const target = category.target_amount || 0;
                  const percentage = target > 0 ? (spent / target) * 100 : 0;
                  const isOverBudget = percentage > 100;

                  return (
                    <div key={category.id} className="p-6 hover:bg-slate-50 transition">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-slate-800">{category.name}</h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(category)}
                            className="p-2 text-slate-400 hover:text-slate-600 transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {target > 0 && (
                        <>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-slate-500 ltr-number">
                              ₪{spent.toLocaleString('he-IL', { maximumFractionDigits: 0 })} / ₪{target.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                            </span>
                            <span className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                              {percentage.toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all progress-bar ${
                                isOverBudget ? 'bg-red-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </>
                      )}

                      {!target && (
                        <p className="text-sm text-slate-400">
                          הוצאות: ₪{spent.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                {editingCategory ? 'עריכת קטגוריה' : 'קטגוריה חדשה'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    שם הקטגוריה
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="לדוגמה: מזון"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    יעד חודשי (אופציונלי)
                  </label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                      ₪
                    </span>
                    <input
                      type="number"
                      value={formData.target_amount}
                      onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                      className="w-full pr-8 pl-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition"
                  >
                    {editingCategory ? 'שמור' : 'הוסף'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingCategory(null);
                    }}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-medium rounded-xl hover:bg-slate-200 transition"
                  >
                    ביטול
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
