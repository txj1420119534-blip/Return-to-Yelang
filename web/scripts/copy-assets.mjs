import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(webRoot, '../assets');
const destination = resolve(webRoot, 'dist/assets');

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
console.log('copied shared yelang assets into dist/assets');
