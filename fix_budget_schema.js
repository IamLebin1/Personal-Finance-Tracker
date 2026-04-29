const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'db', 'finance_tracker.sqlite'));

db.serialize(() => {
  console.log('Fixing budgets table schema...');
  db.run('PRAGMA foreign_keys = OFF');
  
  db.run('DROP TABLE IF EXISTS budgets_old');
  db.run('ALTER TABLE budgets RENAME TO budgets_old');
  
  db.run(`
    CREATE TABLE budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      category TEXT NOT NULL,
      month TEXT NOT NULL,
      amount REAL NOT NULL,
      createdAt TEXT NOT NULL,
      UNIQUE(userId, category, month),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    INSERT INTO budgets (id, userId, category, month, amount, createdAt)
    SELECT id, userId, category, month, amount, createdAt FROM budgets_old
  `, (err) => {
    if (err) {
      console.log('No existing budget data to migrate or error:', err.message);
    } else {
      console.log('Budget data migrated successfully.');
    }
  });

  db.run('DROP TABLE budgets_old');
  db.run('PRAGMA foreign_keys = ON', () => {
    console.log('✓ Budgets table schema fixed.');
    db.close();
  });
});
