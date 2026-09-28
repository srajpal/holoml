// Downloads Harbour Loft's models, textures, and harbour panorama from
// Poly Haven (https://polyhaven.com, every asset CC0), at 1k (the
// panorama's picture larger, for the sky), into tools/cache/ (not
// committed; prepare.mjs makes the site's files from it). Run from the
// repository root:
//
//   node examples/harbour-loft/tools/download.mjs
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cache = join(here, 'cache');
const API = 'https://api.polyhaven.com';
const HEADERS = { 'User-Agent': 'HoloML examples (https://github.com/srajpal/holoml)' };

/** The furniture, lamps, and plants (glTF). The walls, floors, doors, kitchen, bathroom, and bed are made by prepare.mjs. */
export const MODELS = [
  'sofa_02',
  'mid_century_lounge_chair',
  'coffee_table_round_01',
  'modern_wooden_cabinet',
  'steel_frame_shelves_01',
  'potted_plant_04',
  'throw_pillows_01',
  'hanging_picture_frame_02',
  'side_table_tall_01',
  'side_table_01',
  'industrial_pipe_lamp',
  'round_wooden_table_01',
  'painted_wooden_chair_01',
  'metal_stool_01',
  'modern_ceiling_lamp_01',
  'metal_office_desk',
  'modern_arm_chair_01',
  'desk_lamp_arm_01',
  'outdoor_table_chair_set_01',
  'planter_box_02',
];
/** Textures (colour, normal, and roughness pictures) for what prepare.mjs makes. */
export const TEXTURES = [
  'herringbone_parquet',
  'interior_tiles',
  'long_white_tiles',
  'marble_01',
  'oak_veneer_01',
  'white_oak_veneer',
  'brick_wall_001',
  'poly_wool_herringbone',
  'waffle_pique_cotton',
  'brown_planks_09',
];
/** The harbour: its HDR panorama at 1k (the light), and Poly Haven's own tonemapped picture of it (the sky). */
export const HARBOUR = 'simons_town_harbour';

async function get(path) {
  const r = await fetch(`${API}${path}`, { headers: HEADERS, signal: AbortSignal.timeout(60_000) });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

async function save(url, file) {
  if (existsSync(file)) return;
  const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(300_000) });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  console.log(`saved ${file.slice(cache.length + 1)}`);
}

const credits = [];
const note = async (id, kind) => {
  const info = await get(`/info/${id}`);
  credits.push({
    id,
    kind,
    name: info.name,
    authors: Object.keys(info.authors ?? {}),
    page: `https://polyhaven.com/a/${id}`,
    // A texture's size in the world, in millimetres (how far one picture reaches).
    ...(info.dimensions ? { dimensions: info.dimensions } : {}),
  });
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
const harbour = await get(`/files/${HARBOUR}`);
await save(harbour.hdri['1k'].hdr.url, join(cache, 'light', `${HARBOUR}.hdr`));
await save(harbour.tonemapped.url, join(cache, 'light', `${HARBOUR}.jpg`));
await note(HARBOUR, 'HDRI');
writeFileSync(join(cache, 'credits.json'), JSON.stringify(credits, null, 2));
console.log(`${credits.length} assets in ${cache}`);
