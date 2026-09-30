import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['**/node_modules/**', 'coverage/**', '_site/**', '.claude/**'],
  },
  ...tseslint.configs.recommended,
];
