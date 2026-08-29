import { createServer } from 'node:http';
import { httpServerHandler } from 'cloudflare:node';
import vinextHandler from 'vinext/server/fetch-handler';
import { app } from '../../server/src/app';
import { withPersistentState } from './persistence';

type SitesEnv = Cloudflare.Env & { DB: D1Database };
type CloudflareNodeServer = {
  listen(...args: unknown[]): CloudflareNodeServer;
  address(): { port?: number | null };
};

const expressServer = createServer(app);
const apiHandler = httpServerHandler(expressServer as unknown as CloudflareNodeServer) as unknown as {
  fetch(request: Request, env: SitesEnv, context: ExecutionContext): Response | Promise<Response>;
};

export default {
  async fetch(request: Request, env: SitesEnv, context: ExecutionContext): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/health') {
      return Response.json({
        ok: true,
        service: 'yelang-sites',
        mode: 'd1',
        db: Boolean(env.DB),
        ai: false,
        event_id: '00000000-0000-0000-0000-000000000001'
      });
    }
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return withPersistentState(env, async () => apiHandler.fetch(request, env, context));
    }
    return vinextHandler.fetch(request, env, context);
  }
};
