const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const DB = 'finance_tracker.sqlite';

// Middleware
app.use(express.json());

function mapRow(row) {
  return {
    id: row.id,
    amount: Number(row.amount),
    type: row.type,
    category: row.category,
    date: row.date,
    note: row.note || '',
    receiptUrl: row.receiptUrl || '',
    userId: row.userId,
  };
}

// GET /api/transactions?userId=demo-user
app.get('/api/transactions', (req, res) => {
  const userId = (req.query.userId || 'demo-user').toString();
  const db = new sqlite3.Database(DB);

  db.all(
    'SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC',
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.status(200).json(rows.map(mapRow));
    }
  );

  db.close();
});

// GET /api/transactions/:id
app.get('/api/transactions/:id', (req, res) => {
  const db = new sqlite3.Database(DB);

  db.get('SELECT * FROM transactions WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json(err);
    if (!row) return res.status(200).json(null);
    return res.status(200).json(mapRow(row));
  });

  db.close();
});

// POST /api/transactions
app.post('/api/transactions', (req, res) => {
  if (!req.body) return res.sendStatus(400);

  const { amount, type, category, date, note, receiptUrl, userId } = req.body;
  if (!amount || !type || !category || !date || !userId) {
    return res.status(400).json({ message: 'amount, type, category, date, userId are required' });
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const db = new sqlite3.Database(DB);

  db.run(
    `INSERT INTO transactions(id, amount, type, category, date, note, receiptUrl, userId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, Number(amount), type, category, date, note || '', receiptUrl || '', userId],
    function onInsert(err) {
      if (err) return res.status(500).json(err);
      return res.status(201).json({ id, affected: this.changes });
    }
  );

  db.close();
});

// PUT /api/transactions/:id
app.put('/api/transactions/:id', (req, res) => {
  if (!req.body) return res.sendStatus(400);

  const { amount, type, category, date, note, receiptUrl } = req.body;
  if (!amount || !type || !category || !date) {
    return res.status(400).json({ message: 'amount, type, category, date are required' });
  }

  const db = new sqlite3.Database(DB);

  db.run(
    `UPDATE transactions
     SET amount = ?, type = ?, category = ?, date = ?, note = ?, receiptUrl = ?
     WHERE id = ?`,
    [Number(amount), type, category, date, note || '', receiptUrl || '', req.params.id],
    function onUpdate(err) {
      if (err) return res.status(500).json(err);
      return res.status(200).json({ id: req.params.id, affected: this.changes });
    }
  );

  db.close();
});

// DELETE /api/transactions/:id
app.delete('/api/transactions/:id', (req, res) => {
  const db = new sqlite3.Database(DB);

  db.run('DELETE FROM transactions WHERE id = ?', [req.params.id], function onDelete(err) {
    if (err) return res.status(500).json(err);
    return res.status(200).json({ id: req.params.id, affected: this.changes });
  });

  db.close();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
