const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

const DB = path.join(__dirname, 'db', 'finance_tracker.sqlite');

const db = new sqlite3.Database(DB, (err) => {
  if (err) {
    console.error('❌ Cannot open database:', err.message);
    process.exit(1);
  }
  
  const newPassword = hashPassword('123456');
  
  db.run('UPDATE users SET password = ? WHERE username = ?', [newPassword, 'lebin'], function(err) {
    if (err) {
      console.error('❌ Error updating password:', err.message);
      db.close();
      process.exit(1);
    }
    
    console.log('✓ Password reset to "123456" for user "lebin"');
    db.close();
  });
});
