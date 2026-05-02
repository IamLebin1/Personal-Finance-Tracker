const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/finance_tracker.sqlite');

db.all("SELECT * FROM transactions WHERE userId = 1", (err, rows) => {
  if (err) console.error(err);
  else console.log(`Found ${rows.length} transactions for user 1`);
});

db.close();
