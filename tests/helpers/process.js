import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export async function launch(env = {}) {
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    env: {
      ...process.env, APP_MODE: 'local', HOST: '127.0.0.1', PORT: '0',
      BASIC_AUTH_USERNAME: '', BASIC_AUTH_PASSWORD: '', TRUST_PROXY: '',
      SESSION_SECRET: '', SESSION_TTL_MINUTES: '240',
      MAX_POSTS: '1000', MAX_USERS: '100', ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const closed = new Promise(resolve => child.once('exit', resolve));
  let text = '';
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error('Startup timed out')); }, 10000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', () => { clearTimeout(timer); reject(new Error('Server exited before startup')); });
    child.stdout.on('data', chunk => {
      text += chunk;
      const match = text.match(/SNS listening at (http:\/\/[^\s]+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
  });
  return { url, async stop() { if (child.exitCode === null) child.kill('SIGTERM'); await closed; } };
}
