import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const THREE_CHUNK_LIMIT_KB = 670;

const PAGES_BASE = '/literkowo/';
const ROOT_BASE = '/';
const base = process.env.GITHUB_PAGES ? PAGES_BASE : ROOT_BASE;

const APP_NAME = 'Literkowo';
const APP_DESCRIPTION = 'Przygoda, w której klawiatura jest twoją różdżką';
const THEME_COLOR = '#070b1a';
const BACKGROUND_COLOR = '#050816';
const PRECACHE_PATTERNS = ['**/*.{js,css,html,svg,png,woff2}'];
const MODEL_FILES = /\/models\/.+\.(?:glb|png)$/;
const MODEL_CACHE = 'literkowo-models';
const MODEL_CACHE_ENTRIES = 64;
const CACHEABLE_STATUSES = [0, 200];

export default defineConfig({
  base,
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
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        name: APP_NAME,
        short_name: APP_NAME,
        description: APP_DESCRIPTION,
        lang: 'pl',
        theme_color: THEME_COLOR,
        background_color: BACKGROUND_COLOR,
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: PRECACHE_PATTERNS,
        globIgnores: ['models/**'],
        runtimeCaching: [
          {
            urlPattern: MODEL_FILES,
            handler: 'CacheFirst',
            options: {
              cacheName: MODEL_CACHE,
              expiration: { maxEntries: MODEL_CACHE_ENTRIES },
              cacheableResponse: { statuses: CACHEABLE_STATUSES },
            },
          },
        ],
      },
    }),
  ],
});
