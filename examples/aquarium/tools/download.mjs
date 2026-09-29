// Downloads the aquarium's fish (tools/fish.mjs lists them: where each
// comes from, at a fixed version, and its licence) and, from Poly Haven
// (https://polyhaven.com, every asset CC0), a boulder, a sunken log, a
// shell, and the sand, at 1k, into tools/cache/ (not committed;
// prepare.mjs makes the site's files from them), and checks each against
// its checksum. Run from the repository root:
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
const md5 = (bytes) => createHash('md5').update(bytes).digest('hex');
const API = 'https://api.polyhaven.com';

/** From Poly Haven: the tank's rocks, a log, and a shell (glTF), and the sand's pictures. The tank, the tunnel, and the plants are made by prepare.mjs. */
export const MODELS = ['boulder_01', 'dead_tree_trunk_02', 'lambis_shell'];
export const SAND = 'aerial_beach_01';

async function api(path) {
  const r = await fetch(`${API}${path}`, { headers: HEADERS, signal: AbortSignal.timeout(60_000) });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

/** Saves a file Poly Haven lists, checked against the checksum it gives. */
async function save(file, { url, md5: sum }) {
  if (existsSync(file) && md5(readFileSync(file)) === sum) return;
  const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(300_000) });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  const bytes = Buffer.from(await r.arrayBuffer());
  if (md5(bytes) !== sum) throw new Error(`${url}: not the file Poly Haven lists (its checksum differs)`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, bytes);
  console.log(`saved ${file.slice(cache.length + 1)}`);
}

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

const credits = [];
const note = async (id, kind) => {
  const info = await api(`/info/${id}`);
  credits.push({ id, kind, name: info.name, authors: Object.keys(info.authors ?? {}), page: `https://polyhaven.com/a/${id}`, ...(info.dimensions ? { dimensions: info.dimensions } : {}) });
};
for (const id of MODELS) {
  const gltf = (await api(`/files/${id}`)).gltf['1k'].gltf;
  await save(join(cache, 'polyhaven', id, `${id}.gltf`), gltf);
  for (const [path, file] of Object.entries(gltf.include)) await save(join(cache, 'polyhaven', id, path), file);
  await note(id, 'model');
}
const sand = await api(`/files/${SAND}`);
for (const map of ['Diffuse', 'nor_gl', 'Rough']) await save(join(cache, 'polyhaven', SAND, `${map}.jpg`), sand[map]['1k'].jpg);
await note(SAND, 'texture');
writeFileSync(join(cache, 'polyhaven', 'credits.json'), JSON.stringify(credits, null, 2));
console.log(`${credits.length} Poly Haven assets in ${join(cache, 'polyhaven')}`);
