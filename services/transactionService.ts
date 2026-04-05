import type { Transaction } from '../types/transaction';
import { getTransactionsByUser } from '../db/sqlite';

export interface DashboardSummary {
  totalBalance: number;
  recentTransactions: Transaction[];
}

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const all = await getTransactionsByUser(userId);

  const totalBalance = all.reduce((acc, tx) => {
    return tx.type === 'income' ? acc + tx.amount : acc - tx.amount;
  }, 0);

  const recentTransactions = all.slice(0, 3);

  return {
    totalBalance,
    recentTransactions,
  };
}

export function formatCurrency(amount: number): string {
  return `$${Math.abs(amount).toFixed(2)}`;
}
