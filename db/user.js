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

function ensureTables() {
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
    });
  });
}

ensureTables();

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
  const { token } = req.body || {};

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

          // Simple demo flow: return token so it can be used in reset-password.
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

const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`User API running on port ${PORT}`);
});
