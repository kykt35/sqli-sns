import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
// OWASP scrypt profile: N=2^14, r=8, p=5 (16 MiB per derivation).
const options = { N: 16384, r: 8, p: 5, maxmem: 32 * 1024 * 1024 };
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt, 64, options);
  return `scrypt$16384$8$5$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password, digest) {
  if (typeof digest !== 'string' || !/^scrypt\$16384\$8\$5\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(digest)) return false;
  const parts = digest.split('$');
  const key = await derive(password, parts[4], 64, options);
  return timingSafeEqual(key, Buffer.from(parts[5], 'hex'));
}
