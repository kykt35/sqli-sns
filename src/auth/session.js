import { promisify } from 'node:util';

export async function rotateSession(req, userId) {
  await promisify(req.session.regenerate.bind(req.session))();
  if (userId !== undefined) req.session.userId = userId;
  await promisify(req.session.save.bind(req.session))();
}
