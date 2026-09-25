import { Router } from 'express';
import { credentials } from '../auth/validation.js';
import { findUser, registerUser } from '../auth/users.js';
import { verifyPassword } from '../auth/password.js';
import { rotateSession } from '../auth/session.js';

export function authRoutes({ dummyDigest }) {
  const router = Router();
  // Bound simultaneous expensive password work without an unbounded queue.
  let active = 0;
  const limited = handler => async (req, res, next) => {
    if (active >= 4) return res.status(503).render('error', { title: '少しお待ちください', message: '混み合っています。しばらくしてからお試しください。' });
    active++;
    try { await handler(req, res); } catch (error) { next(error); } finally { active--; }
  };
  router.get('/register', (_req, res) => res.render('register', { title: 'アカウント作成', username: '', error: '' }));
  router.post('/register', limited(async (req, res) => {
    const { username, password, valid } = credentials(req.body);
    const failure = (status, error) => res.status(status).render('register', { title: 'アカウント作成', username, error });
    if (!valid) return failure(400, 'ユーザー名は英数字・_の3〜32文字、パスワードは8〜128文字で入力してください。');
    if (findUser(req.db, username)) return failure(409, 'このユーザー名はすでに使われています。');
    try { await registerUser(req.db, username, password); }
    catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return failure(409, 'このユーザー名はすでに使われています。');
      throw error;
    }
    res.redirect(303, '/login');
  }));
  router.get('/login', (_req, res) => res.render('login', { title: 'ログイン', username: '', error: '' }));
  router.post('/login', limited(async (req, res) => {
    const { username, password, valid } = credentials(req.body);
    const user = valid ? findUser(req.db, username) : null;
    const matches = valid && await verifyPassword(password, user?.password_digest || dummyDigest);
    if (!user || !matches) return res.status(401).render('login', { title: 'ログイン', username, error: 'ユーザー名またはパスワードを確認してください。' });
    await rotateSession(req, user.id);
    res.redirect(303, '/');
  }));
  router.post('/logout', async (req, res) => {
    await rotateSession(req);
    res.redirect(303, '/');
  });
  return router;
}
