'use client';

import { useMemo, useEffect, useState } from 'react';
import { Recurring, Account, api, CREDIT_CARD_TYPES } from '@/lib/supabase';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { addDays, format, startOfDay, eachDayOfInterval, parseISO, isSameDay } from 'date-fns';
import { he } from 'date-fns/locale';

interface BalanceChartProps {
  currentBalance: number;
  recurring: Recurring[];
  accounts: Account[];
}

// Credit card transaction with processed date
interface CreditCardTransaction {
  charged_amount: number;
  processed_date: string;
}

export default function BalanceChart({ currentBalance, recurring, accounts }: BalanceChartProps) {
  const [creditCardTransactions, setCreditCardTransactions] = useState<CreditCardTransaction[]>([]);

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
    const chargesByDate: Record<string, number> = {};
    creditCardTransactions.forEach(tx => {
      if (tx.processed_date) {
        const dateKey = format(startOfDay(parseISO(tx.processed_date)), 'yyyy-MM-dd');
        chargesByDate[dateKey] = (chargesByDate[dateKey] || 0) + Math.abs(tx.charged_amount || 0);
      }
    });

    // Get bank accounts (not credit cards) balance
    const bankAccounts = accounts.filter(acc => !CREDIT_CARD_TYPES.includes(acc.bank_type));
    let runningBalance = bankAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

    // Filter recurring that might be duplicates from credit card transactions
    // Credit card purchases are already included in the credit card transactions
    // So we only count recurring from bank accounts (direct debits, standing orders)
    const creditCardAccountIds = accounts
      .filter(acc => CREDIT_CARD_TYPES.includes(acc.bank_type))
      .map(acc => acc.id);
    
    const filteredRecurring = recurring.filter(r => 
      !creditCardAccountIds.includes(r.account_id)
    );

    return days.map((day) => {
      const dayOfMonth = day.getDate();
      const dateKey = format(day, 'yyyy-MM-dd');
      
      // Add credit card charges on their actual processed_date
      const dayCharge = chargesByDate[dateKey] || 0;
      if (dayCharge > 0) {
        runningBalance -= dayCharge;
      }
      
      // Check for recurring transactions on this day (only from bank accounts)
      filteredRecurring.forEach((item) => {
        if (item.day_of_month === dayOfMonth) {
          // Use the actual sign - negative means expense
          const amount = item.amount_avg || 0;
          if (amount < 0) {
            runningBalance += amount; // amount is already negative
          } else {
            runningBalance += amount; // income
          }
        }
      });

      return {
        date: format(day, 'dd/MM', { locale: he }),
        fullDate: format(day, 'EEEE, d בMMMM', { locale: he }),
        balance: Math.round(runningBalance),
        isToday: day.getTime() === today.getTime(),
      };
    });
  }, [currentBalance, recurring, accounts, creditCardTransactions]);

  const minBalance = Math.min(...chartData.map((d) => d.balance));
  const maxBalance = Math.max(...chartData.map((d) => d.balance));
  const yDomain = [
    Math.floor(minBalance * 0.9),
    Math.ceil(maxBalance * 1.1),
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-100">
          <p className="text-sm text-slate-500">{data.fullDate}</p>
          <p className="text-lg font-bold text-slate-800 ltr-number">
            ₪{data.balance.toLocaleString('he-IL')}
          </p>
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
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            domain={yDomain}
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}K`}
            orientation="right"
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="5 5" />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#balanceGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
