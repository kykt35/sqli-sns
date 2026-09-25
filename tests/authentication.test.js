import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../src/server.js';
import { readConfig } from '../src/config.js';
import { client, submit, csrf } from './helpers/http.js';

test('login rotates sessions, logout preserves the database but rejects old sessions', async t => {
  const running = await startServer({ config: readConfig({ PORT: '0' }) }); t.after(() => running.close());
  const a = client(running.url);
  await submit(a, '/register', { username: 'new_user', password: ' example-pass ' });
  assert.equal((await submit(a, '/login', { username: 'new_user', password: 'example-pass' })).status, 401);
  assert.equal((await submit(a, '/login', { username: 'missing', password: 'example-pass' })).status, 401);
  const before = a.cookie;
  assert.equal((await submit(a, '/login', { username: 'NEW_USER', password: ' example-pass ' })).status, 303);
  assert.notEqual(a.cookie, before);
  const authenticated = a.cookie;
  const home = await a.request('/');
  assert.match(home.text, /new_user/);
  assert.equal((await a.request('/logout', { method: 'POST', form: { _csrf: csrf(home) } })).status, 303);
  assert.notEqual(a.cookie, authenticated);
  assert.equal((await submit(a, '/login', { username: 'new_user', password: ' example-pass ' })).status, 303);
  const old = client(running.url); old.cookie = authenticated;
  assert.doesNotMatch((await old.request('/')).text, /new_user/);
});
