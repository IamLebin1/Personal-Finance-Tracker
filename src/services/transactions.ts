var config = require('../config/Config');
import type {
  TransactionDraft,
  TransactionRecord,
} from '../types/transactions';

const mapApiTransaction = (row: any): TransactionRecord => {
  return {
    id: String(row.id),
    userId: String(row.userId ?? ''),
    amount: Number(row.amount),
    category: row.category ?? 'Other',
    note: row.note ?? '',
    type: row.type === 'income' ? 'income' : 'expense',
    occurredOn: row.occurredOn ?? new Date().toISOString().slice(0, 10),
    createdAt: 0,
    updatedAt: 0,
  };
};

const fetchTransactions = (userId?: string) => {
  const requestUrl = userId
    ? config.settings.serverPath + '/api/transactions?userId=' + encodeURIComponent(userId)
    : config.settings.serverPath + '/api/transactions';

  return fetch(requestUrl)
    .then(response => response.json())
    .then(data => {
      if (!Array.isArray(data)) {
        return [];
      }

      return data.map(mapApiTransaction);
    });
};

export const subscribeToTransactions = (
  userId: string,
  onChange: (records: TransactionRecord[]) => void,
) => {
  fetchTransactions(userId)
    .then(onChange)
    .catch(() => onChange([]));

  const timer = setInterval(() => {
    fetchTransactions(userId)
      .then(onChange)
      .catch(() => onChange([]));
  }, 1500);

  return () => {
    clearInterval(timer);
  };
};

export const getTransactionById = (transactionId: string) => {
  return fetch(config.settings.serverPath + '/api/transactions/' + transactionId)
    .then(response => response.json())
    .then(data => {
      if (!data) {
        return null;
      }

      return mapApiTransaction(data);
    });
};

export const saveTransaction = (
  userId: string,
  draft: TransactionDraft,
  transactionId?: string,
) => {
  const payload = {
    userId: Number(userId) || 1,
    amount: Number(draft.amount),
    category: draft.category.trim(),
    note: draft.note.trim(),
    type: draft.type,
    occurredOn: draft.occurredOn,
  };

  if (transactionId) {
    return fetch(config.settings.serverPath + '/api/transactions/' + transactionId, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: payload.amount,
        category: payload.category,
      }),
    })
      .then(response => response.json())
      .then(() => transactionId);
  }

  return fetch(config.settings.serverPath + '/api/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
    .then(response => response.json())
    .then(data => String(data.id));
};

export const removeTransaction = (transactionId: string) => {
  return fetch(config.settings.serverPath + '/api/transactions/' + transactionId, {
    method: 'DELETE',
  }).then(() => undefined);
};