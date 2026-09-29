// Downloads the sneaker store's shoe: "Materials Variants Shoe" from the
// Khronos glTF Sample Assets (https://github.com/KhronosGroup/glTF-Sample-Assets),
// © 2021 Shopify, Inc., under CC BY 4.0, into tools/cache/ (not committed;
// prepare.mjs makes the site's files from it). Run from the repository root:
//
//   node examples/sneaker-store/tools/download.mjs
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cache = join(here, 'cache');
const HEADERS = { 'User-Agent': 'HoloML examples (https://github.com/srajpal/holoml)' };
/** The shoe's folder in the sample assets, at a fixed commit so the files cannot change under the site. */
export const COMMIT = 'f36bfdabd1031c3cf6689a50570b8cdf3678b49c';
const BASE = `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/${COMMIT}/Models/MaterialsVariantsShoe`;
/** Its glTF, buffer, and pictures, and the licence and notes that come with it. */
export const FILES = [
  'glTF/MaterialsVariantsShoe.gltf',
  'glTF/MaterialsVariantsShoe.bin',
  'glTF/diffuseBeach.jpg',
  'glTF/diffuseMidnight.jpg',
  'glTF/diffuseStreet.jpg',
  'glTF/normal.jpg',
  'glTF/occlusionRougnessMetalness.jpg',
  'LICENSE.md',
  'README.md',
  'metadata.json',
];

async function save(url, file) {
  if (existsSync(file)) return;
  const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(300_000) });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  console.log(`saved ${file.slice(cache.length + 1)}`);
}

for (const f of FILES) await save(`${BASE}/${f}`, join(cache, 'shoe', f));
console.log(`the shoe's ${FILES.length} files in ${join(cache, 'shoe')}`);
