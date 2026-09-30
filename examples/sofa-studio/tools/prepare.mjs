// Makes the sofa studio's files from what download.mjs saved in
// tools/cache/ (Poly Haven's CC0 models, textures, and light):
//
// - models/sofa.gltf: Sofa 01 with its one material split in two,
//   "Fabric" and "Wood", by the colour of its own picture under each
//   triangle (the upholstery is light, the carved frame dark), so a page
//   can change the one without the other;
// - textures/sofa-wood-oak.jpg and sofa-wood-ebony.jpg: the sofa's
//   picture recoloured as two other wood finishes (the frame's own is
//   walnut);
// - the fabrics, the rug (recoloured grey), and the floor as colour,
//   normal, and roughness pictures, and the other models, with every
//   JPEG re-encoded for the web;
// - models/room.gltf (a floor of planks and three walls) and
//   models/rug.gltf, made here;
// - light/studio.hdr, and models/CREDITS.md.
//
// It uses Electron's picture decoder and encoder, so run it with
// Electron (any recent version) from the repository root:
//
//   electron examples/sofa-studio/tools/prepare.mjs
import { app } from 'electron';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode, encode } from '../../tools/pictures.mjs';
import { add3, luminance } from '../../tools/shapes.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const cache = join(here, 'cache');
const site = join(here, '..');
const MODELS = join(site, 'models');
const TEXTURES = join(site, 'textures');

// ---- Pictures ------------------------------------------------------------------

/** A JPEG again at web quality (normal maps a little higher: their errors show as bumps). */
function reencode(from, to, quality) {
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, encode(decode(from), quality));
}

/** Recolours a picture: each pixel's lightness picks a colour between `dark` and `light` (wood keeps its grain). */
function tint(picture, dark, light) {
  const data = Buffer.from(picture.data);
  for (let i = 0; i < data.length; i += 4) {
    const t = Math.min(1, luminance(data[i + 2], data[i + 1], data[i]) / 0.35);
    data[i + 2] = Math.round(dark[0] + (light[0] - dark[0]) * t);
    data[i + 1] = Math.round(dark[1] + (light[1] - dark[1]) * t);
    data[i] = Math.round(dark[2] + (light[2] - dark[2]) * t);
  }
  return { ...picture, data };
}

// ---- glTF --------------------------------------------------------------------------

/** Writes a glTF file and its .bin from arrays: each primitive's attributes and indices, and its material's name. */
function writeGltf(file, name, primitives, materials, images) {
  const chunks = [];
  let length = 0;
  const views = [];
  const accessors = [];
  const add = (array, type, target, bounds) => {
    const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    const pad = (4 - (length % 4)) % 4;
    if (pad) {
      chunks.push(Buffer.alloc(pad));
      length += pad;
    }
    views.push({ buffer: 0, byteOffset: length, byteLength: bytes.length, target });
    chunks.push(bytes);
    length += bytes.length;
    const componentType = array instanceof Float32Array ? 5126 : array instanceof Uint32Array ? 5125 : 5123;
    const size = { SCALAR: 1, VEC2: 2, VEC3: 3 }[type];
    accessors.push({ bufferView: views.length - 1, componentType, count: array.length / size, type, ...bounds });
    return accessors.length - 1;
  };
  const bounds = (p) => {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], p[i + k]);
      max[k] = Math.max(max[k], p[i + k]);
    }
    return { min, max };
  };
  const prims = primitives.map((p) => ({
    attributes: {
      POSITION: add(p.positions, 'VEC3', 34962, bounds(p.positions)),
      NORMAL: add(p.normals, 'VEC3', 34962),
      TEXCOORD_0: add(p.uvs, 'VEC2', 34962),
    },
    indices: add(p.indices, 'SCALAR', 34963),
    material: materials.findIndex((m) => m.name === p.material),
  }));
  const bin = `${basename(file, '.gltf')}.bin`;
  const gltf = {
    asset: { version: '2.0', generator: 'HoloML examples/sofa-studio/tools/prepare.mjs' },
    scene: 0,
    scenes: [{ name, nodes: [0] }],
    nodes: [{ name, mesh: 0 }],
    meshes: [{ name, primitives: prims }],
    materials,
    ...(images.length
      ? {
          images: images.map((uri) => ({ uri, mimeType: 'image/jpeg' })),
          textures: images.map((_, i) => ({ source: i, sampler: 0 })),
          samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
        }
      : {}),
    buffers: [{ uri: bin, byteLength: length }],
    bufferViews: views,
    accessors,
  };
  writeFileSync(file, JSON.stringify(gltf));
  writeFileSync(join(dirname(file), bin), Buffer.concat(chunks));
}

/** A flat rectangle as a primitive: its corner, two edges, its normal, and how far its pictures tile. */
function quad(origin, u, v, normal, tiles, material) {
  const p = [origin, add3(origin, u), add3(add3(origin, u), v), add3(origin, v)];
  return {
    positions: new Float32Array(p.flat()),
    normals: new Float32Array([normal, normal, normal, normal].flat()),
    uvs: new Float32Array([0, tiles[1], tiles[0], tiles[1], tiles[0], 0, 0, 0]),
    indices: new Uint16Array([0, 1, 2, 0, 2, 3]),
    material,
  };
}

/** Joins primitives of the same material into one. */
function merge(parts) {
  const byMaterial = new Map();
  for (const p of parts) byMaterial.set(p.material, [...(byMaterial.get(p.material) ?? []), p]);
  return [...byMaterial.entries()].map(([material, list]) => {
    const cat = (key, Type) => {
      const out = new Type(list.reduce((n, p) => n + p[key].length, 0));
      let at = 0;
      for (const p of list) {
        out.set(p[key], at);
        at += p[key].length;
      }
      return out;
    };
    const indices = new Uint16Array(list.reduce((n, p) => n + p.indices.length, 0));
    let at = 0;
    let base = 0;
    for (const p of list) {
      for (let i = 0; i < p.indices.length; i++) indices[at + i] = p.indices[i] + base;
      at += p.indices.length;
      base += p.positions.length / 3;
    }
    return { positions: cat('positions', Float32Array), normals: cat('normals', Float32Array), uvs: cat('uvs', Float32Array), indices, material };
  });
}

/** A textured material: its colour, normal, and roughness pictures (indices into the file's images). */
const textured = (name, first, extra = {}) => ({
  name,
  pbrMetallicRoughness: { baseColorTexture: { index: first }, metallicRoughnessTexture: { index: first + 2 }, metallicFactor: 0, ...extra },
  normalTexture: { index: first + 1 },
});

// ---- The sofa ------------------------------------------------------------------------

function sofa() {
  const dir = join(cache, 'models', 'Sofa_01');
  const g = JSON.parse(readFileSync(join(dir, 'Sofa_01.gltf'), 'utf8'));
  const raw = readFileSync(join(dir, 'Sofa_01.bin'));
  const bin = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  const read = (index, Type, size) => {
    const a = g.accessors[index];
    const view = g.bufferViews[a.bufferView];
    return new Type(bin, (view.byteOffset ?? 0) + (a.byteOffset ?? 0), a.count * size);
  };
  const prim = g.meshes[0].primitives[0];
  const positions = read(prim.attributes.POSITION, Float32Array, 3);
  const normals = read(prim.attributes.NORMAL, Float32Array, 3);
  const uvs = read(prim.attributes.TEXCOORD_0, Float32Array, 2);
  const indices = read(prim.indices, Uint16Array, 1);
  const picture = decode(join(dir, 'textures', 'Sofa_01_diff_1k.jpg'));
  const at = (u, v) => {
    const x = Math.min(picture.width - 1, Math.max(0, Math.floor((u - Math.floor(u)) * picture.width)));
    const y = Math.min(picture.height - 1, Math.max(0, Math.floor((v - Math.floor(v)) * picture.height)));
    const i = (y * picture.width + x) * 4;
    return luminance(picture.data[i + 2], picture.data[i + 1], picture.data[i]);
  };
  // Each triangle: the picture at 21 points spread over it; wood when at
  // least three quarters of them are dark. The picture's wood is darker
  // than 0.2 and its fabric lighter than 0.25, even in the shade under
  // the seat. The skirt's long triangles run from the fabric down onto
  // the dark trim: as fabric, the new fabric reaches the trim's own strip
  // of triangles; as wood (a first try, at "mostly dark"), they showed as
  // a zigzag of the old fabric once the fabric changed.
  const fabric = [];
  const wood = [];
  const N = 6;
  for (let t = 0; t < indices.length; t += 3) {
    const [a, b, c] = [indices[t], indices[t + 1], indices[t + 2]];
    let dark = 0;
    let count = 0;
    for (let i = 0; i < N; i++) {
      for (let j = 0; i + j < N; j++) {
        const [p, q] = [(i + 0.5) / N, (j + 0.5) / N];
        const r = 1 - p - q;
        const u = p * uvs[a * 2] + q * uvs[b * 2] + r * uvs[c * 2];
        const v = p * uvs[a * 2 + 1] + q * uvs[b * 2 + 1] + r * uvs[c * 2 + 1];
        if (at(u, v) < 0.2) dark++;
        count++;
      }
    }
    (dark / count >= 0.75 ? wood : fabric).push(a, b, c);
  }
  console.log(`sofa: ${fabric.length / 3} fabric triangles, ${wood.length / 3} wood triangles`);
  const images = ['textures/sofa-color.jpg', 'textures/sofa-normal.jpg', 'textures/sofa-arm.jpg'];
  const materials = [
    { ...textured('Fabric', 0), doubleSided: true },
    { ...textured('Wood', 0), doubleSided: true },
  ];
  const part = (list, material) => ({ positions, normals, uvs, indices: new Uint16Array(list), material });
  writeGltf(join(MODELS, 'sofa.gltf'), 'Sofa', [part(fabric, 'Fabric'), part(wood, 'Wood')], materials, images.map((p) => `../${p}`));
  reencode(join(dir, 'textures', 'Sofa_01_diff_1k.jpg'), join(site, images[0]), 84);
  reencode(join(dir, 'textures', 'Sofa_01_nor_gl_1k.jpg'), join(site, images[1]), 90);
  reencode(join(dir, 'textures', 'Sofa_01_arm_1k.jpg'), join(site, images[2]), 84);
  // The other finishes of the frame: the picture recoloured (only the wood's triangles use it).
  writeFileSync(join(TEXTURES, 'sofa-wood-oak.jpg'), encode(tint(picture, [118, 80, 44], [226, 186, 132]), 84));
  writeFileSync(join(TEXTURES, 'sofa-wood-ebony.jpg'), encode(tint(picture, [9, 8, 8], [66, 56, 50]), 84));
}

// ---- Textures, models, room, light, credits ------------------------------------------

/** Each fabric (and the rug and the floor): colour, normal, and roughness pictures. */
const SETS = {
  linen: 'rough_linen',
  velvet: 'velour_velvet',
  boucle: 'wool_boucle',
  leather: 'brown_leather',
  rug: 'quatrefoil_jacquard_fabric',
  floor: 'brown_planks_05',
};

/** The rug's jacquard is red; recoloured to a quiet stone grey (its pattern kept), so the sofa stays the brightest thing. */
const RUG = { dark: [88, 84, 78], light: [214, 207, 194] };

function textures() {
  for (const [slug, id] of Object.entries(SETS)) {
    const dir = join(cache, 'textures', id);
    if (slug === 'rug') writeFileSync(join(TEXTURES, 'rug-color.jpg'), encode(tint(decode(join(dir, 'Diffuse.jpg')), RUG.dark, RUG.light), 82));
    else reencode(join(dir, 'Diffuse.jpg'), join(TEXTURES, `${slug}-color.jpg`), 82);
    reencode(join(dir, 'nor_gl.jpg'), join(TEXTURES, `${slug}-normal.jpg`), 90);
    reencode(join(dir, 'Rough.jpg'), join(TEXTURES, `${slug}-rough.jpg`), 80);
  }
}

/** Poly Haven's other models: their glTF and .bin as they are, and their pictures in textures/, JPEGs re-encoded. */
const OTHERS = {
  'coffee-table': 'modern_coffee_table_01',
  'side-table': 'side_table_01',
  lamp: 'industrial_pipe_lamp',
  plant: 'potted_plant_02',
  vase: 'ceramic_vase_01',
};

function others() {
  for (const [slug, id] of Object.entries(OTHERS)) {
    const dir = join(cache, 'models', id);
    const g = JSON.parse(readFileSync(join(dir, `${id}.gltf`), 'utf8'));
    g.buffers.forEach((b, i) => {
      const name = g.buffers.length === 1 ? `${slug}.bin` : `${slug}-${i}.bin`;
      copyFileSync(join(dir, b.uri), join(MODELS, name));
      b.uri = name;
    });
    for (const image of g.images ?? []) {
      const file = basename(image.uri);
      const to = join(TEXTURES, file);
      if (/\.jpe?g$/i.test(file)) reencode(join(dir, image.uri), to, /_nor_/i.test(file) ? 90 : 82);
      else copyFileSync(join(dir, image.uri), to);
      image.uri = `../textures/${file}`;
    }
    g.asset = { ...g.asset, extras: { from: `https://polyhaven.com/a/${id}`, license: 'CC0 1.0' } };
    writeFileSync(join(MODELS, `${slug}.gltf`), JSON.stringify(g));
  }
}

/** The room: a floor of planks, 5 by 4 metres, and three walls 2.8 m high (the fourth side is where the viewer stands). */
function room() {
  const [x0, x1, z0, z1, h] = [-2.5, 2.5, -0.85, 3.15, 2.8];
  const floor = quad([x0, 0, z1], [x1 - x0, 0, 0], [0, 0, z0 - z1], [0, 1, 0], [(x1 - x0) / 2, (z1 - z0) / 2], 'Floor');
  const walls = [
    quad([x0, 0, z0], [x1 - x0, 0, 0], [0, h, 0], [0, 0, 1], [1, 1], 'Wall'),
    quad([x0, 0, z1], [0, 0, z0 - z1], [0, h, 0], [1, 0, 0], [1, 1], 'Wall'),
    quad([x1, 0, z0], [0, 0, z1 - z0], [0, h, 0], [-1, 0, 0], [1, 1], 'Wall'),
  ];
  const materials = [
    textured('Floor', 0, { roughnessFactor: 1 }),
    { name: 'Wall', pbrMetallicRoughness: { baseColorFactor: [0.93, 0.9, 0.85, 1], metallicFactor: 0, roughnessFactor: 0.95 } },
  ];
  writeGltf(join(MODELS, 'room.gltf'), 'Room', merge([floor, ...walls]), materials, ['../textures/floor-color.jpg', '../textures/floor-normal.jpg', '../textures/floor-rough.jpg']);
}

/** The rug: 2.4 by 1.6 m and 1 cm thick, its top a jacquard fabric. */
function rug() {
  const [w, d, t] = [2.4, 1.6, 0.01];
  const top = quad([-w / 2, t, d / 2], [w, 0, 0], [0, 0, -d], [0, 1, 0], [2, 4 / 3], 'Rug');
  const sides = [
    quad([-w / 2, 0, d / 2], [w, 0, 0], [0, t, 0], [0, 0, 1], [2, 0.01], 'Rug'),
    quad([w / 2, 0, -d / 2], [-w, 0, 0], [0, t, 0], [0, 0, -1], [2, 0.01], 'Rug'),
    quad([-w / 2, 0, -d / 2], [0, 0, d], [0, t, 0], [-1, 0, 0], [4 / 3, 0.01], 'Rug'),
    quad([w / 2, 0, d / 2], [0, 0, -d], [0, t, 0], [1, 0, 0], [4 / 3, 0.01], 'Rug'),
  ];
  writeGltf(join(MODELS, 'rug.gltf'), 'Rug', merge([top, ...sides]), [textured('Rug', 0, { roughnessFactor: 1 })], [
    '../textures/rug-color.jpg',
    '../textures/rug-normal.jpg',
    '../textures/rug-rough.jpg',
  ]);
}

function light() {
  mkdirSync(join(site, 'light'), { recursive: true });
  copyFileSync(join(cache, 'light', 'brown_photostudio_02.hdr'), join(site, 'light', 'studio.hdr'));
}

function credits() {
  const list = JSON.parse(readFileSync(join(cache, 'credits.json'), 'utf8'));
  const line = (c) => `- **${c.name}** (${c.kind}) by ${c.authors.join(', ')}: ${c.page}`;
  writeFileSync(
    join(MODELS, 'CREDITS.md'),
    `# Credits for the sofa studio's models, textures, and light

All from **Poly Haven** (https://polyhaven.com), under Creative Commons
Zero (CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/):
no conditions. Poly Haven and its artists ask for credit as thanks.

${list.map(line).join('\n')}

Made from them by ../tools/prepare.mjs: sofa.gltf (Sofa 01 with its
material split into Fabric and Wood), the oak and ebony pictures of its
frame, the rug's picture recoloured grey, and the pictures re-encoded
for the web. room.gltf and rug.gltf are made there too, under the
repository's licence (Apache 2.0).
`,
  );
}

// Not awaited at the top: Electron fires "ready" only once this module has loaded.
void app.whenReady().then(() => {
  try {
    mkdirSync(MODELS, { recursive: true });
    mkdirSync(TEXTURES, { recursive: true });
    sofa();
    textures();
    others();
    room();
    rug();
    light();
    credits();
    console.log('done');
  } catch (e) {
    console.error(e);
    // Ended with 1, so that whatever ran the tool knows it failed (app.quit() would end with 0).
    app.exit(1);
    return;
  }
  app.quit();
});
