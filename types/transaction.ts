export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Wallet {
  id: string;
  name: string;
  userId: string;
  color: string;
  icon: string;
  initialBalance?: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string; // ISO 8601 string
  note?: string;
  receiptUrl?: string;
  userId: string;
  walletId?: string;
  destinationWalletId?: string; // For transfers
}

export type CreateTransactionInput = Omit<Transaction, 'id'>;
