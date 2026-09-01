import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Use relative asset paths so the app works when served behind a sub-path
  // proxy (e.g. https://<host>/proxy/3000/) as in the workshop lab.
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    host: true, // listen on all interfaces (needed for proxied/lab environments)
    // Allow the dev server to be reached through the workshop's proxy host
    // (e.g. a CloudFront URL). Set to true to allow any host.
    allowedHosts: true,
  },
});
