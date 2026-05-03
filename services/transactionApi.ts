import { config } from '../config/appConfig';
import type { CreateTransactionInput, Transaction } from '../types/transaction';
import { getAuthSession } from './authSession';
import { clearTransactionCache } from './transactionService';
import { syncRecurringTransactions } from './recurringTransactionApi';
import { setSyncing, setPendingCount } from './syncService';
import {
  addPendingTransactionChange,
  getPendingTransactionChanges,
  insertTransaction as insertTransactionLocal,
  getAllTransactions,
  getTransactionsByUser as getTransactionsByUserLocal,
  removePendingTransactionChange,
  replaceTransactionIdReferences,
  updateTransaction as updateTransactionLocal,
  deleteTransaction as deleteTransactionLocal,
} from '../db/sqlite';

type TransactionUpdate = Partial<Omit<Transaction, 'id' | 'userId'>>;

let syncTimer: ReturnType<typeof setInterval> | null = null;
let isSyncInProgress = false;

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
    destinationWalletId: row.destinationWalletId ? String(row.destinationWalletId) : undefined,
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
    const err: any = new Error(message);
    // attach status so callers can react to auth errors (401)
    err.status = response.status;
    err.payload = payload;
    throw err;
  }

  return payload as T;
}

function getUserIdForFallback(explicitUserId?: string): string {
  if (explicitUserId) {
    return explicitUserId;
  }

  const session = getAuthSession();
  return session?.userId ?? '';
}

function isNetworkError(error: unknown): boolean {
  const message = String((error as any)?.message ?? '').toLowerCase();
  return message.includes('network request failed') || message.includes('failed to fetch');
}

function mergeLocalAndServerTransactions(localRows: Transaction[], serverRows: Transaction[], 
     pendingChanges: Array<{ operationType: string; transactionId: string }>): Transaction[] {
  const merged = new Map<string, Transaction>();
  const deletedIds = new Set(
    pendingChanges
      .filter(change => change.operationType === 'delete')
      .map(change => String(change.transactionId)),
  );

  for (const row of serverRows) {
    if (!deletedIds.has(String(row.id))) {
      merged.set(String(row.id), row);
    }
  }

  for (const row of localRows) {
    merged.set(String(row.id), row);
  }

  return Array.from(merged.values()).sort((left, right) => right.date.localeCompare(left.date));
}

export async function syncPendingTransactions(): Promise<void> {
  if (isSyncInProgress) {
    return;
  }

  const session = getAuthSession();
  if (!session?.token) {
    return;
  }

  isSyncInProgress = true;
  setSyncing(true);
  try {
    const pending = await getPendingTransactionChanges();
    setPendingCount(pending.length);
    for (const change of pending) {
      const payload = JSON.parse(change.payload || '{}');

      try {
        if (change.operationType === 'create') {
          const response = await fetch(`${config.apiBaseUrl}/api/transactions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              amount: Number(payload.amount),
              type: payload.type,
              category: payload.category,
              date: payload.date,
              note: payload.note ?? '',
              receiptUrl: payload.receiptUrl ?? '',
              walletId: payload.walletId,
              userId: payload.userId ?? session.userId,
            }),
          });

          const created = await parseResponse<{ id: string | number }>(response);
          const newId = String(created.id);
          if (newId && newId !== change.transactionId) {
            await replaceTransactionIdReferences(change.transactionId, newId);
          }
          await removePendingTransactionChange(change.id);
          continue;
        }

        if (change.operationType === 'update') {
          const response = await fetch(`${config.apiBaseUrl}/api/transactions/${encodeURIComponent(change.transactionId)}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              amount: Number(payload.amount),
              type: payload.type,
              category: payload.category,
              date: payload.date,
              note: payload.note ?? '',
              receiptUrl: payload.receiptUrl ?? '',
              walletId: payload.walletId,
            }),
          });

          await parseResponse<{ affected: number }>(response);
          await removePendingTransactionChange(change.id);
          continue;
        }

        if (change.operationType === 'delete') {
          const response = await fetch(`${config.apiBaseUrl}/api/transactions/${encodeURIComponent(change.transactionId)}`, {
            method: 'DELETE',
            headers: {
              ...getAuthHeaders(),
            },
          });

          await parseResponse<{ affected: number }>(response);
          await removePendingTransactionChange(change.id);
        }
      } catch (error) {
        if (isNetworkError(error)) {
          break;
        }
        // Keep unsynced records if server rejects; stop to preserve operation order.
        break;
      }
    }
  } finally {
    isSyncInProgress = false;
    setSyncing(false);
    const remaining = (await getPendingTransactionChanges()).length;
    setPendingCount(remaining);
  }

  clearTransactionCache();
}

export function startTransactionSync(): void {
  if (syncTimer) {
    return;
  }

  void syncPendingTransactions();
  syncTimer = setInterval(() => {
    void syncPendingTransactions();
  }, 15000);
}

export function stopTransactionSync(): void {
  if (!syncTimer) {
    return;
  }

  clearInterval(syncTimer);
  syncTimer = null;
}

export async function getTransactionsByUser(_userId?: string, walletId?: string): Promise<Transaction[]> {
  try {
    await syncRecurringTransactions();
    clearTransactionCache();
  } catch (err) {
    console.warn('Recurring transaction sync skipped while offline.');
  }

  const fallbackUserId = getUserIdForFallback(_userId);
  const localRows = fallbackUserId ? await getTransactionsByUserLocal(fallbackUserId) : await getAllTransactions();
  const localData = walletId
    ? localRows.filter(item => String(item.walletId ?? '') === String(walletId))
    : localRows;

  const pendingChanges = await getPendingTransactionChanges();

  await syncPendingTransactions();

  let url = `${config.apiBaseUrl}/api/transactions`;
  if (walletId) {
    url += `?walletId=${encodeURIComponent(walletId)}`;
  }

  try {
    const response = await fetch(url, {
      headers: {
        ...getAuthHeaders(),
      },
    });

    const rows = await parseResponse<any[]>(response);
    const serverData = rows.map(mapTransactionRow);
    const filteredServerData = walletId
      ? serverData.filter(item => String(item.walletId ?? '') === String(walletId))
      : serverData;

    return mergeLocalAndServerTransactions(localData, filteredServerData, pendingChanges);
  } catch (error) {
    return localData;
  }
}

export async function insertTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const session = getAuthSession();
  const localTransaction = await insertTransactionLocal({
    ...input,
    userId: session?.userId ?? input.userId,
  });

  await addPendingTransactionChange('create', localTransaction.id, localTransaction);
  setPendingCount((await getPendingTransactionChanges()).length);
  clearTransactionCache();
  void syncPendingTransactions();
  return localTransaction;
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

  const result = await updateTransactionLocal(id, updates);
  if (!result) {
    return null;
  }

  await addPendingTransactionChange('update', id, {
    amount: result.amount,
    type: result.type,
    category: result.category,
    date: result.date,
    note: result.note ?? '',
    receiptUrl: result.receiptUrl ?? '',
    walletId: result.walletId,
  });
  clearTransactionCache();
  setPendingCount((await getPendingTransactionChanges()).length);
  void syncPendingTransactions();
  return result;
}

export async function deleteTransaction(id: string): Promise<void> {
  await deleteTransactionLocal(id);
  await addPendingTransactionChange('delete', id, { transactionId: id });
  setPendingCount((await getPendingTransactionChanges()).length);
  clearTransactionCache();
  void syncPendingTransactions();
}
