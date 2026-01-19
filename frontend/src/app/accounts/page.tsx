'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { api, Account } from '@/lib/supabase';
import Sidebar from '@/components/layout/Sidebar';
import {
  Building2,
  CreditCard,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

export default function AccountsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const accountsData = await api.getAccounts();
        setAccounts(accountsData || []);
      } catch (error) {
        console.error('Error fetching accounts:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 text-green-700';
      case 'error':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-yellow-50 text-yellow-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'פעיל';
      case 'error':
        return 'שגיאה';
      default:
        return 'ממתין';
    }
  };

  const getBankDisplayName = (bankName: string) => {
    const banks: Record<string, string> = {
      hapoalim: 'בנק הפועלים',
      leumi: 'בנק לאומי',
      discount: 'בנק דיסקונט',
      mizrahi: 'מזרחי טפחות',
      isracard: 'ישראכרט',
      cal: 'כאל',
      max: 'מקס',
      visa: 'ויזה',
      amex: 'אמריקן אקספרס',
      behatsdaa: 'בהצדעה',
    };
    return banks[bankName] || bankName;
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">חשבונות מחוברים</h1>
              <p className="text-slate-500">ניהול חשבונות בנק וכרטיסי אשראי</p>
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 mb-1">סה"כ יתרה</p>
                <p className="text-3xl font-bold ltr-number">
                  ₪{totalBalance.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Building2 className="w-7 h-7" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-sm text-blue-100">
                {accounts.length} חשבונות מחוברים
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-700 font-medium">הוספת חשבונות</p>
                <p className="text-sm text-amber-600 mt-1">
                  כדי להוסיף חשבון חדש, הרץ את הפעולה Add Account ב-GitHub Actions עם פרטי ההתחברות המתאימים.
                </p>
              </div>
            </div>
          </div>

          {/* Accounts List */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">חשבונות</h2>
            </div>

            {accounts.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">אין חשבונות</h3>
                <p className="text-slate-400 text-sm">הוסף חשבון בנק או כרטיס אשראי להתחיל</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {accounts.map((account) => (
                  <div key={account.id} className="p-6 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-slate-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-800">
                            {getBankDisplayName(account.bank_name)}
                          </h3>
                          {account.account_number && (
                            <p className="text-sm text-slate-500 ltr-number">
                              חשבון: ****{account.account_number.slice(-4)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-left">
                        <p className={`text-xl font-bold ltr-number ${
                          (account.current_balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ₪{(account.current_balance || 0).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                        </p>
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(account.status)}`}>
                          {getStatusIcon(account.status)}
                          <span>{getStatusText(account.status)}</span>
                        </div>
                      </div>
                    </div>

                    {account.last_sync && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>
                          עודכן לאחרונה {formatDistanceToNow(new Date(account.last_sync), { addSuffix: true, locale: he })}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sync Info */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-800 mb-1">סנכרון אוטומטי</h3>
                <p className="text-sm text-slate-500">
                  החשבונות מסונכרנים אוטומטית פעם ביום באמצעות GitHub Actions.
                  הסנכרון שואב עסקאות חדשות מכל החשבונות המחוברים.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
