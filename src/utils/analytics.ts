import type {
  CategorySummary,
  TransactionRecord,
} from '../types/transactions';

export const groupSpendingByCategory = (
  transactions: TransactionRecord[],
): CategorySummary[] => {
  const totals = new Map<string, { total: number; count: number }>();

  transactions
    .filter(transaction => transaction.type === 'expense')
    .forEach(transaction => {
      const current = totals.get(transaction.category) ?? { total: 0, count: 0 };
      totals.set(transaction.category, {
        total: current.total + Number(transaction.amount || 0),
        count: current.count + 1,
      });
    });

  return Array.from(totals.entries())
    .map(([category, value]) => ({
      category,
      total: value.total,
      count: value.count,
    }))
    .sort((left, right) => right.total - left.total);
};