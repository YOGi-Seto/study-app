const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router({ mergeParams: true });
const db = require('../db');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}${ext}`);
  }
});
const upload = multer({ storage });

// POST /api/users/:userId/videos — 動画アップロード（multipart/form-data）
router.post('/', upload.single('video'), (req, res) => {
  const { userId } = req.params;
  const { title, visibility } = req.body;

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (!title || !req.file) {
    return res.status(400).json({ error: 'title and video are required' });
  }
  const vis = visibility || 'private';
  if (!['private', 'followers', 'public'].includes(vis)) {
    return res.status(400).json({ error: 'visibility must be private, followers, or public' });
  }

  const filePath = `/uploads/${req.file.filename}`;
  const stmt = db.prepare('INSERT INTO videos (user_id, title, path, visibility) VALUES (?, ?, ?, ?)');
  const result = stmt.run(userId, title, filePath, vis);
  const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(video);
});

// GET /api/users/:userId/videos — ユーザーの動画一覧
router.get('/', (req, res) => {
  const { userId } = req.params;
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const videos = db.prepare('SELECT * FROM videos WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  res.json(videos);
});

module.exports = router;
