const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const app = express();
const DB = 'finance_tracker.sqlite';

app.use(express.json());

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
      alterStatements.push("ALTER TABLE transactions ADD COLUMN userId TEXT NOT NULL DEFAULT 'demo-user'");
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
        userId: String(row.userId),
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
        id TEXT PRIMARY KEY NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        note TEXT,
        receiptUrl TEXT,
        userId TEXT NOT NULL
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
            'INSERT INTO users(username, password, createdAt) VALUES (?, ?, ?)',
            ['demo-user', hashPassword('demo123'), new Date().toISOString()]
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
    if (err) {
      console.error(err.message);
      closeDb(db);
      if (typeof onDone === 'function') {
        onDone();
      }
      return;
    }

    if (row && row.total > 0) {
      closeDb(db);
      if (typeof onDone === 'function') {
        onDone();
      }
      return;
    }

    const stmt = db.prepare(`
      INSERT INTO transactions(id, amount, type, category, date, note, receiptUrl, userId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      'seed-1', 4200, 'income', 'salary', '2026-04-04T08:30:00Z', 'Monthly salary', '', 'demo-user',
      seedErr => {
        if (seedErr) {
          console.error(seedErr.message);
        }
      }
    );
    stmt.run(
      'seed-2', 84.2, 'expense', 'groceries', '2026-04-04T11:45:00Z', 'Weekend grocery run', '', 'demo-user',
      seedErr => {
        if (seedErr) {
          console.error(seedErr.message);
        }
      }
    );
    stmt.run(
      'seed-3', 14.9, 'expense', 'transport', '2026-04-03T15:15:00Z', 'Grab ride', '', 'demo-user',
      seedErr => {
        if (seedErr) {
          console.error(seedErr.message);
        }
      }
    );
    stmt.run(
      'seed-4', 120.0, 'expense', 'utilities', '2026-04-02T09:00:00Z', 'Water bill', '', 'demo-user',
      seedErr => {
        if (seedErr) {
          console.error(seedErr.message);
        }
      }
    );
    stmt.run(
      'seed-5', 250.0, 'income', 'freelance', '2026-04-01T19:00:00Z', 'Side project payment', '', 'demo-user',
      seedErr => {
        if (seedErr) {
          console.error(seedErr.message);
        }
      }
    );

    stmt.finalize(() => {
      closeDb(db);
      if (typeof onDone === 'function') {
        onDone();
      }
    });
  });
}

function startServer() {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

ensureTables(() => {
  seedTransactions(() => {
    startServer();
  });
});

// Register
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: 'username and password are required' });
  }

  const db = openDb();
  db.run(
    'INSERT INTO users(username, password, createdAt) VALUES (?, ?, ?)',
    [username.trim(), hashPassword(password), new Date().toISOString()],
    function onInsert(err) {
      closeDb(db);
      if (err) {
        if (String(err.message || '').includes('UNIQUE')) {
          return res.status(409).json({ message: 'username already exists' });
        }
        return res.status(500).json({ message: 'Database error' });
      }

      return res.status(201).json({ id: this.lastID, username: username.trim() });
    }
  );
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: 'username and password are required' });
  }

  const db = openDb();
  db.get(
    'SELECT id, username, password FROM users WHERE username = ?',
    [username.trim()],
    (err, row) => {
      if (err) {
        closeDb(db);
        return res.status(500).json({ message: 'Database error' });
      }

      if (!row || !verifyPassword(password, row.password)) {
        closeDb(db);
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = generateToken();
      db.run(
        'INSERT INTO sessions(token, userId, createdAt) VALUES (?, ?, ?)',
        [token, row.id, new Date().toISOString()],
        insertErr => {
          closeDb(db);
          if (insertErr) {
            return res.status(500).json({ message: 'Database error' });
          }

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

// Logout
app.post('/api/auth/logout', (req, res) => {
  const bodyToken = (req.body && req.body.token) ? String(req.body.token).trim() : '';
  const token = bodyToken || getBearerToken(req);

  if (!token) {
    return res.status(400).json({ message: 'token is required' });
  }

  const db = openDb();
  db.run('DELETE FROM sessions WHERE token = ?', [token], function onDelete(err) {
    closeDb(db);
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    return res.status(200).json({ ok: true, affected: this.changes });
  });
});

// Forgot password
app.post('/api/auth/forgot-password', (req, res) => {
  const { username } = req.body || {};

  if (!username) {
    return res.status(400).json({ message: 'username is required' });
  }

  const db = openDb();
  db.get(
    'SELECT id, username FROM users WHERE username = ?',
    [username.trim()],
    (err, row) => {
      if (err) {
        closeDb(db);
        return res.status(500).json({ message: 'Database error' });
      }

      if (!row) {
        closeDb(db);
        return res.status(404).json({ message: 'User not found' });
      }

      const token = generateToken();
      db.run(
        'INSERT INTO password_resets(token, userId, createdAt) VALUES (?, ?, ?)',
        [token, row.id, new Date().toISOString()],
        insertErr => {
          closeDb(db);
          if (insertErr) {
            return res.status(500).json({ message: 'Database error' });
          }

          return res.status(200).json({
            message: 'Reset token created',
            resetToken: token,
            username: row.username,
          });
        }
      );
    }
  );
});

// Reset password
app.post('/api/auth/reset-password', (req, res) => {
  const { token, newPassword } = req.body || {};

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'token and newPassword are required' });
  }

  const db = openDb();
  db.get(
    'SELECT userId FROM password_resets WHERE token = ?',
    [token],
    (err, row) => {
      if (err) {
        closeDb(db);
        return res.status(500).json({ message: 'Database error' });
      }

      if (!row) {
        closeDb(db);
        return res.status(400).json({ message: 'Invalid reset token' });
      }

      const hashedPassword = hashPassword(newPassword);
      db.run(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, row.userId],
        updateErr => {
          if (updateErr) {
            closeDb(db);
            return res.status(500).json({ message: 'Database error' });
          }

          db.run('DELETE FROM password_resets WHERE token = ?', [token], deleteErr => {
            closeDb(db);
            if (deleteErr) {
              return res.status(500).json({ message: 'Database error' });
            }

            return res.status(200).json({ ok: true });
          });
        }
      );
    }
  );
});

// Transactions
app.get('/api/transactions', requireAuth, (req, res) => {
  const db = openDb();

  db.all(
    'SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC',
    [req.auth.userId],
    (err, rows) => {
      closeDb(db);
      if (err) return res.status(500).json({ message: 'Database error' });
      return res.status(200).json(rows);
    }
  );
});

app.get('/api/transactions/:id', requireAuth, (req, res) => {
  const db = openDb();

  db.get(
    'SELECT * FROM transactions WHERE id = ? AND userId = ?',
    [req.params.id, req.auth.userId],
    (err, row) => {
      closeDb(db);
      if (err) return res.status(500).json({ message: 'Database error' });
      if (!row) return res.status(404).json({ message: 'Transaction not found' });
      return res.status(200).json(row);
    }
  );
});

app.post('/api/transactions', requireAuth, (req, res) => {
  if (!req.body) return res.sendStatus(400);

  const { amount, type, category, date, note, receiptUrl } = req.body;
  if (!amount || !type || !category || !date) {
    return res.status(400).json({ message: 'amount, type, category, date are required' });
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const db = openDb();

  db.run(
    `INSERT INTO transactions(id, amount, type, category, date, note, receiptUrl, userId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, Number(amount), type, category, date, note || '', receiptUrl || '', req.auth.userId],
    function onInsert(err) {
      closeDb(db);
      if (err) return res.status(500).json({ message: 'Database error' });
      return res.status(201).json({ id, affected: this.changes });
    }
  );
});

app.put('/api/transactions/:id', requireAuth, (req, res) => {
  if (!req.body) return res.sendStatus(400);

  const { amount, type, category, date, note, receiptUrl } = req.body;
  if (!amount || !type || !category || !date) {
    return res.status(400).json({ message: 'amount, type, category, date are required' });
  }

  const db = openDb();

  db.run(
    `UPDATE transactions
     SET amount = ?, type = ?, category = ?, date = ?, note = ?, receiptUrl = ?
     WHERE id = ? AND userId = ?`,
    [Number(amount), type, category, date, note || '', receiptUrl || '', req.params.id, req.auth.userId],
    function onUpdate(err) {
      closeDb(db);
      if (err) return res.status(500).json({ message: 'Database error' });
      if (!this.changes) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      return res.status(200).json({ id: req.params.id, affected: this.changes });
    }
  );
});

app.delete('/api/transactions/:id', requireAuth, (req, res) => {
  const db = openDb();

  db.run(
    'DELETE FROM transactions WHERE id = ? AND userId = ?',
    [req.params.id, req.auth.userId],
    function onDelete(err) {
      closeDb(db);
      if (err) return res.status(500).json({ message: 'Database error' });
      if (!this.changes) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      return res.status(200).json({ id: req.params.id, affected: this.changes });
    }
  );
});
