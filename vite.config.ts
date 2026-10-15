import { defineConfig } from 'vite';

const THREE_CHUNK_LIMIT_KB = 620;

const PAGES_BASE = '/literkowo/';

export default defineConfig({
  base: process.env.GITHUB_PAGES ? PAGES_BASE : '/',
  build: {
    chunkSizeWarningLimit: THREE_CHUNK_LIMIT_KB,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'three', test: /node_modules[\\/]three[\\/]/ }],
        },
      },
    },
  },
});
