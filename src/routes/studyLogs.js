const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');

// POST /api/users/:userId/study-logs — 記録作成
router.post('/', (req, res) => {
  const { userId } = req.params;
  const { subject, duration_min, page_start, page_end, studied_at } = req.body;

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (!subject || duration_min == null) {
    return res.status(400).json({ error: 'subject and duration_min are required' });
  }

  const stmt = db.prepare(
    'INSERT INTO study_logs (user_id, subject, duration_min, page_start, page_end, studied_at) VALUES (?, ?, ?, ?, ?, COALESCE(?, datetime(\'now\')))'
  );
  const result = stmt.run(userId, subject, duration_min, page_start ?? null, page_end ?? null, studied_at ?? null);
  const log = db.prepare('SELECT * FROM study_logs WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(log);
});

// GET /api/users/:userId/study-logs — ユーザーの記録一覧
router.get('/', (req, res) => {
  const { userId } = req.params;
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const logs = db.prepare('SELECT * FROM study_logs WHERE user_id = ? ORDER BY studied_at DESC').all(userId);
  res.json(logs);
});

module.exports = router;
