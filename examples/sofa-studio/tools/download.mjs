// Downloads the sofa studio's models, textures, and light from Poly Haven
// (https://polyhaven.com, every asset CC0), at 1k, into tools/cache/
// (not committed; prepare.mjs makes the site's files from it). Run from
// the repository root:
//
//   node examples/sofa-studio/tools/download.mjs
//
// Every file is checked against the SHA-256 recorded for it in
// checksums.json: Poly Haven serves the newest version of an asset, and a
// file that has changed stops the tool instead of changing the site. To
// take a new or changed file on purpose, run with --record, look at the
// file, and commit checksums.json.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchJson, keeper, readSums, writeSums } from '../../tools/cache.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const cache = join(here, 'cache');
const API = 'https://api.polyhaven.com';
const CHECKSUMS = join(here, 'checksums.json');
const record = process.argv.includes('--record');
const sums = readSums(CHECKSUMS);

/** Models (glTF), textures (colour, normal, and roughness pictures), and the light (an HDR panorama). */
export const MODELS = ['Sofa_01', 'modern_coffee_table_01', 'side_table_01', 'industrial_pipe_lamp', 'potted_plant_02', 'ceramic_vase_01'];
export const TEXTURES = ['rough_linen', 'velour_velvet', 'wool_boucle', 'brown_leather', 'quatrefoil_jacquard_fabric', 'brown_planks_05'];
export const LIGHT = 'brown_photostudio_02';

// Every request gives up after a while (a minute for Poly Haven's lists, five for a file), instead of waiting for ever.
const get = (path) => fetchJson(`${API}${path}`);
const save = keeper({ cache, sums, record });

const credits = [];
const note = async (id, kind) => {
  const info = await get(`/info/${id}`);
  credits.push({ id, kind, name: info.name, authors: Object.keys(info.authors ?? {}), page: `https://polyhaven.com/a/${id}` });
};

for (const id of MODELS) {
  const gltf = (await get(`/files/${id}`)).gltf['1k'].gltf;
  await save(gltf.url, join(cache, 'models', id, `${id}.gltf`));
  for (const [path, file] of Object.entries(gltf.include)) await save(file.url, join(cache, 'models', id, path));
  await note(id, 'model');
}
for (const id of TEXTURES) {
  const files = await get(`/files/${id}`);
  for (const map of ['Diffuse', 'nor_gl', 'Rough']) await save(files[map]['1k'].jpg.url, join(cache, 'textures', id, `${map}.jpg`));
  await note(id, 'texture');
}
await save((await get(`/files/${LIGHT}`)).hdri['1k'].hdr.url, join(cache, 'light', `${LIGHT}.hdr`));
await note(LIGHT, 'HDRI');
mkdirSync(cache, { recursive: true });
writeFileSync(join(cache, 'credits.json'), JSON.stringify(credits, null, 2));
if (record) writeSums(CHECKSUMS, sums);
console.log(`${credits.length} assets in ${cache}, each file as its checksum says`);
