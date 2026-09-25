# 実装チェックリスト: Plan 2 アカウント作成・ログイン・ログアウト

## 対応Plan / PR

- Plan: [plan-2.md](./plan-2.md)
- Topic: `20260925_1_sqli-sns`
- PR単位: Plan 2全体で1 PR
- 全体: [implementation-overview.md](./implementation-overview.md)

## PR / stack記録

| 項目 | 計画 | 実績 |
| --- | --- | --- |
| headブランチ | `feat/sns-auth` | `feat/sns-auth` |
| baseブランチ | `feat/sns-foundation` | `feat/sns-foundation` |
| 直下の依存Plan | Plan 1 | Plan 1 |
| stack位置 | middle | middle |
| PR | 未作成 | https://github.com/kykt35/sqli-sns/pull/2 |
| マージ順 | 2番目 | 2番目（未マージ） |

## ステータス定義

- `planned`: 計画済み（未着手）
- `done`: 計画どおり完了
- `changed`: 計画から変更して実施（理由を記載）
- `skipped`: 未実施／不要化（理由を記載）

## Task別チェック

### Task 1: アカウント登録を実装する

| ID | 種別 | 内容 | 対応コミット（予定） | 実績コミット | 状態 | メモ |
| --- | --- | --- | --- | --- | --- | --- |
| 1-1 | test | 正常登録、username正規化、重複・境界値・空入力、ハッシュ保存、CSRF欠落、SQL風入力を含む登録のHTTPテストを作る。 | `test(auth): define registration and csrf contracts` | e4a4129 / 8f304a2 | done | 補強テストの実績は実行記録参照 |
| 1-2 | impl | 登録クエリ・入力検証・CSRF middleware・登録フォームを実装する。重複はDBの一意制約でも保証し、成功後にログイン画面へ303で移動する。 | `feat(auth): add username and password registration` | 9c13dbd | changed | 認証ルートを同一ファイルにまとめて実装 |
| 1-3 | verify | 登録・CSRFテストを実行し、DBとHTTP応答に平文passwordが残らないことを確認する。 | - | - | done | 15テスト成功 |

### Task 2: ログインとログアウトを実装する

| ID | 種別 | 内容 | 対応コミット（予定） | 実績コミット | 状態 | メモ |
| --- | --- | --- | --- | --- | --- | --- |
| 2-1 | test | 正誤パスワード、存在しない利用者、ログイン時のセッションID変更、POSTログアウト、古いCookie無効化、再ログイン時の環境維持を検証する。 | `test(auth): cover login logout and session rotation` | 4cf9a1d | done | セッション更新を検証 |
| 2-2 | impl | パラメーター化したユーザー取得・ハッシュ照合・現在ユーザー取得・ログイン必須middleware・ログアウトを実装する。認証エラーは存在有無を区別しない。 | `feat(auth): add login and logout session flow` | 9c13dbd / b2668d8 | changed | 登録ルートと認証処理を共有して実装 |
| 2-3 | verify | 認証テストとPlan 1の環境テストを実行し、セッション更新で別DBが割り当てられないことを確認する。 | - | - | done | 15テスト成功 |

### Task 3: 認証画面と共通レイアウトを整える

| ID | 種別 | 内容 | 対応コミット（予定） | 実績コミット | 状態 | メモ |
| --- | --- | --- | --- | --- | --- | --- |
| 3-1 | test | 未ログイン／ログイン時の表示、入力エラー時にpasswordが返らないこと、表示値のエスケープ、内部エラー非表示の応答テストを追加する。 | `test(ui): cover auth rendering and error responses` | 0406a2d | done | エスケープ・秘密値非表示確認 |
| 3-2 | impl | 日本語ラベル、入力エラー、登録／ログインへのリンク、ログイン中username、POSTログアウトを共通レイアウトへ接続し、共通エラー画面を整える。 | `feat(ui): add auth pages and shared layout` | bb438e6 | done | 日本語の共通画面 |
| 3-3 | verify | 全テスト・lintとブラウザ確認を行う。ノートPC幅で入力欄・エラー・遷移先を確認する。 | - | - | done | 15テスト・lint・ブラウザ操作成功 |

## 検証記録

| コマンド／確認 | 結果 | 証跡・残件 |
| --- | --- | --- |
| `npm test`：登録、認証、CSRF、セッション再生成を含む全テスト | 成功 | 実行記録参照 |
| `npm run lint` | 成功 | 実行記録参照 |
| ブラウザで登録 → 誤パスワード → ログイン → ログアウト → 再ログインを確認 | 成功 | 実行記録参照 |

## 計画差分ログ

| 日時 | 変更内容 | 理由 | 判断者・承認が必要な場合の承認者 |
| --- | --- | --- | --- |
| 2026-09-25 | ファイル・コミットの集約と追加検証 | 各Taskのメモ・実行記録に記載 | 実装担当 |

## 最終確認

- [x] 全Taskの状態を更新した
- [x] `changed / skipped` の理由を記載した
- [x] 変更を伴うサブタスクの実績コミットを記録した
- [x] 必要なテスト・lint・表示確認を完了し、結果を記録した
- [x] 各Taskの受け入れ条件とPlanの機能完了条件を満たした
- [x] コードレビューを実施し、指摘を反映した
- [x] 意図的な脆弱性・演習ガイド・SQL解説・初期化UI/API・版切替を追加していない
- [x] Plan内の全Taskが同じheadブランチに含まれている
- [x] PR作成前に全Taskの完了・検証結果・実際のbaseブランチを確認した
- [x] stacked PRのbaseを確認した。下位PRは未マージのため、その後のbase更新は将来の作業
- [x] このPlanに対応するPRを1つだけ作成または更新した
- [x] 実施内容、テスト結果、stack内の依存関係、残件をPR要約へ反映した

## 実行記録

2026-09-25: 15テスト・lint成功。ブラウザで新規登録、誤パスワード拒否、ログイン、ログアウト、再ログイン、画面レイアウトを確認。独立レビュー2名は不具合指摘なし。提案されたCSRFの別セッション・旧トークンと入力境界値の回帰テストを追加。登録とログインの共通ルートは同時実装、接続・画面は後続コミットで追加した。
