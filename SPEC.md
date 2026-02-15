# StudyTok 仕様書

## 概要
学生が勉強動画を投稿・共有し、クイズで配信者と対戦できるTikTok風アプリ。

## 技術スタック
Express.js / SQLite(better-sqlite3) / multer / vanilla HTML・CSS・JS / Render(無料) / [GitHub](https://github.com/YOGi-Seto/study-app)

## ディレクトリ構成
```
src/index.js           … サーバー（エントリポイント）
src/db.js              … DB接続・テーブル定義・シードデータ
src/routes/users.js    … ユーザーCRUD・フォロー・親子関係
src/routes/videos.js   … 動画アップロード・一覧
src/routes/feed.js     … 公開フィード（session_id,subject含む）
src/routes/sessions.js … クイズセッション・回答・結果比較
src/routes/studyLogs.js… 勉強記録
public/                … HTML/CSS/JS（静的配信）
uploads/               … 動画保存先（.gitignore対象）
```

## DB
| テーブル | 主要カラム |
|---------|-----------|
| users | name, role(student/parent) |
| videos | user_id, title, path, visibility |
| study_logs | user_id, subject, duration_min, page_start/end |
| follows | follower_id, followee_id |
| parent_child | parent_id, child_id |
| sessions | broadcaster_id, video_id, title, subject, video_url |
| questions | session_id, body, choice_a〜d, correct_choice, sort_order |
| answers | question_id, user_id, selected_choice, time_ms |

**シード**: ユーザー3名(太郎/花子/父親)、ダミータイル6件、「数学の基礎」に数学クイズ3問(配信者1問ランダム不正解)

## API

| メソッド | パス | 概要 |
|---------|------|------|
| GET/POST | `/api/users` | 一覧 / 作成(name,role) |
| GET | `/api/users/:id` | 詳細 |
| GET | `/api/users/:id/following` | フォロー中一覧 |
| GET | `/api/users/:id/followers` | フォロワー一覧 |
| GET | `/api/users/:id/following/study-logs` | フォロー中の学習ログ(limit/offset) |
| POST/DELETE | `/api/users/:id/follow/:targetId` | フォロー / 解除 |
| POST | `/api/users/:parentId/children/:childId` | 親子関係登録 |
| GET/POST | `/api/users/:userId/videos` | 動画一覧 / アップロード(multipart) |
| GET/POST | `/api/users/:userId/study-logs` | 勉強記録一覧 / 作成 |
| GET | `/api/feed` | 公開フィード(limit/offset) |
| GET/POST | `/api/sessions` | セッション一覧 / 作成(questions含む) |
| GET | `/api/sessions/:id` | 詳細(問題一覧、正解非公開) |
| POST | `/api/sessions/:id/answers` | 回答送信 |
| GET | `/api/sessions/:id/results?user_id=X` | 結果比較(視聴者vs配信者) |

## UI

**ログイン**: ヘッダー右上でユーザー選択 → 全タブで使用

| タブ | 内容 |
|-----|------|
| フィード | 2列グリッドのダミータイル。クイズ付きは「クイズ付き」バッジ、タップでクイズ開始 |
| アップロード | タイトル・公開範囲・動画ファイルを投稿 |
| マイ動画 | ログインユーザーの動画一覧 |
| 自習室 | フォロー管理、フォロー中/フォロワー一覧、学習ログタイムライン |

**クイズ画面**（フィードからオーバーレイ遷移）: 動画+問題表示 → 10秒タイマーで4択回答 → 全問後に視聴者vs配信者の結果比較

## デプロイ
Render Web Service: `npm install` → `node src/index.js`（無料プラン、15分スリープ、再デプロイでDBリセット）

## ローカル開発
```bash
npm install && node src/index.js  # http://localhost:3000
```

## 実装履歴
1. Express+SQLiteバックエンドAPI（ユーザー・勉強記録・フォロー・親子関係）
2. 動画アップロード(multer)・公開フィードAPI
3. フロントエンドUI(HTML/CSS/JS)・静的配信
4. GitHub連携→Renderデプロイ・シードデータ
5. フォロー一覧・フォロワー一覧・フォロー中学習ログAPI
6. ログイン機能・タブUI統一・自習室UI・2列グリッド・モバイルズーム防止
7. クイズAPI(sessions/questions/answers)
8. クイズUI(フィード連携・10秒タイマー・結果比較・ダミータイル・配信者ランダム不正解)
