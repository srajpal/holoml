// Downloads the aquarium's fish (tools/fish.mjs lists them: where each
// comes from, at a fixed version, and its licence) into tools/cache/
// (not committed; prepare.mjs makes the site's files from them), and
// checks each against its checksum. Run from the repository root:
//
//   node examples/aquarium/tools/download.mjs
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FISH } from './fish.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const cache = join(here, 'cache');
const HEADERS = { 'User-Agent': 'HoloML examples (https://github.com/srajpal/holoml)' };
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

mkdirSync(cache, { recursive: true });
for (const f of FISH) {
  const file = join(cache, `${f.id}.glb`);
  if (existsSync(file) && sha256(readFileSync(file)) === f.sha256) continue;
  const r = await fetch(f.url, { headers: HEADERS, signal: AbortSignal.timeout(300_000) });
  if (!r.ok) throw new Error(`${f.url}: ${r.status}`);
  const bytes = Buffer.from(await r.arrayBuffer());
  if (sha256(bytes) !== f.sha256) throw new Error(`${f.url}: not the file expected (its checksum differs)`);
  writeFileSync(file, bytes);
  console.log(`saved ${f.id}.glb (${(bytes.length / 1e6).toFixed(1)} MB)`);
}
console.log(`the aquarium's ${FISH.length} fish in ${cache}`);
