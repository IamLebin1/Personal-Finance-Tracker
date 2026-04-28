import type { Transaction } from '../types/transaction';
import { getTransactionsByUser } from './transactionApi';
import { formatCurrencyFromUsd } from './currencyService';

export interface DashboardSummary {
  totalBalance: number;
  recentTransactions: Transaction[];
}

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
}

export interface DaySpending {
  date: string;
  day: number;
  amount: number;
  income: number;
  expense: number;
}

let _transactionCache: {
  data: Transaction[];
  walletId?: string;
  timestamp: number;
} | null = null;

const CACHE_TTL = 3000; // 3 seconds

async function getCachedTransactions(walletId?: string): Promise<Transaction[]> {
  const now = Date.now();
  if (_transactionCache && _transactionCache.walletId === walletId && (now - _transactionCache.timestamp) < CACHE_TTL) {
    return _transactionCache.data;
  }
  
  const data = await getTransactionsByUser(undefined, walletId);
  _transactionCache = {
    data,
    walletId,
    timestamp: now
  };
  return data;
}

export function clearTransactionCache() {
  _transactionCache = null;
}

export async function getDashboardSummary(_userId?: string, walletId?: string): Promise<DashboardSummary> {
  const all = await getCachedTransactions(walletId);

  const totalBalance = all.reduce((acc, tx) => {
    return tx.type === 'income' ? acc + tx.amount : acc - tx.amount;
  }, 0);

  const recentTransactions = all.slice(0, 5);

  return {
    totalBalance,
    recentTransactions,
  };
}

export async function getSpendingByCategory(walletId?: string): Promise<CategorySpending[]> {
  const transactions = await getCachedTransactions(walletId);
  const expenses = transactions.filter(tx => tx.type === 'expense');
  
  const categoryMap = new Map<string, number>();
  
  expenses.forEach(tx => {
    const current = categoryMap.get(tx.category) || 0;
    categoryMap.set(tx.category, current + tx.amount);
  });
  
  const totalSpending = Array.from(categoryMap.values()).reduce((sum, val) => sum + val, 0);
  
  const result: CategorySpending[] = Array.from(categoryMap.entries()).map(([category, amount]) => ({
    category,
    amount,
    percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0,
  }));
  
  return result.sort((a, b) => b.amount - a.amount);
}

export async function getSpendingByDate(walletId?: string, monthDate?: Date): Promise<DaySpending[]> {
  const transactions = await getCachedTransactions(walletId);
  
  const targetDate = monthDate || new Date();
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  
  const dayMap = new Map<number, { income: number; expense: number }>();
  
  transactions.forEach(tx => {
    const date = new Date(tx.date);
    if (date.getFullYear() === year && date.getMonth() === month) {
      const day = date.getDate();
      const current = dayMap.get(day) || { income: 0, expense: 0 };
      if (tx.type === 'income') {
        current.income += tx.amount;
      } else if (tx.type === 'expense') {
        current.expense += tx.amount;
      }
      dayMap.set(day, current);
    }
  });
  
  const result: DaySpending[] = Array.from(dayMap.entries()).map(([day, stats]) => ({
    date: new Date(year, month, day).toISOString().split('T')[0],
    day,
    amount: stats.expense, // Keep for backward compatibility if needed
    income: stats.income,
    expense: stats.expense,
  }));
  
  return result.sort((a, b) => a.day - b.day);
}

export async function getWeeklySpending(walletId?: string): Promise<number> {
  const transactions = await getCachedTransactions(walletId);
  const expenses = transactions.filter(tx => tx.type === 'expense');
  
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  return expenses
    .filter(tx => new Date(tx.date) >= weekAgo && new Date(tx.date) <= now)
    .reduce((sum, tx) => sum + tx.amount, 0);
}

export async function getMonthlySpendingTrendPercent(walletId?: string, monthDate?: Date): Promise<number> {
  const transactions = await getCachedTransactions(walletId);
  const expenses = transactions.filter(tx => tx.type === 'expense');
  
  const targetDate = monthDate || new Date();
  const curYear = targetDate.getFullYear();
  const curMonth = targetDate.getMonth();
  
  const prevDate = new Date(curYear, curMonth - 1, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth();
  
  const currentTotal = expenses
    .filter(tx => {
      const d = new Date(tx.date);
      return d.getFullYear() === curYear && d.getMonth() === curMonth;
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  const prevTotal = expenses
    .filter(tx => {
      const d = new Date(tx.date);
      return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  if (prevTotal === 0) return currentTotal > 0 ? 100 : 0;
  return ((currentTotal - prevTotal) / prevTotal) * 100;
}

export function formatCurrency(amount: number, showSign: boolean = false): string {
  return formatCurrencyFromUsd(amount, { showSign });
}

export function formatTrendPercent(value: number): string {
  if (typeof value !== 'number' || isNaN(value)) return '0.0%';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}
