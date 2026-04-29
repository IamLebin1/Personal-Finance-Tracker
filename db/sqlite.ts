import type { CreateTransactionInput, Transaction } from '../types/transaction';
import { config } from '../config/appConfig';

// Lightweight declaration for process in RN TypeScript builds
declare const process: any;

type TransactionListener = (transactions: Transaction[]) => void;
type TransactionUpdate = Partial<Omit<Transaction, 'id' | 'userId'>>;

const TABLE_NAME = 'transactions';
const DEFAULT_USER_ID = 'demo-user';

let SQLiteModule: any;

try {
  // Use runtime require to avoid breaking Jest (native module unavailable there).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
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
      userId TEXT NOT NULL
    )`,
  );

  await executeSql(
    `CREATE INDEX IF NOT EXISTS idx_transactions_user_date
     ON ${TABLE_NAME}(userId, date DESC)`,
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
      `INSERT INTO ${TABLE_NAME} (id, amount, type, category, date, note, receiptUrl, userId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [row.id, row.amount, row.type, row.category, row.date, row.note ?? '', row.receiptUrl ?? '', row.userId],
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
    `INSERT INTO ${TABLE_NAME} (id, amount, type, category, date, note, receiptUrl, userId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newRow.id,
      newRow.amount,
      newRow.type,
      newRow.category,
      newRow.date,
      newRow.note ?? '',
      newRow.receiptUrl ?? '',
      newRow.userId,
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
    `SELECT id, amount, type, category, date, note, receiptUrl, userId
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
    `SELECT id, amount, type, category, date, note, receiptUrl, userId
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
    `SELECT id, amount, type, category, date, note, receiptUrl, userId
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
  };

  await executeSql(
    `UPDATE ${TABLE_NAME}
     SET amount = ?, type = ?, category = ?, date = ?, note = ?, receiptUrl = ?
     WHERE id = ?`,
    [
      nextRow.amount,
      nextRow.type,
      nextRow.category,
      nextRow.date,
      nextRow.note ?? '',
      nextRow.receiptUrl ?? '',
      id,
    ],
  );

  await emitChange();
  return nextRow;
}

export function subscribeToTransactions(listener: TransactionListener): () => void {
  listeners.add(listener);

  void getAllTransactions().then(snapshot => {
    listener(snapshot);
  });

  return () => {
    listeners.delete(listener);
  };
}
