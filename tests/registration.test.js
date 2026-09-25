import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../src/server.js';
import { readConfig } from '../src/config.js';
import { client, submit } from './helpers/http.js';

test('registration validates values, CSRF, duplicates and environment isolation', async t => {
  const running = await startServer({ config: readConfig({ PORT: '0' }) }); t.after(() => running.close());
  const a = client(running.url), b = client(running.url);
  assert.equal((await a.request('/register', { method: 'POST', form: { username: 'newuser', password: 'example-pass' } })).status, 403);
  for (const form of [{ username: '', password: 'example-pass' }, { username: "' OR 1=1--", password: 'example-pass' }, { username: 'a'.repeat(33), password: 'example-pass' }, { username: 'valid', password: 'short' }, { username: 'valid', password: 'p'.repeat(129) }]) {
    assert.equal((await submit(a, '/register', form)).status, 400);
  }
  const success = await submit(a, '/register', { username: ' New_User ', password: 'example-pass' });
  assert.equal(success.status, 303); assert.equal(success.headers.get('location'), '/login');
  const duplicate = await submit(a, '/register', { username: 'NEW_USER', password: 'do-not-echo-this' });
  assert.equal(duplicate.status, 409); assert.doesNotMatch(duplicate.text, /do-not-echo-this|scrypt\$/);
  assert.equal((await submit(a, '/register', { username: 'alice', password: 'example-pass' })).status, 409);
  assert.equal((await submit(b, '/register', { username: 'new_user', password: 'example-pass' })).status, 303);
});
