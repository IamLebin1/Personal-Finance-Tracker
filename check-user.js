const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const DB = path.join(__dirname, 'db', 'finance_tracker.sqlite');

const db = new sqlite3.Database(DB, (err) => {
  if (err) {
    console.error('❌ Cannot open database:', err.message);
    process.exit(1);
  }
  console.log('✓ Connected to database');
  
  // Check all users
  db.all('SELECT id, username, password FROM users', [], (err, rows) => {
    if (err) {
      console.error('❌ Error fetching users:', err.message);
      db.close();
      process.exit(1);
    }
    
    console.log('\n📋 Users in database:');
    if (!rows || rows.length === 0) {
      console.log('   No users found');
    } else {
      rows.forEach(row => {
        console.log(`   - Username: ${row.username}, ID: ${row.id}`);
      });
    }
    
    // Check if "lebin" exists
    db.get('SELECT id, username FROM users WHERE username = ?', ['lebin'], (err, row) => {
      if (err) {
        console.error('❌ Error:', err.message);
      } else if (row) {
        console.log(`\n✓ User "lebin" found (ID: ${row.id})`);
      } else {
        console.log('\n❌ User "lebin" NOT found');
        console.log('   You need to register first or create the user');
      }
      
      db.close();
    });
  });
});
