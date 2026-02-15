# StudyTok 仕様書

## 概要
学生が勉強動画を投稿・共有するTikTok風アプリケーション。

## 技術スタック
- **バックエンド**: Express.js (Node.js)
- **データベース**: SQLite (better-sqlite3)
- **ファイルアップロード**: multer
- **フロントエンド**: vanilla HTML/CSS/JS（`public/`ディレクトリ）
- **ホスティング**: Render (Web Service, 無料プラン)
- **リポジトリ**: https://github.com/YOGi-Seto/study-app

## ディレクトリ構成
```
study-app/
├── src/
│   ├── index.js          # Expressサーバー（エントリポイント）
│   ├── db.js             # SQLite接続・テーブル定義・シードデータ
│   └── routes/
│       ├── users.js      # ユーザーCRUD・フォロー・親子関係
│       ├── videos.js     # 動画アップロード・一覧
│       ├── feed.js       # 公開動画フィード（session_id, subject含む）
│       ├── sessions.js   # クイズセッションCRUD・回答・結果比較
│       └── studyLogs.js  # 勉強記録
├── public/
│   ├── index.html        # メインHTML（4タブ構成 + ログイン）
│   ├── style.css         # ダークテーマTikTok風スタイル
│   └── app.js            # API呼び出し・DOM操作
├── uploads/              # アップロード動画保存先（.gitignore対象）
├── package.json
└── .gitignore
```

## データベーステーブル
| テーブル | 用途 |
|---------|------|
| users | ユーザー（name, role: student/parent） |
| videos | 動画（user_id, title, path, visibility） |
| study_logs | 勉強記録（user_id, subject, duration_min, page_start/end） |
| follows | フォロー関係（follower_id, followee_id） |
| parent_child | 親子関係（parent_id, child_id） |
| sessions | クイズセッション（broadcaster_id, video_id, title, subject, video_url） |
| questions | 問題（session_id, body, choice_a〜d, correct_choice, sort_order） |
| answers | 回答（question_id, user_id, selected_choice, time_ms） |

### シードデータ（初回起動時に自動作成）
- ユーザー: 「太郎(student)」「花子(student)」「父親(parent)」
- ダミータイル6件: 数学の基礎、英語リスニング、国語 古文読解、理科 実験まとめ、社会 地理、数学 応用問題
- 「数学の基礎」に数学クイズ3問付き（配信者は1問ランダムで不正解）

## API一覧

### ユーザー
| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/users` | ユーザー一覧 |
| GET | `/api/users/:id` | ユーザー詳細 |
| POST | `/api/users` | ユーザー作成（name, role） |
| GET | `/api/users/:id/following` | フォロー中ユーザー一覧 |
| GET | `/api/users/:id/followers` | フォロワー一覧 |
| GET | `/api/users/:id/following/study-logs?limit=20&offset=0` | フォロー中ユーザーの学習ログ新着 |
| POST | `/api/users/:id/follow/:targetId` | フォロー |
| DELETE | `/api/users/:id/follow/:targetId` | フォロー解除 |
| POST | `/api/users/:parentId/children/:childId` | 親子関係登録 |

### 動画
| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/users/:userId/videos` | 動画アップロード（multipart: video, title, visibility） |
| GET | `/api/users/:userId/videos` | ユーザーの動画一覧 |

### フィード
| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/feed?limit=20&offset=0` | 公開動画フィード（新着順） |

### 勉強記録
| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/users/:userId/study-logs` | 記録作成（subject, duration_min, page_start, page_end） |
| GET | `/api/users/:userId/study-logs` | ユーザーの記録一覧 |

### クイズセッション
| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/sessions` | セッション作成（broadcaster_id, video_id, title, subject, video_url, questions） |
| GET | `/api/sessions` | セッション一覧（id, title, subject, video_url, question_count） |
| GET | `/api/sessions/:id` | セッション詳細（動画URL + 問題一覧、正解は含まない） |
| POST | `/api/sessions/:id/answers` | 回答送信（user_id, answers[{question_id, selected_choice, time_ms}]） |
| GET | `/api/sessions/:id/results?user_id=X` | 結果比較（視聴者 vs 配信者の正解数・正答率・時間・各問題正誤） |

## フロントエンドUI

### ログイン
- ヘッダー右上のドロップダウンでユーザーを選択してログイン
- ログイン後はユーザー名表示 + ログアウトボタン
- ログインユーザーがアップロード・マイ動画・自習室の操作主体になる

### タブ構成（4タブ）
1. **フィードタブ**: 2列グリッドでダミータイル表示（科目アイコン付きプレースホルダー）。クイズ付きタイルは「クイズ付き」バッジ表示、タップでクイズ開始
2. **アップロードタブ**: タイトル・公開範囲・動画ファイルを指定して投稿（ログインユーザーとして）
3. **マイ動画タブ**: ログインユーザーの全動画を自動表示
4. **自習室タブ**: フォロー管理（フォロー/解除）、フォロー中・フォロワー一覧、フォロー中ユーザーの学習ログタイムライン

### クイズ画面（フィードからオーバーレイ遷移）
- フィードのクイズ付きタイルをタップ → 全画面オーバーレイでクイズ開始
- 上半分に動画プレーヤー、下半分に問題文・4択選択肢
- 1問あたり10秒のタイマーバー（赤いバーが減っていく）
- 回答選択後もタイマー終了まで待機、未回答のまま10秒経過すると自動で次へ
- 全問回答後 → 結果画面（あなた vs 配信者の正解数・正答率・時間・各問題正誤比較）
- 「フィードに戻る」ボタンでオーバーレイを閉じる

## デプロイ
- **Render**: GitHubリポジトリ連携で自動デプロイ
  - Build Command: `npm install`
  - Start Command: `node src/index.js`
  - Plan: Free

### 注意事項
- Render無料プランは15分間アクセスがないとスリープする
- SQLiteはRender再デプロイ時にリセットされる（永続化にはPostgreSQL移行が必要）
- `uploads/` は `.gitignore` 対象のためデプロイ先では動画ファイルも再デプロイ時に消える

## ローカル開発
```bash
npm install
node src/index.js
# http://localhost:3000 で起動
```

## 実装履歴
1. **Phase1**: Express + SQLiteでバックエンドAPI構築（ユーザー・勉強記録・フォロー・親子関係）
2. **Phase2**: 動画アップロード（multer）・公開フィードAPI追加
3. **Phase3**: フロントエンドUI（HTML/CSS/JS）作成、`public/`静的配信追加
4. **デプロイ**: GitHub連携 → Render Web Serviceにデプロイ、シードデータ追加
5. **Phase4（自習室/フォロー）**: フォロー中一覧・フォロワー一覧・フォロー中ユーザーの学習ログ新着取得API追加
6. **Phase5（ログイン・UI改善）**: ヘッダーにログイン機能追加、各タブのユーザー選択を廃止しログインユーザーで統一、自習室タブUI（フォロー管理・学習ログタイムライン）追加、フィードを2列グリッド表示に変更、モバイル自動ズーム防止
7. **Phase6（クイズAPI）**: sessions/questions/answersテーブル追加、セッション作成・一覧・詳細・回答送信・結果比較APIを実装
8. **Phase7（クイズUI）**: フィードからクイズ付きタイルをタップでオーバーレイ遷移、10秒タイマー付き4択クイズ、視聴者vs配信者の結果比較画面、ダミータイル6件のフィード表示、配信者は1問ランダム不正解のシードデータ
