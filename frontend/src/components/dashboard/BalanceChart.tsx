'use client';

import { useMemo, useEffect, useState } from 'react';
import { Recurring, Account, api, CREDIT_CARD_TYPES } from '@/lib/supabase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { addDays, format, startOfDay, eachDayOfInterval, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { ArrowDown, ArrowUp, CreditCard, Calendar, AlertTriangle } from 'lucide-react';

interface BalanceChartProps {
  currentBalance: number;
  recurring: Recurring[];
  accounts: Account[];
}

// Credit card transaction with processed date
interface CreditCardTransaction {
  charged_amount: number;
  processed_date: string;
  description?: string;
}

interface DayChange {
  type: 'credit_card' | 'recurring_expense' | 'recurring_income';
  description: string;
  amount: number;
}

interface ChartDataPoint {
  date: string;
  fullDate: string;
  dayOfWeek: string;
  balance: number;
  isToday: boolean;
  changes: DayChange[];
}

export default function BalanceChart({ currentBalance, recurring, accounts }: BalanceChartProps) {
  const [creditCardTransactions, setCreditCardTransactions] = useState<CreditCardTransaction[]>([]);
  const [selectedDay, setSelectedDay] = useState<ChartDataPoint | null>(null);

  // Fetch credit card transactions with their actual processed dates
  useEffect(() => {
    const fetchTransactions = async () => {
      const allTransactions: CreditCardTransaction[] = [];
      const creditCards = accounts.filter(acc => CREDIT_CARD_TYPES.includes(acc.bank_type));
      
      for (const card of creditCards) {
        try {
          const transactions = await api.getCreditCardTransactionsWithProcessedDate(card.id);
          allTransactions.push(...transactions);
        } catch (error) {
          console.error('Error fetching credit card transactions:', error);
        }
      }
      setCreditCardTransactions(allTransactions);
    };

    if (accounts.length > 0) {
      fetchTransactions();
    }
  }, [accounts]);

  const chartData = useMemo(() => {
    const today = startOfDay(new Date());
    const endDate = addDays(today, 30);
    const days = eachDayOfInterval({ start: today, end: endDate });

    // Group credit card transactions by their processed_date
    const chargesByDate: Record<string, { total: number; items: DayChange[] }> = {};
    creditCardTransactions.forEach(tx => {
      if (tx.processed_date) {
        const dateKey = format(startOfDay(parseISO(tx.processed_date)), 'yyyy-MM-dd');
        if (!chargesByDate[dateKey]) {
          chargesByDate[dateKey] = { total: 0, items: [] };
        }
        const amount = Math.abs(tx.charged_amount || 0);
        chargesByDate[dateKey].total += amount;
        chargesByDate[dateKey].items.push({
          type: 'credit_card',
          description: tx.description || 'חיוב כרטיס אשראי',
          amount: -amount,
        });
      }
    });

    // Get bank accounts (not credit cards) balance
    const bankAccounts = accounts.filter(acc => !CREDIT_CARD_TYPES.includes(acc.bank_type));
    let runningBalance = bankAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

    // Filter recurring - include all confirmed recurring items
    const creditCardAccountIds = accounts
      .filter(acc => CREDIT_CARD_TYPES.includes(acc.bank_type))
      .map(acc => acc.id);
    
    // Include both bank recurring AND credit card recurring that are confirmed
    const allRecurring = recurring;

    return days.map((day): ChartDataPoint => {
      const dayOfMonth = day.getDate();
      const dateKey = format(day, 'yyyy-MM-dd');
      const changes: DayChange[] = [];
      
      // Add credit card charges on their actual processed_date
      const dayChargeData = chargesByDate[dateKey];
      if (dayChargeData && dayChargeData.total > 0) {
        runningBalance -= dayChargeData.total;
        changes.push(...dayChargeData.items);
      }
      
      // Check for recurring transactions on this day
      allRecurring.forEach((item) => {
        if (item.day_of_month === dayOfMonth) {
          const amount = item.amount_avg || 0;
          runningBalance += amount;
          
          changes.push({
            type: amount < 0 ? 'recurring_expense' : 'recurring_income',
            description: item.description || 'תשלום קבוע',
            amount: amount,
          });
        }
      });

      return {
        date: format(day, 'dd/MM', { locale: he }),
        fullDate: format(day, 'EEEE, d בMMMM', { locale: he }),
        dayOfWeek: format(day, 'EEE', { locale: he }),
        balance: Math.round(runningBalance),
        isToday: day.getTime() === today.getTime(),
        changes,
      };
    });
  }, [currentBalance, recurring, accounts, creditCardTransactions]);

  const minBalance = Math.min(...chartData.map((d) => d.balance), 0);
  const maxBalance = Math.max(...chartData.map((d) => d.balance));
  const yDomain = [
    Math.floor(minBalance * 1.1),
    Math.ceil(maxBalance * 1.1),
  ];

  // Find days with changes for the detail panel
  const daysWithChanges = chartData.filter(d => d.changes.length > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataPoint;
      const isNegative = data.balance < 0;
      
      return (
        <div className={`p-3 rounded-lg shadow-lg border ${isNegative ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
          <p className="text-sm text-slate-500">{data.fullDate}</p>
          <p className={`text-lg font-bold ltr-number ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
            ₪{data.balance.toLocaleString('he-IL')}
          </p>
          {data.changes.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-200 text-xs">
              <p className="text-slate-500 mb-1">{data.changes.length} שינויים ביום זה</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Show chart if there are accounts or recurring items
  const hasData = accounts.length > 0 || recurring.length > 0;
  
  if (!hasData) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        <p>אין מספיק נתונים להצגת תחזית</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bar Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            onClick={(data) => {
              if (data && data.activePayload) {
                setSelectedDay(data.activePayload[0].payload);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              interval={2}
            />
            <YAxis
              domain={yDomain}
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`}
              orientation="right"
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#ef4444" strokeWidth={2} />
            <Bar dataKey="balance" radius={[4, 4, 0, 0]} cursor="pointer">
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.balance >= 0 ? '#22c55e' : '#ef4444'}
                  opacity={entry.isToday ? 1 : 0.8}
                  stroke={entry.isToday ? '#000' : 'none'}
                  strokeWidth={entry.isToday ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span>יתרה חיובית</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded" />
          <span>יתרה שלילית</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 border-2 border-black rounded bg-green-500" />
          <span>היום</span>
        </div>
      </div>

      {/* Changes Detail Panel */}
      {daysWithChanges.length > 0 && (
        <div className="bg-slate-50 rounded-xl p-4">
          <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            שינויים צפויים
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {daysWithChanges.slice(0, 10).map((day, dayIndex) => (
              <div key={dayIndex} className="bg-white rounded-lg p-3 border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-600">{day.fullDate}</span>
                  <span className={`text-xs font-bold ltr-number ${day.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    יתרה: ₪{day.balance.toLocaleString('he-IL')}
                  </span>
                </div>
                <div className="space-y-1">
                  {day.changes.map((change, changeIndex) => (
                    <div key={changeIndex} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {change.type === 'credit_card' ? (
                          <CreditCard className="w-3 h-3 text-purple-500" />
                        ) : change.amount < 0 ? (
                          <ArrowDown className="w-3 h-3 text-red-500" />
                        ) : (
                          <ArrowUp className="w-3 h-3 text-green-500" />
                        )}
                        <span className="text-slate-600 truncate max-w-[150px]">{change.description}</span>
                      </div>
                      <span className={`font-medium ltr-number ${change.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {change.amount >= 0 ? '+' : ''}₪{change.amount.toLocaleString('he-IL')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning for negative balance */}
      {chartData.some(d => d.balance < 0) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-red-700">התראה: יתרה שלילית צפויה</h4>
            <p className="text-xs text-red-600 mt-1">
              לפי התחזית, היתרה שלך עלולה לרדת מתחת לאפס. בדוק את ההוצאות הקרובות.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
