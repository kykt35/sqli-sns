import { promisify } from 'node:util';

export async function rotateSession(req, userId) {
  const environmentId = req.session.environmentId;
  await promisify(req.session.regenerate.bind(req.session))();
  req.session.environmentId = environmentId;
  if (userId !== undefined) req.session.userId = userId;
  await promisify(req.session.save.bind(req.session))();
}
