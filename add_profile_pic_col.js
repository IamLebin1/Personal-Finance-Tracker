const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'db', 'finance_tracker.sqlite'));

db.serialize(() => {
  console.log('Adding profilePic column to users table...');
  db.all('PRAGMA table_info(users)', [], (err, rows) => {
    if (err) {
      console.error(err);
      db.close();
      return;
    }
    
    const hasProfilePic = rows.some(row => row.name === 'profilePic');
    if (!hasProfilePic) {
      db.run('ALTER TABLE users ADD COLUMN profilePic TEXT', (alterErr) => {
        if (alterErr) {
          console.error('Error adding column:', alterErr.message);
        } else {
          console.log('✓ profilePic column added successfully.');
        }
        db.close();
      });
    } else {
      console.log('profilePic column already exists.');
      db.close();
    }
  });
});
