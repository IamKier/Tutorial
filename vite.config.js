// ============================================================================
// vite.config.js — THE BUILD
// ============================================================================
//
// React needs a build step. Browsers cannot run JSX — `<Task />` is not
// JavaScript — so something has to compile it first. That something is Vite,
// and this file tells it where things are.
//
// This is the cost of using React, and it is worth being clear-eyed about it:
// the files you edit are no longer the files the browser receives.
//
//   npm run dev     Vite serves the client with hot reloading, and forwards
//                   /api to the Node server running alongside it.
//   npm run build   compiles client/ into dist/, which the Node server serves.
// ============================================================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // The frontend lives in client/, not at the project root, so the backend and
  // the frontend cannot be confused for one another.
  root: 'client',

  plugins: [react()],

  build: {
    // Built files land in dist/, which server.js serves in production. It is
    // gitignored — build output is derived from source, and committing it
    // means every change shows up twice in a diff.
    outDir: '../dist',
    emptyOutDir: true,
    // Makes a production bug traceable to the line you actually wrote rather
    // than to a column in a minified bundle.
    sourcemap: true,
  },

  server: {
    port: 5173,
    // Without this, the dev server on :5173 asking for /api/tasks would look
    // for it on :5173 — where there is no API. The proxy forwards those calls
    // to the Node server on :3000, so the browser still sees one origin and
    // cookies keep working.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
