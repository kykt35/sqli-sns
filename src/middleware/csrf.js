import { randomBytes, timingSafeEqual } from 'node:crypto';

export function csrfProtection(req, res, next) {
  req.session.csrf ||= randomBytes(32).toString('hex');
  res.locals.csrf = req.session.csrf;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const supplied = req.body?._csrf;
    if (typeof supplied !== 'string' || !/^[a-f0-9]{64}$/.test(supplied) ||
        !timingSafeEqual(Buffer.from(supplied), Buffer.from(req.session.csrf))) {
      return res.status(403).render('error', { title: '送信できませんでした', message: 'ページを開き直して、もう一度お試しください。' });
    }
  }
  next();
}
