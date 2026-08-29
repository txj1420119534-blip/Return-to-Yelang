import { cpSync, mkdirSync, rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
cpSync('web/dist', 'dist', { recursive: true });
mkdirSync('.openai', { recursive: true });
cpSync('web/.openai/hosting.json', '.openai/hosting.json');
