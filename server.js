const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');

const DB = 'membership.sqlite';
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Initialize database and tables if they do not exist.
const initDb = new sqlite3.Database(DB);
initDb.serialize(() => {
  initDb.run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT,
      email TEXT UNIQUE,
      password TEXT
    )`,
  );

  // Backward-compatible migration for existing DB files created before fullName existed.
  initDb.run('ALTER TABLE users ADD COLUMN fullName TEXT', err => {
    if (err && !String(err.message).includes('duplicate column name')) {
      console.log('users.fullName migration warning:', err.message);
    }
  });

  initDb.run(
    `CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      amount REAL,
      category TEXT,
      type TEXT,
      note TEXT,
      occurredOn TEXT,
      FOREIGN KEY (userId) REFERENCES users(id)
    )`,
  );
});
initDb.close();

// Helper: row to object
function rowToTransaction(row) {
  return {
    id: row.id,
    userId: row.userId,
    amount: row.amount,
    category: row.category,
    type: row.type,
    note: row.note,
    occurredOn: row.occurredOn,
  };
}

// POST register
app.post('/api/register', (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: 'Missing fullName, email or password' });
  }

  const db = new sqlite3.Database(DB);
  const stmt = `INSERT INTO users(fullName,email,password) VALUES(?,?,?)`;

  db.run(stmt, [fullName, email, password], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, affected: this.changes });
    db.close();
  });
});

// POST login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  const db = new sqlite3.Database(DB);
  db.get(
    'SELECT * FROM users WHERE email=? AND password=?',
    [email, password],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });

      if (!row) {
        res.status(200).json({ affected: 0, user: null });
      } else {
        res.status(200).json({
          affected: 1,
          user: {
            id: row.id,
            fullName: row.fullName || '',
            email: row.email,
          },
        });
      }

      db.close();
    },
  );
});

// GET all transactions
app.get('/api/transactions', (req, res) => {
  const db = new sqlite3.Database(DB);
  db.all('SELECT * FROM transactions ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(rowToTransaction));
    db.close();
  });
});

// GET one transaction
app.get('/api/transactions/:id', (req, res) => {
  const db = new sqlite3.Database(DB);
  db.get('SELECT * FROM transactions WHERE id=?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row ? rowToTransaction(row) : null);
    db.close();
  });
});

// POST new transaction
app.post('/api/transactions', (req, res) => {
  const { userId, amount, category, type, note, occurredOn } = req.body;
  const db = new sqlite3.Database(DB);
  const stmt = `INSERT INTO transactions(userId,amount,category,type,note,occurredOn) VALUES(?,?,?,?,?,?)`;

  db.run(
    stmt,
    [userId, amount, category, type, note, occurredOn],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, affected: this.changes });
      db.close();
    },
  );
});

// PUT update transaction (Lecture-style affected response)
app.put('/api/transactions/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { amount, category } = req.body;
  const db = new sqlite3.Database(DB);
  const stmt = `UPDATE transactions SET amount=?, category=? WHERE id=?`;

  db.run(stmt, [amount, category, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: id, affected: this.changes });
    db.close();
  });
});

// DELETE transaction
app.delete('/api/transactions/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const db = new sqlite3.Database(DB);
  db.run('DELETE FROM transactions WHERE id=?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: id, affected: this.changes });
    db.close();
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
