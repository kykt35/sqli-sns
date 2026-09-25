import Database from 'better-sqlite3';
import { hashPassword } from '../auth/password.js';
import { readStorageLimits } from './storage-limits.js';

export async function prepareSeed() {
  return {
    alice: await hashPassword('alice-pass-2026'),
    bob: await hashPassword('bob-pass-2026'),
  };
}
export function createDatabase(seed, limits) {
  const { maxPosts, maxUsers } = readStorageLimits(limits);
  const db = new Database(':memory:');
  try {
    // Bound the shared SQLite database to 8 MiB, including indexes and edits.
    // This is a database-page budget, not a bound on total process RSS.
    db.pragma('page_size = 4096');
    db.pragma('max_page_count = 2048');
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
      -- Enforce totals at the write boundary, including concurrent registrations
      -- that finish password hashing after another request claims the last slot.
      CREATE TRIGGER users_storage_limit BEFORE INSERT ON users
      WHEN (SELECT count(*) FROM users) >= ${maxUsers}
      BEGIN SELECT RAISE(ABORT, 'database_user_limit'); END;
      CREATE TRIGGER posts_storage_limit BEFORE INSERT ON posts
      WHEN (SELECT count(*) FROM posts) >= ${maxPosts}
      BEGIN SELECT RAISE(ABORT, 'database_post_limit'); END;
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
