import { defineConfig } from 'vite';

const GAME_CHUNK_KB = 800;

export default defineConfig({
  build: {
    chunkSizeWarningLimit: GAME_CHUNK_KB,
  },
});
