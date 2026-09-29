import { Router } from 'express';
import { findUserById } from '../auth/users.js';
import { notFound } from '../middleware/errors.js';

export const usersRoutes = Router();
usersRoutes.get('/users/:id', (req, res) => {
  const rawId = req.params.id;
  const id = /^[1-9][0-9]*$/.test(rawId) && Number.isSafeInteger(Number(rawId)) ? Number(rawId) : null;
  const profile = id && findUserById(req.db, id);
  if (!profile) return notFound(req, res);
  res.render('users/show', { title: profile.username, profile });
});
