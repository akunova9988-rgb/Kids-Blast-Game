import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { openDatabase } from './db.js';
import { mountApi } from './api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const isProd = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 5173;

const db = openDatabase(path.join(root, 'data', 'kidsblast.sqlite'));
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
mountApi(app, db);

if (isProd) {
  const dist = path.join(root, 'dist');
  app.use(express.static(dist, { index: false }));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(dist, 'index.html'));
  });
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    root,
    configFile: path.join(root, 'vite.config.js'),
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.use((error, _req, res, _next) => {
  if (error?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'That did not look right.' });
    return;
  }
  console.error(error);
  if (!res.headersSent) res.status(500).json({ error: 'Something went wrong.' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Kids Blast is ready at http://127.0.0.1:${port}`);
});
