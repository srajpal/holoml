import { defineConfig } from 'vitest/config';

// Unit and conformance tests: *.test.ts next to the code in each package, the site's (site/), and those of the
// example sites' tools and scripts (examples/*/tools/ and examples/tools/, which are not published).
export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts', 'site/**/*.test.ts', 'examples/*/tools/*.test.ts', 'examples/tools/*.test.ts'],
    environment: 'node',
  },
});
