import { randomBytes } from 'node:crypto';

function integer(value, fallback, min, max, name) {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw new Error(`Invalid ${name}`);
  return parsed;
}
export function readConfig(env = process.env) {
  const mode = env.APP_MODE || 'local';
  if (!['local', 'public'].includes(mode)) throw new Error('Invalid APP_MODE');
  return {
    mode, host: env.HOST || '127.0.0.1',
    port: integer(env.PORT, 3000, 0, 65535, 'PORT'),
    maxEnvironments: integer(env.MAX_ENVIRONMENTS, 50, 1, 1000, 'MAX_ENVIRONMENTS'),
    ttlMs: integer(env.SESSION_TTL_MINUTES, 240, 1, 1440, 'SESSION_TTL_MINUTES') * 60_000,
    sessionSecret: env.SESSION_SECRET || randomBytes(32).toString('hex'),
  };
}
