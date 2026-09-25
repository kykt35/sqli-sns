import test from 'node:test';
import assert from 'node:assert/strict';
import { readConfig } from '../src/config.js';
import { startServer } from '../src/server.js';

test('configuration is loopback by default and rejects invalid limits', () => {
  assert.equal(readConfig({}).host, '127.0.0.1');
  for (const env of [{ PORT: '-1' }, { MAX_ENVIRONMENTS: '0' }, { SESSION_TTL_MINUTES: 'x' }, { APP_MODE: 'invalid' }]) {
    assert.throws(() => readConfig(env));
  }
});
test('server can start on an assigned port, stop, and restart', async () => {
  const first = await startServer({ config: readConfig({ PORT: '0' }) });
  assert.equal((await fetch(first.url)).status, 200);
  const port = first.server.address().port;
  await first.close();
  const second = await startServer({ config: readConfig({ PORT: String(port) }) });
  assert.equal((await fetch(second.url)).status, 200);
  await second.close();
});
