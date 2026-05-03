const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/finance_tracker.sqlite');

db.get("SELECT id, username FROM users WHERE username = 'demo-user'", (err, row) => {
  if (err) console.error(err);
  else console.log('Demo user:', row);
});

db.close();
