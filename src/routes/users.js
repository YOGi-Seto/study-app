const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/users — ユーザー作成
router.post('/', (req, res) => {
  const { name, role } = req.body;
  if (!name || !role) {
    return res.status(400).json({ error: 'name and role are required' });
  }
  if (!['student', 'parent'].includes(role)) {
    return res.status(400).json({ error: 'role must be student or parent' });
  }
  const stmt = db.prepare('INSERT INTO users (name, role) VALUES (?, ?)');
  const result = stmt.run(name, role);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(user);
});

// GET /api/users — 一覧取得
router.get('/', (req, res) => {
  const users = db.prepare('SELECT * FROM users').all();
  res.json(users);
});

// GET /api/users/:id — 詳細取得
router.get('/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

// POST /api/users/:id/follow/:targetId — フォロー
router.post('/:id/follow/:targetId', (req, res) => {
  const { id, targetId } = req.params;
  if (id === targetId) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);
  if (!user || !target) {
    return res.status(404).json({ error: 'User not found' });
  }
  try {
    db.prepare('INSERT INTO follows (follower_id, followee_id) VALUES (?, ?)').run(id, targetId);
    res.status(201).json({ follower_id: Number(id), followee_id: Number(targetId) });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
      return res.status(409).json({ error: 'Already following' });
    }
    throw err;
  }
});

// DELETE /api/users/:id/follow/:targetId — フォロー解除
router.delete('/:id/follow/:targetId', (req, res) => {
  const { id, targetId } = req.params;
  const result = db.prepare('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?').run(id, targetId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Follow relationship not found' });
  }
  res.status(204).end();
});

// POST /api/users/:parentId/children/:childId — 親子関係登録
router.post('/:parentId/children/:childId', (req, res) => {
  const { parentId, childId } = req.params;
  const parent = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(parentId, 'parent');
  const child = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(childId, 'student');
  if (!parent) {
    return res.status(400).json({ error: 'Parent user not found or not a parent role' });
  }
  if (!child) {
    return res.status(400).json({ error: 'Child user not found or not a student role' });
  }
  try {
    db.prepare('INSERT INTO parent_child (parent_id, child_id) VALUES (?, ?)').run(parentId, childId);
    res.status(201).json({ parent_id: Number(parentId), child_id: Number(childId) });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
      return res.status(409).json({ error: 'Relationship already exists' });
    }
    throw err;
  }
});

module.exports = router;
