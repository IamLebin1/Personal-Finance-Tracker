const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/finance_tracker.sqlite');

db.all(`
  SELECT s.token, s.userId, u.username, s.createdAt 
  FROM sessions s 
  JOIN users u ON s.userId = u.id 
  ORDER BY s.createdAt DESC 
  LIMIT 5
`, (err, rows) => {
  if (err) console.error(err);
  else console.log('Recent sessions:', rows);
});

db.close();
