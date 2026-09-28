// Downloads the sofa studio's models, textures, and light from Poly Haven
// (https://polyhaven.com, every asset CC0), at 1k, into tools/cache/
// (not committed; prepare.mjs makes the site's files from it). Run from
// the repository root:
//
//   node examples/sofa-studio/tools/download.mjs
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cache = join(here, 'cache');
const API = 'https://api.polyhaven.com';
const HEADERS = { 'User-Agent': 'HoloML examples (https://github.com/srajpal/holoml)' };

/** Models (glTF), textures (colour, normal, and roughness pictures), and the light (an HDR panorama). */
export const MODELS = ['Sofa_01', 'modern_coffee_table_01', 'side_table_01', 'industrial_pipe_lamp', 'potted_plant_02', 'ceramic_vase_01'];
export const TEXTURES = ['rough_linen', 'velour_velvet', 'wool_boucle', 'brown_leather', 'quatrefoil_jacquard_fabric', 'brown_planks_05'];
export const LIGHT = 'brown_photostudio_02';

async function get(path) {
  const r = await fetch(`${API}${path}`, { headers: HEADERS });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

async function save(url, file) {
  if (existsSync(file)) return;
  const r = await fetch(url, { headers: HEADERS });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  console.log(`saved ${file.slice(cache.length + 1)}`);
}

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
writeFileSync(join(cache, 'credits.json'), JSON.stringify(credits, null, 2));
console.log(`${credits.length} assets in ${cache}`);
