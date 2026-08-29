import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(webRoot, '../assets');
// Vinext's generated Worker serves static files from `dist/client`.
// Keep the shared project assets inside that published directory so
// `/assets/*` resolves the same way in local previews and on Sites.
const destination = resolve(webRoot, 'dist/client/assets');

if (!existsSync(source)) {
  throw new Error(`Shared assets directory is missing: ${source}`);
}

mkdirSync(destination, { recursive: true });

function copyDirectory(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const sourcePath = resolve(from, entry.name);
    const destinationPath = resolve(to, entry.name);
    if (entry.isDirectory()) copyDirectory(sourcePath, destinationPath);
    if (entry.isFile()) copyFileSync(sourcePath, destinationPath);
  }
}

copyDirectory(source, destination);
console.log('copied shared yelang assets into dist/client/assets');
