# 実装上の選択

- Node.js 22系、Express 5.2.1、better-sqlite3 13.0.3、EJS 6.0.1、express-session 1.19.0を使用。依存はlockfileに固定。
- ESLint 9のサポート終了警告を受け、インストール時点の10.11.0へ変更した。
- 単一Node.jsプロセス、参加者ごとに独立したインメモリSQLite DB。再起動でDBとセッションを破棄する。
- パスワードは非同期scrypt、N=16384、r=8、p=5、ソルト16バイト、出力64バイト。初期データのハッシュは起動時に生成し、参加者DB作成時にコピーする。

参照（2026-09-25確認）：[Node.js 22 crypto](https://nodejs.org/docs/latest-v22.x/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback)、[OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt)、[Expressの要件](https://expressjs.com/en/starter/installing/)、[better-sqlite3](https://github.com/WiseLibs/better-sqlite3)。

計画との差分：DBスキーマ・seed・接続生成は小規模なため `src/db/create-db.js` に集約。環境数上限と期限切れ解放は分離処理と一体で実装した。テストは機能ごとに集約し、計画の予定ファイルと完全に一対一にはしていない。
