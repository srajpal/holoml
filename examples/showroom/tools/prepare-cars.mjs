// Writes the showroom's cars (models/*.glb) from Kenney's Car Kit (CC0,
// https://kenney.nl/assets/car-kit). Each car in the kit has one material
// that takes every colour from a small palette picture, so a page could
// only tint the whole car. This splits each car into named materials, by
// the palette cell each triangle uses, so a page can change one of them:
//
//   Paint   the body colour (a plain colour, no picture, so a page's
//           <material name="Paint" color="..."> sets it exactly)
//   Glass   the windows
//   Lights  head and tail lights
//   Trim    bumpers, sills, and the rest of the body
//   Wheels  tyres and rims
//
// Download the kit, unpack it, and run from the repository root:
//
//   node examples/showroom/tools/prepare-cars.mjs "<kit>/Models/GLB format"
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

/** Kit file -> the showroom's name for it (the names are made up). */
export const CARS = {
  'sedan-sports.glb': 'quellis',
  'hatchback-sports.glb': 'pippet',
  'suv-luxury.glb': 'tallberg',
  'race-future.glb': 'veyl',
  'race.glb': 'strafe',
};

const kit = process.argv[2];
if (!kit) throw new Error('Give the folder of the kit\'s GLB files, for example "kenney_car-kit/Models/GLB format"');
const out = new URL('../models/', import.meta.url);

/** An 8-bit RGB or RGBA PNG, decoded (enough for the kit's palette). */
function readPng(file) {
  const b = readFileSync(file);
  let at = 8;
  let w = 0;
  let h = 0;
  let type = 0;
  const idat = [];
  while (at < b.length) {
    const len = b.readUInt32BE(at);
    const kind = b.toString('ascii', at + 4, at + 8);
    const data = b.subarray(at + 8, at + 8 + len);
    if (kind === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      type = data[9];
    }
    if (kind === 'IDAT') idat.push(data);
    at += 12 + len;
  }
  const bpp = type === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(w * h * bpp);
  const stride = w * bpp;
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= bpp ? px[y * stride + x - bpp] : 0;
      const up = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0;
      let p = v;
      if (filter === 1) p = v + a;
      else if (filter === 2) p = v + up;
      else if (filter === 3) p = v + ((a + up) >> 1);
      else if (filter === 4) {
        const q = a + up - c;
        const pa = Math.abs(q - a);
        const pb = Math.abs(q - up);
        const pc = Math.abs(q - c);
        p = v + (pa <= pb && pa <= pc ? a : pb <= pc ? up : c);
      }
      px[y * stride + x] = p & 255;
    }
  }
  return { w, h, rgb: (x, y) => [0, 1, 2].map((k) => px[(y * w + x) * bpp + k]) };
}

function readGlb(file) {
  const b = readFileSync(file);
  const jsonLength = b.readUInt32LE(12);
  return { json: JSON.parse(b.subarray(20, 20 + jsonLength).toString('utf8')), bin: b.subarray(20 + jsonLength + 8) };
}

const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const SIZES = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 };

/** An accessor's values as plain numbers. */
function values(g, index) {
  const a = g.json.accessors[index];
  const view = g.json.bufferViews[a.bufferView];
  const n = COMPONENTS[a.type];
  const size = SIZES[a.componentType];
  const stride = view.byteStride ?? n * size;
  const start = (view.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const out = [];
  for (let i = 0; i < a.count; i++) {
    for (let k = 0; k < n; k++) {
      const p = start + i * stride + k * size;
      out.push(a.componentType === 5126 ? g.bin.readFloatLE(p) : a.componentType === 5125 ? g.bin.readUInt32LE(p) : a.componentType === 5123 ? g.bin.readUInt16LE(p) : g.bin[p]);
    }
  }
  return out;
}

/** Which material a triangle belongs to, from the palette cell it uses (16 columns, 4 rows). */
function role(isBody, column, row) {
  if (!isBody) return 'Wheels';
  if (row === 1) return 'Paint';
  if (row === 3 && column <= 1) return 'Glass';
  if ((row === 3 && (column === 3 || column === 5)) || (row === 2 && (column === 12 || column === 13))) return 'Lights';
  return 'Trim';
}

const ROLES = ['Paint', 'Glass', 'Lights', 'Trim', 'Wheels'];
const palette = readPng(join(kit, 'Textures', 'colormap.png'));

for (const [file, name] of Object.entries(CARS)) {
  const g = readGlb(join(kit, file));
  const chunks = [];
  let length = 0;
  const views = [];
  const accessors = [];
  /** Adds data to the new buffer (4-byte aligned) and returns its accessor. */
  const add = (array, type, componentType, target, minMax) => {
    const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    const pad = (4 - (length % 4)) % 4;
    if (pad) chunks.push(Buffer.alloc(pad));
    length += pad;
    views.push({ buffer: 0, byteOffset: length, byteLength: bytes.length, target });
    chunks.push(bytes);
    length += bytes.length;
    accessors.push({ bufferView: views.length - 1, componentType, count: array.length / COMPONENTS[type], type, ...minMax });
    return accessors.length - 1;
  };
  const paintColour = [0, 0, 0];
  let paintCount = 0;

  const meshes = g.json.meshes.map((mesh, meshIndex) => {
    const isBody = g.json.nodes.some((n) => n.mesh === meshIndex && n.name === 'body');
    const primitives = [];
    for (const p of mesh.primitives) {
      const position = values(g, p.attributes.POSITION);
      const normal = values(g, p.attributes.NORMAL);
      const uv = values(g, p.attributes.TEXCOORD_0);
      const index = p.indices === undefined ? position.map((_, i) => i).filter((i) => i < position.length / 3) : values(g, p.indices);
      const min = [0, 1, 2].map((k) => Math.min(...position.filter((_, i) => i % 3 === k)));
      const max = [0, 1, 2].map((k) => Math.max(...position.filter((_, i) => i % 3 === k)));
      const attributes = {
        POSITION: add(new Float32Array(position), 'VEC3', 5126, 34962, { min, max }),
        NORMAL: add(new Float32Array(normal), 'VEC3', 5126, 34962),
        TEXCOORD_0: add(new Float32Array(uv), 'VEC2', 5126, 34962),
      };
      const byRole = new Map();
      for (let t = 0; t < index.length; t += 3) {
        const tri = [index[t], index[t + 1], index[t + 2]];
        const u = tri.reduce((s, i) => s + uv[i * 2], 0) / 3;
        const v = tri.reduce((s, i) => s + uv[i * 2 + 1], 0) / 3;
        const r = role(isBody, Math.floor(u * 16), Math.floor(v * 4));
        if (r === 'Paint') {
          const c = palette.rgb(Math.min(palette.w - 1, Math.floor(u * palette.w)), Math.min(palette.h - 1, Math.floor(v * palette.h)));
          c.forEach((x, k) => (paintColour[k] += x));
          paintCount += 1;
        }
        (byRole.get(r) ?? byRole.set(r, []).get(r)).push(...tri);
      }
      for (const r of ROLES) {
        const list = byRole.get(r);
        if (list) primitives.push({ attributes, indices: add(new Uint16Array(list), 'SCALAR', 5123, 34963), material: ROLES.indexOf(r) });
      }
    }
    return { name: mesh.name, primitives };
  });

  // The paint's own colour from the kit, as a plain colour (sRGB to linear).
  const linear = (c) => ((c / 255) <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
  const paint = paintColour.map((c) => linear(c / Math.max(1, paintCount)));
  const textured = (materialName, metallic, roughness) => ({
    name: materialName,
    pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: metallic, roughnessFactor: roughness },
  });
  const gltf = {
    asset: { version: '2.0', generator: 'HoloML examples/showroom/tools/prepare-cars.mjs, from Kenney Car Kit (CC0)' },
    scene: 0,
    scenes: [{ name, nodes: g.json.scenes[g.json.scene ?? 0].nodes }],
    nodes: g.json.nodes,
    meshes,
    materials: [
      { name: 'Paint', pbrMetallicRoughness: { baseColorFactor: [...paint, 1], metallicFactor: 0.5, roughnessFactor: 0.35 } },
      { name: 'Glass', pbrMetallicRoughness: { baseColorFactor: [0.55, 0.68, 0.85, 1], metallicFactor: 0.1, roughnessFactor: 0.1 } },
      textured('Lights', 0, 0.4),
      textured('Trim', 0.2, 0.6),
      textured('Wheels', 0, 0.8),
    ],
    textures: [{ source: 0, sampler: 0 }],
    samplers: [{ magFilter: 9728, minFilter: 9728 }],
    images: [{ uri: 'colormap.png', name: 'colormap' }],
    accessors,
    bufferViews: views,
    buffers: [{ byteLength: length }],
  };
  const bin = Buffer.concat(chunks);
  let json = Buffer.from(JSON.stringify(gltf), 'utf8');
  json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
  const binPadded = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4)]);
  const header = Buffer.alloc(12);
  header.write('glTF', 0, 'ascii');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + json.length + 8 + binPadded.length, 8);
  const chunk = (data, type) => {
    const h = Buffer.alloc(8);
    h.writeUInt32LE(data.length, 0);
    h.write(type, 4, 'ascii');
    return Buffer.concat([h, data]);
  };
  const glb = Buffer.concat([header, chunk(json, 'JSON'), chunk(binPadded, 'BIN\0')]);
  writeFileSync(new URL(`${name}.glb`, out), glb);
  console.log(`${file} -> models/${name}.glb (${glb.length} bytes, ${ROLES.filter((r) => meshes.some((m) => m.primitives.some((p) => p.material === ROLES.indexOf(r)))).join(', ')})`);
}
copyFileSync(join(kit, 'Textures', 'colormap.png'), new URL('colormap.png', out));
console.log('copied Textures/colormap.png -> models/colormap.png');
