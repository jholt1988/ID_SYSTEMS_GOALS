import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Allow the dev host(s). Set ALLOWED_HOSTS (comma-separated) to override;
      // defaults to permissive for local/dev. Production serves the built
      // bundle via Express (server.ts), not the Vite dev server.
      allowedHosts: (process.env.ALLOWED_HOSTS
        ? process.env.ALLOWED_HOSTS.split(',').map((h) => h.trim())
        : true) as true | string[],
    },
  };
});
