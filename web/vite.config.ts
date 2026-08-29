import { cloudflare } from '@cloudflare/vite-plugin';
import { sites } from '@openai/sites-vite-plugin';
import { defineConfig } from 'vite';
import vinext from 'vinext';

export default defineConfig({
  plugins: [
    vinext(),
    sites(),
    cloudflare({
      viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
      config: {
        main: './worker/index.ts',
        compatibility_date: '2026-05-15',
        compatibility_flags: ['nodejs_compat'],
        d1_databases: [
          {
            binding: 'DB',
            database_name: 'return-to-yelang-local',
            database_id: 'local'
          }
        ]
      }
    })
  ],
  server: {
    host: '127.0.0.1',
    port: 5173
  }
});
