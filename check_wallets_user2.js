const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/finance_tracker.sqlite');

db.all("SELECT * FROM wallets WHERE userId = 2", (err, rows) => {
  if (err) console.error(err);
  else console.log('Wallets for user 2:', rows);
});

db.close();
