export function currentUser(req, res, next) {
  req.user = req.session.userId ? req.db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.session.userId) : null;
  res.locals.user = req.user;
  next();
}
export function requireLogin(req, res, next) {
  if (!req.user) return res.redirect(303, '/login');
  next();
}
