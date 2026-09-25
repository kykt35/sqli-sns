import test from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from '../src/server.js';
import { readConfig } from '../src/config.js';
import { client } from './helpers/http.js';

test('more than 50 browser sessions share a single database without reseeding it', async t => {
  let now = Date.now();
  const running = await startServer({ config: readConfig({ PORT: '0' }), now: () => now }); t.after(() => running.close());
  const db = running.db;
  const browsers = Array.from({ length: 55 }, () => client(running.url));
  const statuses = await Promise.all(browsers.map(async c => (await c.request('/')).status));
  assert.ok(statuses.every(status => status === 200));
  assert.equal(db.prepare('SELECT count(*) n FROM users').get().n, 2);
  assert.equal(db.prepare('SELECT count(*) n FROM posts').get().n, 4);
  now += running.config.ttlMs + 1;
  assert.equal((await browsers[0].request('/')).status, 200);
  assert.equal(running.db, db);
  assert.equal(db.prepare('SELECT count(*) n FROM posts').get().n, 4);
});
