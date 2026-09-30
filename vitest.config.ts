import { defineConfig } from 'vitest/config';

// Unit and conformance tests: *.test.ts next to the code in each package, the site's (site/), and those of the
// example sites' tools and scripts (examples/*/tools/ and examples/tools/, which are not published).
export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts', 'site/**/*.test.ts', 'examples/*/tools/*.test.ts', 'examples/tools/*.test.ts'],
    environment: 'node',
    // One file at a time: the parser's speed checks (O7) time it against
    // the clock, and other files running beside them (the example scripts'
    // simulations, the site's build) took the processor and made 1 MB read
    // in 103 to 143 ms where it takes 30 alone. The whole run takes about
    // fifteen seconds this way (browser review of 2026-09-30).
    fileParallelism: false,
  },
});
