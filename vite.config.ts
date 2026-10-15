import { defineConfig } from 'vite';

const THREE_CHUNK_LIMIT_KB = 620;

export default defineConfig({
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
