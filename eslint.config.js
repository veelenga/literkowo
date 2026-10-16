import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const UNTYPED_LINT_SOURCES = ['src/game/**', 'src/audio/**'];
const ROOT_CONFIG_FILES = ['*.js', '*.config.ts', 'scripts/**'];
const NODE_SCRIPTS = ['scripts/**'];

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: [...UNTYPED_LINT_SOURCES, ...ROOT_CONFIG_FILES],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: NODE_SCRIPTS,
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
);
