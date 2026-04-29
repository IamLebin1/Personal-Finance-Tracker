const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'db', 'finance_tracker.sqlite'));

db.serialize(() => {
  db.run('PRAGMA foreign_keys = OFF');
  db.run('BEGIN TRANSACTION');
  
  // 1. Rename existing users table
  db.run('ALTER TABLE users RENAME TO users_old');
  
  // 2. Create new users table with email and phone
  db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      createdAt TEXT NOT NULL
    )
  `);
  
  // 3. Copy data
  db.run(`
    INSERT INTO users (id, username, password, createdAt)
    SELECT id, username, password, createdAt FROM users_old
  `);
  
  // 4. Drop old table
  db.run('DROP TABLE users_old');
  
  db.run('COMMIT', (err) => {
    if (err) {
      console.error('Migration failed:', err.message);
      process.exit(1);
    } else {
      console.log('Migration successful: Users table updated with email and phone.');
      db.close();
    }
  });
});
