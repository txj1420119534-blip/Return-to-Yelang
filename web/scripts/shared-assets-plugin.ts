import { createReadStream, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import type { Plugin } from 'vite';

const CONTENT_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.wav': 'audio/wav',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
};

type NextFunction = (error?: unknown) => void;

function sendAsset(root: string, request: IncomingMessage, response: ServerResponse, next: NextFunction) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    next();
    return;
  }

  let relativePath: string;
  try {
    relativePath = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname).replace(/^\/+/, '');
  } catch {
    response.statusCode = 400;
    response.end('Bad request');
    return;
  }

  const filePath = resolve(root, relativePath);
  if (!filePath.startsWith(`${root}${sep}`)) {
    response.statusCode = 403;
    response.end('Forbidden');
    return;
  }

  let stats;
  try {
    stats = statSync(filePath);
  } catch {
    next();
    return;
  }
  if (!stats.isFile()) {
    next();
    return;
  }

  response.setHeader('Accept-Ranges', 'bytes');
  response.setHeader('Content-Type', CONTENT_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream');
  const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  let start = 0;
  let end = stats.size - 1;
  if (range) {
    start = Number(range[1]);
    end = range[2] ? Math.min(Number(range[2]), end) : end;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= stats.size) {
      response.statusCode = 416;
      response.setHeader('Content-Range', `bytes */${stats.size}`);
      response.end();
      return;
    }
    response.statusCode = 206;
    response.setHeader('Content-Range', `bytes ${start}-${end}/${stats.size}`);
  }
  response.setHeader('Content-Length', String(end - start + 1));

  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(filePath, { start, end }).on('error', next).pipe(response);
}

export function sharedAssetsPlugin(): Plugin {
  const root = resolve(import.meta.dirname, '../../assets');
  return {
    name: 'yelang-shared-assets',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/assets', (request, response, next) => sendAsset(root, request, response, next));
    }
  };
}
