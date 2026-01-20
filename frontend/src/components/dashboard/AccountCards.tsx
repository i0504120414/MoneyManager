'use client';

import { useEffect, useState } from 'react';
import { Account, api, CREDIT_CARD_TYPES } from '@/lib/supabase';
import { CreditCard, TrendingUp, TrendingDown, AlertCircle, Receipt } from 'lucide-react';

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

  useEffect(() => {
    const fetchCreditCardCharges = async () => {
      const charges: Record<string, number> = {};
      for (const account of accounts) {
        if (CREDIT_CARD_TYPES.includes(account.bank_type)) {
          try {
            const charge = await api.getCreditCardUpcomingCharges(account.id);
            charges[account.id] = charge;
          } catch (error) {
            console.error('Error fetching credit card charges:', error);
          }
        }
      }
      setCreditCardCharges(charges);
    };

    if (accounts.length > 0) {
      fetchCreditCardCharges();
    }
  }, [accounts]);

  if (accounts.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
        <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-600 mb-2">אין חשבונות מחוברים</h3>
        <p className="text-slate-400 text-sm">
          הוסף חשבון בנק או כרטיס אשראי דרך GitHub Actions
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {accounts.map((account) => {
        const style = bankStyles[account.bank_type] || bankStyles.default;
        const isCreditCard = CREDIT_CARD_TYPES.includes(account.bank_type);
        const displayAmount = isCreditCard 
          ? -(creditCardCharges[account.id] || 0) // Show as negative (charge)
          : (account.balance || 0);
        const isPositive = displayAmount >= 0;

        return (
          <div
            key={account.id}
            className="bg-white rounded-2xl p-5 shadow-sm card-hover border border-slate-100"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl ${style.bg} flex items-center justify-center`}>
                <CreditCard className={`w-6 h-6 ${style.text}`} />
              </div>
              {account.status === 'error' && (
                <div className="flex items-center gap-1 text-red-500 text-xs">
                  <AlertCircle className="w-4 h-4" />
                  <span>שגיאה</span>
                </div>
              )}
            </div>

            <h3 className="font-medium text-slate-800">{style.name}</h3>
            {account.description && (
              <p className="text-sm text-slate-500 truncate">{account.description}</p>
            )}

            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-xs text-slate-400">
                  {isCreditCard ? 'חיוב קרוב' : 'יתרה נוכחית'}
                </p>
                <p
                  className={`text-2xl font-bold ltr-number ${
                    isPositive ? 'text-slate-800' : 'text-red-600'
                  }`}
                >
                  ₪{Math.abs(displayAmount).toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${isCreditCard ? 'bg-purple-50' : isPositive ? 'bg-green-50' : 'bg-red-50'}`}>
                {isCreditCard ? (
                  <Receipt className="w-5 h-5 text-purple-600" />
                ) : isPositive ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-3">
              עודכן: {new Date(account.last_updated).toLocaleDateString('he-IL')}
            </p>
          </div>
        );
      })}
    </div>
  );
}
