import test from 'node:test';
import assert from 'node:assert/strict';
import { EnvironmentRegistry } from '../src/runtime/environments.js';
import { SessionStore } from '../src/runtime/session-store.js';

test('environment capacity, active leases and expiry are bounded', () => {
  let now = 0, closed = 0;
  const registry = new EnvironmentRegistry({ max: 2, ttlMs: 100, now: () => now, factory: () => ({ close() { closed++; } }) });
  const a = registry.acquire(), b = registry.acquire();
  assert.notEqual(a.id, b.id);
  assert.throws(() => registry.acquire(), { status: 503 });
  a.release(); now = 101;
  registry.sweep();
  assert.equal(closed, 1);
  assert.equal(registry.size, 1); // b is still in use
  b.release(); now = 202; registry.sweep();
  assert.equal(registry.size, 0);
  registry.close();
});
test('failed creation consumes no slot and an unknown id is never accepted', () => {
  let fail = true;
  const registry = new EnvironmentRegistry({ max: 1, ttlMs: 100, factory: () => { if (fail) throw Error('seed failed'); return { close() {} }; } });
  assert.throws(() => registry.acquire());
  assert.equal(registry.size, 0);
  fail = false;
  const e = registry.acquire('chosen-by-client');
  assert.notEqual(e.id, 'chosen-by-client');
  e.release(); registry.close();
});
test('session deletion cannot be undone by a stale response', async () => {
  let now = 0;
  const store = new SessionStore({ ttlMs: 100, now: () => now });
  const call = (method, ...args) => new Promise((resolve, reject) => store[method](...args, (err, value) => err ? reject(err) : resolve(value)));
  const a = store.createId(), b = store.createId();
  await call('set', a, { environmentId: 'x' });
  assert.equal((await call('get', a)).environmentId, 'x');
  await call('destroy', a);
  await call('set', a, { environmentId: 'x' });
  assert.equal(await call('get', a), null);
  await call('set', b, { environmentId: 'x' });
  now = 101;
  assert.equal(await call('get', b), null);
  await call('set', a, { environmentId: 'x', userId: 1 });
  await call('set', b, { environmentId: 'x', userId: 1 });
  assert.equal(await call('get', a), null);
  assert.equal(await call('get', b), null);
  store.close();
});
