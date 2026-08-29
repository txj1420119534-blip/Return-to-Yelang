import { cloudflare } from '@cloudflare/vite-plugin';
import { sites } from '@openai/sites-vite-plugin';
import { defineConfig } from 'vite';
import vinext from 'vinext';
import { sharedAssetsPlugin } from './scripts/shared-assets-plugin';

export default defineConfig({
  resolve: {
    // Express pulls depd's Node wrapper, which uses new Function and cannot run in Workers.
    // The package's browser entry preserves validation without runtime code generation.
    alias: { depd: 'depd/lib/browser/index.js' }
  },
  plugins: [
    sharedAssetsPlugin(),
    vinext(),
    sites(),
    cloudflare({
      persistState: false,
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
