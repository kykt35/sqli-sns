import test from 'node:test';
import assert from 'node:assert/strict';
import { launch } from './helpers/process.js';
import { client } from './helpers/http.js';

test('process restart discards old sessions and occupied environment slots', async t => {
  const first = await launch({ MAX_ENVIRONMENTS: '1', SESSION_SECRET: 'fixed-test-secret-used-across-restarts' });
  t.after(() => first.stop());
  const a = client(first.url);
  assert.equal((await a.request('/')).status, 200);
  const oldCookie = a.cookie;
  assert.equal((await client(first.url).request('/')).status, 503);
  await first.stop();
  const second = await launch({ MAX_ENVIRONMENTS: '1', SESSION_SECRET: 'fixed-test-secret-used-across-restarts' });
  t.after(() => second.stop());
  const b = client(second.url); b.cookie = oldCookie;
  assert.equal((await b.request('/')).status, 200);
  assert.notEqual(b.cookie, oldCookie);
});
