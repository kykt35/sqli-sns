import test from 'node:test';
import assert from 'node:assert/strict';
import { launch } from './helpers/process.js';
import { client } from './helpers/http.js';

test('process restart discards old sessions while new browsers can use the shared database', async t => {
  const first = await launch({ SESSION_SECRET: 'fixed-test-secret-used-across-restarts' });
  t.after(() => first.stop());
  const a = client(first.url);
  assert.equal((await a.request('/')).status, 200);
  const oldCookie = a.cookie;
  assert.equal((await client(first.url).request('/')).status, 200);
  await first.stop();
  const second = await launch({ SESSION_SECRET: 'fixed-test-secret-used-across-restarts' });
  t.after(() => second.stop());
  const b = client(second.url); b.cookie = oldCookie;
  assert.equal((await b.request('/')).status, 200);
  assert.notEqual(b.cookie, oldCookie);
});

test('restart clears newly registered accounts, edited seed posts and new posts', async t => {
  const { submit } = await import('./helpers/http.js');
  const env = { SESSION_SECRET: 'fixed-test-secret-used-across-restarts' };
  const first = await launch(env); t.after(() => first.stop());
  const a = client(first.url);
  await submit(a, '/register', { username: 'restart_user', password: 'restart-pass-2026' });
  await submit(a, '/login', { username: 'restart_user', password: 'restart-pass-2026' });
  await submit(a, '/posts', { body: 'only-before-restart', is_public: '1' }, '/posts/new');
  await submit(a, '/login', { username: 'alice', password: 'alice-pass-2026' });
  await submit(a, '/posts/1', { body: 'edited-before-restart' }, '/posts/1/edit');
  const oldCookie = a.cookie;
  await first.stop();
  const second = await launch(env); t.after(() => second.stop());
  const b = client(second.url); b.cookie = oldCookie;
  const home = await b.request('/');
  assert.match(home.text, /今日はエンジニアカフェ/);
  assert.doesNotMatch(home.text, /only-before-restart|edited-before-restart|ログイン中/);
  assert.equal((await b.request('/posts/5')).status, 404);
  assert.equal((await submit(b, '/login', { username: 'restart_user', password: 'restart-pass-2026' })).status, 401);
  assert.equal((await submit(b, '/register', { username: 'new_after_restart', password: 'restart-pass-2026' })).status, 303);
  const old = client(second.url); old.cookie = oldCookie;
  assert.doesNotMatch((await old.request('/')).text, /ログイン中/);
});
