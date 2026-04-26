const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const path = require('path');
const app = express();
const DB = path.join(__dirname, 'finance_tracker.sqlite');

app.use(express.json());

// Global logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

function openDb() {
  return new sqlite3.Database(DB);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

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

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function closeDb(db) {
  db.close();
}

function ensureTransactionColumns(db, onDone) {
  db.all('PRAGMA table_info(transactions)', [], (err, rows) => {
    if (err) {
      console.error(err.message);
      if (typeof onDone === 'function') {
        onDone();
      }
      return;
    }

    const existingColumns = new Set((rows || []).map(column => column.name));
    const alterStatements = [];

    if (!existingColumns.has('note')) {
      alterStatements.push('ALTER TABLE transactions ADD COLUMN note TEXT');
    }
    if (!existingColumns.has('receiptUrl')) {
      alterStatements.push('ALTER TABLE transactions ADD COLUMN receiptUrl TEXT');
    }
    if (!existingColumns.has('userId')) {
      alterStatements.push("ALTER TABLE transactions ADD COLUMN userId INTEGER NOT NULL DEFAULT 1");
    }

    if (alterStatements.length === 0) {
      if (typeof onDone === 'function') {
        onDone();
      }
      return;
    }

    let pending = alterStatements.length;
    alterStatements.forEach(sql => {
      db.run(sql, alterErr => {
        if (alterErr) {
          console.error(alterErr.message);
        }

        pending -= 1;
        if (pending === 0 && typeof onDone === 'function') {
          onDone();
        }
      });
    });
  });
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme && scheme.toLowerCase() === 'bearer' && token) {
    return token.trim();
  }
  return '';
}

function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Missing auth token' });
  }

  const db = openDb();
  db.get(
    `SELECT sessions.userId, users.username
     FROM sessions
     JOIN users ON users.id = sessions.userId
     WHERE sessions.token = ?`,
    [token],
    (err, row) => {
      closeDb(db);

      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (!row) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }

      req.auth = {
        token,
        userId: Number(row.userId), // Store as Number for consistent DB querying
        username: row.username,
      };
      return next();
    }
  );
}

function ensureTables(onDone) {
  const db = openDb();
  db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON');

    // Auth tables
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT,
        phone TEXT,
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
      CREATE TABLE IF NOT EXISTS password_resets (
        token TEXT PRIMARY KEY,
        userId INTEGER NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Transaction table
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
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_date
      ON transactions(userId, date DESC)
    `);

    ensureTransactionColumns(db, () => {
      // Seed demo auth user
      db.get('SELECT COUNT(*) AS total FROM users', [], (err, row) => {
        if (!err && row && row.total === 0) {
          db.run(
            'INSERT INTO users(username, password, email, phone, createdAt) VALUES (?, ?, ?, ?, ?)',
            ['demo-user', hashPassword('demo123'), 'demo@example.com', '+1234567890', new Date().toISOString()]
          );
        } else if (!err && row && row.total > 0) {
          db.run(
            'UPDATE users SET email = ?, phone = ? WHERE username = ? AND (email IS NULL OR phone IS NULL)',
            ['demo@example.com', '+1234567890', 'demo-user']
          );
        }

        if (err) {
          console.error(err.message);
        }

        closeDb(db);
        if (typeof onDone === 'function') {
          onDone();
        }
      });
    });
  });
}

function seedTransactions(onDone) {
  const db = openDb();
  db.get('SELECT COUNT(*) AS total FROM transactions', [], (err, row) => {
    if (err || (row && row.total > 0)) {
      if (err) console.error(err.message);
      closeDb(db);
      if (typeof onDone === 'function') onDone();
      return;
    }

    db.get('SELECT id FROM users LIMIT 1', [], (userErr, userRow) => {
      if (userErr || !userRow) {
        closeDb(db);
        if (typeof onDone === 'function') onDone();
        return;
      }

      const userId = userRow.id;
      const stmt = db.prepare(`
        INSERT INTO transactions(amount, type, category, date, note, receiptUrl, userId, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const now = new Date().toISOString();
      stmt.run(4200, 'income', 'salary', '2026-04-04T08:30:00Z', 'Monthly salary', '', userId, now);
      stmt.run(84.2, 'expense', 'groceries', '2026-04-04T11:45:00Z', 'Weekend grocery run', '', userId, now);
      stmt.run(14.9, 'expense', 'transport', '2026-04-03T15:15:00Z', 'Grab ride', '', userId, now);
      stmt.run(120.0, 'expense', 'utilities', '2026-04-02T09:00:00Z', 'Water bill', '', userId, now);
      stmt.run(250.0, 'income', 'freelance', '2026-04-01T19:00:00Z', 'Side project payment', '', userId, now);

      stmt.finalize(() => {
        closeDb(db);
        if (typeof onDone === 'function') onDone();
      });
    });
  });
}

function startServer() {
  const PORT = process.env.PORT || 5001;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Database: ${DB}`);
    console.log('✓ Backend ready for connections');
  });
  
  server.on('error', (err) => {
    console.error('❌ Server error:', err.message);
  });
}

console.log('🚀 Starting backend...');
ensureTables(() => {
  console.log('✓ Database tables created');
  seedTransactions(() => {
    console.log('✓ Database seeded');
    startServer();
  });
});

// Auth Endpoints
app.post('/api/auth/register', (req, res) => {
  const { username, password, email, phone } = req.body || {};
  if (!username || !password) return res.status(400).json({ message: 'username and password are required' });

  const db = openDb();
  db.run(
    'INSERT INTO users(username, password, email, phone, createdAt) VALUES (?, ?, ?, ?, ?)',
    [username.trim(), hashPassword(password), email, phone, new Date().toISOString()],
    function(err) {
      closeDb(db);
      if (err) {
        if (String(err.message).includes('UNIQUE')) return res.status(409).json({ message: 'username already exists' });
        return res.status(500).json({ message: 'Database error' });
      }
      return res.status(201).json({ id: this.lastID, username: username.trim() });
    }
  );
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ message: 'username and password are required' });

  const db = openDb();
  db.get('SELECT id, username, password FROM users WHERE username = ?', [username.trim()], (err, row) => {
    if (err) { closeDb(db); return res.status(500).json({ message: 'Database error' }); }
    if (!row || !verifyPassword(password, row.password)) { closeDb(db); return res.status(401).json({ message: 'Invalid credentials' }); }

    const token = generateToken();
    db.run('INSERT INTO sessions(token, userId, createdAt) VALUES (?, ?, ?)', [token, row.id, new Date().toISOString()], insertErr => {
      closeDb(db);
      if (insertErr) return res.status(500).json({ message: 'Database error' });
      return res.status(200).json({ token, user: { id: row.id, username: row.username } });
    });
  });
});

app.post('/api/auth/logout', (req, res) => {
  const token = (req.body && req.body.token) ? String(req.body.token).trim() : getBearerToken(req);
  if (!token) return res.status(400).json({ message: 'token is required' });
  const db = openDb();
  db.run('DELETE FROM sessions WHERE token = ?', [token], function(err) {
    closeDb(db);
    return res.status(200).json({ ok: true, affected: this.changes });
  });
});

app.get('/api/auth/profile', requireAuth, (req, res) => {
  const db = openDb();
  db.get('SELECT id, username, email, phone, createdAt FROM users WHERE id = ?', [req.auth.userId], (err, row) => {
    closeDb(db);
    if (err) return res.status(500).json({ message: 'Database error' });
    if (!row) return res.status(404).json({ message: 'User not found' });
    res.json(row);
  });
});

app.put('/api/auth/profile', requireAuth, (req, res) => {
  const { username, email, phone } = req.body;
  if (!username) return res.status(400).json({ message: 'username is required' });
  const db = openDb();
  db.run('UPDATE users SET username = ?, email = ?, phone = ? WHERE id = ?', [username.trim(), email, phone, req.auth.userId], function(err) {
    closeDb(db);
    if (err) {
      if (err.message.includes('UNIQUE')) return res.status(409).json({ message: 'username already exists' });
      return res.status(500).json({ message: 'Database error' });
    }
    res.json({ ok: true });
  });
});

app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Passwords are required' });

  const db = openDb();
  db.get('SELECT password FROM users WHERE id = ?', [req.auth.userId], (err, row) => {
    if (err || !row) { closeDb(db); return res.status(500).json({ message: 'Database error' }); }
    if (!verifyPassword(currentPassword, row.password)) { closeDb(db); return res.status(401).json({ message: 'Incorrect current password' }); }

    const hashedNew = hashPassword(newPassword);
    db.run('UPDATE users SET password = ? WHERE id = ?', [hashedNew, req.auth.userId], function(updateErr) {
      closeDb(db);
      res.json({ ok: true });
    });
  });
});

// Transaction Endpoints
app.get('/api/transactions', requireAuth, (req, res) => {
  const db = openDb();
  db.all('SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC', [req.auth.userId], (err, rows) => {
    closeDb(db);
    if (err) return res.status(500).json({ message: 'Database error' });
    res.status(200).json(rows || []);
  });
});

app.post('/api/transactions', requireAuth, (req, res) => {
  const { amount, type, category, date, note, receiptUrl } = req.body || {};
  if (!amount || !type || !category || !date) return res.status(400).json({ message: 'Missing fields' });

  const db = openDb();
  db.run(
    `INSERT INTO transactions(userId, amount, type, category, note, date, createdAt, receiptUrl)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.auth.userId, Number(amount), type, category, note || '', date, new Date().toISOString(), receiptUrl || ''],
    function(err) {
      closeDb(db);
      if (err) return res.status(500).json({ message: 'Database error' });
      res.status(201).json({ id: this.lastID, affected: this.changes });
    }
  );
});

app.put('/api/transactions/:id', requireAuth, (req, res) => {
  const { amount, type, category, date, note, receiptUrl } = req.body || {};
  const db = openDb();
  db.run(
    `UPDATE transactions SET amount = ?, type = ?, category = ?, date = ?, note = ?, receiptUrl = ?
     WHERE id = ? AND userId = ?`,
    [Number(amount), type, category, date, note || '', receiptUrl || '', req.params.id, req.auth.userId],
    function(err) {
      closeDb(db);
      if (err) return res.status(500).json({ message: 'Database error' });
      res.status(200).json({ ok: true, affected: this.changes });
    }
  );
});

app.delete('/api/transactions/:id', requireAuth, (req, res) => {
  const db = openDb();
  db.run('DELETE FROM transactions WHERE id = ? AND userId = ?', [req.params.id, req.auth.userId], function(err) {
    closeDb(db);
    if (err) return res.status(500).json({ message: 'Database error' });
    res.status(200).json({ ok: true, affected: this.changes });
  });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ message: 'username is required' });
  const db = openDb();
  db.get('SELECT id, username FROM users WHERE username = ?', [username.trim()], (err, row) => {
    if (err || !row) { closeDb(db); return res.status(err ? 500 : 404).json({ message: err ? 'Database error' : 'User not found' }); }
    const token = generateToken();
    db.run('INSERT INTO password_resets(token, userId, createdAt) VALUES (?, ?, ?)', [token, row.id, new Date().toISOString()], err => {
      closeDb(db);
      res.status(200).json({ message: 'Reset token created', resetToken: token, username: row.username });
    });
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) return res.status(400).json({ message: 'token and newPassword are required' });
  const db = openDb();
  db.get('SELECT userId FROM password_resets WHERE token = ?', [token], (err, row) => {
    if (err || !row) { closeDb(db); return res.status(err ? 500 : 400).json({ message: err ? 'Database error' : 'Invalid token' }); }
    const hashedPassword = hashPassword(newPassword);
    db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, row.userId], err => {
      db.run('DELETE FROM password_resets WHERE token = ?', [token], () => {
        closeDb(db);
        res.status(200).json({ ok: true });
      });
    });
  });
});
