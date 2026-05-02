const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/finance_tracker.sqlite');

const tables = ['users', 'sessions', 'transactions', 'wallets', 'accounts', 'budgets', 'recurring_transactions'];

db.serialize(() => {
  tables.forEach(table => {
    db.get(`SELECT COUNT(*) as count FROM ${table}`, (err, row) => {
      if (err) {
        console.error(`Error counting ${table}:`, err.message);
      } else {
        console.log(`${table}: ${row.count} rows`);
      }
    });
  });
});

db.close();
