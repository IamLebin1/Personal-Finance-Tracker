const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/finance_tracker.sqlite');

db.serialize(() => {
  db.run('PRAGMA foreign_keys = OFF');
  
  db.run('BEGIN TRANSACTION');
  
  // 1. Rename existing table
  db.run('ALTER TABLE transactions RENAME TO transactions_old');
  
  // 2. Create new table with correct schema (including 'transfer' and 'receiptUrl')
  db.run(`
    CREATE TABLE transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      accountId INTEGER,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer')),
      category TEXT NOT NULL,
      note TEXT DEFAULT '',
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      receiptUrl TEXT,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE SET NULL
    )
  `);
  
  // 3. Copy data
  db.run(`
    INSERT INTO transactions (id, userId, accountId, amount, type, category, note, date, createdAt, receiptUrl)
    SELECT id, userId, accountId, amount, type, category, note, date, createdAt, receiptUrl FROM transactions_old
  `);
  
  // 4. Drop old table
  db.run('DROP TABLE transactions_old');
  
  db.run('COMMIT', (err) => {
    if (err) {
      console.error('Migration failed:', err.message);
    } else {
      console.log('Migration successful: Transactions table updated.');
    }
  });
});
