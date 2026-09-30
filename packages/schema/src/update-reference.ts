// Writes the reference pages in docs/reference/ and refreshes SPEC.md's index (pnpm reference:update), for review.
import { readFileSync, writeFileSync } from 'node:fs';
import { REFERENCE_PAGES, withIndex } from './reference.ts';

for (const [file, page] of Object.entries(REFERENCE_PAGES)) {
  const url = new URL(`../../../${file}`, import.meta.url);
  writeFileSync(url, page());
  console.log(`wrote ${url.pathname}`);
}
const spec = new URL('../../../SPEC.md', import.meta.url);
writeFileSync(spec, withIndex(readFileSync(spec, 'utf8')));
console.log(`refreshed the index in ${spec.pathname}`);
