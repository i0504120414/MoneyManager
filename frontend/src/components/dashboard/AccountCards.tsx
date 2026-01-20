'use client';

import { useEffect, useState } from 'react';
import { Account, api, CREDIT_CARD_TYPES } from '@/lib/supabase';
import { CreditCard, Building2, TrendingUp, TrendingDown, AlertCircle, Receipt, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

// Bank logos/colors mapping
const bankStyles: Record<string, { bg: string; text: string; name: string }> = {
  hapoalim: { bg: 'bg-red-500', text: 'text-white', name: 'הפועלים' },
  leumi: { bg: 'bg-green-600', text: 'text-white', name: 'לאומי' },
  discount: { bg: 'bg-orange-500', text: 'text-white', name: 'דיסקונט' },
  mizrahi: { bg: 'bg-blue-600', text: 'text-white', name: 'מזרחי-טפחות' },
  beinleumi: { bg: 'bg-purple-600', text: 'text-white', name: 'הבינלאומי' },
  otsarHahayal: { bg: 'bg-teal-600', text: 'text-white', name: 'אוצר החייל' },
  mercantile: { bg: 'bg-cyan-600', text: 'text-white', name: 'מרכנתיל' },
  yahav: { bg: 'bg-amber-600', text: 'text-white', name: 'יהב' },
  massad: { bg: 'bg-indigo-600', text: 'text-white', name: 'מסד' },
  union: { bg: 'bg-slate-700', text: 'text-white', name: 'איגוד' },
  isracard: { bg: 'bg-blue-800', text: 'text-white', name: 'ישראכרט' },
  amex: { bg: 'bg-blue-900', text: 'text-white', name: 'אמריקן אקספרס' },
  max: { bg: 'bg-rose-600', text: 'text-white', name: 'מקס' },
  visaCal: { bg: 'bg-yellow-500', text: 'text-slate-800', name: 'ויזה כאל' },
  default: { bg: 'bg-slate-500', text: 'text-white', name: 'חשבון' },
};

interface AccountCardsProps {
  accounts: Account[];
}

export default function AccountCards({ accounts }: AccountCardsProps) {
  const [creditCardCharges, setCreditCardCharges] = useState<Record<string, number>>({});

  // Separate banks from credit cards
  const bankAccounts = accounts.filter(acc => !CREDIT_CARD_TYPES.includes(acc.bank_type));
  const creditCardAccounts = accounts.filter(acc => CREDIT_CARD_TYPES.includes(acc.bank_type));

  useEffect(() => {
    const fetchCreditCardCharges = async () => {
      const charges: Record<string, number> = {};
      for (const account of creditCardAccounts) {
        try {
          const charge = await api.getCreditCardUpcomingCharges(account.id);
          charges[account.id] = charge;
        } catch (error) {
          console.error('Error fetching credit card charges:', error);
        }
      }
      setCreditCardCharges(charges);
    };

    if (creditCardAccounts.length > 0) {
      fetchCreditCardCharges();
    }
  }, [accounts]);

  // Calculate total credit card charges
  const totalCreditCardCharges = Object.values(creditCardCharges).reduce((sum, charge) => sum + charge, 0);

  if (accounts.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-600 mb-2">אין חשבונות מחוברים</h3>
        <p className="text-slate-400 text-sm">
          הוסף חשבון בנק או כרטיס אשראי דרך GitHub Actions
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bank Accounts - Large Cards */}
      {bankAccounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bankAccounts.map((account) => {
            const style = bankStyles[account.bank_type] || bankStyles.default;
            const balance = account.balance || 0;
            const isPositive = balance >= 0;

            return (
              <div
                key={account.id}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 card-hover"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-xl ${style.bg} flex items-center justify-center`}>
                    <Building2 className={`w-7 h-7 ${style.text}`} />
                  </div>
                  {account.status === 'error' && (
                    <div className="flex items-center gap-1 text-red-500 text-xs">
                      <AlertCircle className="w-4 h-4" />
                      <span>שגיאה</span>
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-slate-800">{style.name}</h3>
                {account.account_number && (
                  <p className="text-sm text-slate-500">חשבון: {account.account_number}</p>
                )}

                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">יתרה נוכחית</p>
                    <p
                      className={`text-3xl font-bold ltr-number ${
                        isPositive ? 'text-slate-800' : 'text-red-600'
                      }`}
                    >
                      ₪{balance.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${isPositive ? 'bg-green-50' : 'bg-red-50'}`}>
                    {isPositive ? (
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-4">
                  עודכן: {new Date(account.last_updated).toLocaleDateString('he-IL')}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Credit Cards - List inside one card */}
      {creditCardAccounts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">כרטיסי אשראי</h3>
                <p className="text-sm text-slate-500">{creditCardAccounts.length} כרטיסים</p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-xs text-slate-400">סה"כ חיוב קרוב</p>
              <p className="text-xl font-bold text-red-600 ltr-number">
                ₪{totalCreditCardCharges.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Credit Cards List */}
          <div className="divide-y divide-slate-100">
            {creditCardAccounts.map((account) => {
              const style = bankStyles[account.bank_type] || bankStyles.default;
              const charge = creditCardCharges[account.id] || 0;

              return (
                <div
                  key={account.id}
                  className="p-4 hover:bg-slate-50 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${style.bg} flex items-center justify-center`}>
                      <CreditCard className={`w-5 h-5 ${style.text}`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800">{style.name}</h4>
                      <p className="text-xs text-slate-400">
                        {account.account_number ? `**** ${account.account_number.slice(-4)}` : 'כרטיס אשראי'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <p className="text-xs text-slate-400">חיוב קרוב</p>
                      <p className="text-lg font-semibold text-red-600 ltr-number">
                        ₪{charge.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    {account.status === 'error' && (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
