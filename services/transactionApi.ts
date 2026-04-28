import { config } from '../config/appConfig';
import type { CreateTransactionInput, Transaction } from '../types/transaction';
import { getAuthSession } from './authSession';
import { clearTransactionCache } from './transactionService';

type TransactionUpdate = Partial<Omit<Transaction, 'id' | 'userId'>>;

function mapTransactionRow(row: any): Transaction {
  return {
    id: String(row.id),
    amount: Number(row.amount),
    type: row.type,
    category: row.category,
    date: row.date,
    note: row.note ?? '',
    receiptUrl: row.receiptUrl ?? '',
    userId: String(row.userId),
    walletId: row.walletId ? String(row.walletId) : undefined,
  };
}

function getAuthHeaders(): Record<string, string> {
  const session = getAuthSession();
  if (!session?.token) {
    throw new Error('Please log in first');
  }

  return {
    Authorization: `Bearer ${session.token}`,
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.toLowerCase().includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = payload?.message ?? `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

export async function getTransactionsByUser(_userId?: string, walletId?: string): Promise<Transaction[]> {
  let url = `${config.apiBaseUrl}/api/transactions`;
  if (walletId) {
    url += `?walletId=${encodeURIComponent(walletId)}`;
  }

  const response = await fetch(url, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  const rows = await parseResponse<any[]>(response);
  return rows.map(mapTransactionRow);
}

export async function insertTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const response = await fetch(`${config.apiBaseUrl}/api/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      amount: Number(input.amount),
      type: input.type,
      category: input.category,
      date: input.date,
      note: input.note ?? '',
      receiptUrl: input.receiptUrl ?? '',
      walletId: input.walletId,
    }),
  });

  const payload = await parseResponse<{ id: string }>(response);
  const session = getAuthSession();
  clearTransactionCache();

  return {
    ...input,
    id: payload.id,
    userId: session?.userId || input.userId,
  };
}

export async function updateTransaction(
  id: string,
  updates: TransactionUpdate,
  fallback?: Transaction,
): Promise<Transaction | null> {
  const next = {
    amount: Number(updates.amount ?? fallback?.amount ?? 0),
    type: updates.type ?? fallback?.type,
    category: updates.category ?? fallback?.category,
    date: updates.date ?? fallback?.date,
    note: updates.note ?? fallback?.note ?? '',
    receiptUrl: updates.receiptUrl ?? fallback?.receiptUrl ?? '',
    walletId: updates.walletId ?? fallback?.walletId,
  };

  if (!next.type || !next.category || !next.date || next.amount <= 0) {
    throw new Error('amount, type, category and date are required');
  }

  const response = await fetch(`${config.apiBaseUrl}/api/transactions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(next),
  });

  await parseResponse<{ affected: number }>(response);
  clearTransactionCache();

  if (!fallback) {
    return null;
  }

  return {
    ...fallback,
    ...updates,
    amount: next.amount,
    type: next.type,
    category: next.category,
    date: next.date,
    note: next.note,
    receiptUrl: next.receiptUrl,
  };
}

export async function deleteTransaction(id: string): Promise<void> {
  const response = await fetch(`${config.apiBaseUrl}/api/transactions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });

  await parseResponse<{ affected: number }>(response);
  clearTransactionCache();
}
