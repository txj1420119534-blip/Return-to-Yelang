import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app } from './app.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
app.use('/assets', express.static(path.join(rootDir, 'assets')));

const port = Number(process.env.PORT ?? 8787);

app.listen(port, '0.0.0.0', () => {
  console.log(`[yelang] http://127.0.0.1:${port}  health=/health`);
});
