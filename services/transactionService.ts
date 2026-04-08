import type { Transaction } from '../types/transaction';
import { getTransactionsByUser } from './transactionApi';

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
}

export async function getDashboardSummary(_userId?: string): Promise<DashboardSummary> {
  const all = await getTransactionsByUser();

  const totalBalance = all.reduce((acc, tx) => {
    return tx.type === 'income' ? acc + tx.amount : acc - tx.amount;
  }, 0);

  const recentTransactions = all.slice(0, 3);

  return {
    totalBalance,
    recentTransactions,
  };
}

export async function getSpendingByCategory(_userId?: string): Promise<CategorySpending[]> {
  const transactions = await getTransactionsByUser();
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

export async function getSpendingByDate(_userId?: string, monthDate?: Date): Promise<DaySpending[]> {
  const transactions = await getTransactionsByUser();
  const expenses = transactions.filter(tx => tx.type === 'expense');
  
  const targetDate = monthDate || new Date();
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  
  const dayMap = new Map<number, number>();
  
  expenses.forEach(tx => {
    const date = new Date(tx.date);
    if (date.getFullYear() === year && date.getMonth() === month) {
      const day = date.getDate();
      const current = dayMap.get(day) || 0;
      dayMap.set(day, current + tx.amount);
    }
  });
  
  const result: DaySpending[] = Array.from(dayMap.entries()).map(([day, amount]) => ({
    date: new Date(year, month, day).toISOString().split('T')[0],
    day,
    amount,
  }));
  
  return result.sort((a, b) => a.day - b.day);
}

export async function getWeeklySpending(_userId?: string): Promise<number> {
  const transactions = await getTransactionsByUser();
  const expenses = transactions.filter(tx => tx.type === 'expense');
  
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  return expenses
    .filter(tx => new Date(tx.date) >= weekAgo && new Date(tx.date) <= now)
    .reduce((sum, tx) => sum + tx.amount, 0);
}

export async function getMonthlySpendingTrend(_userId?: string, monthDate?: Date): Promise<number> {
  const transactions = await getTransactionsByUser();
  const expenses = transactions.filter(tx => tx.type === 'expense');
  
  const targetDate = monthDate || new Date();
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  
  return expenses
    .filter(tx => {
      const date = new Date(tx.date);
      return date.getFullYear() === year && date.getMonth() === month;
    })
    .reduce((sum, tx) => sum + tx.amount, 0);
}

export function formatCurrency(amount: number): string {
  return `$${Math.abs(amount).toFixed(2)}`;
}
