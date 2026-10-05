import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['**/node_modules/**', 'coverage/**', '_site/**', '.claude/**', 'packages/vscode/dist/**', 'packages/vscode/dist-test/**', 'packages/vscode/.vscode-test/**'],
  },
  ...tseslint.configs.recommended,
  // Rules that need the types (browser review of 2026-09-30, H8): a
  // promise that nobody awaits or catches would fail in silence.
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        // The site's and the vitest configuration have no tsconfig of their own.
        projectService: { allowDefaultProject: ['*.ts', 'site/*.ts', 'examples/*/tools/*.ts', 'examples/tools/*.ts'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
    },
  },
];
