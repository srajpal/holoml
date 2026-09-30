import { defineConfig } from 'vitest/config';

// Unit and conformance tests: *.test.ts next to the code in each package, and the site's (site/).
export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts', 'site/**/*.test.ts'],
    environment: 'node',
  },
});
