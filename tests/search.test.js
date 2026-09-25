import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../src/server.js';
import { readConfig } from '../src/config.js';
import { client, submit } from './helpers/http.js';
import { createDatabase, prepareSeed } from '../src/db/create-db.js';
import { searchPosts } from '../src/posts/search.js';
import { listPublicPosts } from '../src/posts/repository.js';

test('search is literal, parameterized and limited to visible posts', async t => {
  const running = await startServer({ config: readConfig({ PORT: '0' }) }); t.after(() => running.close());
  const a = client(running.url);
  assert.doesNotMatch((await a.request('/search?q=')).text, /非公開メモ/);
  await submit(a, '/login', { username: 'alice', password: 'alice-pass-2026' });
  const visible = await a.request('/search?q=');
  assert.match(visible.text, /Aliceの非公開メモ/);
  assert.doesNotMatch(visible.text, /Bobの非公開メモ|scrypt\$|password_digest/);
  const body = 'literal % _ \\ 日本語 O\'Reilly';
  await submit(a, '/posts', { body, is_public: '1' }, '/posts/new');
  for (const q of ['%', '_', '\\', '日本語', "O'Reilly"]) {
    const r = await a.request('/search?q=' + encodeURIComponent(q));
    assert.equal(r.status, 200); assert.match(r.text, /literal %/);
    assert.doesNotMatch(r.text, /Bobの非公開メモ|コーヒーを飲みながら|今日はエンジニアカフェ/);
  }
  const injection = await a.request('/search?q=' + encodeURIComponent("' OR 1=1 UNION SELECT username,password_digest FROM users--"));
  assert.equal(injection.status, 200);
  assert.match(injection.text, /見つかりませんでした/);
  assert.doesNotMatch(injection.text, /scrypt\$/);
  assert.equal((await a.request('/search?q=' + 'x'.repeat(100))).status, 200);
  assert.equal((await a.request('/search?q=' + 'x'.repeat(101))).status, 400);
  assert.equal((await a.request('/search?q=x&q=y')).status, 400);
});
test('timeline and search return at most 50 posts in descending id order', async () => {
  const db = createDatabase(await prepareSeed());
  try {
    for (let i = 0; i < 55; i++) db.prepare('INSERT INTO posts (user_id,body,is_public) VALUES (1,?,1)').run('limit-'+i);
    const timeline = listPublicPosts(db), results = searchPosts(db, '', 1);
    for (const rows of [timeline, results]) {
      assert.equal(rows.length, 50);
      assert.ok(rows[0].id > rows[49].id);
      assert.equal(Object.hasOwn(rows[0], 'password_digest'), false);
    }
  } finally { db.close(); }
});
