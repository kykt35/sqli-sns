# 実装チェックリスト: Plan 1 起動・DB・参加者環境の基盤

## 対応Plan / PR

- Plan: [plan-1.md](./plan-1.md)
- Topic: `20260925_1_sqli-sns`
- PR単位: Plan 1全体で1 PR
- 全体: [implementation-overview.md](./implementation-overview.md)

## PR / stack記録

| 項目 | 計画 | 実績 |
| --- | --- | --- |
| headブランチ | `feat/sns-foundation` |  |
| baseブランチ | `main（仮。実リポジトリ確認後に確定）` |  |
| 直下の依存Plan | なし |  |
| stack位置 | bottom |  |
| PR | 未作成 |  |
| マージ順 | 1番目 |  |

## ステータス定義

- `planned`: 計画済み（未着手）
- `done`: 計画どおり完了
- `changed`: 計画から変更して実施（理由を記載）
- `skipped`: 未実施／不要化（理由を記載）

## Task別チェック

### Task 1: アプリと検証基盤を用意する

| ID | 種別 | 内容 | 対応コミット（予定） | 実績コミット | 状態 | メモ |
| --- | --- | --- | --- | --- | --- | --- |
| 1-1 | impl | 採用Node.jsと依存ライブラリの互換性を公式資料で確認し、package・lockfile、start/test/lint、ignore設定とHTTPテストヘルパーを用意する。 | `chore(sns): bootstrap app and test tooling` |   | planned |  |
| 1-2 | test | ポート指定、既定のループバック待受、不正設定での起動失敗、正常終了後の再起動の契約テストを作成する。 | `test(runtime): define startup and shutdown behavior` |   | planned |  |
| 1-3 | impl | アプリ生成とlistenを分離し、設定検証・起動・終了処理を実装する。終了時に後続のDBやストアを閉じるためのライフサイクルを用意する。 | `feat(runtime): add application lifecycle` |   | planned |  |
| 1-4 | verify | npm testとnpm run lintを実行し、実際に起動・停止できることを確認する。 | - | - | planned |  |

### Task 2: データモデルと初期データを実装する

| ID | 種別 | 内容 | 対応コミット（予定） | 実績コミット | 状態 | メモ |
| --- | --- | --- | --- | --- | --- | --- |
| 2-1 | test | username一意性、必須値、投稿の外部キー・公開フラグ、seedの公開／非公開投稿、ハッシュ照合と誤パスワード拒否を検証するテストを作成する。 | `test(db): define sns schema and seed contracts` |   | planned |  |
| 2-2 | impl | users/postsのスキーマ、SQLite接続生成・クローズ、パラメーター化したseed処理、ソルト付きパスワードハッシュ生成・照合を実装する。scryptのパラメーターは公式資料を確認して定義に固定する。 | `feat(db): add sns schema and seeded accounts` |   | planned |  |
| 2-3 | verify | DB・パスワードのテストを実行し、保存値が平文ではなく初期アカウントで照合できることを確認する。 | - | - | planned |  |

### Task 3: 参加者環境とセッションのライフサイクルを実装する

| ID | 種別 | 内容 | 対応コミット（予定） | 実績コミット | 状態 | メモ |
| --- | --- | --- | --- | --- | --- | --- |
| 3-1 | test | 2環境の分離、Cookie改変・環境ID指定の拒否、上限超過、期限切れの解放、作成失敗時の後始末、再起動後の古いCookieを検証する。期限は偽時計で検証する。 | `test(runtime): cover environment isolation and reset` |   | planned |  |
| 3-2 | impl | サーバー管理の環境レジストリとメモリセッションストアを実装し、環境IDを受け付けない割り当てmiddlewareを接続する。セッションの更新時も環境を引き継げる関数を提供する。 | `feat(runtime): isolate participant databases and sessions` |   | planned |  |
| 3-3 | impl | 環境数上限、期限切れの接続解放、利用中環境の延命、起動失敗・終了時の解放を実装する。CookieはHttpOnly・SameSite=Lax・Host-onlyとし、公開時はSecureを使用する設定境界を用意する。 | `feat(runtime): bound environment lifecycle and cleanup` |   | planned |  |
| 3-4 | verify | 全テスト・lintを実行し、同一サーバー再起動で全環境が初期化されることをプロセス境界で確認する。 | - | - | planned |  |

## 検証記録

| コマンド／確認 | 結果 | 証跡・残件 |
| --- | --- | --- |
| `npm ci` | 未実施 |  |
| `npm test`：起動、DB、パスワード、環境・セッションのテスト | 未実施 |  |
| `npm run lint` | 未実施 |  |
| `npm start`：ループバックで起動し、終了後に再起動できることを確認 | 未実施 |  |

## 計画差分ログ

| 日時 | 変更内容 | 理由 | 判断者・承認が必要な場合の承認者 |
| --- | --- | --- | --- |
|  |  |  |  |

## 最終確認

- [ ] 全Taskの状態を更新した
- [ ] `changed / skipped` の理由を記載した
- [ ] 変更を伴うサブタスクの実績コミットを記録した
- [ ] 必要なテスト・lint・表示確認を完了し、結果を記録した
- [ ] 各Taskの受け入れ条件とPlanの機能完了条件を満たした
- [ ] コードレビューを実施し、指摘を反映した
- [ ] 意図的な脆弱性・演習ガイド・SQL解説・初期化UI/API・版切替を追加していない
- [ ] Plan内の全Taskが同じheadブランチに含まれている
- [ ] PR作成前に全Taskの完了・検証結果・実際のbaseブランチを確認した
- [ ] stacked PRでは直下Planのheadをbaseとし、下位マージ後はbaseと差分を更新した
- [ ] このPlanに対応するPRを1つだけ作成または更新した
- [ ] 実施内容、テスト結果、stack内の依存関係、残件をPR要約へ反映した
