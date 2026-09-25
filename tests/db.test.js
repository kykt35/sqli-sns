import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase, prepareSeed } from '../src/db/create-db.js';
import { hashPassword, verifyPassword } from '../src/auth/password.js';

test('salted digests verify only the original password', async () => {
  const digest = await hashPassword(' correct horse ');
  assert.notEqual(digest, await hashPassword(' correct horse '));
  assert.equal(await verifyPassword(' correct horse ', digest), true);
  assert.equal(await verifyPassword('correct horse', digest), false);
  assert.equal(await verifyPassword('x', 'malformed'), false);
});
test('seeded databases are independent and enforce constraints', async () => {
  const seed = await prepareSeed();
  const a = createDatabase(seed), b = createDatabase(seed);
  try {
    assert.equal(a.prepare('SELECT count(*) n FROM posts').get().n, 4);
    const alice = a.prepare('SELECT * FROM users WHERE username = ?').get('alice');
    assert.equal(await verifyPassword('alice-pass-2026', alice.password_digest), true);
    assert.throws(() => a.prepare('INSERT INTO users (username, password_digest) VALUES (?, ?)').run('alice', 'x'));
    assert.throws(() => a.prepare('INSERT INTO posts (user_id,body,is_public) VALUES (999, ?, 1)').run('x'));
    assert.throws(() => a.prepare('UPDATE posts SET is_public = 2').run());
    a.prepare('UPDATE posts SET body = ? WHERE id = 1').run('changed');
    assert.notEqual(b.prepare('SELECT body FROM posts WHERE id = 1').get().body, 'changed');
  } finally { a.close(); b.close(); }
});
