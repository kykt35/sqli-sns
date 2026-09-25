import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../src/server.js';
import { readConfig } from '../src/config.js';
import { client } from './helpers/http.js';

test('HTTP sessions allocate independent environments and enforce capacity', async t => {
  const running = await startServer({ config: readConfig({ PORT: '0', MAX_ENVIRONMENTS: '2' }) });
  t.after(() => running.close());
  const a = client(running.url), b = client(running.url);
  const r = await a.request('/?environmentId=chosen');
  assert.match(r.headers.get('set-cookie'), /HttpOnly/);
  assert.match(r.headers.get('set-cookie'), /SameSite=Lax/);
  assert.equal((await b.request('/')).status, 200);
  assert.notEqual(a.cookie, b.cookie);
  assert.equal(running.environments.size, 2);
  assert.equal((await client(running.url).request('/')).status, 503);
  assert.equal((await a.request('/')).status, 200);
});

test('tampered cookies and expired sessions never reconnect to a live environment', async t => {
  let now = Date.now();
  const running = await startServer({ config: readConfig({ PORT: '0' }), now: () => now });
  t.after(() => running.close());
  const a = client(running.url);
  await a.request('/');
  const oldCookie = a.cookie;
  a.cookie = oldCookie.slice(0, -1) + (oldCookie.endsWith('x') ? 'y' : 'x');
  await a.request('/');
  assert.equal(running.environments.size, 2);
  assert.notEqual(a.cookie, oldCookie);
  now += running.config.ttlMs + 1;
  a.cookie = oldCookie;
  await a.request('/');
  assert.notEqual(a.cookie, oldCookie);
  assert.equal(running.environments.size, 1);
});
