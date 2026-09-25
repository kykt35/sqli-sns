import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../src/server.js';
import { readConfig } from '../src/config.js';
import { client, submit, csrf } from './helpers/http.js';

test('different browsers share public posts while private posts and edits stay owner-only', async t => {
  const running = await startServer({ config: readConfig({ PORT: '0' }) }); t.after(() => running.close());
  const a = client(running.url), b = client(running.url);
  await Promise.all([a, b].map(async (c, i) => {
    assert.equal((await submit(c, '/register', { username: `visitor_${i}`, password: 'test-visitor-pass' })).status, 303);
    assert.equal((await submit(c, '/login', { username: `visitor_${i}`, password: 'test-visitor-pass' })).status, 303);
  }));
  const created = await submit(a, '/posts', { body: 'shared-public-note', is_public: '1' }, '/posts/new');
  const path = created.headers.get('location');
  assert.equal((await b.request(path)).status, 200);
  assert.match((await b.request('/')).text, /shared-public-note/);
  assert.match((await b.request('/search?q=shared')).text, /shared-public-note/);
  assert.equal((await b.request(path + '/edit')).status, 404);
  assert.equal((await submit(b, path, { body: 'unauthorized-edit' }, '/')).status, 404);
  await submit(a, path, { body: 'edited-public-note' }, path + '/edit');
  assert.match((await b.request('/search?q=edited')).text, /edited-public-note/);
  const privatePost = await submit(a, '/posts', { body: 'my-private-note', is_public: '0' }, '/posts/new');
  const privatePath = privatePost.headers.get('location');
  assert.doesNotMatch((await a.request('/')).text, /my-private-note/);
  assert.match((await a.request('/search?q=my-private')).text, /my-private-note/);
  assert.equal((await b.request(privatePath)).status, 404);
  assert.doesNotMatch((await b.request('/search?q=my-private')).text, /my-private-note/);
  await a.request('/logout', { method: 'POST', form: { _csrf: csrf(await a.request('/')) } });
  assert.equal((await a.request(privatePath)).status, 404);
  assert.equal((await submit(b, '/login', { username: 'visitor_0', password: 'test-visitor-pass' })).status, 303);
  assert.match((await b.request(privatePath)).text, /my-private-note/);
  assert.equal((await a.request(privatePath)).status, 404);
});
