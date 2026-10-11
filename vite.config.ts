import { resolve } from 'node:path';

import { defineConfig } from 'vite';

import { metPort } from './scripts/met-port.js';

/**
 * Two pages are build inputs: the viewer (`index.html`) and the parts gallery (`parts.html`).
 * `base: './'` keeps every asset URL relative, so the built site works from any path.
 * The dev and preview servers listen on this worktree's `MET_PORT` and fail rather than move to another port, so a client never reaches a server of another worktree.
 * `three` alone minifies to about 520 kB, so the default 500 kB chunk warning would fire on every build; the limit is 1 MB, and a chunk over it is app code worth splitting.
 */
const port = metPort();

export default defineConfig({
  base: './',
  server: { host: '127.0.0.1', port, strictPort: true },
  preview: { host: '127.0.0.1', port, strictPort: true },
  build: {
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        parts: resolve(import.meta.dirname, 'parts.html'),
      },
    },
  },
});
