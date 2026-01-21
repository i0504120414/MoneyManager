'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { api, RecurringItem } from '@/lib/supabase';
import { useRecurring } from '@/lib/hooks';
import Sidebar from '@/components/layout/Sidebar';
import {
  RefreshCcw,
  Check,
  X,
  Loader2,
  Calendar,
  AlertCircle,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export default function RecurringPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const { recurring, isLoading: loading, refresh: refreshRecurring } = useRecurring();
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed'>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleConfirm = async (id: string) => {
    try {
      await api.confirmRecurring(id, true);
      refreshRecurring();
    } catch (error) {
      console.error('Error confirming recurring:', error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.deleteRecurring(id);
      refreshRecurring();
    } catch (error) {
      console.error('Error deleting recurring:', error);
    }
  };

  const filteredRecurring = recurring.filter((r) => {
    if (filter === 'pending') return !r.is_confirmed && r.type !== 'installment';
    if (filter === 'confirmed') return r.is_confirmed || r.type === 'installment';
    return true;
  });

  // Only count non-installment recurring as pending (installments are auto-approved)
  const pendingCount = recurring.filter((r) => !r.is_confirmed && r.type !== 'installment').length;
  
  // Calculate remaining installments for each installment
  const calculateRemainingInstallments = (item: RecurringItem) => {
    if (item.type !== 'installment' || !item.installment_total || !item.first_detected_date) {
      return null;
    }
    const firstDate = new Date(item.first_detected_date);
    const now = new Date();
    const monthsPassed = (now.getFullYear() - firstDate.getFullYear()) * 12 + 
                         (now.getMonth() - firstDate.getMonth());
    const startInstallment = item.installment_current || 1;
    const remaining = item.installment_total - startInstallment - monthsPassed;
    return Math.max(0, remaining);
  };
  
  // Check if installment is still active for next month
  const isInstallmentActive = (item: RecurringItem) => {
    const remaining = calculateRemainingInstallments(item);
    return remaining !== null && remaining > 0;
  };
  
  const totalIncome = recurring
    .filter((r) => r.is_confirmed && (r.average_amount || r.amount_avg || 0) > 0)
    .reduce((sum, r) => sum + (r.average_amount || r.amount_avg || 0), 0);
  const totalExpenses = recurring
    .filter((r) => r.is_confirmed && (r.average_amount || r.amount_avg || 0) < 0)
    .reduce((sum, r) => sum + Math.abs(r.average_amount || r.amount_avg || 0), 0);

  if (authLoading || (loading && recurring.length === 0)) {
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
          <div>
            <h1 className="text-2xl font-bold text-slate-800">תשלומים קבועים</h1>
            <p className="text-slate-500">ניהול הכנסות והוצאות חוזרות</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-slate-500 text-sm">ממתינים לאישור</p>
              </div>
              <p className="text-2xl font-bold text-slate-800">{pendingCount}</p>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                  <ArrowUpCircle className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-slate-500 text-sm">הכנסות חודשיות</p>
              </div>
              <p className="text-2xl font-bold text-green-600 ltr-number">
                ₪{totalIncome.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <ArrowDownCircle className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-slate-500 text-sm">הוצאות חודשיות</p>
              </div>
              <p className="text-2xl font-bold text-red-600 ltr-number">
                ₪{totalExpenses.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="bg-white rounded-2xl shadow-sm p-2 flex gap-2">
            {[
              { value: 'all', label: 'הכל' },
              { value: 'pending', label: 'ממתינים' },
              { value: 'confirmed', label: 'מאושרים' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value as typeof filter)}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition ${
                  filter === tab.value
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
                {tab.value === 'pending' && pendingCount > 0 && (
                  <span className="mr-2 px-2 py-0.5 text-xs rounded-full bg-red-500 text-white">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Recurring List */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {filteredRecurring.length === 0 ? (
              <div className="text-center py-12">
                <RefreshCcw className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">
                  {filter === 'pending' ? 'אין פריטים ממתינים' : 'אין תשלומים קבועים'}
                </h3>
                <p className="text-slate-400 text-sm">
                  המערכת מזהה אוטומטית תשלומים חוזרים
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredRecurring.map((item) => {
                  const remainingInstallments = calculateRemainingInstallments(item);
                  const isActive = item.type === 'installment' ? isInstallmentActive(item) : item.is_confirmed;
                  const needsApproval = !item.is_confirmed && item.type !== 'installment';
                  const amount = item.average_amount ?? item.amount_avg ?? 0;
                  
                  return (
                  <div key={item.id} className={`p-5 hover:bg-slate-50 transition ${!isActive ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          amount >= 0 ? 'bg-green-50' : 'bg-red-50'
                        }`}>
                          {amount >= 0 ? (
                            <ArrowUpCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <ArrowDownCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-800">{item.description}</h3>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {item.expected_day && (
                              <span className="text-sm text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                יום {item.expected_day} בחודש
                              </span>
                            )}
                            {item.type === 'installment' && remainingInstallments !== null && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                remainingInstallments > 0 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-slate-100 text-slate-500'
                              }`}>
                                {remainingInstallments > 0 
                                  ? `נותרו ${remainingInstallments} תשלומים` 
                                  : 'הסתיים'}
                              </span>
                            )}
                            {item.type === 'installment' && (
                              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                                תשלומים
                              </span>
                            )}
                            {item.type === 'direct_debit' && (
                              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                הוראת קבע
                              </span>
                            )}
                            {needsApproval && (
                              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                                ממתין לאישור
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <p className={`text-lg font-bold ltr-number ${
                          amount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {amount >= 0 ? '+' : ''}
                          ₪{Math.abs(amount).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                        </p>

                        {needsApproval && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleConfirm(item.id)}
                              className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition"
                              title="אשר"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(item.id)}
                              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                              title="דחה"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-sm text-blue-700">
              <strong>איך זה עובד?</strong> המערכת מזהה אוטומטית תשלומים שחוזרים על עצמם. 
              תשלומים (חיובים בתשלומים) מאושרים אוטומטית והמערכת מחשבת כמה תשלומים נותרו.
              הוראות קבע ותשלומים שזוהו אלגוריתמית דורשים אישור ידני.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
