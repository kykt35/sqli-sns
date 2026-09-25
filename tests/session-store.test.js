import test from 'node:test';
import assert from 'node:assert/strict';
import { SessionStore } from '../src/runtime/session-store.js';

test('session deletion cannot be undone by a stale response', async () => {
  let now = 0;
  const store = new SessionStore({ ttlMs: 100, now: () => now });
  const call = (method, ...args) => new Promise((resolve, reject) => store[method](...args, (err, value) => err ? reject(err) : resolve(value)));
  const a = store.createId(), b = store.createId();
  await call('set', a, { userId: 1 });
  assert.equal((await call('get', a)).userId, 1);
  await call('destroy', a);
  await call('set', a, { userId: 1 });
  assert.equal(await call('get', a), null);
  await call('set', b, { userId: 2 });
  now = 101;
  assert.equal(await call('get', b), null);
  await call('set', a, { userId: 1 });
  await call('set', b, { userId: 1 });
  assert.equal(await call('get', a), null);
  assert.equal(await call('get', b), null);
  store.close();
});
