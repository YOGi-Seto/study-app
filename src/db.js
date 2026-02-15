const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'study-app.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('student','parent')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS study_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    subject TEXT NOT NULL,
    duration_min INTEGER NOT NULL,
    page_start INTEGER,
    page_end INTEGER,
    studied_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    path TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','followers','public')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL REFERENCES users(id),
    followee_id INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (follower_id, followee_id)
  );

  CREATE TABLE IF NOT EXISTS parent_child (
    parent_id INTEGER NOT NULL REFERENCES users(id),
    child_id INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (parent_id, child_id)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    broadcaster_id INTEGER NOT NULL REFERENCES users(id),
    video_id INTEGER REFERENCES videos(id),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    video_url TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id),
    body TEXT NOT NULL,
    choice_a TEXT NOT NULL,
    choice_b TEXT NOT NULL,
    choice_c TEXT NOT NULL,
    choice_d TEXT NOT NULL,
    correct_choice TEXT NOT NULL CHECK(correct_choice IN ('a','b','c','d')),
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL REFERENCES questions(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    selected_choice TEXT NOT NULL CHECK(selected_choice IN ('a','b','c','d')),
    time_ms INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(question_id, user_id)
  );
`);

// video_id カラムがなければ追加（既存DB対応）
try {
  db.prepare('SELECT video_id FROM sessions LIMIT 1').get();
} catch (e) {
  db.exec('ALTER TABLE sessions ADD COLUMN video_id INTEGER REFERENCES videos(id)');
}

// シードデータ: ユーザーが0人なら初期ユーザーを作成
const count = db.prepare('SELECT COUNT(*) AS cnt FROM users').get().cnt;
if (count === 0) {
  const insert = db.prepare('INSERT INTO users (name, role) VALUES (?, ?)');
  insert.run('太郎', 'student');
  insert.run('花子', 'student');
  insert.run('父親', 'parent');
}

// シードデータ: セッションが0件なら数学クイズを作成
const sessionCount = db.prepare('SELECT COUNT(*) AS cnt FROM sessions').get().cnt;
if (sessionCount === 0) {
  const dummyTiles = [
    { title: '数学の基礎', subject: '数学', hasQuiz: true },
    { title: '英語リスニング', subject: '英語', hasQuiz: false },
    { title: '国語 古文読解', subject: '国語', hasQuiz: false },
    { title: '理科 実験まとめ', subject: '理科', hasQuiz: false },
    { title: '社会 地理', subject: '社会', hasQuiz: false },
    { title: '数学 応用問題', subject: '数学', hasQuiz: false }
  ];

  const user1 = db.prepare('SELECT id FROM users LIMIT 1').get();
  const insertVideo = db.prepare(
    "INSERT INTO videos (user_id, title, path, visibility) VALUES (?, ?, '', 'public')"
  );

  dummyTiles.forEach(function (tile) {
    const vResult = insertVideo.run(user1.id, tile.title);
    const videoId = vResult.lastInsertRowid;

    if (tile.hasQuiz) {
      const insertSession = db.prepare(
        'INSERT INTO sessions (broadcaster_id, video_id, title, subject, video_url) VALUES (?, ?, ?, ?, ?)'
      );
      const sResult = insertSession.run(user1.id, videoId, tile.title, tile.subject, '');
      const sid = sResult.lastInsertRowid;

      const insertQ = db.prepare(
        'INSERT INTO questions (session_id, body, choice_a, choice_b, choice_c, choice_d, correct_choice, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );
      insertQ.run(sid, '5 + 3 × 2 = ?', '16', '11', '13', '10', 'b', 0);
      insertQ.run(sid, '36の平方根は？', '4', '6', '8', '9', 'b', 1);
      insertQ.run(sid, 'x + 5 = 12 のとき x = ?', '5', '7', '8', '17', 'b', 2);

      const qIds = db.prepare('SELECT id FROM questions WHERE session_id = ? ORDER BY sort_order').all(sid);
      const insertA = db.prepare('INSERT INTO answers (question_id, user_id, selected_choice, time_ms) VALUES (?, ?, ?, ?)');
      const missIndex = Math.floor(Math.random() * qIds.length);
      var broadcasterChoices = ['b', 'b', 'b'];
      broadcasterChoices[missIndex] = 'c'; // 1問だけ不正解
      insertA.run(qIds[0].id, user1.id, broadcasterChoices[0], 3200);
      insertA.run(qIds[1].id, user1.id, broadcasterChoices[1], 2500);
      insertA.run(qIds[2].id, user1.id, broadcasterChoices[2], 1800);
    }
  });
}

module.exports = db;
