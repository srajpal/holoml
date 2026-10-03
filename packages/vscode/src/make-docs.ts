/**
 * Writes dist/docs.json, the hover's words, from SPEC.md. build.mjs runs
 * it with Node's type stripping before bundling.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { makeDocs } from './docs-build.ts';

const spec = readFileSync(new URL('../../../SPEC.md', import.meta.url), 'utf8');
const dist = new URL('../dist/', import.meta.url);
mkdirSync(dist, { recursive: true });
writeFileSync(new URL('docs.json', dist), JSON.stringify(makeDocs(spec)));
