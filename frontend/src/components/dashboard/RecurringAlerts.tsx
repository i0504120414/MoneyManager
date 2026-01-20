'use client';

import { useState } from 'react';
import { Recurring, api } from '@/lib/supabase';
import { AlertCircle, Check, X, RefreshCw, CreditCard, Calendar } from 'lucide-react';

interface RecurringAlertsProps {
  items: Recurring[];
  onRefresh: () => void;
}

export default function RecurringAlerts({ items, onRefresh }: RecurringAlertsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleConfirm = async (id: string, confirmed: boolean) => {
    setLoading(id);
    try {
      await api.confirmRecurring(id, confirmed);
      onRefresh();
    } catch (error) {
      console.error('Error confirming recurring:', error);
    } finally {
      setLoading(null);
    }
  };

  const typeLabels: Record<string, string> = {
    installment: 'תשלומים',
    direct_debit: 'הוראת קבע',
    detected: 'זוהה אוטומטית',
  };

  const typeIcons: Record<string, React.ReactNode> = {
    installment: <CreditCard className="w-4 h-4" />,
    direct_debit: <RefreshCw className="w-4 h-4" />,
    detected: <AlertCircle className="w-4 h-4" />,
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-5 h-5 text-amber-600" />
        <h3 className="font-semibold text-amber-800">הוצאות קבועות חדשות לאישור</h3>
        <span className="bg-amber-200 text-amber-800 text-xs px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </div>

      <div className="space-y-3">
        {items.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between bg-white rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                {typeIcons[item.type]}
              </div>
              <div>
                <p className="font-medium text-slate-700">{item.description}</p>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">
                    {typeLabels[item.type]}
                  </span>
                  {item.day_of_month && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      יום {item.day_of_month}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <p className="font-semibold text-slate-800 ltr-number">
                ₪{(item.amount_avg || 0).toLocaleString('he-IL', { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleConfirm(item.id, true)}
                  disabled={loading === item.id}
                  className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition disabled:opacity-50"
                  title="אשר"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleConfirm(item.id, false)}
                  disabled={loading === item.id}
                  className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                  title="דחה"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {items.length > 5 && (
        <p className="text-center text-amber-700 text-sm mt-3">
          +{items.length - 5} פריטים נוספים
        </p>
      )}
    </div>
  );
}
