import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../src/server.js';
import { readConfig } from '../src/config.js';
import { client, submit } from './helpers/http.js';

test('cookie deletion creates a new session without deleting shared accounts or posts', async t => {
  const running = await startServer({ config: readConfig({ PORT: '0' }) });
  t.after(() => running.close());
  const a = client(running.url), b = client(running.url);
  const r = await a.request('/');
  assert.match(r.headers.get('set-cookie'), /HttpOnly/);
  assert.match(r.headers.get('set-cookie'), /SameSite=Lax/);
  await submit(a, '/register', { username: 'retained_user', password: 'retained-password' });
  await submit(a, '/login', { username: 'retained_user', password: 'retained-password' });
  const created = await submit(a, '/posts', { body: 'retained-private', is_public: '0' }, '/posts/new');
  const path = created.headers.get('location');
  a.cookie = '';
  assert.equal((await a.request(path)).status, 404);
  assert.equal((await submit(a, '/login', { username: 'retained_user', password: 'retained-password' })).status, 303);
  assert.match((await a.request(path)).text, /retained-private/);
  assert.equal((await b.request(path)).status, 404);
  assert.notEqual(a.cookie, b.cookie);
});

test('tampered and expired cookies lose identity but leave the shared database intact', async t => {
  let now = Date.now();
  const running = await startServer({ config: readConfig({ PORT: '0' }), now: () => now });
  t.after(() => running.close());
  const a = client(running.url);
  await submit(a, '/register', { username: 'persistent_user', password: 'persistent-password' });
  await submit(a, '/login', { username: 'persistent_user', password: 'persistent-password' });
  const post = await submit(a, '/posts', { body: 'survives-session-expiry', is_public: '0' }, '/posts/new');
  const path = post.headers.get('location');
  const oldCookie = a.cookie;
  a.cookie = oldCookie.slice(0, -1) + (oldCookie.endsWith('x') ? 'y' : 'x');
  assert.equal((await a.request(path)).status, 404);
  assert.notEqual(a.cookie, oldCookie);
  now += running.config.ttlMs + 1;
  running.store.sweep();
  a.cookie = oldCookie;
  assert.equal((await a.request(path)).status, 404);
  assert.notEqual(a.cookie, oldCookie);
  assert.equal((await submit(a, '/login', { username: 'persistent_user', password: 'persistent-password' })).status, 303);
  assert.match((await a.request(path)).text, /survives-session-expiry/);
});
