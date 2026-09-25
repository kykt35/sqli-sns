import express from 'express';

export async function createApplication(config) {
  const app = express();
  app.disable('x-powered-by');
  app.get('/', (_req, res) => res.type('text').send('簡易SNS'));
  return { app, config, close() {} };
}
