const sqlite3 = require('sqlite3').verbose();

// Open database
const db = new sqlite3.Database('finance_tracker.sqlite');

// Reset table to match db/sqlite.ts
 db.serialize(() => {
  db.run('DROP TABLE IF EXISTS transactions');

  // Create transactions table (same structure as db/sqlite.ts)
  db.run(`
    CREATE TABLE transactions(
      id TEXT PRIMARY KEY NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      receiptUrl TEXT,
      userId TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_transactions_user_date
    ON transactions(userId, date DESC)
  `);

  // Seed data (same idea as db/sqlite.ts)
  const stmt = db.prepare(`
    INSERT INTO transactions(id, amount, type, category, date, note, receiptUrl, userId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run('seed-1', 4200, 'income', 'salary', '2026-04-04T08:30:00Z', 'Monthly salary', '', 'demo-user');
  stmt.run('seed-2', 84.2, 'expense', 'groceries', '2026-04-04T11:45:00Z', 'Weekend grocery run', '', 'demo-user');
  stmt.run('seed-3', 14.9, 'expense', 'transport', '2026-04-03T15:15:00Z', 'Grab ride', '', 'demo-user');
  stmt.run('seed-4', 120.0, 'expense', 'utilities', '2026-04-02T09:00:00Z', 'Water bill', '', 'demo-user');
  stmt.run('seed-5', 250.0, 'income', 'freelance', '2026-04-01T19:00:00Z', 'Side project payment', '', 'demo-user');

  stmt.finalize();
});

// Close database
db.close((err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Database initialized: finance_tracker.sqlite');
});
