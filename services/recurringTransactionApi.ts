import { config } from '../config/appConfig';
import { getAuthSession } from './authSession';

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
export type RecurringTransactionType = 'income' | 'expense';

export interface RecurringTransaction {
  id: string;
  userId: string;
  walletId?: string;
  amount: number;
  type: RecurringTransactionType;
  category: string;
  note?: string;
  frequency: RecurringFrequency;
  intervalCount: number;
  nextRunDate: string;
  lastRunDate?: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringTransactionInput {
  amount: number;
  type: RecurringTransactionType;
  category: string;
  note?: string;
  frequency: RecurringFrequency;
  intervalCount?: number;
  nextRunDate: string;
  endDate?: string;
  walletId?: string;
  isActive?: boolean;
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
    const err: any = new Error(message);
    err.status = response.status;
    err.payload = payload;
    throw err;
  }

  return payload as T;
}

function mapRecurringRow(row: any): RecurringTransaction {
  return {
    id: String(row.id),
    userId: String(row.userId),
    walletId: row.walletId ? String(row.walletId) : undefined,
    amount: Number(row.amount),
    type: row.type,
    category: row.category,
    note: row.note ?? '',
    frequency: row.frequency,
    intervalCount: Number(row.intervalCount ?? 1),
    nextRunDate: row.nextRunDate,
    lastRunDate: row.lastRunDate ?? undefined,
    endDate: row.endDate ?? undefined,
    isActive: Boolean(row.isActive),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getRecurringTransactions(): Promise<RecurringTransaction[]> {
  const response = await fetch(`${config.apiBaseUrl}/api/recurring-transactions`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  const rows = await parseResponse<any[]>(response);
  return rows.map(mapRecurringRow);
}

export async function createRecurringTransaction(input: RecurringTransactionInput): Promise<RecurringTransaction> {
  const response = await fetch(`${config.apiBaseUrl}/api/recurring-transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      amount: Number(input.amount),
      type: input.type,
      category: input.category,
      note: input.note ?? '',
      frequency: input.frequency,
      intervalCount: input.intervalCount ?? 1,
      nextRunDate: input.nextRunDate,
      endDate: input.endDate,
      walletId: input.walletId,
      isActive: input.isActive ?? true,
    }),
  });

  const payload = await parseResponse<{ id: number | string }>(response);
  const session = getAuthSession();

  return {
    id: String(payload.id),
    userId: String(session?.userId || ''),
    walletId: input.walletId,
    amount: Number(input.amount),
    type: input.type,
    category: input.category,
    note: input.note ?? '',
    frequency: input.frequency,
    intervalCount: input.intervalCount ?? 1,
    nextRunDate: input.nextRunDate,
    lastRunDate: undefined,
    endDate: input.endDate,
    isActive: input.isActive ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function updateRecurringTransaction(id: string, input: RecurringTransactionInput): Promise<void> {
  const response = await fetch(`${config.apiBaseUrl}/api/recurring-transactions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      amount: Number(input.amount),
      type: input.type,
      category: input.category,
      note: input.note ?? '',
      frequency: input.frequency,
      intervalCount: input.intervalCount ?? 1,
      nextRunDate: input.nextRunDate,
      endDate: input.endDate,
      walletId: input.walletId,
      isActive: input.isActive ?? true,
    }),
  });

  await parseResponse<{ ok: boolean }>(response);
}

export async function deleteRecurringTransaction(id: string): Promise<void> {
  const response = await fetch(`${config.apiBaseUrl}/api/recurring-transactions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });

  await parseResponse<{ ok: boolean }>(response);
  clearTransactionCache();
}

export async function syncRecurringTransactions(): Promise<number> {
  const response = await fetch(`${config.apiBaseUrl}/api/recurring-transactions/sync`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
  });

  const payload = await parseResponse<{ generated?: number }>(response);
  return payload.generated ?? 0;
}