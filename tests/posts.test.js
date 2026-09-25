import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../src/server.js';
import { readConfig } from '../src/config.js';
import { client, submit, csrf } from './helpers/http.js';

test('posts enforce visibility, validation, owner assignment and csrf', async t => {
  const running = await startServer({ config: readConfig({ PORT: '0' }) }); t.after(() => running.close());
  const a = client(running.url);
  assert.equal((await a.request('/posts/new')).headers.get('location'), '/login');
  assert.equal((await a.request('/posts/4')).status, 404);
  assert.doesNotMatch((await a.request('/')).text, /非公開メモ/);
  await submit(a, '/login', { username: 'alice', password: 'alice-pass-2026' });
  assert.equal((await a.request('/posts/2')).status, 200);
  assert.equal((await a.request('/posts/4')).status, 404);
  for (const form of [{ body: ' ', is_public: '1' }, { body: 'x'.repeat(1001), is_public: '1' }, { body: 'valid', is_public: '2' }]) {
    assert.equal((await submit(a, '/posts', form, '/posts/new')).status, 400);
  }
  const created = await submit(a, '/posts', { body: '<script>alert(1)</script> 日本語', is_public: '0', user_id: '2' }, '/posts/new');
  assert.equal(created.status, 303);
  const path = created.headers.get('location');
  const detail = await a.request(path);
  assert.match(detail.text, /@alice/); assert.match(detail.text, /&lt;script&gt;/); assert.doesNotMatch(detail.text, /<script>/);
  assert.equal((await a.request('/posts', { method: 'POST', form: { body: 'hello', is_public: '1' } })).status, 403);
  const home = await a.request('/');
  await a.request('/logout', { method: 'POST', form: { _csrf: csrf(home) } });
  await submit(a, '/login', { username: 'bob', password: 'bob-pass-2026' });
  assert.equal((await a.request(path)).status, 404);
});
