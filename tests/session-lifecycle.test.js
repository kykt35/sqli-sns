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
