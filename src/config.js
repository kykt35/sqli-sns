import { randomBytes } from 'node:crypto';
import { isIP } from 'node:net';
import { readStorageLimits } from './db/storage-limits.js';

function integer(value, fallback, min, max, name) {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw new Error(`Invalid ${name}`);
  return parsed;
}
export function readConfig(env = process.env) {
  const mode = env.APP_MODE || 'local';
  if (!['local', 'public'].includes(mode)) throw new Error('Invalid APP_MODE');
  const basicUsername = env.BASIC_AUTH_USERNAME || '';
  const basicPassword = env.BASIC_AUTH_PASSWORD || '';
  const trustedProxies = env.TRUST_PROXY ? env.TRUST_PROXY.split(',').map(value => value.trim()) : [];
  for (const proxy of trustedProxies) {
    const parts = proxy.split('/');
    const version = isIP(parts[0]);
    // Use IPv4 CIDR notation for mapped addresses so IPv6 prefix lengths cannot
    // silently expand the trusted range to the entire IPv4 address space.
    if (version === 6 && parts.length === 2 && new URL(`http://[${parts[0]}]/`).hostname.startsWith('[::ffff:')) throw new Error('Use IPv4 notation for mapped TRUST_PROXY CIDR');
    const prefix = parts[1] === undefined ? (version === 4 ? 32 : 128) : Number(parts[1]);
    if (!version || parts.length > 2 || !Number.isInteger(prefix) || prefix < 1 || prefix > (version === 4 ? 32 : 128)) throw new Error('Invalid TRUST_PROXY');
  }
  if (Boolean(basicUsername) !== Boolean(basicPassword) || /[:\r\n]/.test(basicUsername)) throw new Error('Invalid Basic authentication settings');
  if (mode === 'public' && (!basicUsername || !basicPassword || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32 || trustedProxies.length === 0)) throw new Error('Public configuration is incomplete');
  return {
    basicUsername, basicPassword, trustedProxies,
    mode, host: env.HOST || '127.0.0.1',
    port: integer(env.PORT, 3000, 0, 65535, 'PORT'),
    maxEnvironments: integer(env.MAX_ENVIRONMENTS, 50, 1, 1000, 'MAX_ENVIRONMENTS'),
    databaseLimits: readStorageLimits({ maxPosts: env.MAX_POSTS_PER_ENVIRONMENT, maxUsers: env.MAX_USERS_PER_ENVIRONMENT }),
    ttlMs: integer(env.SESSION_TTL_MINUTES, 240, 1, 1440, 'SESSION_TTL_MINUTES') * 60_000,
    sessionSecret: env.SESSION_SECRET || randomBytes(32).toString('hex'),
  };
}
