const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/feed — 公開動画フィード（新着順）
router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;

  const videos = db.prepare(`
    SELECT v.*, u.name AS user_name, s.id AS session_id, s.subject
    FROM videos v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN sessions s ON s.video_id = v.id
    WHERE v.visibility = 'public'
    ORDER BY v.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  res.json(videos);
});

module.exports = router;
