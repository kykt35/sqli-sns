import { createHash, timingSafeEqual } from 'node:crypto';

export function basicAuth(config) {
  const expected = createHash('sha256').update(`${config.basicUsername}:${config.basicPassword}`).digest();
  return (req, res, next) => {
    if (config.mode === 'public' && !req.secure) return res.status(426).type('text').send('HTTPS経由でアクセスしてください。');
    if (!config.basicUsername) return next();
    const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(req.headers.authorization || '');
    const supplied = createHash('sha256').update(match ? Buffer.from(match[1], 'base64') : '').digest();
    if (!match || !timingSafeEqual(supplied, expected)) {
      return res.set('WWW-Authenticate', 'Basic realm="SNS event", charset="UTF-8"').status(401).type('text').send('教材環境の認証が必要です。');
    }
    next();
  };
}
