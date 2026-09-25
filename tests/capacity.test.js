import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../src/server.js';
import { readConfig } from '../src/config.js';
import { client } from './helpers/http.js';

test('concurrent admission respects capacity and expiry permits a new environment', async t => {
  let now = Date.now();
  const running = await startServer({ config: readConfig({ PORT: '0', MAX_ENVIRONMENTS: '2' }), now: () => now }); t.after(() => running.close());
  const browsers = Array.from({ length: 5 }, () => client(running.url));
  const statuses = await Promise.all(browsers.map(async c => (await c.request('/')).status));
  assert.equal(statuses.filter(s => s === 200).length, 2);
  assert.equal(statuses.filter(s => s === 503).length, 3);
  const existing = browsers[statuses.indexOf(200)];
  assert.equal((await existing.request('/')).status, 200);
  now += running.config.ttlMs + 1;
  const newcomer = browsers[statuses.indexOf(503)];
  assert.equal((await newcomer.request('/')).status, 200);
  assert.equal(running.environments.size, 1);
});
