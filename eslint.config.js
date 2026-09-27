import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['**/node_modules/**', 'coverage/**'],
  },
  ...tseslint.configs.recommended,
];
