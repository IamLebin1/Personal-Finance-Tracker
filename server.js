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

  initDb.run(
    `CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      section TEXT,
      institution TEXT,
      accountName TEXT,
      accountType TEXT,
      balance REAL,
      maskedNumber TEXT,
      status TEXT,
      growthPct REAL,
      accentColor TEXT,
      FOREIGN KEY (userId) REFERENCES users(id)
    )`,
  );

  initDb.run(
    `CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      category TEXT,
      target REAL,
      createdAt TEXT,
      updatedAt TEXT,
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

function rowToAccount(row) {
  return {
    id: row.id,
    userId: row.userId,
    section: row.section,
    institution: row.institution,
    accountName: row.accountName,
    accountType: row.accountType,
    balance: row.balance,
    maskedNumber: row.maskedNumber,
    status: row.status,
    growthPct: row.growthPct,
    accentColor: row.accentColor,
  };
}

function rowToBudget(row) {
  return {
    id: row.id,
    userId: row.userId,
    category: row.category,
    target: row.target,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function seedDefaultAccounts(db, userId, callback) {
  const defaults = [
    ['Checking & Savings', 'Chase Bank', 'CHASE CHECKING', 'Visa', 12450.0, '**** 4521', 'Active', 0, '#117aca'],
    ['Checking & Savings', 'American Express', 'AMEX GOLD', 'Amex', 4230.5, '**** 3310', 'Due Soon', 0, '#006fcf'],
    ['Investment', 'Fidelity', 'FIDELITY INVESTMENT', 'Brokerage', 85120.0, 'Individual Brokerage', 'Growing', 5.2, '#128a2a'],
  ];

  let completed = 0;

  db.serialize(() => {
    defaults.forEach(entry => {
      db.run(
        `INSERT INTO accounts(userId,section,institution,accountName,accountType,balance,maskedNumber,status,growthPct,accentColor)
         VALUES(?,?,?,?,?,?,?,?,?,?)`,
        [userId, ...entry],
        () => {
          completed += 1;

          if (completed === defaults.length) {
            callback();
          }
        },
      );
    });
  });
}

function seedDefaultBudgets(db, userId, callback) {
  const now = new Date().toISOString();
  const defaults = [
    ['Food', 450],
    ['Housing', 1500],
    ['Entertainment', 300],
  ];

  let completed = 0;

  db.serialize(() => {
    defaults.forEach(entry => {
      db.run(
        `INSERT INTO budgets(userId,category,target,createdAt,updatedAt)
         VALUES(?,?,?,?,?)`,
        [userId, entry[0], entry[1], now, now],
        () => {
          completed += 1;

          if (completed === defaults.length) {
            callback();
          }
        },
      );
    });
  });
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
  const userId = req.query.userId ? String(req.query.userId) : '';
  const query = userId
    ? 'SELECT * FROM transactions WHERE userId=? ORDER BY id DESC'
    : 'SELECT * FROM transactions ORDER BY id DESC';
  const params = userId ? [userId] : [];

  db.all(query, params, (err, rows) => {
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

// GET all accounts
app.get('/api/accounts', (req, res) => {
  const userId = req.query.userId ? String(req.query.userId) : '';

  if (!userId) {
    return res.json([]);
  }

  const db = new sqlite3.Database(DB);
  db.get('SELECT COUNT(*) AS count FROM accounts WHERE userId=?', [userId], (countErr, row) => {
    if (countErr) {
      db.close();
      return res.status(500).json({ error: countErr.message });
    }

    const finishQuery = () => {
      db.all('SELECT * FROM accounts WHERE userId=? ORDER BY id DESC', [userId], (err, rows) => {
        if (err) {
          db.close();
          return res.status(500).json({ error: err.message });
        }

        res.json(rows.map(rowToAccount));
        db.close();
      });
    };

    if (row && row.count === 0) {
      seedDefaultAccounts(db, userId, finishQuery);
      return;
    }

    finishQuery();
  });
});

// POST new account
app.post('/api/accounts', (req, res) => {
  const {
    userId,
    section,
    institution,
    accountName,
    accountType,
    balance,
    maskedNumber,
    status,
    growthPct,
    accentColor,
  } = req.body;

  if (!userId || !institution || !accountName) {
    return res.status(400).json({ error: 'Missing account details' });
  }

  const db = new sqlite3.Database(DB);
  const stmt = `INSERT INTO accounts(userId,section,institution,accountName,accountType,balance,maskedNumber,status,growthPct,accentColor)
    VALUES(?,?,?,?,?,?,?,?,?,?)`;

  db.run(
    stmt,
    [
      userId,
      section || 'Checking & Savings',
      institution,
      accountName,
      accountType || 'Account',
      Number(balance) || 0,
      maskedNumber || '',
      status || 'Active',
      Number(growthPct) || 0,
      accentColor || '#4f46e5',
    ],
    function (err) {
      if (err) {
        db.close();
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({ id: this.lastID, affected: this.changes });
      db.close();
    },
  );
});

// PUT update account
app.put('/api/accounts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const db = new sqlite3.Database(DB);
  const {
    section,
    institution,
    accountName,
    accountType,
    balance,
    maskedNumber,
    status,
    growthPct,
    accentColor,
  } = req.body;

  const stmt = `UPDATE accounts SET
    section=?, institution=?, accountName=?, accountType=?, balance=?, maskedNumber=?, status=?, growthPct=?, accentColor=?
    WHERE id=?`;

  db.run(
    stmt,
    [
      section,
      institution,
      accountName,
      accountType,
      balance,
      maskedNumber,
      status,
      growthPct,
      accentColor,
      id,
    ],
    function (err) {
      if (err) {
        db.close();
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({ id: id, affected: this.changes });
      db.close();
    },
  );
});

// DELETE account
app.delete('/api/accounts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const db = new sqlite3.Database(DB);
  db.run('DELETE FROM accounts WHERE id=?', [id], function (err) {
    if (err) {
      db.close();
      return res.status(500).json({ error: err.message });
    }

    res.status(201).json({ id: id, affected: this.changes });
    db.close();
  });
});

// GET budgets by user
app.get('/api/budgets', (req, res) => {
  const userId = req.query.userId ? String(req.query.userId) : '';

  if (!userId) {
    return res.json([]);
  }

  const db = new sqlite3.Database(DB);
  db.get('SELECT COUNT(*) AS count FROM budgets WHERE userId=?', [userId], (countErr, row) => {
    if (countErr) {
      db.close();
      return res.status(500).json({ error: countErr.message });
    }

    const finishQuery = () => {
      db.all('SELECT * FROM budgets WHERE userId=? ORDER BY id ASC', [userId], (err, rows) => {
        if (err) {
          db.close();
          return res.status(500).json({ error: err.message });
        }

        res.json(rows.map(rowToBudget));
        db.close();
      });
    };

    if (row && row.count === 0) {
      seedDefaultBudgets(db, userId, finishQuery);
      return;
    }

    finishQuery();
  });
});

// POST budget
app.post('/api/budgets', (req, res) => {
  const { userId, category, target } = req.body;

  if (!userId || !category) {
    return res.status(400).json({ error: 'Missing budget details' });
  }

  const now = new Date().toISOString();
  const db = new sqlite3.Database(DB);
  const stmt = `INSERT INTO budgets(userId,category,target,createdAt,updatedAt) VALUES(?,?,?,?,?)`;

  db.run(stmt, [userId, category, Number(target) || 0, now, now], function (err) {
    if (err) {
      db.close();
      return res.status(500).json({ error: err.message });
    }

    res.status(201).json({ id: this.lastID, affected: this.changes });
    db.close();
  });
});

// PUT update budget target
app.put('/api/budgets/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { category, target } = req.body;
  const now = new Date().toISOString();
  const db = new sqlite3.Database(DB);
  const stmt = `UPDATE budgets SET category=?, target=?, updatedAt=? WHERE id=?`;

  db.run(stmt, [category, target, now, id], function (err) {
    if (err) {
      db.close();
      return res.status(500).json({ error: err.message });
    }

    res.status(201).json({ id: id, affected: this.changes });
    db.close();
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
