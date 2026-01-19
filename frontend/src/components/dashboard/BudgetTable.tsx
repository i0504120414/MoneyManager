'use client';

import { useMemo } from 'react';
import { Category, Transaction } from '@/lib/supabase';
import { Target, TrendingUp } from 'lucide-react';

interface BudgetTableProps {
  categories: Category[];
  transactions: Transaction[];
}

export default function BudgetTable({ categories, transactions }: BudgetTableProps) {
  const budgetData = useMemo(() => {
    // Get current month transactions
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthTransactions = transactions.filter((t) => 
      new Date(t.date) >= startOfMonth
    );

    // Calculate actual spending per category
    const spending: Record<string, number> = {};
    monthTransactions.forEach((t) => {
      if (t.category_id && t.charged_amount < 0) {
        spending[t.category_id] = (spending[t.category_id] || 0) + Math.abs(t.charged_amount);
      }
    });

    // Map categories with their spending
    return categories
      .filter((c) => c.target_amount && c.target_amount > 0)
      .map((category) => {
        const actual = spending[category.id] || 0;
        const target = category.target_amount || 0;
        const percentage = target > 0 ? (actual / target) * 100 : 0;
        
        return {
          id: category.id,
          name: category.name,
          actual,
          target,
          percentage: Math.min(percentage, 100),
          isOverBudget: percentage > 100,
          remaining: Math.max(target - actual, 0),
        };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }, [categories, transactions]);

  if (budgetData.length === 0) {
    return (
      <div className="text-center py-8">
        <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-600 mb-2">אין יעדי תקציב</h3>
        <p className="text-slate-400 text-sm">הגדר קטגוריות עם יעדי תקציב להצגת ניצול</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-clean">
        <thead>
          <tr className="text-slate-500 text-sm">
            <th className="text-right font-medium pb-4">קטגוריה</th>
            <th className="text-center font-medium pb-4">ניצול</th>
            <th className="text-left font-medium pb-4">יתרה</th>
          </tr>
        </thead>
        <tbody>
          {budgetData.map((item) => (
            <tr key={item.id} className="group">
              <td className="py-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      item.isOverBudget ? 'bg-red-500' : 'bg-green-500'
                    }`}
                  />
                  <span className="font-medium text-slate-700">{item.name}</span>
                </div>
              </td>
              <td className="py-3">
                <div className="max-w-[200px] mx-auto">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-500 ltr-number">
                      ₪{item.actual.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-slate-400 ltr-number">
                      ₪{item.target.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all progress-bar ${
                        item.isOverBudget ? 'bg-red-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="py-3 text-left">
                <span
                  className={`font-medium ltr-number ${
                    item.isOverBudget ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {item.isOverBudget ? 'חריגה!' : `₪${item.remaining.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
