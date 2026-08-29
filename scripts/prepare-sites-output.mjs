import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

function copyDirectory(from, to) {
  if (!existsSync(from)) throw new Error(`Build output is missing: ${from}`);
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const sourcePath = resolve(from, entry.name);
    const destinationPath = resolve(to, entry.name);
    if (entry.isDirectory()) copyDirectory(sourcePath, destinationPath);
    if (entry.isFile()) copyFileSync(sourcePath, destinationPath);
  }
}

rmSync('dist', { recursive: true, force: true });
copyDirectory('web/dist', 'dist');
mkdirSync('.openai', { recursive: true });
copyFileSync('web/.openai/hosting.json', '.openai/hosting.json');
