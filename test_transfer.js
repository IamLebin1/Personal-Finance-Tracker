const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/finance_tracker.sqlite');

const userId = 1;
const accountId = null;
const amount = 50.0;
const type = 'transfer'; // This should fail based on the schema on disk
const category = 'other';
const note = 'test transfer';
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
