// Writes the showroom's building, made for this project: models/hall.gltf
// (a round floor and a curved back wall with a glowing strip) and
// models/plinth.gltf (a low round stand for one car). Materials: Floor,
// Wall, Glow, Plinth, and Rim, which pages can change.
//
//   node examples/showroom/tools/make-hall.mjs
import { writeFileSync } from 'node:fs';

/** Positions, normals, and triangle indices, added to as shapes are built. */
function geometry() {
  return { position: [], normal: [], index: [] };
}

/** A flat disc facing up, at height y. */
function disc(g, radius, y, segments = 96) {
  const centre = g.position.length / 3;
  g.position.push(0, y, 0);
  g.normal.push(0, 1, 0);
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    g.position.push(Math.cos(a) * radius, y, Math.sin(a) * radius);
    g.normal.push(0, 1, 0);
  }
  for (let i = 1; i <= segments; i++) g.index.push(centre, centre + i + 1, centre + i);
}

/** The side of a cylinder (or an arc of one), facing out, or in when inward is set. */
function side(g, radius, y0, y1, from = 0, to = Math.PI * 2, inward = false, segments = 96) {
  const base = g.position.length / 3;
  for (let i = 0; i <= segments; i++) {
    const a = from + ((to - from) * i) / segments;
    const [x, z] = [Math.cos(a), Math.sin(a)];
    const n = inward ? [-x, 0, -z] : [x, 0, z];
    g.position.push(x * radius, y0, z * radius, x * radius, y1, z * radius);
    g.normal.push(...n, ...n);
  }
  for (let i = 0; i < segments; i++) {
    const [a, b, c, d] = [base + i * 2, base + i * 2 + 1, base + i * 2 + 2, base + i * 2 + 3];
    if (inward) g.index.push(a, c, b, b, c, d);
    else g.index.push(a, b, c, b, d, c);
  }
}

const material = (name, color, metallic, roughness, emissive) => ({
  name,
  pbrMetallicRoughness: { baseColorFactor: [...color, 1], metallicFactor: metallic, roughnessFactor: roughness },
  ...(emissive ? { emissiveFactor: emissive } : {}),
});

/** One glTF file of several meshes, each one geometry with one material. */
function write(file, name, parts, materials) {
  const buffers = [];
  let length = 0;
  const bufferViews = [];
  const accessors = [];
  const add = (array, type, target, extra = {}) => {
    const bytes = Buffer.from(array.buffer);
    bufferViews.push({ buffer: 0, byteOffset: length, byteLength: bytes.length, target });
    buffers.push(bytes);
    length += bytes.length;
    accessors.push({ bufferView: bufferViews.length - 1, componentType: array instanceof Float32Array ? 5126 : 5125, count: array.length / (type === 'VEC3' ? 3 : 1), type, ...extra });
    return accessors.length - 1;
  };
  const meshes = parts.map(({ name: meshName, g, material: m }) => {
    const p = g.position;
    const min = [0, 1, 2].map((k) => Math.min(...p.filter((_, i) => i % 3 === k)));
    const max = [0, 1, 2].map((k) => Math.max(...p.filter((_, i) => i % 3 === k)));
    return {
      name: meshName,
      primitives: [
        {
          attributes: { POSITION: add(new Float32Array(p), 'VEC3', 34962, { min, max }), NORMAL: add(new Float32Array(g.normal), 'VEC3', 34962) },
          indices: add(new Uint32Array(g.index), 'SCALAR', 34963),
          material: m,
        },
      ],
    };
  });
  const buffer = Buffer.concat(buffers);
  const gltf = {
    asset: { version: '2.0', generator: 'HoloML examples/showroom/tools/make-hall.mjs' },
    scene: 0,
    scenes: [{ name, nodes: meshes.map((_, i) => i) }],
    nodes: meshes.map((m, i) => ({ name: m.name, mesh: i })),
    meshes,
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: buffer.length, uri: `data:application/octet-stream;base64,${buffer.toString('base64')}` }],
  };
  const url = new URL(`../models/${file}`, import.meta.url);
  writeFileSync(url, JSON.stringify(gltf) + '\n');
  console.log(`wrote models/${file} (${buffer.length} bytes of geometry)`);
}

// The hall: a floor 30 m across, and a wall 6 m high around the back half,
// with a glowing strip along its foot. The open side faces +z, where the
// viewer comes in.
const floor = geometry();
disc(floor, 15, 0);
const wall = geometry();
side(wall, 15, 0, 6, Math.PI, Math.PI * 2, true);
const glow = geometry();
side(glow, 14.9, 0.15, 0.3, Math.PI, Math.PI * 2, true);
write(
  'hall.gltf',
  'Hall',
  [
    { name: 'Floor', g: floor, material: 0 },
    { name: 'Wall', g: wall, material: 1 },
    { name: 'Glow', g: glow, material: 2 },
  ],
  [
    material('Floor', [0.06, 0.065, 0.08], 0.2, 0.55),
    material('Wall', [0.1, 0.1, 0.14], 0, 0.8),
    material('Glow', [0.3, 0.8, 1], 0, 1, [0.3, 0.8, 1]),
  ],
);

// A plinth: 3 m across, 0.25 m high, with a bright rim.
const top = geometry();
disc(top, 1.5, 0.25);
side(top, 1.5, 0.04, 0.25);
const rim = geometry();
side(rim, 1.52, 0, 0.04);
write(
  'plinth.gltf',
  'Plinth',
  [
    { name: 'Plinth', g: top, material: 0 },
    { name: 'Rim', g: rim, material: 1 },
  ],
  [material('Plinth', [0.85, 0.86, 0.9], 0.1, 0.4), material('Rim', [0.3, 0.8, 1], 0, 1, [0.3, 0.8, 1])],
);
