# Plan 1: 起動・DB・参加者環境の基盤

## 概要

専用SNSの起動基盤を作り、参加者ごとに独立したSQLite DBとセッションを持たせる。インメモリ構成によって、サーバー再起動で登録・投稿・認証状態が初期化される土台を用意する。

共通の仕様・入力規則・ルート・対象外は[全体計画](./implementation-overview.md)を参照する。

## PR / stack構成

| 項目 | 計画値 |
| --- | --- |
| Plan | Plan 1（このPlan全体で1 PR） |
| headブランチ | `feat/sns-foundation` |
| baseブランチ | `main` |
| 直下の依存Plan | なし |
| stack位置 | bottom |
| マージ順 | 1番目。Plan 1 → 2 → 3 → 4 |

## 前提条件

- 作成先は新規 `sqli-sns/`、構成はNode.js・Express・EJS・better-sqlite3の計画案。リモートは `https://github.com/kykt35/sqli-sns.git`。
- 実装開始時にGit管理範囲とトランクを確認する。新規リポジトリの初期コミットには最小の説明・ignore設定のみを置き、機能開発はhead上で行う。
- 単一プロセスで、参加者環境ごとに独立したインメモリDB接続を持つ。永続DB、共有テーブルによる環境分離、複数ワーカーは採用しない。

**特記事項**

- トランクへ機能開発を直接コミットしない。全Taskを同じheadブランチと1つのPRに含める。
- 上位Planのbaseは直下Planのheadとする。下位のマージ後は実際のトランクへ付け替え、差分を再確認する。
- サブタスクを原則1コミットとし、検証だけの作業ではコミットを作らない。テスト→実装→検証の順で進める。
- コードレビューを実施し、指摘を反映してからこのPlanのPRを1つ作成または更新する。リモート未確定ならPR作成は未完了として記録する。
- 実装・検証済み。実績は対応checklistを参照。

## 設計方針

起動処理とアプリ組み立てを分離し、テストからポート0・独立ストア・一時設定で起動できるようにする。セッションには環境IDを保持し、環境レジストリはサーバー側だけに置く。HTTP入力からDB接続先を指定させない。初回アクセスでDBをseedし、完了後に環境を登録する。プロセス終了時にDB接続とセッションストアを破棄する。

## タスク一覧

### Task 1: アプリと検証基盤を用意する

**目的:** 新規アプリを再現可能なコマンドで起動・検証できるようにする。

**変更ファイル（作成予定）:**

- `package.json`
- `package-lock.json`
- `.gitignore`
- `src/app.js`
- `src/server.js`
- `src/config.js`
- `tests/helpers/http.js`
- `tests/startup.test.js`
- `eslint.config.js`

**サブタスク:**

1. [x] **1-1** 採用Node.jsと依存ライブラリの互換性を公式資料で確認し、package・lockfile、start/test/lint、ignore設定とHTTPテストヘルパーを用意する。
   - 予定コミット: `chore(sns): bootstrap app and test tooling`
2. [x] **1-2** ポート指定、既定のループバック待受、不正設定での起動失敗、正常終了後の再起動の契約テストを作成する。
   - 予定コミット: `test(runtime): define startup and shutdown behavior`
3. [x] **1-3** アプリ生成とlistenを分離し、設定検証・起動・終了処理を実装する。終了時に後続のDBやストアを閉じるためのライフサイクルを用意する。
   - 予定コミット: `feat(runtime): add application lifecycle`
4. [x] **1-4** npm testとnpm run lintを実行し、実際に起動・停止できることを確認する。
   - 検証のみ。変更がなければコミット不要。

**受け入れ条件:**

- [x] 起動コマンド・テスト・lintが動く。
- [x] モジュールimportだけではlistenや全体初期化が走らず、テストを独立して実行できる。

---

### Task 2: データモデルと初期データを実装する

**目的:** 通常の認証と公開範囲を持つSNS用DBを用意する。

**変更ファイル（作成予定）:**

- `src/db/schema.js`
- `src/db/create-db.js`
- `src/db/seed.js`
- `src/auth/password.js`
- `tests/db.test.js`
- `tests/password.test.js`

**サブタスク:**

1. [x] **2-1** username一意性、必須値、投稿の外部キー・公開フラグ、seedの公開／非公開投稿、ハッシュ照合と誤パスワード拒否を検証するテストを作成する。
   - 予定コミット: `test(db): define sns schema and seed contracts`
2. [x] **2-2** users/postsのスキーマ、SQLite接続生成・クローズ、パラメーター化したseed処理、ソルト付きパスワードハッシュ生成・照合を実装する。scryptのパラメーターは公式資料を確認して定義に固定する。
   - 予定コミット: `feat(db): add sns schema and seeded accounts`
3. [x] **2-3** DB・パスワードのテストを実行し、保存値が平文ではなく初期アカウントで照合できることを確認する。
   - 検証のみ。変更がなければコミット不要。

**受け入れ条件:**

- [x] 同じseed定義から独立したDBを生成できる。
- [x] DBへ保存する認証情報はpassword_digestのみ。Basic認証情報やセッションは教材DBに置かない。

---

### Task 3: 参加者環境とセッションのライフサイクルを実装する

**目的:** データ分離と再起動時の初期化を一つの仕組みで成立させる。

**変更ファイル（作成予定）:**

- `src/runtime/environments.js`
- `src/runtime/session-store.js`
- `src/middleware/environment.js`
- `src/app.js`
- `src/server.js`
- `tests/environments.test.js`
- `tests/session-lifecycle.test.js`

**サブタスク:**

1. [x] **3-1** 2環境の分離、Cookie改変・環境ID指定の拒否、上限超過、期限切れの解放、作成失敗時の後始末、再起動後の古いCookieを検証する。期限は偽時計で検証する。
   - 予定コミット: `test(runtime): cover environment isolation and reset`
2. [x] **3-2** サーバー管理の環境レジストリとメモリセッションストアを実装し、環境IDを受け付けない割り当てmiddlewareを接続する。セッションの更新時も環境を引き継げる関数を提供する。
   - 予定コミット: `feat(runtime): isolate participant databases and sessions`
3. [x] **3-3** 環境数上限、期限切れの接続解放、利用中環境の延命、起動失敗・終了時の解放を実装する。CookieはHttpOnly・SameSite=Lax・Host-onlyとし、公開時はSecureを使用する設定境界を用意する。
   - 予定コミット: `feat(runtime): bound environment lifecycle and cleanup`
4. [x] **3-4** 全テスト・lintを実行し、同一サーバー再起動で全環境が初期化されることをプロセス境界で確認する。
   - 検証のみ。変更がなければコミット不要。

**受け入れ条件:**

- [x] 参加者間で登録予定領域・投稿・認証状態を共有しない。
- [x] 上限に達しても既存環境を消さず、新規アクセスへ503と案内を返す。
- [x] 利用中環境を期限切れとして閉じず、失効したセッションが残った環境へ復帰できない。

---

## Plan内の依存関係

- Task 1 → Task 2 → Task 3の順に進める。後続Taskで変更した共通処理は、先行Taskのテストも実行する。

## 検証方法

- `npm ci`
- `npm test`：起動、DB、パスワード、環境・セッションのテスト
- `npm run lint`
- `npm start`：ループバックで起動し、終了後に再起動できることを確認

## Planの完了条件

- [x] `npm start`で起動し、DB初期化失敗時は不完全な環境で処理を継続しない。
- [x] 2つの独立したCookie jarで別DBが割り当てられ、一方の変更が他方に現れない。
- [x] 環境IDやパスをリクエストに付けても別環境を選べない。
- [x] 全セッション・DBは再起動で失われ、古いCookieが新しい利用者やDBへ誤ってひも付かない。
- [x] 全Taskの受け入れ条件を満たし、必要なテスト・lint・表示確認が完了している。
- [x] コードレビューの指摘を反映し、チェックリストに検証結果と実績コミットを記録した。
- [x] head/baseを確認し、このPlanに対応するPRを1つ作成または更新した。

## 備考

- 依存バージョンの決定とテスト基盤の追加はTask 1で行う。実行環境がない状態で先にテストを走らせる必要はない。以後はテストを追加して期待した失敗を確認してから実装する。
- この段階の画面は最小の起動確認ページでよい。登録や投稿UIは後続Planで追加する。
- ユーザー指定により文書を本リポジトリ内へ移動済み。元イベント資料・既存教材へのリンクはローカルの兄弟ディレクトリを参照する。
- 実績は[checklist-1.md](./checklist-1.md)へ記録する。
