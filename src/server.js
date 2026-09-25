import { pathToFileURL } from 'node:url';
import { createApplication } from './app.js';
import { readConfig } from './config.js';

export async function startServer({ config = readConfig(), ...options } = {}) {
  const runtime = await createApplication(config, options);
  let server;
  try {
    server = await new Promise((resolve, reject) => {
      const listener = runtime.app.listen(config.port, config.host, error => error ? reject(error) : resolve(listener));
      listener.once('error', reject);
    });
  } catch (error) { runtime.close(); throw error; }
  return {
    ...runtime, server, url: `http://${config.host === '::1' ? '[::1]' : config.host}:${server.address().port}`,
    async close() {
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      runtime.close();
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const running = await startServer();
    console.log(`SNS listening at ${running.url}`);
    let closing = false;
    const stop = async () => {
      if (closing) return;
      closing = true;
      await running.close();
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  } catch (_error) {
    console.error('起動できませんでした。設定と待受ポートを確認してください。');
    process.exitCode = 1;
  }
}
