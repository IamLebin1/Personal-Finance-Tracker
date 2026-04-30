import type { CreateTransactionInput, Transaction } from '../types/transaction';
import { config } from '../config/appConfig';

// Lightweight declaration for process in RN TypeScript builds
declare const process: any;

type TransactionListener = (transactions: Transaction[]) => void;
type TransactionUpdate = Partial<Omit<Transaction, 'id' | 'userId'>>;
type PendingChangeType = 'create' | 'update' | 'delete';

export type PendingTransactionChange = {
  id: number;
  operationType: PendingChangeType;
  transactionId: string;
  payload: string;
  createdAt: string;
};

const TABLE_NAME = 'transactions';
const PENDING_TABLE_NAME = 'pending_transaction_changes';
const DEFAULT_USER_ID = 'demo-user';

let SQLiteModule: any;

try {
  // Use runtime require to avoid breaking Jest (native module unavailable there).
  SQLiteModule = require('react-native-sqlite-storage');
  if (typeof SQLiteModule?.enablePromise === 'function') {
    SQLiteModule.enablePromise(true);
  }
} catch {
  SQLiteModule = null;
}

const isJestRuntime = typeof process !== 'undefined' && Boolean(process.env.JEST_WORKER_ID);
const hasSQLiteModule = Boolean(SQLiteModule?.openDatabase) && !isJestRuntime;
let sqliteNativeUnavailable = false;

let dbConnectionPromise: Promise<any> | null = null;
const listeners = new Set<TransactionListener>();
let memoryPendingChanges: PendingTransactionChange[] = [];
let memoryPendingId = 1;

const createSeedTransaction = (
  id: string,
  amount: number,
  type: Transaction['type'],
  category: string,
  date: string,
  note: string,
): Transaction => ({
  id,
  amount,
  type,
  category,
  date,
  note,
  userId: DEFAULT_USER_ID,
});

const seedRows: Transaction[] = [
  createSeedTransaction('seed-1', 4200, 'income', 'salary', '2026-04-04T08:30:00Z', 'Monthly salary'),
  createSeedTransaction('seed-2', 84.2, 'expense', 'groceries', '2026-04-04T11:45:00Z', 'Weekend grocery run'),
  createSeedTransaction('seed-3', 14.9, 'expense', 'transport', '2026-04-03T15:15:00Z', 'Grab ride'),
  createSeedTransaction('seed-4', 120.0, 'expense', 'utilities', '2026-04-02T09:00:00Z', 'Water bill'),
  createSeedTransaction('seed-5', 250.0, 'income', 'freelance', '2026-04-01T19:00:00Z', 'Side project payment'),
];

let memoryStore: Transaction[] = [...seedRows];

function sortTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((left, right) => right.date.localeCompare(left.date));
}

function toDbTransaction(input: CreateTransactionInput): CreateTransactionInput {
  return {
    ...input,
    amount: Number(input.amount),
    note: input.note ?? '',
    receiptUrl: input.receiptUrl ?? '',
    walletId: input.walletId ?? undefined,
  };
}

function mapRowToTransaction(row: any): Transaction {
  return {
    id: String(row.id),
    amount: Number(row.amount),
    type: row.type,
    category: row.category,
    date: row.date,
    note: row.note ?? '',
    receiptUrl: row.receiptUrl ?? '',
    userId: row.userId,
    walletId: row.walletId ?? undefined,
  };
}

function mapPendingRow(row: any): PendingTransactionChange {
  return {
    id: Number(row.id),
    operationType: row.operationType,
    transactionId: String(row.transactionId),
    payload: String(row.payload ?? '{}'),
    createdAt: String(row.createdAt),
  };
}

function nextId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function emitChange(): Promise<void> {
  const snapshot = await getAllTransactions();
  listeners.forEach(listener => {
    listener(snapshot);
  });
}

async function openDatabase(): Promise<any> {
  if (!hasSQLiteModule || sqliteNativeUnavailable) {
    return null;
  }

  if (!dbConnectionPromise) {
    try {
      dbConnectionPromise = SQLiteModule.openDatabase({
        name: config.sqliteDbName,
        location: 'default',
      });
    } catch {
      sqliteNativeUnavailable = true;
      dbConnectionPromise = null;
      return null;
    }
  }

  return dbConnectionPromise;
}

async function executeSql(sql: string, params: any[] = []): Promise<any> {
  const db = await openDatabase();
  if (!db) {
    return null;
  }

  return new Promise((resolve, reject) => {
    db.transaction(
      (tx: any) => {
        tx.executeSql(
          sql,
          params,
          (_tx: any, results: any) => resolve(results),
          (_tx: any, error: any) => {
            reject(error);
            return false;
          },
        );
      },
      (error: any) => reject(error),
    );
  });
}

async function ensureTables(): Promise<void> {
  await executeSql(
    `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id TEXT PRIMARY KEY NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      receiptUrl TEXT,
      userId TEXT NOT NULL,
      walletId TEXT
    )`,
  );

  // Keep older local schemas compatible when walletId was introduced later.
  const infoResult = await executeSql(`PRAGMA table_info(${TABLE_NAME})`);
  const infoRows = infoResult?.rows;
  let hasWalletId = false;
  if (infoRows) {
    for (let index = 0; index < infoRows.length; index += 1) {
      const name = String(infoRows.item(index)?.name ?? '');
      if (name === 'walletId') {
        hasWalletId = true;
        break;
      }
    }
  }

  if (!hasWalletId) {
    await executeSql(`ALTER TABLE ${TABLE_NAME} ADD COLUMN walletId TEXT`);
  }

  await executeSql(
    `CREATE INDEX IF NOT EXISTS idx_transactions_user_date
     ON ${TABLE_NAME}(userId, date DESC)`,
  );

  await executeSql(
    `CREATE TABLE IF NOT EXISTS ${PENDING_TABLE_NAME} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operationType TEXT NOT NULL,
      transactionId TEXT NOT NULL,
      payload TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )`,
  );

  await executeSql(
    `CREATE INDEX IF NOT EXISTS idx_pending_changes_created
     ON ${PENDING_TABLE_NAME}(createdAt ASC)`,
  );
}

async function seedIfNeeded(): Promise<void> {
  if (!config.sqliteSeedDemoData) {
    return;
  }

  const countResult = await executeSql(`SELECT COUNT(*) as total FROM ${TABLE_NAME}`);
  const count = countResult?.rows?.item(0)?.total ?? 0;

  if (count > 0) {
    return;
  }

  for (const row of seedRows) {
    await executeSql(
      `INSERT INTO ${TABLE_NAME} (id, amount, type, category, date, note, receiptUrl, userId, walletId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [row.id, row.amount, row.type, row.category, row.date, row.note ?? '', row.receiptUrl ?? '', row.userId, row.walletId ?? null],
    );
  }
}

async function selectTransactions(sql: string, params: any[] = []): Promise<Transaction[]> {
  const result = await executeSql(sql, params);
  const rows = result?.rows;

  if (!rows) {
    return [];
  }

  const values: Transaction[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    values.push(mapRowToTransaction(rows.item(index)));
  }

  return values;
}

export async function initDatabase(): Promise<void> {
  if (!hasSQLiteModule || sqliteNativeUnavailable) {
    if (memoryStore.length === 0) {
      memoryStore = [...seedRows];
    }
    return;
  }

  await ensureTables();
  await seedIfNeeded();
}

export async function insertTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const normalized = toDbTransaction(input);
  const newRow: Transaction = {
    ...normalized,
    id: nextId(),
  };

  if (!hasSQLiteModule || sqliteNativeUnavailable) {
    memoryStore = sortTransactions([newRow, ...memoryStore]);
    await emitChange();
    return newRow;
  }

  await initDatabase();
  await executeSql(
    `INSERT INTO ${TABLE_NAME} (id, amount, type, category, date, note, receiptUrl, userId, walletId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newRow.id,
      newRow.amount,
      newRow.type,
      newRow.category,
      newRow.date,
      newRow.note ?? '',
      newRow.receiptUrl ?? '',
      newRow.userId,
      newRow.walletId ?? null,
    ],
  );

  await emitChange();
  return newRow;
}

export async function getTransactionsByUser(userId: string): Promise<Transaction[]> {
  if (!hasSQLiteModule || sqliteNativeUnavailable) {
    return sortTransactions(memoryStore.filter(item => item.userId === userId));
  }

  await initDatabase();
  return selectTransactions(
    `SELECT id, amount, type, category, date, note, receiptUrl, userId, walletId
     FROM ${TABLE_NAME}
     WHERE userId = ?
     ORDER BY date DESC`,
    [userId],
  );
}

export async function getAllTransactions(): Promise<Transaction[]> {
  if (!hasSQLiteModule || sqliteNativeUnavailable) {
    return sortTransactions(memoryStore);
  }

  await initDatabase();
  return selectTransactions(
    `SELECT id, amount, type, category, date, note, receiptUrl, userId, walletId
     FROM ${TABLE_NAME}
     ORDER BY date DESC`,
  );
}

export async function deleteTransaction(id: string): Promise<void> {
  if (!hasSQLiteModule || sqliteNativeUnavailable) {
    memoryStore = memoryStore.filter(item => item.id !== id);
    await emitChange();
    return;
  }

  await initDatabase();
  await executeSql(`DELETE FROM ${TABLE_NAME} WHERE id = ?`, [id]);

  await emitChange();
}

export async function updateTransaction(id: string, updates: TransactionUpdate): Promise<Transaction | null> {
  if (!hasSQLiteModule || sqliteNativeUnavailable) {
    let updatedTransaction: Transaction | null = null;

    memoryStore = memoryStore.map(item => {
      if (item.id !== id) {
        return item;
      }

      updatedTransaction = {
        ...item,
        ...updates,
      };

      return updatedTransaction;
    });

    if (updatedTransaction) {
      await emitChange();
    }

    return updatedTransaction;
  }

  await initDatabase();

  const existingRows = await selectTransactions(
    `SELECT id, amount, type, category, date, note, receiptUrl, userId, walletId
     FROM ${TABLE_NAME}
     WHERE id = ?`,
    [id],
  );

  const existing = existingRows[0];
  if (!existing) {
    return null;
  }

  const nextRow: Transaction = {
    ...existing,
    ...updates,
    amount: updates.amount !== undefined ? Number(updates.amount) : existing.amount,
    note: updates.note ?? existing.note ?? '',
    receiptUrl: updates.receiptUrl ?? existing.receiptUrl ?? '',
    walletId: updates.walletId ?? existing.walletId,
  };

  await executeSql(
    `UPDATE ${TABLE_NAME}
     SET amount = ?, type = ?, category = ?, date = ?, note = ?, receiptUrl = ?, walletId = ?
     WHERE id = ?`,
    [
      nextRow.amount,
      nextRow.type,
      nextRow.category,
      nextRow.date,
      nextRow.note ?? '',
      nextRow.receiptUrl ?? '',
      nextRow.walletId ?? null,
      id,
    ],
  );

  await emitChange();
  return nextRow;
}

export function subscribeToTransactions(listener: TransactionListener): () => void {
  listeners.add(listener);

  getAllTransactions()
    .then(snapshot => {
      listener(snapshot);
    })
    .catch(() => {
      // Ignore initial emission errors so subscribers stay attached.
    });

  return () => {
    listeners.delete(listener);
  };
}

export async function addPendingTransactionChange(
  operationType: PendingChangeType,
  transactionId: string,
  payload: unknown,
): Promise<void> {
  const serializedPayload = JSON.stringify(payload ?? {});
  const createdAt = new Date().toISOString();

  if (!hasSQLiteModule || sqliteNativeUnavailable) {
    memoryPendingChanges.push({
      id: memoryPendingId,
      operationType,
      transactionId,
      payload: serializedPayload,
      createdAt,
    });
    memoryPendingId += 1;
    return;
  }

  await initDatabase();
  await executeSql(
    `INSERT INTO ${PENDING_TABLE_NAME} (operationType, transactionId, payload, createdAt)
     VALUES (?, ?, ?, ?)`,
    [operationType, transactionId, serializedPayload, createdAt],
  );
}

export async function getPendingTransactionChanges(): Promise<PendingTransactionChange[]> {
  if (!hasSQLiteModule || sqliteNativeUnavailable) {
    return [...memoryPendingChanges].sort((left, right) => left.id - right.id);
  }

  await initDatabase();
  const result = await executeSql(
    `SELECT id, operationType, transactionId, payload, createdAt
     FROM ${PENDING_TABLE_NAME}
     ORDER BY id ASC`,
  );

  const rows = result?.rows;
  if (!rows) {
    return [];
  }

  const values: PendingTransactionChange[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    values.push(mapPendingRow(rows.item(index)));
  }

  return values;
}

export async function removePendingTransactionChange(id: number): Promise<void> {
  if (!hasSQLiteModule || sqliteNativeUnavailable) {
    memoryPendingChanges = memoryPendingChanges.filter(change => change.id !== id);
    return;
  }

  await initDatabase();
  await executeSql(`DELETE FROM ${PENDING_TABLE_NAME} WHERE id = ?`, [id]);
}

export async function replaceTransactionIdReferences(oldId: string, newId: string): Promise<void> {
  if (oldId === newId) {
    return;
  }

  if (!hasSQLiteModule || sqliteNativeUnavailable) {
    memoryStore = memoryStore.map(item => (item.id === oldId ? { ...item, id: newId } : item));
    memoryPendingChanges = memoryPendingChanges.map(change => {
      const payload = JSON.parse(change.payload || '{}');
      if (payload && typeof payload === 'object') {
        if (payload.id === oldId) {
          payload.id = newId;
        }
        if (payload.transactionId === oldId) {
          payload.transactionId = newId;
        }
      }

      return {
        ...change,
        transactionId: change.transactionId === oldId ? newId : change.transactionId,
        payload: JSON.stringify(payload ?? {}),
      };
    });
    await emitChange();
    return;
  }

  await initDatabase();
  await executeSql(`UPDATE ${TABLE_NAME} SET id = ? WHERE id = ?`, [newId, oldId]);

  const pendingChanges = await getPendingTransactionChanges();
  for (const change of pendingChanges) {
    const payload = JSON.parse(change.payload || '{}');
    let payloadChanged = false;

    if (payload && typeof payload === 'object') {
      if (payload.id === oldId) {
        payload.id = newId;
        payloadChanged = true;
      }
      if (payload.transactionId === oldId) {
        payload.transactionId = newId;
        payloadChanged = true;
      }
    }

    const nextTransactionId = change.transactionId === oldId ? newId : change.transactionId;
    if (nextTransactionId !== change.transactionId || payloadChanged) {
      await executeSql(
        `UPDATE ${PENDING_TABLE_NAME} SET transactionId = ?, payload = ? WHERE id = ?`,
        [nextTransactionId, JSON.stringify(payload ?? {}), change.id],
      );
    }
  }

  await emitChange();
}
