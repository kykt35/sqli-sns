import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../src/server.js';
import { readConfig } from '../src/config.js';
import { client, submit, csrf } from './helpers/http.js';

test('registered users complete a full SNS journey in isolated environments', async t => {
  const running = await startServer({ config: readConfig({ PORT: '0' }) }); t.after(() => running.close());
  const a = client(running.url), b = client(running.url);
  await Promise.all([a, b].map(async c => {
    assert.equal((await submit(c, '/register', { username: 'visitor', password: 'test-visitor-pass' })).status, 303);
    assert.equal((await submit(c, '/login', { username: 'visitor', password: 'test-visitor-pass' })).status, 303);
  }));
  const created = await submit(a, '/posts', { body: 'isolated-public-note', is_public: '1' }, '/posts/new');
  const path = created.headers.get('location');
  assert.equal((await b.request(path)).status, 404);
  assert.doesNotMatch((await b.request('/search?q=isolated')).text, /isolated-public-note/);
  await submit(a, path, { body: 'edited-public-note' }, path + '/edit');
  assert.match((await a.request('/search?q=edited')).text, /edited-public-note/);
  const privatePost = await submit(a, '/posts', { body: 'my-private-note', is_public: '0' }, '/posts/new');
  assert.doesNotMatch((await a.request('/')).text, /my-private-note/);
  assert.match((await a.request('/search?q=my-private')).text, /my-private-note/);
  await a.request('/logout', { method: 'POST', form: { _csrf: csrf(await a.request('/')) } });
  assert.equal((await a.request(privatePost.headers.get('location'))).status, 404);
});
