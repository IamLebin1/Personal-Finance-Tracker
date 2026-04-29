const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const http = require('http');
const { Server } = require('socket.io');

const path = require('path');
const app = express();
const DB = path.join(__dirname, 'finance_tracker.sqlite');
let financeNamespace = null;

app.use(cors());
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
    if (!existingColumns.has('walletId')) {
      alterStatements.push("ALTER TABLE transactions ADD COLUMN walletId INTEGER REFERENCES wallets(id) ON DELETE SET NULL");
    }
    if (!existingColumns.has('recurringTransactionId')) {
      alterStatements.push("ALTER TABLE transactions ADD COLUMN recurringTransactionId INTEGER REFERENCES recurring_transactions(id) ON DELETE SET NULL");
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
          console.error(`Error altering table: ${sql}`, alterErr.message);
        }

        pending -= 1;
        if (pending === 0 && typeof onDone === 'function') {
          onDone();
        }
      });
    });
  });
}

function isValidRecurringFrequency(frequency) {
  return ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'].includes(String(frequency || '').toLowerCase());
}

function addRecurringInterval(dateValue, frequency, intervalCount = 1) {
  const nextDate = new Date(dateValue);
  const normalizedFrequency = String(frequency || '').toLowerCase();
  const steps = Math.max(1, Number(intervalCount) || 1);

  if (normalizedFrequency === 'weekly') {
    nextDate.setDate(nextDate.getDate() + (7 * steps));
  } else if (normalizedFrequency === 'biweekly') {
    nextDate.setDate(nextDate.getDate() + (14 * steps));
  } else if (normalizedFrequency === 'monthly') {
    nextDate.setMonth(nextDate.getMonth() + steps);
  } else if (normalizedFrequency === 'quarterly') {
    nextDate.setMonth(nextDate.getMonth() + (3 * steps));
  } else if (normalizedFrequency === 'yearly') {
    nextDate.setFullYear(nextDate.getFullYear() + steps);
  }

  return nextDate;
}

function emitBudgetAlertsForUser(userId, dateValue) {
  if (!financeNamespace) {
    return;
  }

  const targetDate = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(targetDate.getTime())) {
    return;
  }

  const monthKey = targetDate.toISOString().slice(0, 7);
  const db = openDb();

  db.all(
    `SELECT b.category, b.amount AS budgetAmount,
            COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS actualAmount
     FROM budgets b
     LEFT JOIN transactions t
       ON t.userId = b.userId
      AND t.category = b.category
      AND substr(t.date, 1, 7) = b.month
     WHERE b.userId = ? AND b.month = ?
     GROUP BY b.category, b.amount`,
    [userId, monthKey],
    (err, rows) => {
      closeDb(db);

      if (err || !rows || rows.length === 0) {
        return;
      }

      rows.forEach(row => {
        const budgetAmount = Number(row.budgetAmount) || 0;
        const actualAmount = Number(row.actualAmount) || 0;
        if (budgetAmount > 0 && actualAmount >= budgetAmount * 0.9) {
          financeNamespace.to(`user_${userId}`).emit('budget_alert', {
            category: row.category,
            spent: Math.round(actualAmount * 100) / 100,
            limit: Math.round(budgetAmount * 100) / 100,
            percentUsed: Math.round((actualAmount / budgetAmount) * 100),
            message: `${row.category} budget is ${Math.round((actualAmount / budgetAmount) * 100)}% used for ${monthKey}`,
          });
        }
      });
    }
  );
}

function ensureRecurringTransactionsColumns(db, onDone) {
  db.all('PRAGMA table_info(recurring_transactions)', [], (err, rows) => {
    if (err) {
      console.error(err.message);
      if (typeof onDone === 'function') {
        onDone();
      }
      return;
    }

    const existingColumns = new Set((rows || []).map(column => column.name));
    const alterStatements = [];

    if (!existingColumns.has('walletId')) {
      alterStatements.push('ALTER TABLE recurring_transactions ADD COLUMN walletId INTEGER REFERENCES wallets(id) ON DELETE SET NULL');
    }
    if (!existingColumns.has('endDate')) {
      alterStatements.push('ALTER TABLE recurring_transactions ADD COLUMN endDate TEXT');
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
          console.error(`Error altering table: ${sql}`, alterErr.message);
        }

        pending -= 1;
        if (pending === 0 && typeof onDone === 'function') {
          onDone();
        }
      });
    });
  });
}

function syncRecurringTransactionsForUser(db, userId, onDone) {
  db.all(
    `SELECT *
     FROM recurring_transactions
     WHERE userId = ? AND isActive = 1
     ORDER BY nextRunDate ASC`,
    [userId],
    (err, schedules) => {
      if (err) {
        console.error(err.message);
        if (typeof onDone === 'function') {
          onDone(err);
        }
        return;
      }

      if (!schedules || schedules.length === 0) {
        if (typeof onDone === 'function') {
          onDone(null, { generated: 0 });
        }
        return;
      }

      const now = new Date();
      let generated = 0;
      let pending = schedules.length;

      const finishOne = () => {
        pending -= 1;
        if (pending === 0 && typeof onDone === 'function') {
          onDone(null, { generated });
        }
      };

      schedules.forEach(schedule => {
        const scheduleId = schedule.id;
        const amount = Number(schedule.amount);
        const frequency = String(schedule.frequency || '').toLowerCase();
        const intervalCount = Math.max(1, Number(schedule.intervalCount) || 1);
        const walletId = schedule.walletId ?? null;
        const note = schedule.note || '';
        const category = schedule.category;
        const type = schedule.type;
        const nextRunStart = new Date(schedule.nextRunDate);
        const endDate = schedule.endDate ? new Date(schedule.endDate) : null;

        if (Number.isNaN(nextRunStart.getTime()) || !isValidRecurringFrequency(frequency)) {
          finishOne();
          return;
        }

        const processNextOccurrence = () => {
          const dueDate = new Date(nextRunStart);

          if (endDate && dueDate > endDate) {
            db.run(
              'UPDATE recurring_transactions SET isActive = 0, updatedAt = ? WHERE id = ? AND userId = ?',
              [new Date().toISOString(), scheduleId, userId],
              () => finishOne()
            );
            return;
          }

          if (dueDate > now) {
            db.run(
              'UPDATE recurring_transactions SET nextRunDate = ?, updatedAt = ? WHERE id = ? AND userId = ?',
              [dueDate.toISOString(), new Date().toISOString(), scheduleId, userId],
              () => finishOne()
            );
            return;
          }

          db.run(
            `INSERT INTO transactions(userId, amount, type, category, note, date, createdAt, receiptUrl, walletId, recurringTransactionId)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              userId,
              amount,
              type,
              category,
              note,
              dueDate.toISOString(),
              new Date().toISOString(),
              '',
              walletId,
              scheduleId,
            ],
            insertErr => {
              if (!insertErr) {
                generated += 1;
                emitBudgetAlertsForUser(userId, dueDate.toISOString());
              } else {
                console.error('Error creating recurring transaction:', insertErr.message);
              }

              const nextRun = addRecurringInterval(dueDate, frequency, intervalCount);
              const shouldDeactivate = endDate && nextRun > endDate;

              db.run(
                'UPDATE recurring_transactions SET lastRunDate = ?, nextRunDate = ?, isActive = ?, updatedAt = ? WHERE id = ? AND userId = ?',
                [
                  dueDate.toISOString(),
                  nextRun.toISOString(),
                  shouldDeactivate ? 0 : 1,
                  new Date().toISOString(),
                  scheduleId,
                  userId,
                ],
                () => {
                  nextRunStart.setTime(nextRun.getTime());
                  if (nextRun <= now && !shouldDeactivate) {
                    processNextOccurrence();
                  } else {
                    finishOne();
                  }
                }
              );
            }
          );
        };

        processNextOccurrence();
      });
    }
  );
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
        profilePic TEXT,
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

    // Wallets table
    db.run(`
      CREATE TABLE IF NOT EXISTS wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        name TEXT NOT NULL,
        color TEXT,
        icon TEXT,
        initialBalance REAL DEFAULT 0,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Budgets table
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

    // Transaction table
    db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        walletId INTEGER,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer')),
        category TEXT NOT NULL,
        note TEXT DEFAULT '',
        date TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        receiptUrl TEXT,
        recurringTransactionId INTEGER,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (walletId) REFERENCES wallets(id) ON DELETE SET NULL,
        FOREIGN KEY (recurringTransactionId) REFERENCES recurring_transactions(id) ON DELETE SET NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS recurring_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        walletId INTEGER,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        category TEXT NOT NULL,
        note TEXT DEFAULT '',
        frequency TEXT NOT NULL CHECK(frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
        intervalCount INTEGER NOT NULL DEFAULT 1,
        nextRunDate TEXT NOT NULL,
        lastRunDate TEXT,
        endDate TEXT,
        isActive INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (walletId) REFERENCES wallets(id) ON DELETE SET NULL
      )
    `);

    db.run(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_date
      ON transactions(userId, date DESC)
    `);

    ensureTransactionColumns(db, () => {
      ensureRecurringTransactionsColumns(db, () => {
        db.run(`
          CREATE INDEX IF NOT EXISTS idx_transactions_wallet
          ON transactions(walletId)
        `);
        db.run(`
          CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user_next
          ON recurring_transactions(userId, isActive, nextRunDate)
        `);
        // Seed default wallet for each user if not exists
        db.all('SELECT id FROM users', [], (userErr, userRows) => {
        if (!userErr && userRows && userRows.length > 0) {
          let userPending = userRows.length;
          userRows.forEach(user => {
            db.get('SELECT id FROM wallets WHERE userId = ? LIMIT 1', [user.id], (walletErr, walletRow) => {
              if (!walletErr && !walletRow) {
                db.run(
                  'INSERT INTO wallets(userId, name, color, icon, createdAt) VALUES (?, ?, ?, ?, ?)',
                  [user.id, 'Main Wallet', '#6e57ff', '👛', new Date().toISOString()],
                  function(insertErr) {
                    if (!insertErr) {
                      const defaultWalletId = this.lastID;
                      // Update existing transactions for this user that have NULL walletId
                      db.run('UPDATE transactions SET walletId = ? WHERE userId = ? AND walletId IS NULL', [defaultWalletId, user.id]);
                    }
                    userPending -= 1;
                    if (userPending === 0) finish();
                  }
                );
              } else {
                userPending -= 1;
                if (userPending === 0) finish();
              }
            });
          });
        } else {
          finish();
        }
      });

      function finish() {
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
      db.get('SELECT id FROM wallets WHERE userId = ? LIMIT 1', [userId], (wErr, wRow) => {
        const walletId = wRow ? wRow.id : null;
        
        const stmt = db.prepare(`
          INSERT INTO transactions(amount, type, category, date, note, receiptUrl, userId, createdAt, walletId)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const now = new Date().toISOString();
        stmt.run(4200, 'income', 'salary', '2026-04-04T08:30:00Z', 'Monthly salary', '', userId, now, walletId);
        stmt.run(84.2, 'expense', 'groceries', '2026-04-04T11:45:00Z', 'Weekend grocery run', '', userId, now, walletId);
        stmt.run(14.9, 'expense', 'transport', '2026-04-03T15:15:00Z', 'Grab ride', '', userId, now, walletId);
        stmt.run(120.0, 'expense', 'utilities', '2026-04-02T09:00:00Z', 'Water bill', '', userId, now, walletId);
        stmt.run(250.0, 'income', 'freelance', '2026-04-01T19:00:00Z', 'Side project payment', '', userId, now, walletId);

        stmt.finalize(() => {
          closeDb(db);
          if (typeof onDone === 'function') onDone();
        });
      });
    });
  });
}


function startServer() {
  const PORT = process.env.PORT || 5001;
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  // Socket.IO namespace for finance notifications
  const finance = io.of('/finance');

  finance.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.id}`);

    // Receive user login event
    socket.on('user_login', (data) => {
      const userId = data.userId;
      // Join user to their own room for private notifications
      socket.join(`user_${userId}`);
      console.log(`[Socket] User ${userId} joined room`);
    });

    // Listen for budget check requests
    socket.on('check_budget', (data) => {
      const { userId, category, spent, limit } = data;
      const percentUsed = (spent / limit) * 100;
      
      if (percentUsed >= 90) {
        // Emit budget alert back to specific user
        finance.to(`user_${userId}`).emit('budget_alert', {
          category,
          spent: Math.round(spent * 100) / 100,
          limit: Math.round(limit * 100) / 100,
          percentUsed: Math.round(percentUsed),
          message: `You have used ${Math.round(percentUsed)}% of your ${category} budget`
        });
      }
    });

    // Listen for recurring transaction sync
    socket.on('sync_recurring', (data) => {
      const { userId, syncedCount } = data;
      finance.to(`user_${userId}`).emit('recurring_synced', {
        syncedCount,
        message: `${syncedCount} recurring transactions processed`,
        timestamp: new Date().toISOString()
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.id}`);
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Database: ${DB}`);
    console.log('✓ WebSocket listening on /finance namespace');
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
  db.get('SELECT id, username, email, phone, profilePic, createdAt FROM users WHERE id = ?', [req.auth.userId], (err, row) => {
    closeDb(db);
    if (err) return res.status(500).json({ message: 'Database error' });
    if (!row) return res.status(404).json({ message: 'User not found' });
    res.json(row);
  });
});

app.put('/api/auth/profile', requireAuth, (req, res) => {
  const { username, email, phone, profilePic } = req.body;
  if (!username) return res.status(400).json({ message: 'username is required' });
  const db = openDb();
  db.run('UPDATE users SET username = ?, email = ?, phone = ?, profilePic = ? WHERE id = ?', [username.trim(), email, phone, profilePic || null, req.auth.userId], function(err) {
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

// Wallet Endpoints
app.get('/api/wallets', requireAuth, (req, res) => {
  const db = openDb();
  db.all('SELECT * FROM wallets WHERE userId = ? ORDER BY createdAt ASC', [req.auth.userId], (err, rows) => {
    closeDb(db);
    if (err) return res.status(500).json({ message: 'Database error' });
    res.status(200).json(rows || []);
  });
});

app.post('/api/wallets', requireAuth, (req, res) => {
  const { name, color, icon, initialBalance } = req.body || {};
  if (!name) return res.status(400).json({ message: 'Wallet name is required' });

  const balance = typeof initialBalance === 'number' && initialBalance >= 0 ? initialBalance : 0;

  const db = openDb();
  db.run(
    'INSERT INTO wallets(userId, name, color, icon, initialBalance, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
    [req.auth.userId, name, color || '#6e57ff', icon || '👛', balance, new Date().toISOString()],
    function(err) {
      closeDb(db);
      if (err) return res.status(500).json({ message: 'Database error' });
      res.status(201).json({ id: this.lastID, affected: this.changes });
    }
  );
});

app.put('/api/wallets/:id', requireAuth, (req, res) => {
  const { name, color, icon } = req.body || {};
  if (!name) return res.status(400).json({ message: 'Wallet name is required' });

  const db = openDb();
  db.run(
    'UPDATE wallets SET name = ?, color = ?, icon = ? WHERE id = ? AND userId = ?',
    [name, color, icon, req.params.id, req.auth.userId],
    function(err) {
      closeDb(db);
      if (err) return res.status(500).json({ message: 'Database error' });
      res.status(200).json({ ok: true, affected: this.changes });
    }
  );
});

app.delete('/api/wallets/:id', requireAuth, (req, res) => {
  const db = openDb();
  // We should also handle transactions associated with this wallet.
  // The table is created with ON DELETE SET NULL, so transactions will remain but walletId will be null.
  db.run('DELETE FROM wallets WHERE id = ? AND userId = ?', [req.params.id, req.auth.userId], function(err) {
    closeDb(db);
    if (err) return res.status(500).json({ message: 'Database error' });
    res.status(200).json({ ok: true, affected: this.changes });
  });
});

// Transaction Endpoints
app.get('/api/transactions', requireAuth, (req, res) => {
  const { walletId } = req.query;
  const db = openDb();
  let sql = 'SELECT * FROM transactions WHERE userId = ?';
  let params = [req.auth.userId];

  if (walletId) {
    sql += ' AND walletId = ?';
    params.push(walletId);
  }

  sql += ' ORDER BY date DESC';

  db.all(sql, params, (err, rows) => {
    closeDb(db);
    if (err) return res.status(500).json({ message: 'Database error' });
    res.status(200).json(rows || []);
  });
});

app.post('/api/transactions', requireAuth, (req, res) => {
  const { amount, type, category, date, note, receiptUrl, walletId } = req.body || {};
  if (!amount || !type || !category || !date) return res.status(400).json({ message: 'Missing fields' });

  const db = openDb();
  db.run(
    `INSERT INTO transactions(userId, amount, type, category, note, date, createdAt, receiptUrl, walletId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.auth.userId, Number(amount), type, category, note || '', date, new Date().toISOString(), receiptUrl || '', walletId || null],
    function(err) {
      closeDb(db);
      if (err) return res.status(500).json({ message: 'Database error' });
      emitBudgetAlertsForUser(req.auth.userId, date);
      res.status(201).json({ id: this.lastID, affected: this.changes });
    }
  );
});

app.put('/api/transactions/:id', requireAuth, (req, res) => {
  const { amount, type, category, date, note, receiptUrl, walletId } = req.body || {};
  const db = openDb();
  db.run(
    `UPDATE transactions SET amount = ?, type = ?, category = ?, date = ?, note = ?, receiptUrl = ?, walletId = ?
     WHERE id = ? AND userId = ?`,
    [Number(amount), type, category, date, note || '', receiptUrl || '', walletId || null, req.params.id, req.auth.userId],
    function(err) {
      closeDb(db);
      if (err) return res.status(500).json({ message: 'Database error' });
      emitBudgetAlertsForUser(req.auth.userId, date);
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

// Recurring Transaction Endpoints
app.get('/api/recurring-transactions', requireAuth, (req, res) => {
  const db = openDb();
  db.all(
    'SELECT * FROM recurring_transactions WHERE userId = ? ORDER BY nextRunDate ASC',
    [req.auth.userId],
    (err, rows) => {
      closeDb(db);
      if (err) return res.status(500).json({ message: 'Database error' });
      res.status(200).json(rows || []);
    }
  );
});

app.post('/api/recurring-transactions', requireAuth, (req, res) => {
  const { amount, type, category, note, frequency, intervalCount, nextRunDate, endDate, walletId } = req.body || {};
  if (!amount || !type || !category || !frequency || !nextRunDate) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  if (!isValidRecurringFrequency(frequency)) {
    return res.status(400).json({ message: 'Invalid frequency' });
  }

  if (!['income', 'expense'].includes(String(type))) {
    return res.status(400).json({ message: 'Recurring transactions must be income or expense' });
  }

  const db = openDb();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO recurring_transactions(userId, walletId, amount, type, category, note, frequency, intervalCount, nextRunDate, endDate, isActive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      req.auth.userId,
      walletId || null,
      Number(amount),
      String(type),
      category,
      note || '',
      String(frequency).toLowerCase(),
      Math.max(1, Number(intervalCount) || 1),
      nextRunDate,
      endDate || null,
      1,
      now,
      now,
    ],
    function(err) {
      closeDb(db);
      if (err) return res.status(500).json({ message: 'Database error' });
      res.status(201).json({ id: this.lastID, affected: this.changes });
    }
  );
});

app.put('/api/recurring-transactions/:id', requireAuth, (req, res) => {
  const { amount, type, category, note, frequency, intervalCount, nextRunDate, endDate, walletId, isActive } = req.body || {};
  if (!amount || !type || !category || !frequency || !nextRunDate) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  if (!isValidRecurringFrequency(frequency)) {
    return res.status(400).json({ message: 'Invalid frequency' });
  }

  if (!['income', 'expense'].includes(String(type))) {
    return res.status(400).json({ message: 'Recurring transactions must be income or expense' });
  }

  const db = openDb();
  db.run(
    `UPDATE recurring_transactions
     SET amount = ?, type = ?, category = ?, note = ?, frequency = ?, intervalCount = ?, nextRunDate = ?, endDate = ?, walletId = ?, isActive = ?, updatedAt = ?
     WHERE id = ? AND userId = ?`,
    [
      Number(amount),
      String(type),
      category,
      note || '',
      String(frequency).toLowerCase(),
      Math.max(1, Number(intervalCount) || 1),
      nextRunDate,
      endDate || null,
      walletId || null,
      isActive ? 1 : 0,
      new Date().toISOString(),
      req.params.id,
      req.auth.userId,
    ],
    function(err) {
      closeDb(db);
      if (err) return res.status(500).json({ message: 'Database error' });
      emitBudgetAlertsForUser(req.auth.userId, month + '-01');
      res.status(200).json({ ok: true, affected: this.changes });
    }
  );
});

app.delete('/api/recurring-transactions/:id', requireAuth, (req, res) => {
  const db = openDb();
  db.run('DELETE FROM recurring_transactions WHERE id = ? AND userId = ?', [req.params.id, req.auth.userId], function(err) {
    closeDb(db);
    if (err) return res.status(500).json({ message: 'Database error' });
    res.status(200).json({ ok: true, affected: this.changes });
  });
});

app.post('/api/recurring-transactions/sync', requireAuth, (req, res) => {
  const db = openDb();
  syncRecurringTransactionsForUser(db, req.auth.userId, (err, result) => {
    closeDb(db);
    if (err) return res.status(500).json({ message: 'Database error' });
    res.status(200).json(result || { generated: 0 });
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

// Budget Endpoints
app.get('/api/budgets', requireAuth, (req, res) => {
  const month = (req.query.month || '').toString();
  if (!month) return res.status(400).json({ message: 'month query is required, format YYYY-MM' });

  const db = openDb();
  db.all(
    'SELECT id, category, month, amount, createdAt FROM budgets WHERE userId = ? AND month = ? ORDER BY category ASC',
    [req.auth.userId, month],
    (err, rows) => {
      closeDb(db);
      if (err) return res.status(500).json({ message: 'Database error' });
      res.status(200).json(rows || []);
    }
  );
});

app.post('/api/budgets', requireAuth, (req, res) => {
  const { category, month, amount } = req.body || {};
  if (!category || !month || amount === undefined) return res.status(400).json({ message: 'category, month and amount are required' });

  const db = openDb();
  db.run(
    `INSERT INTO budgets(userId, category, month, amount, createdAt)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(userId, category, month)
     DO UPDATE SET amount = excluded.amount`,
    [req.auth.userId, category.trim(), month, Number(amount), new Date().toISOString()],
    function(err) {
      closeDb(db);
      if (err) return res.status(500).json({ message: 'Database error' });
      res.status(200).json({ ok: true, affected: this.changes });
    }
  );
});

app.get('/api/analytics/budget-vs-actual', requireAuth, (req, res) => {
  const month = (req.query.month || '').toString();
  if (!month) return res.status(400).json({ message: 'month query is required, format YYYY-MM' });

  const db = openDb();
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
    [req.auth.userId, month],
    (err, rows) => {
      closeDb(db);
      if (err) return res.status(500).json({ message: 'Database error' });
      res.status(200).json(rows || []);
    }
  );
});
