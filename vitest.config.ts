import { configDefaults, defineConfig } from 'vitest/config';

const DOM_TESTS = ['src/ui/**/*.test.ts', 'src/audio/playback.test.ts'];
const SETUP_FILES = ['src/testing/setup.ts'];

export default defineConfig({
  test: {
    setupFiles: SETUP_FILES,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: [...configDefaults.exclude, ...DOM_TESTS],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: DOM_TESTS,
        },
      },
    ],
  },
});
