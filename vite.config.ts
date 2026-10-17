import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { SCREENSHOT, SITE_DESCRIPTION, SITE_LANGUAGE, SITE_NAME } from './src/seo/site.ts';
import { seoPlugin } from './src/seo/vitePlugin.ts';

const THREE_CHUNK_LIMIT_KB = 670;

const PAGES_BASE = '/literkowo/';
const ROOT_BASE = '/';
const base = process.env.GITHUB_PAGES ? PAGES_BASE : ROOT_BASE;

const APP_CATEGORIES = ['education', 'games', 'kids'];
const WIDE_FORM_FACTOR = 'wide';
const SCREENSHOT_TYPE = 'image/jpeg';
const THEME_COLOR = '#070b1a';
const BACKGROUND_COLOR = '#050816';
const PRECACHE_PATTERNS = ['**/*.{js,css,html,svg,png,woff2}'];
const MODEL_FILES = /\/models\/.+\.(?:glb|png)$/;
const FILE_REQUEST = /\/[^/?]+\.[a-z0-9]+(?:\?.*)?$/i;
const MODEL_CACHE = 'literkowo-models';
const MODEL_CACHE_ENTRIES = 64;
const MODEL_NETWORK_TIMEOUT_SECONDS = 4;
const CACHEABLE_STATUSES = [200];

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
    seoPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        name: SITE_NAME,
        short_name: SITE_NAME,
        description: SITE_DESCRIPTION,
        lang: SITE_LANGUAGE,
        categories: APP_CATEGORIES,
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
        screenshots: [
          {
            src: SCREENSHOT.path,
            sizes: `${SCREENSHOT.width}x${SCREENSHOT.height}`,
            type: SCREENSHOT_TYPE,
            form_factor: WIDE_FORM_FACTOR,
            label: SCREENSHOT.alt,
          },
        ],
      },
      workbox: {
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: PRECACHE_PATTERNS,
        globIgnores: ['models/**'],
        navigateFallbackDenylist: [FILE_REQUEST],
        runtimeCaching: [
          {
            urlPattern: MODEL_FILES,
            handler: 'NetworkFirst',
            options: {
              cacheName: MODEL_CACHE,
              networkTimeoutSeconds: MODEL_NETWORK_TIMEOUT_SECONDS,
              expiration: { maxEntries: MODEL_CACHE_ENTRIES },
              cacheableResponse: { statuses: CACHEABLE_STATUSES },
            },
          },
        ],
      },
    }),
  ],
});
