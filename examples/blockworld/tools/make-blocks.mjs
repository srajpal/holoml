// Writes Blockworld's block models (models/*.gltf): cubes 1 m across,
// centred on their origin, with textures from Kenney's Voxel Pack (CC0,
// https://kenney.nl/assets/voxel-pack) embedded in each file; and a torch
// and a chest, made here. Download the pack, unpack it, and run from the
// repository root:
//
//   node examples/blockworld/tools/make-blocks.mjs "<pack>/PNG/Tiles"
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const tiles = process.argv[2];
if (!tiles) throw new Error('Give the folder of the pack\'s tiles, for example "kenney_voxel-pack/PNG/Tiles"');
const out = new URL('../models/', import.meta.url);

/** Blocks: the tile on the top, the sides, and the bottom, and how the material behaves. */
const BLOCKS = {
  grass: { top: 'grass_top', side: 'dirt_grass', bottom: 'dirt' },
  dirt: { all: 'dirt' },
  stone: { all: 'stone' },
  sand: { all: 'sand' },
  planks: { all: 'wood' },
  trunk: { top: 'trunk_top', side: 'trunk_side', bottom: 'trunk_top' },
  leaves: { all: 'leaves_transparent', alpha: 'MASK' },
  water: { all: 'water', alpha: 'BLEND', opacity: 0.72 },
  gem: { all: 'stone_diamond' },
};

// The six faces of a cube: which way it faces, and its corners (counter-clockwise from outside).
const FACES = [
  { name: 'side', n: [1, 0, 0], c: [[0.5, 0.5, 0.5], [0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5]] },
  { name: 'side', n: [-1, 0, 0], c: [[-0.5, 0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5]] },
  { name: 'top', n: [0, 1, 0], c: [[-0.5, 0.5, -0.5], [-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5]] },
  { name: 'bottom', n: [0, -1, 0], c: [[-0.5, -0.5, 0.5], [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5]] },
  { name: 'side', n: [0, 0, 1], c: [[-0.5, 0.5, 0.5], [-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5]] },
  { name: 'side', n: [0, 0, -1], c: [[0.5, 0.5, -0.5], [0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5]] },
];
// Texture corners for c[0..3]: top-left, bottom-left, bottom-right, top-right.
const UV = [[0, 0], [0, 1], [1, 1], [1, 0]];

/** A box of the given size and centre, as faces with one material each ("top", "side", "bottom"). */
function boxFaces(size, centre) {
  return FACES.map((f) => ({ ...f, c: f.c.map((p) => p.map((v, i) => v * size[i] + centre[i])) }));
}

/**
 * Writes a glTF file of one mesh: faces grouped by material, each
 * material with an embedded picture or a plain colour.
 */
function writeModel(file, name, faces, materials) {
  const byMaterial = new Map();
  for (const f of faces) {
    const list = byMaterial.get(f.material) ?? [];
    list.push(f);
    byMaterial.set(f.material, list);
  }
  const chunks = [];
  let length = 0;
  const views = [];
  const accessors = [];
  const add = (array, type, target, extra = {}) => {
    const bytes = Buffer.from(array.buffer);
    const pad = (4 - (length % 4)) % 4;
    if (pad) {
      chunks.push(Buffer.alloc(pad));
      length += pad;
    }
    views.push({ buffer: 0, byteOffset: length, byteLength: bytes.length, target });
    chunks.push(bytes);
    length += bytes.length;
    const count = array.length / { VEC3: 3, VEC2: 2, SCALAR: 1 }[type];
    accessors.push({ bufferView: views.length - 1, componentType: array instanceof Float32Array ? 5126 : 5123, count, type, ...extra });
    return accessors.length - 1;
  };
  const primitives = [];
  const materialNames = [...byMaterial.keys()];
  for (const [mat, list] of byMaterial) {
    const position = [];
    const normal = [];
    const uv = [];
    const index = [];
    for (const f of list) {
      const base = position.length / 3;
      f.c.forEach((p, k) => {
        position.push(...p);
        normal.push(...f.n);
        uv.push(...(f.uv?.[k] ?? UV[k]));
      });
      index.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const min = [0, 1, 2].map((i) => Math.min(...position.filter((_, j) => j % 3 === i)));
    const max = [0, 1, 2].map((i) => Math.max(...position.filter((_, j) => j % 3 === i)));
    primitives.push({
      attributes: {
        POSITION: add(new Float32Array(position), 'VEC3', 34962, { min, max }),
        NORMAL: add(new Float32Array(normal), 'VEC3', 34962),
        TEXCOORD_0: add(new Float32Array(uv), 'VEC2', 34962),
      },
      indices: add(new Uint16Array(index), 'SCALAR', 34963),
      material: materialNames.indexOf(mat),
    });
  }
  const images = [];
  const textures = [];
  const gltfMaterials = materialNames.map((m) => {
    const spec = materials[m];
    const pbr = { metallicFactor: 0, roughnessFactor: spec.roughness ?? 0.9 };
    if (spec.tile) {
      images.push({ uri: `data:image/png;base64,${readFileSync(join(tiles, `${spec.tile}.png`)).toString('base64')}`, name: spec.tile });
      textures.push({ source: images.length - 1, sampler: 0 });
      pbr.baseColorTexture = { index: textures.length - 1 };
    }
    if (spec.color) pbr.baseColorFactor = [...spec.color, spec.opacity ?? 1];
    else if (spec.opacity !== undefined) pbr.baseColorFactor = [1, 1, 1, spec.opacity];
    return {
      name: spec.name ?? m,
      pbrMetallicRoughness: pbr,
      ...(spec.emissive ? { emissiveFactor: spec.emissive } : {}),
      ...(spec.alpha ? { alphaMode: spec.alpha } : {}),
      ...(spec.alpha === 'MASK' ? { alphaCutoff: 0.5, doubleSided: true } : {}),
    };
  });
  const buffer = Buffer.concat(chunks);
  const gltf = {
    asset: { version: '2.0', generator: 'HoloML examples/blockworld/tools/make-blocks.mjs' },
    scene: 0,
    scenes: [{ name, nodes: [0] }],
    nodes: [{ name, mesh: 0 }],
    meshes: [{ name, primitives }],
    materials: gltfMaterials,
    ...(textures.length ? { textures, images, samplers: [{ magFilter: 9728, minFilter: 9986 }] } : {}),
    accessors,
    bufferViews: views,
    buffers: [{ byteLength: buffer.length, uri: `data:application/octet-stream;base64,${buffer.toString('base64')}` }],
  };
  writeFileSync(new URL(file, out), JSON.stringify(gltf) + '\n');
  console.log(`wrote models/${file}`);
}

for (const [name, b] of Object.entries(BLOCKS)) {
  const tile = (part) => b[part] ?? b.all;
  const faces = boxFaces([1, 1, 1], [0, 0, 0]).map((f) => ({ ...f, material: b.all ? 'all' : f.name }));
  const materials = b.all
    ? { all: { name, tile: b.all, alpha: b.alpha, opacity: b.opacity } }
    : { top: { name: `${name}-top`, tile: tile('top') }, side: { name: `${name}-side`, tile: tile('side') }, bottom: { name: `${name}-bottom`, tile: tile('bottom') } };
  writeModel(`${name}.gltf`, name, faces, materials);
}

// A torch: a stick with a glowing head, standing in the middle of its block.
writeModel(
  'torch.gltf',
  'torch',
  [
    ...boxFaces([0.12, 0.55, 0.12], [0, -0.22, 0]).map((f) => ({ ...f, material: 'stick' })),
    ...boxFaces([0.18, 0.18, 0.18], [0, 0.12, 0]).map((f) => ({ ...f, material: 'flame' })),
  ],
  {
    stick: { name: 'Stick', tile: 'trunk_side', roughness: 1 },
    flame: { name: 'Flame', color: [1, 0.78, 0.3], emissive: [1, 0.62, 0.18], roughness: 1 },
  },
);

// A chest: planks, with a darker lid and a gold latch, a little smaller than a block.
writeModel(
  'chest.gltf',
  'chest',
  [
    ...boxFaces([0.9, 0.62, 0.8], [0, -0.14, 0]).map((f) => ({ ...f, material: 'body' })),
    ...boxFaces([0.94, 0.26, 0.84], [0, 0.3, 0]).map((f) => ({ ...f, material: 'lid' })),
    ...boxFaces([0.16, 0.22, 0.06], [0, 0.12, 0.43]).map((f) => ({ ...f, material: 'latch' })),
  ],
  {
    body: { name: 'Planks', tile: 'wood' },
    lid: { name: 'Lid', tile: 'wood_red' },
    latch: { name: 'Latch', color: [0.95, 0.75, 0.2], roughness: 0.35 },
  },
);
