'use client';

import { useEffect, useState } from 'react';
import { Account, api, CREDIT_CARD_TYPES } from '@/lib/supabase';
import { CreditCard, Building2, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

// Bank logos/colors mapping with logo URLs (using Clearbit Logo API)
const bankStyles: Record<string, { bg: string; text: string; name: string; logo?: string }> = {
  hapoalim: { 
    bg: 'bg-red-50', 
    text: 'text-red-600', 
    name: 'הפועלים',
    logo: 'https://logo.clearbit.com/bankhapoalim.co.il'
  },
  leumi: { 
    bg: 'bg-green-50', 
    text: 'text-green-600', 
    name: 'לאומי',
    logo: 'https://logo.clearbit.com/leumi.co.il'
  },
  discount: { 
    bg: 'bg-orange-50', 
    text: 'text-orange-600', 
    name: 'דיסקונט',
    logo: 'https://logo.clearbit.com/discountbank.co.il'
  },
  mizrahi: { 
    bg: 'bg-blue-50', 
    text: 'text-blue-600', 
    name: 'מזרחי-טפחות',
    logo: 'https://logo.clearbit.com/mizrahi-tefahot.co.il'
  },
  beinleumi: { 
    bg: 'bg-purple-50', 
    text: 'text-purple-600', 
    name: 'הבינלאומי',
    logo: 'https://logo.clearbit.com/fibi.co.il'
  },
  otsarHahayal: { 
    bg: 'bg-teal-50', 
    text: 'text-teal-600', 
    name: 'אוצר החייל',
    logo: 'https://logo.clearbit.com/bankotsar.co.il'
  },
  mercantile: { 
    bg: 'bg-cyan-50', 
    text: 'text-cyan-600', 
    name: 'מרכנתיל',
    logo: 'https://logo.clearbit.com/mercantile.co.il'
  },
  yahav: { 
    bg: 'bg-amber-50', 
    text: 'text-amber-600', 
    name: 'יהב',
    logo: 'https://logo.clearbit.com/bank-yahav.co.il'
  },
  massad: { 
    bg: 'bg-indigo-50', 
    text: 'text-indigo-600', 
    name: 'מסד',
    logo: 'https://logo.clearbit.com/bankmassad.co.il'
  },
  union: { 
    bg: 'bg-slate-100', 
    text: 'text-slate-600', 
    name: 'איגוד',
    logo: 'https://logo.clearbit.com/unionbank.co.il'
  },
  isracard: { 
    bg: 'bg-blue-50', 
    text: 'text-blue-800', 
    name: 'ישראכרט',
    logo: 'https://logo.clearbit.com/isracard.co.il'
  },
  amex: { 
    bg: 'bg-blue-50', 
    text: 'text-blue-900', 
    name: 'אמריקן אקספרס',
    logo: 'https://logo.clearbit.com/americanexpress.com'
  },
  max: { 
    bg: 'bg-rose-50', 
    text: 'text-rose-600', 
    name: 'מקס',
    logo: 'https://logo.clearbit.com/max.co.il'
  },
  visaCal: { 
    bg: 'bg-yellow-50', 
    text: 'text-yellow-600', 
    name: 'ויזה כאל',
    logo: 'https://logo.clearbit.com/cal-online.co.il'
  },
  default: { 
    bg: 'bg-slate-100', 
    text: 'text-slate-600', 
    name: 'חשבון' 
  },
};

// Fallback icon component when logo fails to load
function BankIcon({ bankType, size = 'normal' }: { bankType: string; size?: 'normal' | 'small' }) {
  const style = bankStyles[bankType] || bankStyles.default;
  const isCreditCard = CREDIT_CARD_TYPES.includes(bankType);
  const iconSize = size === 'small' ? 'w-5 h-5' : 'w-7 h-7';
  
  return isCreditCard ? (
    <CreditCard className={`${iconSize} ${style.text}`} />
  ) : (
    <Building2 className={`${iconSize} ${style.text}`} />
  );
}

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
                  <div className={`w-14 h-14 rounded-xl ${style.bg} flex items-center justify-center overflow-hidden`}>
                    {style.logo ? (
                      <img 
                        src={style.logo} 
                        alt={style.name}
                        className="w-10 h-10 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <Building2 className={`w-7 h-7 ${style.text} ${style.logo ? 'hidden' : ''}`} />
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
                    <div className={`w-10 h-10 rounded-lg ${style.bg} flex items-center justify-center overflow-hidden`}>
                      {style.logo ? (
                        <img 
                          src={style.logo} 
                          alt={style.name}
                          className="w-7 h-7 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <CreditCard className={`w-5 h-5 ${style.text} ${style.logo ? 'hidden' : ''}`} />
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
