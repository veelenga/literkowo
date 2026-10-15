import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const UNTYPED_LINT_SOURCES = ['src/game/**', 'src/audio/**'];
const ROOT_CONFIG_FILES = ['*.js', '*.config.ts'];

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
);
