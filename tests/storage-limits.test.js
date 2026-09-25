import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase, prepareSeed } from '../src/db/create-db.js';
import { createPost, editPost } from '../src/posts/repository.js';
import { startServer } from '../src/server.js';
import { readConfig } from '../src/config.js';
import { client, csrf, submit } from './helpers/http.js';

test('database quotas include seeds and cover every account and visibility', async () => {
  const db = createDatabase(await prepareSeed(), { maxPosts: 6, maxUsers: 3 });
  try {
    createPost(db, 1, 'public', 1);
    const id = createPost(db, 2, 'private', 0);
    assert.throws(() => createPost(db, 1, 'over quota', 0), { code: 'SQLITE_CONSTRAINT_TRIGGER', message: 'database_post_limit' });
    assert.throws(() => db.prepare('INSERT INTO posts (user_id, body, is_public) VALUES (2, ?, 1)').run('alternate writer'), { code: 'SQLITE_CONSTRAINT_TRIGGER' });
    assert.equal(db.prepare('SELECT count(*) n FROM posts').get().n, 6);
    assert.equal(editPost(db, id, 2, 'edited at capacity'), 1);
    const insertUser = db.prepare('INSERT INTO users (username, password_digest) VALUES (?, ?)');
    insertUser.run('third', 'test-digest');
    assert.throws(() => insertUser.run('fourth', 'test-digest'), { code: 'SQLITE_CONSTRAINT_TRIGGER', message: 'database_user_limit' });
    assert.equal(db.prepare('SELECT count(*) n FROM users').get().n, 3);
  } finally { db.close(); }
});

test('SQLite page budget bounds multibyte storage and rolls back failed writes', async () => {
  const db = createDatabase(await prepareSeed(), { maxPosts: 10000 });
  try {
    assert.equal(db.pragma('page_size', { simple: true }), 4096);
    assert.equal(db.pragma('max_page_count', { simple: true }), 2048);
    const body = '😀'.repeat(1000);
    let inserted = 0, failure;
    for (; inserted < 3000; inserted++) {
      try { createPost(db, 1, body, inserted % 2); }
      catch (error) { failure = error; break; }
    }
    assert.equal(failure?.code, 'SQLITE_FULL');
    assert.equal(db.prepare('SELECT count(*) n FROM posts').get().n, inserted + 4);
    assert.ok(db.pragma('page_count', { simple: true }) <= 2048);
    assert.equal(db.prepare('SELECT body FROM posts WHERE id = 1').get().body.includes('エンジニアカフェ'), true);
  } finally { db.close(); }
});

test('database page limit also rejects an oversized edit without changing the row', async () => {
  const db = createDatabase(await prepareSeed());
  try {
    const before = db.prepare('SELECT * FROM posts WHERE id = 1').get();
    db.pragma(`max_page_count = ${db.pragma('page_count', { simple: true })}`);
    assert.throws(() => editPost(db, 1, 1, '😀'.repeat(1000)), { code: 'SQLITE_FULL' });
    assert.deepEqual(db.prepare('SELECT * FROM posts WHERE id = 1').get(), before);
  } finally { db.close(); }
});

test('shared storage limit survives activity, account changes and new or expired sessions', async t => {
  let now = Date.now();
  const running = await startServer({ config: readConfig({ PORT: '0', MAX_POSTS: '6' }), now: () => now });
  t.after(() => running.close());
  const a = client(running.url), b = client(running.url);
  await submit(a, '/login', { username: 'alice', password: 'alice-pass-2026' });
  for (const is_public of ['0', '1']) assert.equal((await submit(a, '/posts', { body: 'quota-note', is_public }, '/posts/new')).status, 303);
  for (let i = 0; i < 3; i++) {
    now += running.config.ttlMs / 2;
    const rejected = await submit(a, '/posts', { body: 'must-not-be-saved', is_public: '1' }, '/posts/new');
    assert.equal(rejected.status, 507);
    assert.match(rejected.text, /保存容量の上限/);
    assert.doesNotMatch(rejected.text, /SQLITE|database_post_limit/);
  }
  await submit(a, '/logout', {}, '/');
  await submit(a, '/login', { username: 'bob', password: 'bob-pass-2026' });
  assert.equal((await submit(a, '/posts', { body: 'new-account-same-quota', is_public: '0' }, '/posts/new')).status, 507);
  assert.equal((await submit(a, '/posts/3', { body: 'edit-still-works' }, '/posts/3/edit')).status, 303);
  assert.match((await a.request('/posts/3')).text, /edit-still-works/);
  await submit(b, '/login', { username: 'alice', password: 'alice-pass-2026' });
  assert.equal((await submit(b, '/posts', { body: 'another-browser', is_public: '1' }, '/posts/new')).status, 507);
  assert.match((await b.request('/posts/3')).text, /edit-still-works/);
  a.cookie = '';
  now += running.config.ttlMs + 1;
  await submit(a, '/login', { username: 'alice', password: 'alice-pass-2026' });
  assert.equal((await submit(a, '/posts', { body: 'after-expiry', is_public: '1' }, '/posts/new')).status, 507);
  assert.doesNotMatch((await a.request('/search?q=must-not-be-saved')).text, /post-body/);
});

test('concurrent registrations from different browsers cannot exceed the final shared account slot', async t => {
  const running = await startServer({ config: readConfig({ PORT: '0', MAX_USERS: '3' }) });
  t.after(() => running.close());
  const a = client(running.url), b = client(running.url);
  const tokens = await Promise.all([a, b].map(async c => csrf(await c.request('/register'))));
  const usernames = ['contender_one', 'contender_two'];
  const results = await Promise.all(usernames.map((username, i) => [a, b][i].request('/register', { method: 'POST', form: { username, password: 'account-password', _csrf: tokens[i] } })));
  assert.deepEqual(results.map(r => r.status).sort(), [303, 507]);
  const winner = usernames[results.findIndex(r => r.status === 303)];
  assert.equal((await submit(a, '/register', { username: winner, password: 'account-password' })).status, 409);
  assert.equal((await submit(a, '/login', { username: winner, password: 'account-password' })).status, 303);
  assert.equal((await submit(b, '/register', { username: 'another_user', password: 'account-password' })).status, 507);
  assert.equal(running.db.prepare('SELECT count(*) n FROM users').get().n, 3);
});

test('storage settings reject limits that cannot hold seed data or exceed the supported budget', () => {
  for (const env of [{ MAX_POSTS: '3' }, { MAX_POSTS: '10001' }, { MAX_USERS: '1' }, { MAX_USERS: '1001' }, { MAX_POSTS: '1.5' }, { MAX_USERS: 'x' }]) {
    assert.throws(() => readConfig(env));
  }
});

test('HTTP reports database capacity errors without losing shared rows', async t => {
  const running = await startServer({ config: readConfig({ PORT: '0' }) });
  t.after(() => running.close());
  const a = client(running.url), b = client(running.url);
  await submit(a, '/login', { username: 'alice', password: 'alice-pass-2026' });
  running.db.pragma(`max_page_count = ${running.db.pragma('page_count', { simple: true })}`);
  const result = await submit(a, '/posts/1', { body: '😀'.repeat(1000) }, '/posts/1/edit');
  assert.equal(result.status, 507);
  assert.doesNotMatch(result.text, /SQLITE|database_post_limit/);
  assert.match((await b.request('/posts/1')).text, /今日はエンジニアカフェ/);
});
