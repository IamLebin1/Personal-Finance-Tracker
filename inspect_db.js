const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/finance_tracker.sqlite');

db.all("SELECT name, sql FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  
  tables.forEach(table => {
    console.log(`\nTable: ${table.name}`);
    console.log('SQL:', table.sql);
    
    db.all(`PRAGMA table_info(${table.name})`, (err, columns) => {
      console.log('Columns:', columns);
    });
  });
});
