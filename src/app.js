import express from 'express';
import session from 'express-session';
import { prepareSeed, createDatabase } from './db/create-db.js';
import { EnvironmentRegistry } from './runtime/environments.js';
import { SessionStore } from './runtime/session-store.js';
import { environmentMiddleware } from './middleware/environment.js';

export async function createApplication(config, { seed, now = Date.now } = {}) {
  const initial = seed || await prepareSeed();
  const environments = new EnvironmentRegistry({ max: config.maxEnvironments, ttlMs: config.ttlMs, now, factory: () => createDatabase(initial) });
  const store = new SessionStore({ ttlMs: config.ttlMs, now });
  const cleanup = setInterval(() => { environments.sweep(); store.sweep(); }, Math.min(config.ttlMs, 60_000));
  cleanup.unref();
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use(session({
    name: 'sns.sid', secret: config.sessionSecret, store, resave: false, saveUninitialized: false, rolling: true,
    cookie: { httpOnly: true, sameSite: 'lax', secure: config.mode === 'public', maxAge: config.ttlMs },
  }));
  app.use(environmentMiddleware(environments));
  app.get('/', (_req, res) => res.type('text').send('簡易SNS'));
  app.use((error, _req, res, _next) => {
    res.status(error.status === 503 ? 503 : 500).type('text').send(error.status === 503 ? error.message : '処理できませんでした。');
  });
  return { app, config, environments, store, close() { clearInterval(cleanup); store.close(); environments.close(); } };
}
