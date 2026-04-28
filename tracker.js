const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');

console.warn('⚠️ WARNING: tracker.js is deprecated. Please use node db/service.js instead.');

const app = express();
// Use an absolute path so running from a different CWD doesn't create a second empty DB.
const DB = path.join(__dirname, 'db', 'finance_tracker.sqlite');
const db = new sqlite3.Database(DB);

app.use(cors());
app.use(express.json());

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      userId INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      accountId INTEGER,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer')),
      category TEXT NOT NULL,
      note TEXT DEFAULT '',
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      receiptUrl TEXT,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      UNIQUE(userId, name),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      category TEXT NOT NULL,
      month TEXT NOT NULL,
      amount REAL NOT NULL,
      createdAt TEXT NOT NULL,
      UNIQUE(userId, category, month),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.all('PRAGMA table_info(transactions)', [], (err, cols) => {
    if (err || !Array.isArray(cols)) {
      return;
    }

    const hasAccountId = cols.some(col => col.name === 'accountId');
    if (!hasAccountId) {
      db.run('ALTER TABLE transactions ADD COLUMN accountId INTEGER');
    }
  });
});

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const parts = String(stored || '').split(':');
  if (parts.length !== 2) {
    // Backward compatibility for old plain-text rows.
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

function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }

  db.get('SELECT userId FROM sessions WHERE token = ?', [token], (err, row) => {
    if (err) {
      console.error('Auth Database Error:', err);
      return res.status(500).json({ message: err.message || 'Database error', code: err.code });
    }
    if (!row) return res.status(401).json({ message: 'Invalid session' });

    req.userId = row.userId;
    req.token = token;
    next();
  });
}

function createDefaultAccounts(userId) {
  const now = new Date().toISOString();
  const defaults = [
    ['Cash', 'cash', 0],
    ['Maybank', 'bank', 0],
    ['GrabPay', 'ewallet', 0],
  ];

  const stmt = db.prepare(
    'INSERT OR IGNORE INTO accounts(userId, name, type, balance, createdAt) VALUES (?, ?, ?, ?, ?)'
  );

  defaults.forEach(item => {
    stmt.run([userId, item[0], item[1], item[2], now]);
  });

  stmt.finalize();
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: 'username and password are required' });
  }

  const hashedPassword = hashPassword(password);

  db.run(
    'INSERT INTO users(username, password, createdAt) VALUES (?, ?, ?)',
    [username.trim(), hashedPassword, new Date().toISOString()],
    function onInsert(err) {
      if (err) {
        if (String(err.message || '').includes('UNIQUE')) {
          return res.status(409).json({ message: 'username already exists' });
        }
        return res.status(500).json({ message: 'Database error' });
      }

      createDefaultAccounts(this.lastID);

      return res.status(201).json({ id: this.lastID, username: username.trim() });
    }
  );
});

app.get('/api/wallets', auth, (req, res) => {
  db.all(
    'SELECT id, name, type, balance, createdAt, userId FROM accounts WHERE userId = ? ORDER BY id ASC',
    [req.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      return res.status(200).json(rows);
    }
  );
});

app.post('/api/wallets', auth, (req, res) => {
  const { name, type, balance } = req.body || {};
  const walletType = type || 'cash';
  const initialBalance = balance || 0;

  if (!name) {
    return res.status(400).json({ message: 'name is required' });
  }

  db.run(
    'INSERT INTO accounts(userId, name, type, balance, createdAt) VALUES (?, ?, ?, ?, ?)',
    [req.userId, name.trim(), walletType.trim(), Number(initialBalance), new Date().toISOString()],
    function onInsert(err) {
      if (err) {
        if (String(err.message || '').includes('UNIQUE')) {
          return res.status(409).json({ message: 'wallet name already exists' });
        }
        return res.status(500).json({ message: 'Database error' });
      }

      return res.status(201).json({ id: this.lastID, affected: this.changes });
    }
  );
});

app.delete('/api/wallets/:id', auth, (req, res) => {
  const walletId = Number(req.params.id);
  if (!walletId) {
    return res.status(400).json({ message: 'valid id is required' });
  }

  db.run('DELETE FROM accounts WHERE id = ? AND userId = ?', [walletId, req.userId], function onDelete(err) {
    if (err) return res.status(500).json({ message: 'Database error' });
    return res.status(200).json({ id: walletId, affected: this.changes });
  });
});

app.get('/api/budgets', auth, (req, res) => {
  const month = (req.query.month || '').toString();
  if (!month) {
    return res.status(400).json({ message: 'month query is required, format YYYY-MM' });
  }

  db.all(
    'SELECT id, category, month, amount, createdAt FROM budgets WHERE userId = ? AND month = ? ORDER BY category ASC',
    [req.userId, month],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      return res.status(200).json(rows);
    }
  );
});

app.post('/api/budgets', auth, (req, res) => {
  const { category, month, amount } = req.body || {};
  if (!category || !month || amount === undefined || amount === null) {
    return res.status(400).json({ message: 'category, month and amount are required' });
  }

  db.run(
    `INSERT INTO budgets(userId, category, month, amount, createdAt)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(userId, category, month)
     DO UPDATE SET amount = excluded.amount`,
    [req.userId, category.trim(), month, Number(amount), new Date().toISOString()],
    function onUpsert(err) {
      if (err) return res.status(500).json({ message: 'Database error' });
      return res.status(200).json({ ok: true, affected: this.changes });
    }
  );
});

app.get('/api/analytics/budget-vs-actual', auth, (req, res) => {
  const month = (req.query.month || '').toString();
  if (!month) {
    return res.status(400).json({ message: 'month query is required, format YYYY-MM' });
  }

  db.all(
    `SELECT b.category,
            b.amount AS budget,
            COALESCE(SUM(t.amount), 0) AS actual
     FROM budgets b
     LEFT JOIN transactions t
       ON t.userId = b.userId
      AND t.type = 'expense'
      AND t.category = b.category
      AND substr(t.date, 1, 7) = b.month
     WHERE b.userId = ? AND b.month = ?
     GROUP BY b.category, b.amount
     ORDER BY b.category ASC`,
    [req.userId, month],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      return res.status(200).json(rows);
    }
  );
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: 'username and password are required' });
  }

  db.get(
    'SELECT id, username, password FROM users WHERE username = ?',
    [username.trim()],
    (err, row) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      if (!row || !verifyPassword(password, row.password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = generateToken();
      db.run(
        'INSERT INTO sessions(token, userId, createdAt) VALUES (?, ?, ?)',
        [token, row.id, new Date().toISOString()],
        insertErr => {
          if (insertErr) return res.status(500).json({ message: 'Database error' });

          return res.status(200).json({
            token,
            user: {
              id: row.id,
              username: row.username,
            },
          });
        }
      );
    }
  );
});

app.post('/api/auth/logout', auth, (req, res) => {
  db.run('DELETE FROM sessions WHERE token = ?', [req.token], function onDelete(err) {
    if (err) return res.status(500).json({ message: 'Database error' });
    return res.status(200).json({ ok: true, affected: this.changes });
  });
});

app.get('/api/transactions', auth, (req, res) => {
  db.all(
    `SELECT t.*, a.name AS accountName
     FROM transactions t
     LEFT JOIN accounts a ON a.id = t.accountId
     WHERE t.userId = ?
     ORDER BY t.date DESC, t.id DESC`,
    [req.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      return res.status(200).json(rows);
    }
  );
});

app.post('/api/transactions', auth, (req, res) => {
  const { amount, type, category, note, date, accountId, receiptUrl } = req.body || {};
  if (!amount || !type || !category || !date) {
    return res.status(400).json({ message: 'amount, type, category and date are required' });
  }

  db.run(
    `INSERT INTO transactions(userId, accountId, amount, type, category, note, date, createdAt, receiptUrl)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.userId,
      accountId || null,
      Number(amount),
      type,
      category.trim(),
      note || '',
      date,
      new Date().toISOString(),
      receiptUrl || '',
    ],
    function onInsert(err) {
      if (err) {
        console.error('Insert Transaction Error:', err);
        // Return the underlying sqlite message to make debugging easier in dev.
        return res.status(500).json({ message: err.message || 'Database error', code: err.code });
      }
      return res.status(201).json({ id: this.lastID, affected: this.changes });
    }
  );
});

app.put('/api/transactions/:id', auth, (req, res) => {
  const txId = Number(req.params.id);
  const { amount, type, category, note, date, accountId, receiptUrl } = req.body || {};
  if (!txId || !amount || !type || !category || !date) {
    return res.status(400).json({ message: 'valid id, amount, type, category and date are required' });
  }

  db.run(
    `UPDATE transactions
     SET amount = ?, type = ?, category = ?, note = ?, date = ?, accountId = ?, receiptUrl = ?
     WHERE id = ? AND userId = ?`,
    [Number(amount), type, category.trim(), note || '', date, accountId || null, receiptUrl || '', txId, req.userId],
    function onUpdate(err) {
      if (err) {
        console.error('Update Transaction Error:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      return res.status(200).json({ id: txId, affected: this.changes });
    }
  );
});

app.delete('/api/transactions/:id', auth, (req, res) => {
  const txId = Number(req.params.id);
  if (!txId) {
    return res.status(400).json({ message: 'valid id is required' });
  }

  db.run('DELETE FROM transactions WHERE id = ? AND userId = ?', [txId, req.userId], function onDelete(err) {
    if (err) {
      console.error('Delete Transaction Error:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    return res.status(200).json({ id: txId, affected: this.changes });
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Finance API running on port ${PORT}`);
});