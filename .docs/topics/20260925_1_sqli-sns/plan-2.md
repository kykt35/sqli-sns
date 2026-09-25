# Plan 2: アカウント作成・ログイン・ログアウト

## 概要

username・passwordによる登録とログインを追加する。登録した利用者が同じ参加者環境内でログイン・ログアウトでき、自己投稿の所有者を判定できる状態にする。

共通の仕様・入力規則・ルート・対象外は[全体計画](./implementation-overview.md)を参照する。

## PR / stack構成

| 項目 | 計画値 |
| --- | --- |
| Plan | Plan 2（このPlan全体で1 PR） |
| headブランチ | `feat/sns-auth` |
| baseブランチ | `feat/sns-foundation` |
| 直下の依存Plan | Plan 1 |
| stack位置 | middle |
| マージ順 | 2番目。Plan 1 → 2 → 3 → 4 |

## 前提条件

- Plan 1のDB・パスワード・セッション基盤が利用できる。
- 入力規則は全体計画の採用案を使う。usernameは小文字へ正規化し環境内で一意、passwordは変換せずハッシュ化する。
- SNSログイン前にも参加者環境が存在する。認証と環境割り当ては別の概念として維持する。

**特記事項**

- トランクへ機能開発を直接コミットしない。全Taskを同じheadブランチと1つのPRに含める。
- 上位Planのbaseは直下Planのheadとする。下位のマージ後は実際のトランクへ付け替え、差分を再確認する。
- サブタスクを原則1コミットとし、検証だけの作業ではコミットを作らない。テスト→実装→検証の順で進める。
- コードレビューを実施し、指摘を反映してからこのPlanのPRを1つ作成または更新する。リモート未確定ならPR作成は未完了として記録する。
- 実装・検証済み。実績は対応checklistを参照。

## 設計方針

登録・ログイン・ログアウトはサーバーレンダリングと通常フォームで実装する。変更を伴うフォームではCSRF検証を行い、認証成功・ログアウト時にはセッションIDとCSRFトークンを更新する。環境IDは更新前の信頼できるセッションから引き継ぐ。DBから取得したpassword_digestをviewへ渡さない。

## タスク一覧

### Task 1: アカウント登録を実装する

**目的:** DB制約と入力検証を伴う最小の登録を提供する。

**変更ファイル（作成予定）:**

- `src/auth/users.js`
- `src/auth/validation.js`
- `src/routes/auth.js`
- `src/middleware/csrf.js`
- `views/register.ejs`
- `tests/registration.test.js`
- `tests/csrf.test.js`

**サブタスク:**

1. [ ] **1-1** 正常登録、username正規化、重複・境界値・空入力、ハッシュ保存、CSRF欠落、SQL風入力を含む登録のHTTPテストを作る。
   - 予定コミット: `test(auth): define registration and csrf contracts`
2. [ ] **1-2** 登録クエリ・入力検証・CSRF middleware・登録フォームを実装する。重複はDBの一意制約でも保証し、成功後にログイン画面へ303で移動する。
   - 予定コミット: `feat(auth): add username and password registration`
3. [ ] **1-3** 登録・CSRFテストを実行し、DBとHTTP応答に平文passwordが残らないことを確認する。
   - 検証のみ。変更がなければコミット不要。

**受け入れ条件:**

- [x] 初期アカウントを含むusername重複を拒否する。
- [x] 環境Aでの登録が環境Bのusersを変更しない。

---

### Task 2: ログインとログアウトを実装する

**目的:** セッション固定やユーザーID取り違えを避けて認証状態を切り替える。

**変更ファイル（作成予定）:**

- `src/auth/users.js`
- `src/routes/auth.js`
- `src/middleware/current-user.js`
- `src/middleware/require-login.js`
- `src/runtime/session-store.js`
- `views/login.ejs`
- `tests/authentication.test.js`

**サブタスク:**

1. [ ] **2-1** 正誤パスワード、存在しない利用者、ログイン時のセッションID変更、POSTログアウト、古いCookie無効化、再ログイン時の環境維持を検証する。
   - 予定コミット: `test(auth): cover login logout and session rotation`
2. [ ] **2-2** パラメーター化したユーザー取得・ハッシュ照合・現在ユーザー取得・ログイン必須middleware・ログアウトを実装する。認証エラーは存在有無を区別しない。
   - 予定コミット: `feat(auth): add login and logout session flow`
3. [ ] **2-3** 認証テストとPlan 1の環境テストを実行し、セッション更新で別DBが割り当てられないことを確認する。
   - 検証のみ。変更がなければコミット不要。

**受け入れ条件:**

- [x] セッションID更新前の認証状態を再利用できない。
- [x] ログアウトでは登録データを消さず、サーバー再起動では登録データと認証状態が消える。

---

### Task 3: 認証画面と共通レイアウトを整える

**目的:** 日本語の画面で登録とログインを迷わず行えるようにする。

**変更ファイル（作成予定）:**

- `views/partials/header.ejs`
- `views/partials/footer.ejs`
- `views/register.ejs`
- `views/login.ejs`
- `views/error.ejs`
- `public/styles.css`
- `src/middleware/errors.js`
- `tests/auth-pages.test.js`

**サブタスク:**

1. [ ] **3-1** 未ログイン／ログイン時の表示、入力エラー時にpasswordが返らないこと、表示値のエスケープ、内部エラー非表示の応答テストを追加する。
   - 予定コミット: `test(ui): cover auth rendering and error responses`
2. [ ] **3-2** 日本語ラベル、入力エラー、登録／ログインへのリンク、ログイン中username、POSTログアウトを共通レイアウトへ接続し、共通エラー画面を整える。
   - 予定コミット: `feat(ui): add auth pages and shared layout`
3. [ ] **3-3** 全テスト・lintとブラウザ確認を行う。ノートPC幅で入力欄・エラー・遷移先を確認する。
   - 検証のみ。変更がなければコミット不要。

**受け入れ条件:**

- [x] ログイン中と未ログインの状態が区別できる。
- [x] SQL表示、演習メニュー、版切替などの対象外UIを追加しない。

---

## Plan内の依存関係

- Task 1 → Task 2 → Task 3の順に進める。後続Taskで変更した共通処理は、先行Taskのテストも実行する。

## 検証方法

- `npm test`：登録、認証、CSRF、セッション再生成を含む全テスト
- `npm run lint`
- ブラウザで登録 → 誤パスワード → ログイン → ログアウト → 再ログインを確認

## Planの完了条件

- [x] username・passwordだけで登録・ログインできる。メールやプロフィールは要求しない。
- [x] 重複・空値・長さ超過・誤パスワードを拒否する。
- [x] ログアウトと再ログインで同じDBが使え、旧認証Cookieは無効になる。
- [x] password・password_digestがHTML、エラー、ログへ出ず、登録・認証処理に意図的なSQLiを入れていない。
- [x] 全Taskの受け入れ条件を満たし、必要なテスト・lint・表示確認が完了している。
- [x] コードレビューの指摘を反映し、チェックリストに検証結果と実績コミットを記録した。
- [x] head/baseを確認し、このPlanに対応するPRを1つ作成または更新した。

## 備考

- 認証関連のフォームでpasswordを再表示しない。入力不正は400、登録重複は409、認証失敗は401、CSRF不正は403を基本とする。
- ログイン成功後は`/`へ移動する。Plan 3前のタイムラインは起動確認ページでよい。
- 実績は[checklist-2.md](./checklist-2.md)へ記録する。
