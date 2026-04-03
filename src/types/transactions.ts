export type TransactionType = 'expense' | 'income';

export type TransactionRecord = {
  id: string;
  userId: string;
  amount: number;
  category: string;
  note: string;
  type: TransactionType;
  occurredOn: string;
  createdAt: number;
  updatedAt: number;
};

export type TransactionDraft = {
  amount: number;
  category: string;
  note: string;
  type: TransactionType;
  occurredOn: string;
};

export type CategorySummary = {
  category: string;
  total: number;
  count: number;
};