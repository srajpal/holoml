// Writes spec/holoml.rnc from the checker's table, and refreshes SPEC.md's copies of the files in spec/
// (pnpm grammar:update), for review.
import { readFileSync, writeFileSync } from 'node:fs';
import { withEmbedded } from './embedded.ts';
import { relaxNg } from './relaxng.ts';

const schema = new URL('../../../spec/holoml.rnc', import.meta.url);
writeFileSync(schema, relaxNg());
console.log(`wrote ${schema.pathname}`);
const spec = new URL('../../../SPEC.md', import.meta.url);
writeFileSync(spec, withEmbedded(readFileSync(spec, 'utf8')));
console.log(`refreshed the copies in ${spec.pathname}`);
