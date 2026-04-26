const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/finance_tracker.sqlite');

const userId = 2; // lebin
const accountId = null;
const amount = 15.0;
const type = 'expense';
const category = 'food';
const note = 'test expense for user 2';
const date = new Date().toISOString();
const createdAt = new Date().toISOString();

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
  
  db.run(
    `INSERT INTO transactions(userId, accountId, amount, type, category, note, date, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, accountId, amount, type, category, note, date, createdAt],
    function(err) {
      if (err) {
        console.error('ERROR:', err.message);
      } else {
        console.log('SUCCESS: Inserted ID', this.lastID);
      }
    }
  );
});
