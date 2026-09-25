# 実装上の選択

- Node.js 22系、Express 5.2.1、better-sqlite3 13.0.3、EJS 6.0.1、express-session 1.19.0を使用。依存はlockfileに固定。
- ESLint 9のサポート終了警告を受け、インストール時点の10.11.0へ変更した。
- 単一Node.jsプロセスで、全利用者が1つのインメモリSQLite DBを共有する。ブラウザごとに管理するのはログインセッションのみ。再起動でDBと全セッションを破棄する。
- SQLiteの挿入トリガーでSNS全体の投稿・アカウント件数を制限し、DBのページ数にも8MiBの上限を設ける。DBとセッションの寿命を分け、セッション失効では投稿・アカウントを消さない。
- パスワードは非同期scrypt、N=16384、r=8、p=5、ソルト16バイト、出力64バイト。初期データのハッシュは起動時に生成し、共有DBに保存する。

参照（2026-09-25確認）：[Node.js 22 crypto](https://nodejs.org/docs/latest-v22.x/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback)、[OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt)、[Expressの要件](https://expressjs.com/en/starter/installing/)、[better-sqlite3](https://github.com/WiseLibs/better-sqlite3)。

計画との差分：DBスキーマ・seed・接続生成は小規模なため `src/db/create-db.js` に集約。ブラウザごとのDB分離を撤廃し、起動時に共有DBを作成して終了時に閉じる構成へ変更した。テストは機能ごとに集約し、計画の予定ファイルと完全に一対一にはしていない。
