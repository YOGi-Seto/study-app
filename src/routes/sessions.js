const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/sessions — セッション作成（配信者が問題付きセッションを登録）
router.post('/', (req, res) => {
  const { broadcaster_id, video_id, title, subject, video_url, questions } = req.body;

  if (!broadcaster_id || !title || !subject || !video_url) {
    return res.status(400).json({ error: 'broadcaster_id, title, subject, video_url are required' });
  }
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(broadcaster_id);
  if (!user) {
    return res.status(404).json({ error: 'Broadcaster not found' });
  }
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'questions array is required' });
  }

  const insertSession = db.prepare(
    'INSERT INTO sessions (broadcaster_id, video_id, title, subject, video_url) VALUES (?, ?, ?, ?, ?)'
  );
  const insertQuestion = db.prepare(
    'INSERT INTO questions (session_id, body, choice_a, choice_b, choice_c, choice_d, correct_choice, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const txn = db.transaction(() => {
    const result = insertSession.run(broadcaster_id, video_id || null, title, subject, video_url);
    const sessionId = result.lastInsertRowid;

    questions.forEach((q, i) => {
      if (!q.body || !q.choice_a || !q.choice_b || !q.choice_c || !q.choice_d || !q.correct_choice) {
        throw new Error('Each question requires body, choice_a-d, correct_choice');
      }
      insertQuestion.run(sessionId, q.body, q.choice_a, q.choice_b, q.choice_c, q.choice_d, q.correct_choice, i);
    });

    return sessionId;
  });

  try {
    const sessionId = txn();
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
    res.status(201).json(session);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/sessions — セッション一覧取得
router.get('/', (req, res) => {
  const sessions = db.prepare(`
    SELECT s.id, s.title, s.subject, s.video_url, s.created_at,
           COUNT(q.id) AS question_count
    FROM sessions s
    LEFT JOIN questions q ON s.id = q.session_id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `).all();
  res.json(sessions);
});

// GET /api/sessions/:id — セッション詳細取得（動画URL + 問題一覧）
router.get('/:id', (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const questions = db.prepare(
    'SELECT id, body, choice_a, choice_b, choice_c, choice_d, sort_order FROM questions WHERE session_id = ? ORDER BY sort_order'
  ).all(req.params.id);

  res.json({
    id: session.id,
    title: session.title,
    subject: session.subject,
    video_url: session.video_url,
    broadcaster_id: session.broadcaster_id,
    created_at: session.created_at,
    questions: questions
  });
});

// POST /api/sessions/:id/answers — 回答送信
router.post('/:id/answers', (req, res) => {
  const sessionId = req.params.id;
  const { user_id, answers } = req.body;

  if (!user_id || !answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'user_id and answers array are required' });
  }

  const session = db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const sessionQuestionIds = db.prepare(
    'SELECT id FROM questions WHERE session_id = ?'
  ).all(sessionId).map(q => q.id);

  const insertAnswer = db.prepare(
    'INSERT OR REPLACE INTO answers (question_id, user_id, selected_choice, time_ms) VALUES (?, ?, ?, ?)'
  );

  const txn = db.transaction(() => {
    for (const ans of answers) {
      if (!ans.question_id || !ans.selected_choice || ans.time_ms == null) {
        throw new Error('Each answer requires question_id, selected_choice, time_ms');
      }
      if (!sessionQuestionIds.includes(ans.question_id)) {
        throw new Error('question_id ' + ans.question_id + ' does not belong to this session');
      }
      insertAnswer.run(ans.question_id, user_id, ans.selected_choice, ans.time_ms);
    }
  });

  try {
    txn();
    res.status(201).json({ message: 'Answers submitted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/sessions/:id/results?user_id=X — 結果取得（視聴者 vs 配信者比較）
router.get('/:id/results', (req, res) => {
  const sessionId = req.params.id;
  const userId = req.query.user_id;

  if (!userId) {
    return res.status(400).json({ error: 'user_id query parameter is required' });
  }

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const questions = db.prepare(
    'SELECT * FROM questions WHERE session_id = ? ORDER BY sort_order'
  ).all(sessionId);

  function getUserResults(uid) {
    var correctCount = 0;
    var totalTime = 0;
    var details = [];

    for (const q of questions) {
      const answer = db.prepare(
        'SELECT selected_choice, time_ms FROM answers WHERE question_id = ? AND user_id = ?'
      ).get(q.id, uid);

      const isCorrect = answer ? answer.selected_choice === q.correct_choice : false;
      if (isCorrect) correctCount++;
      if (answer) totalTime += answer.time_ms;

      details.push({
        question_id: q.id,
        body: q.body,
        correct_choice: q.correct_choice,
        selected_choice: answer ? answer.selected_choice : null,
        is_correct: isCorrect,
        time_ms: answer ? answer.time_ms : null
      });
    }

    return {
      correct_count: correctCount,
      total_questions: questions.length,
      accuracy: questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0,
      total_time_ms: totalTime,
      details: details
    };
  }

  const viewerResults = getUserResults(userId);
  const broadcasterResults = getUserResults(session.broadcaster_id);

  res.json({
    session_id: session.id,
    title: session.title,
    subject: session.subject,
    viewer: viewerResults,
    broadcaster: broadcasterResults
  });
});

module.exports = router;
