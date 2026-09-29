import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../src/server.js';
import { readConfig } from '../src/config.js';
import { client } from './helpers/http.js';

test('post authors link to a public user page showing only the username', async t => {
  const running = await startServer({ config: readConfig({ PORT: '0' }) });
  t.after(() => running.close());
  const browser = client(running.url);

  for (const path of ['/', '/posts/1', '/search?q=エンジニアカフェ']) {
    const page = await browser.request(path);
    assert.equal(page.status, 200);
    assert.match(page.text, /<a class="post-author" href="\/users\/1">/);
  }

  const profile = await browser.request('/users/1');
  assert.equal(profile.status, 200);
  assert.match(profile.text, /<h1>alice<\/h1>/);
  assert.doesNotMatch(profile.text, /今日はエンジニアカフェ|非公開メモ|password_digest/);
  for (const path of ['/users/999', '/users/nope', '/users/1%20OR%201=1']) {
    assert.equal((await browser.request(path)).status, 404);
  }
});
