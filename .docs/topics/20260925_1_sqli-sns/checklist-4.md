# 実装チェックリスト: Plan 4 限定公開の準備・起動手順・総合検証

## 対応Plan / PR

- Plan: [plan-4.md](./plan-4.md)
- Topic: `20260925_1_sqli-sns`
- PR単位: Plan 4全体で1 PR
- 全体: [implementation-overview.md](./implementation-overview.md)

## PR / stack記録

| 項目 | 計画 | 実績 |
| --- | --- | --- |
| headブランチ | `feat/sns-runtime` | `feat/sns-runtime` |
| baseブランチ | `feat/sns-posts-search` | `feat/sns-posts-search` |
| 直下の依存Plan | Plan 3 | Plan 3 |
| stack位置 | top | top |
| PR | 未作成 | 未作成。Docker実行検証待ち |
| マージ順 | 4番目 | 4番目（未マージ） |

## ステータス定義

- `planned`: 計画済み（未着手）
- `done`: 計画どおり完了
- `changed`: 計画から変更して実施（理由を記載）
- `skipped`: 未実施／不要化（理由を記載）

## Task別チェック

### Task 1: Basic認証と公開モードの設定を実装する

| ID | 種別 | 内容 | 対応コミット（予定） | 実績コミット | 状態 | メモ |
| --- | --- | --- | --- | --- | --- | --- |
| 1-1 | test | Basic認証なし／不正／正常の全ルート・静的ファイル、認証前に環境が作られないこと、設定不足、公開Cookie属性、プロキシ由来情報の扱いをテストする。 | `test(runtime): define restricted access configuration` | fcf2a57 / a45b2dd | done | 公開設定とBasic認証を同一テストファイルで検証 |
| 1-2 | impl | Basic認証を全配信の前段に実装し、公開モードの必須設定・Cookie・限定したプロキシ信頼設定を接続する。秘密値をログや応答へ含めない。 | `feat(runtime): add basic auth and public mode settings` | cc46daa / a45b2dd | done | レビューでIPv4射影IPv6 CIDRを拒否する修正を追加 |
| 1-3 | verify | 公開設定・Basic認証テストと全テスト・lintを実行する。ヘルスチェック等の無認証例外を不用意に追加していないことを確認する。 | - | - | done | 全25テスト・lint成功、追加修正は対象3テストとlint成功 |

### Task 2: コンテナと運営手順を用意する

| ID | 種別 | 内容 | 対応コミット（予定） | 実績コミット | 状態 | メモ |
| --- | --- | --- | --- | --- | --- | --- |
| 2-1 | impl | 単一アプリのDockerfile・Compose・秘密値を含まない設定例を作成する。Node.jsとネイティブDB依存の組み合わせを固定し、DB永続ボリュームは追加しない。 | `chore(runtime): add container startup configuration` | 052a89c | done | Compose設定検証成功。コンテナ実行は未検証 |
| 2-2 | impl | 登録・ログイン・投稿・検索、初期アカウント、再起動時に消える範囲、期限切れ時の挙動、環境上限、Basic認証、停止手順をREADMEと運営文書へ記載する。 | `docs(sns): document startup reset and event operation` | e9ebd0b / 2ff1f46 | done | README・運営文書を追加 |
| 2-3 | verify | クリーンな依存インストールとコンテナのbuild/up/restart/downを確認する。設定例に秘密値がなく、説明だけで起動と初期化を再現できることを確認する。 | - | - | changed | npm ci成功、Dockerデーモン停止のためbuild/up/restart/down未実施 |

### Task 3: 全体の動作と開催前の残件を確認する

| ID | 種別 | 内容 | 対応コミット（予定） | 実績コミット | 状態 | メモ |
| --- | --- | --- | --- | --- | --- | --- |
| 3-1 | test | 登録→ログイン→公開／非公開投稿→編集→検索→ログアウトのHTTP結合テストと、子プロセス再起動・古いCookie・同一ユーザーID再利用を検証するテストを追加する。 | `test(sns): cover full journey and process restart` | a682a1b / edaa41f | done | 実プロセス再起動、アカウント・投稿・旧Cookieの初期化を確認 |
| 3-2 | test | 2つ以上の独立ブラウザ相当での環境分離と設定上限の同時アクセスをテストする。上限超過が既存環境へ影響せず、期限切れ解放で新規利用を再開できることを確認する。 | `test(runtime): cover capacity and concurrent isolation` | 4ca0ee5 | done | 独立環境と5並列リクエストの上限・期限切れを確認 |
| 3-3 | verify | 全テスト・lint、ブラウザでの主要操作・表示、ローカルコンテナの再起動を確認する。不具合が出た場合は原因箇所を修正して該当テストを再実行し、変更と実績を記録する。 | - | - | changed | Node全25テスト・lint・ブラウザ確認成功。コンテナ再起動のみ未確認 |
| 3-4 | impl | 検証結果と公開前残件を記録する。実環境のHTTPS・配信元のアクセス制御・想定参加人数での負荷・停止削除確認は未実施として担当作業を明記する。 | `docs(sns): record verification and release readiness` | 2ff1f46 | done | 検証結果とDocker・公開環境の残件を記録 |

## 検証記録

| コマンド／確認 | 結果 | 証跡・残件 |
| --- | --- | --- |
| `npm ci && npm test` | 成功 | 25テスト成功 |
| `npm run lint` | 成功 | 追加修正後も成功 |
| `docker compose build`、`docker compose up -d`でローカル起動 | 未実施 | Dockerデーモン停止で接続不可 |
| `docker compose restart`後に登録・投稿・ログインが初期化されることを確認し、`docker compose down`で停止 | 未実施 | Dockerデーモン停止で接続不可 |
| READMEの通常操作に相当するブラウザ確認 | 成功 | 登録・認証・投稿・編集・検索・ログアウト・再起動を確認 |

## 計画差分ログ

| 日時 | 変更内容 | 理由 | 判断者・承認が必要な場合の承認者 |
| --- | --- | --- | --- |
| 2026-09-25 | コンテナ検証が未完了 | Dockerデーモン停止。実装とNode検証は完了 | 実装担当 |

## 最終確認

- [x] 全Taskの状態を更新した
- [x] `changed / skipped` の理由を記載した
- [x] 変更を伴うサブタスクの実績コミットを記録した
- [ ] 必要なテスト・lint・表示確認を完了し、結果を記録した
- [ ] 各Taskの受け入れ条件とPlanの機能完了条件を満たした
- [x] コードレビューを実施し、指摘を反映した
- [x] 意図的な脆弱性・演習ガイド・SQL解説・初期化UI/API・版切替を追加していない
- [x] Plan内の全Taskが同じheadブランチに含まれている
- [ ] PR作成前に全Taskの完了・検証結果・実際のbaseブランチを確認した
- [ ] stacked PRでは直下Planのheadをbaseとし、下位マージ後はbaseと差分を更新した
- [ ] このPlanに対応するPRを1つだけ作成または更新した
- [ ] 実施内容、テスト結果、stack内の依存関係、残件をPR要約へ反映した

## 公開前の別途確認（アプリ実装PRの完了と区別）

- [ ] ホスティング先・URL・参加人数を確定した
- [ ] 実環境のHTTPS・Secure Cookie・プロキシ信頼設定を確認した
- [ ] 配信元への直接アクセスでもBasic認証を迂回できないことを確認した
- [ ] 想定参加人数で資源使用・環境数上限・登録・投稿・検索を検証した
- [ ] 全参加者に影響する再起動のタイミングを決めた
- [ ] 開催終了後の停止・削除方法を実環境で確認した

現時点ではすべて未実施。公開環境の準備完了とは扱わない。

## 実行記録

2026-09-25: クリーンインストール、25テスト、lint成功。独立レビューはreview_foundation_correctness（正確性・計画整合）、review_foundation_boundaries（認証・境界・エラー処理）。P2のIPv4射影IPv6 CIDRによる広範囲信頼をa45b2ddで修正し、対象3テストとlint成功。Dockerデーモン停止でコンテナ実行は未検証。PR 4作成は必要なコンテナ検証が完了するまで保留。
