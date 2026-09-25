import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../src/server.js';
import { readConfig } from '../src/config.js';
import { client } from './helpers/http.js';

const settings = { APP_MODE: 'public', PORT: '0', SESSION_SECRET: 'test-only-secret-'.repeat(3), BASIC_AUTH_USERNAME: 'event', BASIC_AUTH_PASSWORD: 'test-event-pass', TRUST_PROXY: '127.0.0.1' };
const authorization = 'Basic ' + Buffer.from('event:test-event-pass').toString('base64');
test('public mode requires secrets and an explicit valid proxy boundary', () => {
  for (const key of ['SESSION_SECRET', 'BASIC_AUTH_USERNAME', 'BASIC_AUTH_PASSWORD', 'TRUST_PROXY']) {
    assert.throws(() => readConfig({ ...settings, [key]: '' }));
  }
  for (const value of ['true', '*', '0.0.0.0/0', '::/0', '127.0.0.1/99']) assert.throws(() => readConfig({ ...settings, TRUST_PROXY: value }));
  for (const value of ['::ffff:0.0.0.0/96', '::ffff:0.0.0.0/64', '0:0:0:0:0:FFFF:0:0/96', '::ffff:c000:201/120']) assert.throws(() => readConfig({ ...settings, TRUST_PROXY: value }));
  assert.doesNotThrow(() => readConfig({ ...settings, TRUST_PROXY: '192.0.2.0/24,2001:db8::/64' }));
});
test('Basic auth protects every route and static file before environment allocation', async t => {
  const running = await startServer({ config: readConfig(settings) }); t.after(() => running.close());
  const a = client(running.url);
  for (const path of ['/', '/register', '/login', '/search', '/posts/new', '/posts/1', '/styles.css', '/missing']) {
    const response = await a.request(path, { headers: { 'x-forwarded-proto': 'https' } });
    assert.equal(response.status, 401, path); assert.match(response.headers.get('www-authenticate'), /Basic/);
  }
  assert.equal((await a.request('/register', { method: 'POST', form: {}, headers: { 'x-forwarded-proto': 'https' } })).status, 401);
  assert.equal(running.environments.size, 0);
  assert.equal((await a.request('/', { headers: { 'x-forwarded-proto': 'https', authorization: 'Basic invalid' } })).status, 401);
  const valid = await a.request('/', { headers: { 'x-forwarded-proto': 'https', authorization } });
  assert.equal(valid.status, 200); assert.match(valid.headers.get('set-cookie'), /Secure/);
  assert.equal((await a.request('/styles.css', { headers: { 'x-forwarded-proto': 'https', authorization } })).status, 200);
});
test('untrusted forwarded HTTPS and direct HTTP cannot bypass public transport policy', async t => {
  const running = await startServer({ config: readConfig({ ...settings, TRUST_PROXY: '192.0.2.1' }) }); t.after(() => running.close());
  const a = client(running.url);
  assert.equal((await a.request('/', { headers: { 'x-forwarded-proto': 'https', authorization } })).status, 426);
  assert.equal(running.environments.size, 0);
});
