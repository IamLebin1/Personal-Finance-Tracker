const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'db', 'finance_tracker.sqlite'));

db.serialize(() => {
  db.run('PRAGMA foreign_keys = OFF');
  db.run('BEGIN TRANSACTION');
  
  // 1. Rename existing table
  db.run('ALTER TABLE transactions RENAME TO transactions_old');
  
  // 2. Create new table with correct schema (INTEGER PRIMARY KEY AUTOINCREMENT)
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
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  
  // 3. Copy data, handling the case where 'id' might be TEXT or missing
  // We omit 'id' from the copy to let AUTOINCREMENT handle it if the old IDs are weird
  db.run(`
    INSERT INTO transactions (userId, amount, type, category, note, date, createdAt, receiptUrl)
    SELECT userId, amount, type, category, note, date, createdAt, receiptUrl FROM transactions_old
  `);
  
  // 4. Drop old table
  db.run('DROP TABLE transactions_old');
  
  db.run('COMMIT', (err) => {
    if (err) {
      console.error('Migration failed:', err.message);
      process.exit(1);
    } else {
      console.log('Migration successful: Transactions table fixed.');
      db.close();
    }
  });
});
