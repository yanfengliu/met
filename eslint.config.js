import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  // Build output, task evidence and local caches; the same set .gitignore keeps out of Git.
  globalIgnores(['dist/', 'output/', 'tmp/', 'coverage/', '.shots/', 'test-results/', 'playwright-report/', 'research/cache/']),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: { '@typescript-eslint/consistent-type-imports': 'error' },
  },
  // Plain JavaScript (this file) is in no tsconfig, so the type-checked rules cannot apply to it; it keeps the base rules.
  { files: ['**/*.js'], extends: [tseslint.configs.disableTypeChecked] },
);
