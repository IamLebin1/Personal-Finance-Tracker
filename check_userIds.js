const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/finance_tracker.sqlite');

db.all("SELECT userId, COUNT(*) as count FROM transactions GROUP BY userId", (err, rows) => {
  if (err) console.error(err);
  else console.log('Transaction counts by userId:', rows);
});

db.close();
