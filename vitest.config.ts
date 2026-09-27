import { defineConfig } from 'vitest/config';

// Unit and conformance tests: *.test.ts next to the code in each package.
export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts'],
    environment: 'node',
  },
});
