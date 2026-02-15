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
│       ├── feed.js       # 公開動画フィード
│       └── studyLogs.js  # 勉強記録
├── public/
│   ├── index.html        # メインHTML（3タブ構成）
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

初回起動時にシードデータとして「太郎(student)」「花子(student)」「父親(parent)」を自動作成。

## API一覧

### ユーザー
| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/users` | ユーザー一覧 |
| GET | `/api/users/:id` | ユーザー詳細 |
| POST | `/api/users` | ユーザー作成（name, role） |
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

## フロントエンドUI（3タブ構成）
1. **フィードタブ**: 公開動画を縦スクロールで表示。「もっと見る」で追加読み込み
2. **アップロードタブ**: ユーザー選択→タイトル・公開範囲・動画ファイルを指定して投稿
3. **マイ動画タブ**: ユーザーを選んでそのユーザーの全動画を一覧表示

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
