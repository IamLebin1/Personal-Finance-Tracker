const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');

const DB = path.join(__dirname, 'db', 'finance_tracker.sqlite');

function verifyPassword(password, stored) {
  const parts = String(stored || '').split(':');
  if (parts.length !== 2) {
    return stored === password;
  }

  const [salt, originalHash] = parts;
  const hashBuffer = crypto.scryptSync(password, salt, 64);
  const originalBuffer = Buffer.from(originalHash, 'hex');

  if (hashBuffer.length !== originalBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(hashBuffer, originalBuffer);
}

const db = new sqlite3.Database(DB);

db.get('SELECT username, password FROM users WHERE username = ?', ['lebinbin'], (err, row) => {
  if (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }

  if (!row) {
    console.log('User lebinbin not found');
  } else {
    const isMatch = verifyPassword('123456', row.password);
    console.log(`User: ${row.username}`);
    console.log(`Stored password hash: ${row.password}`);
    console.log(`Password "123456" match: ${isMatch}`);
  }
  db.close();
});
