import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../src/server.js';
import { readConfig } from '../src/config.js';
import { credentials } from '../src/auth/validation.js';
import { client, csrf, submit } from './helpers/http.js';

test('credentials accept exact length boundaries without changing passwords', () => {
  for (const [username, password] of [['abc', '12345678'], ['a'.repeat(32), '語'.repeat(128)]]) {
    assert.equal(credentials({ username, password }).valid, true);
    assert.equal(credentials({ username, password }).password, password);
  }
  assert.equal(credentials({ username: ['abc'], password: '12345678' }).valid, false);
});
test('CSRF rejects foreign and pre-login tokens, including login and logout', async t => {
  const running = await startServer({ config: readConfig({ PORT: '0' }) }); t.after(() => running.close());
  const a = client(running.url), b = client(running.url);
  const token = csrf(await a.request('/login'));
  await b.request('/login');
  for (const _csrf of [token, '0'.repeat(64), '']) {
    assert.equal((await b.request('/login', { method: 'POST', form: { username: 'alice', password: 'alice-pass-2026', _csrf } })).status, 403);
  }
  await submit(a, '/login', { username: 'alice', password: 'alice-pass-2026' });
  assert.equal((await a.request('/logout', { method: 'POST', form: { _csrf: token } })).status, 403);
  assert.equal((await a.request('/logout', { method: 'POST' })).status, 403);
  assert.equal((await a.request('/logout', { method: 'POST', form: { _csrf: csrf(await a.request('/')) } })).status, 303);
});
