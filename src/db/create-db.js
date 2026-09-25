import Database from 'better-sqlite3';
import { hashPassword } from '../auth/password.js';

export async function prepareSeed() {
  return {
    alice: await hashPassword('alice-pass-2026'),
    bob: await hashPassword('bob-pass-2026'),
  };
}
export function createDatabase(seed) {
  const db = new Database(':memory:');
  try {
    db.pragma('foreign_keys = ON');
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        username TEXT NOT NULL UNIQUE CHECK(length(username) BETWEEN 3 AND 32),
        password_digest TEXT NOT NULL
      );
      CREATE TABLE posts (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 1000),
        is_public INTEGER NOT NULL CHECK(is_public IN (0,1)),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
    `);
    db.transaction(() => {
      const user = db.prepare('INSERT INTO users (id, username, password_digest) VALUES (?, ?, ?)');
      user.run(1, 'alice', seed.alice);
      user.run(2, 'bob', seed.bob);
      const post = db.prepare('INSERT INTO posts (user_id, body, is_public) VALUES (?, ?, ?)');
      post.run(1, '今日はエンジニアカフェで勉強。小さな発見をここに残していきます。', 1);
      post.run(1, 'Aliceの非公開メモ：次回はデータベースの仕組みを復習する。', 0);
      post.run(2, 'コーヒーを飲みながら、ひとつずつ。今日もよろしくお願いします。', 1);
      post.run(2, 'Bobの非公開メモ：公開前のイベント企画を準備中。', 0);
    })();
    return db;
  } catch (error) { db.close(); throw error; }
}
