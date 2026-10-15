import { defineConfig, devices } from '@playwright/test';

const PREVIEW_PORT = 4373;
const PREVIEW_URL = `http://localhost:${PREVIEW_PORT}`;
const TEST_TIMEOUT_MS = 90_000;
const SERVER_TIMEOUT_MS = 120_000;
const CI_RETRIES = 1;
const SOFTWARE_WEBGL_ARGS = ['--enable-unsafe-swiftshader'];
const SOFTWARE_RENDER_VIEWPORT = { width: 800, height: 450 };

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: 'e2e',
  timeout: TEST_TIMEOUT_MS,
  forbidOnly: isCI,
  retries: isCI ? CI_RETRIES : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: PREVIEW_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: SOFTWARE_RENDER_VIEWPORT,
        launchOptions: { args: SOFTWARE_WEBGL_ARGS },
      },
    },
  ],
  webServer: {
    command: `npx vite build && npx vite preview --port ${PREVIEW_PORT} --strictPort`,
    url: PREVIEW_URL,
    timeout: SERVER_TIMEOUT_MS,
    reuseExistingServer: false,
  },
});
