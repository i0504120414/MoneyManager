'use client';

import { Transaction } from '@/lib/supabase';
import { ArrowUpRight, ArrowDownRight, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import Link from 'next/link';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-600 mb-2">אין עסקאות</h3>
        <p className="text-slate-400 text-sm">העסקאות יופיעו כאן לאחר סנכרון</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-2">
        {transactions.map((transaction) => {
          const isIncome = transaction.charged_amount > 0;
          const amount = Math.abs(transaction.charged_amount);

          return (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isIncome ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  {isIncome ? (
                    <ArrowUpRight className="w-5 h-5 text-green-600" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-slate-700 line-clamp-1">
                    {transaction.description}
                  </p>
                  <p className="text-sm text-slate-400">
                    {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: he })}
                  </p>
                </div>
              </div>
              <div className="text-left">
                <p
                  className={`font-semibold ltr-number ${
                    isIncome ? 'text-green-600' : 'text-slate-800'
                  }`}
                >
                  {isIncome ? '+' : '-'}₪{amount.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                </p>
                {transaction.installment_number && transaction.installment_total && (
                  <p className="text-xs text-slate-400">
                    תשלום {transaction.installment_number}/{transaction.installment_total}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Link
        href="/transactions"
        className="block mt-4 text-center text-blue-600 hover:text-blue-700 text-sm font-medium"
      >
        צפה בכל העסקאות →
      </Link>
    </div>
  );
}
