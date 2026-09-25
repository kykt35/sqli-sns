import express from 'express';
import { fileURLToPath } from 'node:url';
import { csrfProtection } from './middleware/csrf.js';
import { currentUser } from './middleware/current-user.js';
import { postsRoutes } from './routes/posts.js';
import { searchRoutes } from './routes/search.js';
import { authRoutes } from './routes/auth.js';
import { notFound, handleError } from './middleware/errors.js';
import session from 'express-session';
import { basicAuth } from './middleware/basic-auth.js';
import { prepareSeed, createDatabase } from './db/create-db.js';
import { SessionStore } from './runtime/session-store.js';

export async function createApplication(config, { seed, now = Date.now } = {}) {
  const initial = seed || await prepareSeed();
  const db = createDatabase(initial, config.databaseLimits);
  const store = new SessionStore({ ttlMs: config.ttlMs, now });
  const cleanup = setInterval(() => store.sweep(), Math.min(config.ttlMs, 60_000));
  cleanup.unref();
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.mode === 'public' ? config.trustedProxies : false);
  app.set('view engine', 'ejs');
  app.set('views', fileURLToPath(new URL('../views', import.meta.url)));
  app.locals.user = null; app.locals.csrf = '';
  app.use((_req, res, next) => {
    res.set('Content-Security-Policy', "default-src 'self'; style-src 'self'; script-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'");
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'same-origin');
    next();
  });
  app.use(basicAuth(config));
  app.use(express.static(fileURLToPath(new URL('../public', import.meta.url))));
  app.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use(session({
    genid(req) {
      const id = store.createId();
      const discard = () => store.discardUnused(id);
      req.res.once('finish', discard); req.res.once('close', discard);
      return id;
    },
    name: 'sns.sid', secret: config.sessionSecret, store, resave: false, saveUninitialized: false, rolling: true,
    cookie: { httpOnly: true, sameSite: 'lax', secure: config.mode === 'public', maxAge: config.ttlMs },
  }));
  app.use((req, _res, next) => { req.db = db; next(); });
  app.use(express.urlencoded({ extended: false, limit: '16kb', parameterLimit: 12 }));
  app.use(currentUser);
  app.use(csrfProtection);
  app.use(authRoutes({ dummyDigest: initial.alice }));
  app.use(postsRoutes);
  app.use(searchRoutes);
  app.use(notFound);
  app.use(handleError);
  return { app, config, db, store, close() { clearInterval(cleanup); store.close(); if (db.open) db.close(); } };
}
