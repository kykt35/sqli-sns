import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../src/server.js';
import { readConfig } from '../src/config.js';
import { client, submit } from './helpers/http.js';

test('auth pages escape input and never render passwords or internal errors', async t => {
  const running = await startServer({ config: readConfig({ PORT: '0' }) }); t.after(() => running.close());
  const a = client(running.url);
  const response = await submit(a, '/register', { username: '<script>alert(1)</script>', password: 'hidden-password' });
  assert.equal(response.status, 400);
  assert.doesNotMatch(response.text, /<script>|hidden-password|password_digest|SQLITE/);
  assert.match(response.text, /&lt;script&gt;/);
  assert.equal((await a.request('/login')).status, 200);
  assert.equal((await a.request('/missing')).status, 404);
  assert.equal((await a.request('/logout')).status, 404);
});
