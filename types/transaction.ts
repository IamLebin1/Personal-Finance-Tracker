export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string; // ISO 8601 string
  note?: string;
  receiptUrl?: string;
  userId: string;
}

export type CreateTransactionInput = Omit<Transaction, 'id'>;
