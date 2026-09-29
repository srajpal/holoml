// Makes Harbour Loft's files from what download.mjs saved in tools/cache/
// (Poly Haven's CC0 models, textures, and harbour panorama) and from
// layout.mjs (the flat's walls, rooms, and furniture):
//
// - the textures: colour, normal, and roughness pictures, re-encoded for
//   the web, the duvet's cotton recoloured off-white, the bathroom's
//   floor tiles grey, and the parquet made matte;
// - Poly Haven's furniture, copied, its pictures re-encoded (the small
//   pieces' at half size), the lamps without their own glow (the page
//   switches them on), and the shelves made their real size;
// - what Poly Haven does not have, made here from boxes and cylinders:
//   the walls, floor, and ceiling, the old brick wall, the windows, the
//   doors, the switches, the kitchen and its island, the bed, the
//   wardrobe, the bathroom, the rug, the books, a lamp's glow, and the
//   terrace's deck, railings, stair house, and sun loungers;
// - every model as one .glb file in models/, its pictures inside;
// - the sky and the light (light/sky.jpg, light/harbour.hdr), the floor
//   plan (plans/loft.png), the sounds (sounds/door.wav, switch.wav), and
//   models/CREDITS.md;
// - and index.holoml's walls, windows, and furniture, between its two
//   "prepare.mjs" comments.
//
// It uses Electron's picture decoder and encoder, and a hidden window's
// canvas for the plan, so run it with Electron (any recent version) from
// the repository root:
//
//   electron examples/harbour-loft/tools/prepare.mjs
import { app, BrowserWindow, nativeImage } from 'electron';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRICK_WALL, DOORS, FURNITURE, H, LEAF, OUTSIDE, ROOMS, SCREENS, TERRACE, WALLS, wallBoxes } from './layout.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const cache = join(here, 'cache');
const site = join(here, '..');
const MODELS = join(site, 'models');

/** Each model's box in its own space, for the floor plan: its file's name, then { min, max }. */
const BOUNDS = new Map();

// ---- Pictures ------------------------------------------------------------------

/** A picture's pixels: width, height, and 4 bytes a pixel (blue, green, red, alpha). */
function decode(file) {
  const image = nativeImage.createFromPath(file);
  if (image.isEmpty()) throw new Error(`${file}: not a picture Electron can read`);
  const { width, height } = image.getSize();
  return { width, height, data: image.toBitmap() };
}

function encode(picture, quality) {
  return nativeImage.createFromBitmap(picture.data, { width: picture.width, height: picture.height }).toJPEG(quality);
}

/** A JPEG again at web quality, at most `size` pixels wide (normal maps a little higher: their errors show as bumps). */
function reencode(from, quality, size = 1024) {
  let image = nativeImage.createFromPath(from);
  if (image.isEmpty()) throw new Error(`${from}: not a picture Electron can read`);
  const { width, height } = image.getSize();
  if (width > size) image = image.resize({ width: size, height: Math.round((height * size) / width), quality: 'best' });
  return image.toJPEG(quality);
}

/**
 * The textured materials' pictures (JPEG bytes), by name: each model
 * carries the ones it uses inside its .glb file, so a model is one
 * request (a page of 40 models with their pictures beside them took 200).
 */
const PICTURES = new Map();

const luminance = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/** Recolours a picture: each pixel's lightness, within the picture's own range, picks a colour between `dark` and `light` (the weave keeps its pattern). */
function tint(picture, dark, light) {
  const lum = [];
  for (let i = 0; i < picture.data.length; i += 4) lum.push(luminance(picture.data[i + 2], picture.data[i + 1], picture.data[i]));
  const sorted = [...lum].sort((a, b) => a - b);
  const [lo, hi] = [sorted[Math.floor(sorted.length * 0.02)], sorted[Math.floor(sorted.length * 0.98)]];
  const data = Buffer.from(picture.data);
  for (let i = 0; i < data.length; i += 4) {
    const t = Math.min(1, Math.max(0, (lum[i / 4] - lo) / Math.max(1e-6, hi - lo)));
    data[i + 2] = Math.round(dark[0] + (light[0] - dark[0]) * t);
    data[i + 1] = Math.round(dark[1] + (light[1] - dark[1]) * t);
    data[i] = Math.round(dark[2] + (light[2] - dark[2]) * t);
  }
  return { ...picture, data };
}

// ---- Materials -----------------------------------------------------------------------

/**
 * The materials of the models made here: a colour (sRGB), how rough and
 * how metallic, and for the textured ones the pictures' name in
 * PICTURES (made by textures()) and how far one picture reaches (metres).
 */
const PALETTE = {
  Paint: { color: '#eeeae3', rough: 0.92 },
  Ceiling: { color: '#f3f1ed', rough: 0.95 },
  Parquet: { pictures: 'parquet', tile: 3.4 },
  FloorTiles: { pictures: 'floor-tiles', tile: 1.9 },
  WallTiles: { pictures: 'wall-tiles', tile: 1.27 },
  Quartz: { color: '#efece7', rough: 0.22 },
  StoneTiles: { pictures: 'stone-tiles', tile: 1.5, rough: 0.6 },
  Oak: { pictures: 'oak', tile: 1.83 },
  WhiteOak: { pictures: 'white-oak', tile: 0.5 },
  Brick: { pictures: 'brick', tile: 3.0 },
  Wool: { pictures: 'wool', tile: 0.27 },
  Cotton: { pictures: 'cotton', tile: 0.28 },
  Decking: { pictures: 'decking', tile: 1.0 },
  Steel: { color: '#bfc4c9', metal: 0.55, rough: 0.3 },
  BlackSteel: { color: '#1d1f22', metal: 0.6, rough: 0.45 },
  Carcass: { color: '#3b3834', rough: 0.7 },
  Plinth: { color: '#24221f', rough: 0.85 },
  Ceramic: { color: '#f7f6f2', rough: 0.1 },
  Glass: { color: '#dde8ea', opacity: 0.1, rough: 0.03, twoSided: true },
  Frosted: { color: '#f4f6f6', opacity: 0.94, rough: 0.6, glow: '#8d9396', twoSided: true },
  HobGlass: { color: '#0c0d0f', rough: 0.06 },
  Ring: { color: '#3a3d41', rough: 0.35 },
  Mirror: { color: '#eef1f2', metal: 1, rough: 0.04 },
  DoorPaint: { color: '#f2f0eb', rough: 0.5 },
  Sill: { color: '#f4f2ee', rough: 0.6 },
  Lacquer: { color: '#f1efea', rough: 0.3 },
  Sheet: { color: '#f2f0eb', rough: 0.95 },
  Plastic: { color: '#f5f5f2', rough: 0.35 },
  Rocker: { color: '#e6e6e2', rough: 0.3 },
  Glow: { color: '#fff4e2', glow: '#ffe4bd' },
  Render: { color: '#d8d2c8', rough: 0.95 },
  Cushion: { color: '#e9e3d6', rough: 0.95 },
};

/** A colour from "#rrggbb" to glTF's linear red, green, and blue. */
function linear(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
}

function gltfMaterial(name, spec, image) {
  const m = {
    name,
    pbrMetallicRoughness: {
      baseColorFactor: [...linear(spec.color ?? '#ffffff'), spec.opacity ?? 1],
      metallicFactor: spec.metal ?? 0,
      roughnessFactor: spec.rough ?? (spec.pictures ? 1 : 0.8),
    },
  };
  if (spec.pictures) {
    m.pbrMetallicRoughness.baseColorTexture = { index: image(`${spec.pictures}-color`) };
    m.pbrMetallicRoughness.metallicRoughnessTexture = { index: image(`${spec.pictures}-rough`) };
    m.normalTexture = { index: image(`${spec.pictures}-normal`) };
  }
  if ((spec.opacity ?? 1) < 1) m.alphaMode = 'BLEND';
  if (spec.glow) m.emissiveFactor = linear(spec.glow);
  if (spec.twoSided) m.doubleSided = true;
  return m;
}

// ---- Geometry ------------------------------------------------------------------------

const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => {
  const l = len(a);
  return [a[0] / l, a[1] / l, a[2] / l];
};
const tileOf = (material, extra) => (extra?.[material] ?? PALETTE[material])?.tile ?? 1;

/**
 * A flat rectangle: its corner, two edges (its front is where u × v
 * points), and its material. Its pictures are placed by where it is, so
 * rectangles side by side continue the same pattern.
 */
function quad(origin, u, v, material, tile = tileOf(material)) {
  const n = cross(u, v);
  if (len(n) < 1e-9) return [];
  const normal = unit(n);
  const [du, dv] = [unit(u), unit(v)];
  const p = [origin, add3(origin, u), add3(add3(origin, u), v), add3(origin, v)];
  return [
    {
      positions: p.flat(),
      normals: [normal, normal, normal, normal].flat(),
      uvs: p.flatMap((q) => [dot(q, du) / tile, -dot(q, dv) / tile]),
      indices: [0, 1, 2, 0, 2, 3],
      material,
    },
  ];
}

/** A box between two corners, its faces outward; `skip` leaves out faces ("top", "bottom", "left", "right", "front", "back"). */
function box(min, max, material, { skip = [], tile } = {}) {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  const [w, h, d] = [x1 - x0, y1 - y0, z1 - z0];
  const faces = {
    right: [[x1, y0, z1], [0, 0, -d], [0, h, 0]],
    left: [[x0, y0, z0], [0, 0, d], [0, h, 0]],
    top: [[x0, y1, z1], [w, 0, 0], [0, 0, -d]],
    bottom: [[x0, y0, z0], [w, 0, 0], [0, 0, d]],
    front: [[x0, y0, z1], [w, 0, 0], [0, h, 0]],
    back: [[x1, y0, z0], [-w, 0, 0], [0, h, 0]],
  };
  return Object.entries(faces)
    .filter(([k]) => !skip.includes(k))
    .flatMap(([, [o, u, v]]) => quad(o, u, v, material, tile ?? tileOf(material)));
}

/** The inside of a box, open at the top: a sink, a bath, a basin. */
function tub(min, max, material) {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  const [w, h, d] = [x1 - x0, y1 - y0, z1 - z0];
  return [
    ...quad([x0, y0, z1], [w, 0, 0], [0, 0, -d], material),
    ...quad([x0, y0, z1], [0, 0, -d], [0, h, 0], material),
    ...quad([x1, y0, z0], [0, 0, d], [0, h, 0], material),
    ...quad([x1, y0, z1], [-w, 0, 0], [0, h, 0], material),
    ...quad([x0, y0, z0], [w, 0, 0], [0, h, 0], material),
  ];
}

/** An upright cylinder (or an elliptic one, with rx and rz) standing on `base`, with its top and bottom. */
function cylinder(base, radius, height, material, { segments = 24, top = true, bottom = true, rx = radius, rz = radius } = {}) {
  const tile = tileOf(material);
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * 2 * Math.PI;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    const n = unit([c / rx, 0, s / rz]);
    for (const y of [0, height]) {
      positions.push(base[0] + rx * c, base[1] + y, base[2] + rz * s);
      normals.push(...n);
      uvs.push(((i / segments) * 2 * Math.PI * radius) / tile, -(base[1] + y) / tile);
    }
  }
  for (let i = 0; i < segments; i++) {
    const k = i * 2;
    indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
  }
  const parts = [{ positions, normals, uvs, indices, material }];
  const cap = (y, up) => {
    const p = [base[0], base[1] + y, base[2]];
    const n = [0, up ? 1 : -1, 0];
    const cp = [...p];
    const cn = [...n];
    const cu = [p[0] / tile, p[2] / tile];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * 2 * Math.PI;
      const q = [base[0] + rx * Math.cos(a), base[1] + y, base[2] + rz * Math.sin(a)];
      cp.push(...q);
      cn.push(...n);
      cu.push(q[0] / tile, q[2] / tile);
    }
    const ci = [];
    for (let i = 1; i <= segments; i++) ci.push(...(up ? [0, i + 1, i] : [0, i, i + 1]));
    parts.push({ positions: cp, normals: cn, uvs: cu, indices: ci, material });
  };
  if (top) cap(height, true);
  if (bottom) cap(0, false);
  return parts;
}

/** An ellipsoid: a pillow, a bulb's glow. */
function ellipsoid(centre, radii, material, { segments = 24, rings = 12 } = {}) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  for (let j = 0; j <= rings; j++) {
    const phi = (j / rings) * Math.PI;
    for (let i = 0; i <= segments; i++) {
      const th = (i / segments) * 2 * Math.PI;
      const d = [Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)];
      positions.push(centre[0] + radii[0] * d[0], centre[1] + radii[1] * d[1], centre[2] + radii[2] * d[2]);
      normals.push(...unit([d[0] / radii[0], d[1] / radii[1], d[2] / radii[2]]));
      uvs.push(i / segments, j / rings);
    }
  }
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i;
      const b = a + segments + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  return [{ positions, normals, uvs, indices, material }];
}

/** Turning about an axis, in degrees, as three.js turns (x, then y, then z). */
const rotX = (deg) => {
  const [c, s] = [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
  return (p) => [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
};
const rotY = (deg) => {
  const [c, s] = [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
  return (p) => [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
};
const rotZ = (deg) => {
  const [c, s] = [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
  return (p) => [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
};

/** Parts turned (about their own origin) and then moved to `at`. */
function placed(parts, turn, at = [0, 0, 0]) {
  return parts.map((p) => {
    const positions = [];
    const normals = [];
    for (let i = 0; i < p.positions.length; i += 3) {
      positions.push(...add3(turn([p.positions[i], p.positions[i + 1], p.positions[i + 2]]), at));
      normals.push(...turn([p.normals[i], p.normals[i + 1], p.normals[i + 2]]));
    }
    return { ...p, positions, normals };
  });
}

/** Joins the parts of each material into one. */
function merge(parts) {
  const byMaterial = new Map();
  for (const p of parts) byMaterial.set(p.material, [...(byMaterial.get(p.material) ?? []), p]);
  return [...byMaterial.entries()].map(([material, list]) => {
    const positions = list.flatMap((p) => p.positions);
    const indices = [];
    let base = 0;
    for (const p of list) {
      for (const i of p.indices) indices.push(i + base);
      base += p.positions.length / 3;
    }
    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(list.flatMap((p) => p.normals)),
      uvs: new Float32Array(list.flatMap((p) => p.uvs)),
      indices: base > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
      material,
    };
  });
}

/** Writes a model made here as a .glb: one mesh, a primitive for each material (from PALETTE, or `extra`), its pictures inside. */
function writeModel(file, parts, extra = {}) {
  const prims = merge(parts);
  const materials = { ...PALETTE, ...extra };
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
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const boundsOf = (p) => {
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < p.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], p[i + k]);
        hi[k] = Math.max(hi[k], p[i + k]);
      }
    }
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], lo[k]);
      max[k] = Math.max(max[k], hi[k]);
    }
    return { min: lo, max: hi };
  };
  const images = [];
  const image = (uri) => {
    if (!images.includes(uri)) images.push(uri);
    return images.indexOf(uri);
  };
  const names = prims.map((p) => p.material);
  const mats = names.map((n) => {
    if (!materials[n]) throw new Error(`${file}: no material ${n}`);
    return gltfMaterial(n, materials[n], image);
  });
  const primitives = prims.map((p, i) => ({
    attributes: {
      POSITION: add(p.positions, 'VEC3', 34962, boundsOf(p.positions)),
      NORMAL: add(p.normals, 'VEC3', 34962),
      TEXCOORD_0: add(p.uvs, 'VEC2', 34962),
    },
    indices: add(p.indices, 'SCALAR', 34963),
    material: i,
  }));
  const name = file.replace(/\.glb$/, '');
  const gltf = {
    asset: { version: '2.0', generator: 'HoloML examples/harbour-loft/tools/prepare.mjs' },
    scene: 0,
    scenes: [{ name, nodes: [0] }],
    nodes: [{ name, mesh: 0 }],
    meshes: [{ name, primitives }],
    materials: mats,
    ...(images.length
      ? {
          images: images.map((n) => ({ name: n, mimeType: 'image/jpeg' })),
          textures: images.map((_, i) => ({ source: i, sampler: 0 })),
          samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
        }
      : {}),
    buffers: [{ byteLength: length }],
    bufferViews: views,
    accessors,
  };
  writeGlb(
    file,
    gltf,
    [Buffer.concat(chunks)],
    images.map((n) => {
      if (!PICTURES.has(n)) throw new Error(`${file}: no picture ${n}`);
      return PICTURES.get(n);
    }),
  );
  BOUNDS.set(name, { min, max });
}

/**
 * Writes a model as one binary glTF file (.glb): its JSON, then its
 * buffers and its pictures (JPEG bytes, one for each of its images, in
 * order) in the one binary chunk.
 */
function writeGlb(file, g, buffers, pictures) {
  const chunks = [];
  let length = 0;
  const append = (bytes) => {
    const pad = (4 - (length % 4)) % 4;
    if (pad) {
      chunks.push(Buffer.alloc(pad));
      length += pad;
    }
    const at = length;
    chunks.push(bytes);
    length += bytes.length;
    return at;
  };
  const starts = buffers.map((b) => append(b));
  for (const v of g.bufferViews) {
    v.byteOffset = (v.byteOffset ?? 0) + starts[v.buffer];
    v.buffer = 0;
  }
  g.images = (g.images ?? []).map((image, i) => {
    g.bufferViews.push({ buffer: 0, byteOffset: append(pictures[i]), byteLength: pictures[i].length });
    return { ...(image.name ? { name: image.name } : {}), mimeType: 'image/jpeg', bufferView: g.bufferViews.length - 1 };
  });
  if (g.images.length === 0) delete g.images;
  const tail = (4 - (length % 4)) % 4;
  if (tail) chunks.push(Buffer.alloc(tail));
  const bin = Buffer.concat(chunks);
  g.buffers = [{ byteLength: bin.length }];
  const text = Buffer.from(JSON.stringify(g));
  const json = Buffer.concat([text, Buffer.alloc((4 - (text.length % 4)) % 4, 0x20)]);
  const chunk = (type, data) => {
    const head = Buffer.alloc(8);
    head.writeUInt32LE(data.length, 0);
    head.write(type, 4, 'latin1');
    return Buffer.concat([head, data]);
  };
  const header = Buffer.alloc(12);
  header.write('glTF', 0, 'latin1');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
  writeFileSync(join(MODELS, file), Buffer.concat([header, chunk('JSON', json), chunk('BIN\0', bin)]));
}

// ---- Textures ------------------------------------------------------------------------

/** The pictures of each textured material, from Poly Haven's sets. */
const SETS = {
  parquet: 'herringbone_parquet',
  'floor-tiles': 'interior_tiles',
  'wall-tiles': 'long_white_tiles',
  'stone-tiles': 'marble_01',
  oak: 'oak_veneer_01',
  'white-oak': 'white_oak_veneer',
  brick: 'brick_wall_001',
  wool: 'poly_wool_herringbone',
  cotton: 'waffle_pique_cotton',
  decking: 'brown_planks_09',
};

/** Recolourings, the pattern kept: the waffle cotton is yellow, and the duvet off-white; the floor tiles are terracotta, and the bathroom's a soft grey. */
const TINTS = {
  cotton: { dark: [196, 190, 178], light: [247, 244, 237] },
  'floor-tiles': { dark: [112, 110, 106], light: [214, 211, 205] },
};

/** Roughness pictures lifted so their smoothest point is this rough: the parquet is oiled, not lacquered (its own picture glares in the sun). */
const MATTE = { parquet: 0.45 };

/** A roughness picture's values raised: v becomes lo + (1 - lo) v. */
function lift(picture, lo) {
  const data = Buffer.from(picture.data);
  for (let i = 0; i < data.length; i++) if (i % 4 !== 3) data[i] = Math.round(lo * 255 + (1 - lo) * data[i]);
  return { ...picture, data };
}

function textures() {
  for (const [slug, id] of Object.entries(SETS)) {
    const dir = join(cache, 'textures', id);
    const t = TINTS[slug];
    PICTURES.set(`${slug}-color`, t ? encode(tint(decode(join(dir, 'Diffuse.jpg')), t.dark, t.light), 82) : reencode(join(dir, 'Diffuse.jpg'), 82));
    PICTURES.set(`${slug}-normal`, reencode(join(dir, 'nor_gl.jpg'), 90));
    PICTURES.set(`${slug}-rough`, MATTE[slug] ? encode(lift(decode(join(dir, 'Rough.jpg')), MATTE[slug]), 80) : reencode(join(dir, 'Rough.jpg'), 80));
  }
}

// ---- Poly Haven's furniture ------------------------------------------------------------

/**
 * Each piece: its Poly Haven id; `small` pieces get pictures half as
 * wide (512 pixels: they are never seen close enough to tell); `dark`
 * lamps lose their own glow (the page lights them when switched on);
 * `scale` makes a model its real size; `clear` names glass that Poly
 * Haven's 1k files make opaque (it samples the frame's own picture, a
 * JPEG without transparency), made clear again.
 */
const COPIES = {
  sofa: { id: 'sofa_02' },
  'lounge-chair': { id: 'mid_century_lounge_chair' },
  'coffee-table': { id: 'coffee_table_round_01' },
  sideboard: { id: 'modern_wooden_cabinet' },
  shelves: { id: 'steel_frame_shelves_01', scale: 0.1 },
  plant: { id: 'potted_plant_04', small: true },
  pillows: { id: 'throw_pillows_01' },
  picture: { id: 'hanging_picture_frame_02', clear: ['hanging_picture_frame_02_glass'] },
  'tall-table': { id: 'side_table_tall_01', small: true },
  'bedside-table': { id: 'side_table_01', small: true },
  'pipe-lamp': { id: 'industrial_pipe_lamp', small: true, dark: true },
  'dining-table': { id: 'round_wooden_table_01' },
  'dining-chair': { id: 'painted_wooden_chair_01', small: true },
  stool: { id: 'metal_stool_01', small: true },
  pendant: { id: 'modern_ceiling_lamp_01', small: true, dark: true },
  desk: { id: 'metal_office_desk' },
  'desk-chair': { id: 'modern_arm_chair_01' },
  'desk-lamp': { id: 'desk_lamp_arm_01', small: true, dark: true },
  'outdoor-set': { id: 'outdoor_table_chair_set_01' },
  planter: { id: 'planter_box_02', small: true },
};

/** Poly Haven's names for its pictures, and ours. */
const MAPS = { diff: 'color', nor_gl: 'normal', arm: 'arm', rough: 'rough', roughness: 'rough', emission: 'emission' };

/** The textures a material uses. */
const slots = (m) => [m.pbrMetallicRoughness?.baseColorTexture, m.pbrMetallicRoughness?.metallicRoughnessTexture, m.normalTexture, m.occlusionTexture, m.emissiveTexture].filter(Boolean);

/** Leaves out textures and pictures no material uses, and extensions nothing uses. */
function prune(g) {
  const used = [...new Set(g.materials.flatMap((m) => slots(m).map((s) => s.index)))].sort((a, b) => a - b);
  const sources = [...new Set(used.map((t) => g.textures[t].source))].sort((a, b) => a - b);
  const textureAt = new Map(used.map((t, i) => [t, i]));
  const imageAt = new Map(sources.map((s, i) => [s, i]));
  g.textures = used.map((t) => ({ ...g.textures[t], source: imageAt.get(g.textures[t].source) }));
  g.images = sources.map((s) => g.images[s]);
  for (const m of g.materials) for (const s of slots(m)) s.index = textureAt.get(s.index);
  const text = JSON.stringify(g.materials);
  for (const key of ['extensionsUsed', 'extensionsRequired']) {
    if (!g[key]) continue;
    g[key] = g[key].filter((e) => text.includes(e));
    if (g[key].length === 0) delete g[key];
  }
}

/** A model's box in its own space: every vertex, through its nodes' transforms. */
function modelBounds(g, bins) {
  const mul = (a, b) => {
    const o = new Array(16).fill(0);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) o[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k];
    return o;
  };
  const trs = (n) => {
    if (n.matrix) return n.matrix;
    const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1];
    const [sx, sy, sz] = n.scale ?? [1, 1, 1];
    const [tx, ty, tz] = n.translation ?? [0, 0, 0];
    return [
      (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
      2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
      2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
      tx, ty, tz, 1,
    ];
  };
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const visit = (index, parent) => {
    const n = g.nodes[index];
    const m = mul(parent, trs(n));
    if (n.mesh !== undefined) {
      for (const p of g.meshes[n.mesh].primitives) {
        const a = g.accessors[p.attributes.POSITION];
        const v = g.bufferViews[a.bufferView];
        const buf = bins[v.buffer];
        const f = new Float32Array(buf.buffer.slice(buf.byteOffset + (v.byteOffset ?? 0) + (a.byteOffset ?? 0), buf.byteOffset + (v.byteOffset ?? 0) + (a.byteOffset ?? 0) + a.count * 12));
        for (let i = 0; i < a.count; i++) {
          const [x, y, z] = [f[i * 3], f[i * 3 + 1], f[i * 3 + 2]];
          const q = [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
          for (let k = 0; k < 3; k++) {
            min[k] = Math.min(min[k], q[k]);
            max[k] = Math.max(max[k], q[k]);
          }
        }
      }
    }
    for (const c of n.children ?? []) visit(c, m);
  };
  for (const r of g.scenes[g.scene ?? 0].nodes) visit(r, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  return { min, max };
}

/** Poly Haven's models, each as one .glb: its glTF, its buffers, and its pictures, re-encoded and named ours. */
function copies() {
  for (const [slug, { id, small, dark, scale, clear }] of Object.entries(COPIES)) {
    const dir = join(cache, 'models', id);
    const g = JSON.parse(readFileSync(join(dir, `${id}.gltf`), 'utf8'));
    if (dark) {
      for (const m of g.materials) {
        delete m.emissiveTexture;
        delete m.emissiveFactor;
        if (m.extensions) delete m.extensions.KHR_materials_emissive_strength;
        if (m.extensions && Object.keys(m.extensions).length === 0) delete m.extensions;
      }
    }
    for (const m of g.materials.filter((x) => clear?.includes(x.name))) {
      delete m.normalTexture;
      m.pbrMetallicRoughness = { baseColorFactor: [0.95, 0.97, 0.98, 0.08], metallicFactor: 0, roughnessFactor: 0.05 };
      m.alphaMode = 'BLEND';
    }
    prune(g);
    if (scale) {
      g.nodes.push({ name: slug, scale: [scale, scale, scale], children: g.scenes[g.scene ?? 0].nodes });
      g.scenes[g.scene ?? 0].nodes = [g.nodes.length - 1];
    }
    const bins = g.buffers.map((b) => readFileSync(join(dir, b.uri)));
    BOUNDS.set(slug, modelBounds(g, bins));
    const pictures = (g.images ?? []).map((image) => {
      const base = image.uri.split('/').pop().replace(/\.[a-z]+$/i, '');
      const rest = base.startsWith(`${id}_`) ? base.slice(id.length + 1) : base;
      const words = rest.replace(/_\d+k$/, '');
      const map = Object.keys(MAPS).find((k) => words === k || words.endsWith(`_${k}`));
      if (!map) throw new Error(`${id}: a picture we do not know, ${image.uri}`);
      const part = words.slice(0, words.length - map.length).replace(/_$/, '').replace(/_/g, '-');
      image.name = `${slug}${part ? `-${part}` : ''}-${MAPS[map]}`;
      return reencode(join(dir, image.uri), map === 'nor_gl' ? 90 : 82, small ? 512 : 1024);
    });
    g.asset = { ...g.asset, extras: { from: `https://polyhaven.com/a/${id}`, license: 'CC0 1.0' } };
    writeGlb(`${slug}.glb`, g, bins, pictures);
  }
}

// ---- The flat's shell: walls, floor, ceiling, the brick wall, windows ------------------------

/** A wall piece: a box a metre each way, centred; the page places and stretches it (layout.mjs, wallBoxes). */
function wall() {
  writeModel('wall.glb', box([-0.5, -0.5, -0.5], [0.5, 0.5, 0.5], 'Paint'));
}

/** The floor: oak parquet everywhere, and the bathroom's tiles 2 mm above it. */
function floor() {
  const { x0, x1, z0, z1 } = OUTSIDE;
  const bath = ROOMS.find((r) => r.floor === 'tiles');
  writeModel('floor.glb', [
    ...quad([x0, 0, z1], [x1 - x0, 0, 0], [0, 0, z0 - z1], 'Parquet'),
    ...quad([bath.x0, 0.002, bath.z1], [bath.x1 - bath.x0, 0, 0], [0, 0, bath.z0 - bath.z1], 'FloorTiles'),
  ]);
}

/** The ceiling, facing down (it keeps the sun out but for the windows). */
function ceiling() {
  const { x0, x1, z0, z1 } = OUTSIDE;
  writeModel('ceiling.glb', quad([x0, H, z0], [x1 - x0, 0, 0], [0, 0, z1 - z0], 'Ceiling'));
}

/** The old brick wall of the living room, with its door to the stairs up to the roof terrace (the door is the page's link). */
function brickWall() {
  const [a, b] = BRICK_WALL.across;
  const { from, to, door } = BRICK_WALL;
  const face = (z0, z1, y0, y1) => quad([b, y0, z0], [0, 0, z1 - z0], [0, y1 - y0, 0], 'Brick');
  writeModel('brick-wall.glb', [
    // Inside, facing the room: beside the door and above it.
    ...face(from, door.from, 0, H),
    ...face(door.to, to, 0, H),
    ...face(door.from, door.to, door.y1, H),
    // The door's reveals and head, in brick.
    ...quad([a, 0, door.from], [b - a, 0, 0], [0, door.y1, 0], 'Brick'),
    ...quad([b, 0, door.to], [a - b, 0, 0], [0, door.y1, 0], 'Brick'),
    ...quad([a, door.y1, door.to], [b - a, 0, 0], [0, 0, door.from - door.to], 'Brick'),
    // Outside and the ends, painted (never seen).
    ...quad([a, 0, to], [0, 0, from - to], [0, H, 0], 'Paint'),
    ...box([a, 0, from], [b, H, to], 'Paint', { skip: ['left', 'right', 'bottom'] }),
  ]);
}

/**
 * A steel window: its frame and glazing bars, a grid of `cols` by
 * `rows` panes, and a sill board on the room's side (+z). The glass is a
 * model of its own (glass.glb), outside the page's shadows.
 */
function windowFrame(file, w, h, cols, rows) {
  const p = [];
  const [f, bar, fd, bd] = [0.05, 0.022, 0.03, 0.02];
  p.push(...box([-w / 2, 0, -fd], [-w / 2 + f, h, fd], 'BlackSteel'));
  p.push(...box([w / 2 - f, 0, -fd], [w / 2, h, fd], 'BlackSteel'));
  p.push(...box([-w / 2 + f, 0, -fd], [w / 2 - f, f, fd], 'BlackSteel'));
  p.push(...box([-w / 2 + f, h - f, -fd], [w / 2 - f, h, fd], 'BlackSteel'));
  for (let i = 1; i < cols; i++) {
    const x = -w / 2 + f + ((w - 2 * f) * i) / cols;
    p.push(...box([x - bar / 2, f, -bd], [x + bar / 2, h - f, bd], 'BlackSteel'));
  }
  for (let j = 1; j < rows; j++) {
    const y = f + ((h - 2 * f) * j) / rows;
    p.push(...box([-w / 2 + f, y - bar / 2, -bd], [w / 2 - f, y + bar / 2, bd], 'BlackSteel'));
  }
  // The sill board: painted, standing a little proud of the wall.
  p.push(...box([-w / 2 - 0.04, -0.001, fd], [w / 2 + 0.04, 0.025, 0.14], 'Sill'));
  writeModel(file, p);
}

/** Glass: a pane a metre square, centred, seen from both sides; the page stretches it to each window. */
function glass() {
  writeModel('glass.glb', quad([-0.5, -0.5, 0], [1, 0, 0], [0, 1, 0], 'Glass'));
  writeModel('frosted.glb', quad([-0.5, -0.5, 0], [1, 0, 0], [0, 1, 0], 'Frosted'));
}

/** The windows' frames, by the kind of opening (layout.mjs). */
const WINDOWS = {
  'tall-window': { file: 'window-tall.glb', cols: 3, rows: 4 },
  window: { file: 'window.glb', cols: 2, rows: 2 },
  'small-window': { file: 'window-small.glb', cols: 1, rows: 1, frosted: true },
};

/** Every window in the walls: its kind, where its bottom middle is, which way the room is, and its size. */
function windowsInWalls() {
  return WALLS.flatMap((w) =>
    w.openings
      .filter((o) => WINDOWS[o.kind])
      .map((o) => {
        const [mid, across] = [(o.from + o.to) / 2, (w.across[0] + w.across[1]) / 2];
        const turn = w.along === 'x' ? (across > 0 ? 180 : 0) : across > 0 ? -90 : 90;
        return { ...WINDOWS[o.kind], kind: o.kind, at: w.along === 'x' ? [mid, o.y0, across] : [across, o.y0, mid], turn, width: o.to - o.from, height: o.y1 - o.y0 };
      }),
  );
}

function windows() {
  for (const { file, cols, rows } of Object.values(WINDOWS)) {
    const o = WALLS.flatMap((w) => w.openings).find((x) => WINDOWS[x.kind]?.file === file);
    windowFrame(file, o.to - o.from, o.y1 - o.y0, cols, rows);
  }
}

// ---- Doors, switches, and a lamp's glow ---------------------------------------------------

/** A door: a painted leaf, its hinge edge at x = 0 and its width along +x, with a lever handle on each side. */
function door() {
  const { width: w, height: h, depth: d } = LEAF;
  const p = [...box([0.004, 0.008, -d / 2], [w, h, d / 2], 'DoorPaint')];
  for (const side of [1, -1]) {
    const z = (side * d) / 2;
    // The rose, the neck, and the lever, pointing back toward the hinge.
    p.push(...placed(cylinder([0, 0, 0], 0.026, 0.008, 'Steel'), rotX(side * 90), [w - 0.08, 1.0, z]));
    p.push(...placed(cylinder([0, 0, 0], 0.009, 0.05, 'Steel'), rotX(side * 90), [w - 0.08, 1.0, z]));
    const zz = z + side * 0.05;
    p.push(...box([w - 0.22, 0.99, Math.min(zz, zz + side * 0.016)], [w - 0.07, 1.01, Math.max(zz, zz + side * 0.016)], 'Steel'));
  }
  writeModel('door.glb', p);
}

/** A light switch: a white plate with a rocker, its back on the wall at z = 0, facing +z. */
function lightSwitch() {
  writeModel('switch.glb', [...box([-0.043, -0.043, 0], [0.043, 0.043, 0.01], 'Plastic'), ...box([-0.015, -0.026, 0.01], [0.015, 0.026, 0.017], 'Rocker')]);
}

/** A bulb's glow: a small bright sphere, 4 cm across its radius; the page grows it from nothing when a lamp is switched on. */
function glow() {
  writeModel('glow.glb', ellipsoid([0, 0, 0], [0.04, 0.04, 0.04], 'Glow', { segments: 16, rings: 8 }));
}

// ---- The kitchen ---------------------------------------------------------------------

/**
 * The kitchen run: 3.7 m along the wall (x from 0), 0.62 deep (z from the
 * wall at 0): a tall fridge, five base cupboards with oak fronts and a
 * white stone top, a steel sink, a black glass hob under a steel hood, and
 * cupboards above.
 */
function kitchen() {
  const p = [];
  const [L, D, TOP] = [3.7, 0.62, 0.88];
  const handle = (x0, x1, y) => box([x0, y - 0.006, 0.58], [x1, y + 0.006, 0.6], 'Steel');
  // The fridge and freezer, in a tall cupboard.
  p.push(...box([0.02, 0, 0], [0.68, 0.1, 0.5], 'Plinth'));
  p.push(...box([0, 0.1, 0], [0.7, 2.25, 0.58], 'Carcass'));
  p.push(...box([0.004, 0.104, 0.58], [0.696, 0.84, 0.6], 'Oak'));
  p.push(...box([0.004, 0.848, 0.58], [0.696, 2.246, 0.6], 'Oak'));
  p.push(...box([0.628, 0.45, 0.6], [0.64, 0.8, 0.622], 'Steel'));
  p.push(...box([0.628, 0.9, 0.6], [0.64, 1.45, 0.622], 'Steel'));
  // Five base cupboards of 0.6 m.
  p.push(...box([0.7, 0, 0], [L, 0.1, 0.5], 'Plinth'));
  // (Its top is under the worktop, and would hide the sink.)
  p.push(...box([0.7, 0.1, 0], [L, TOP, 0.56], 'Carcass', { skip: ['top'] }));
  for (let i = 0; i < 5; i++) {
    const [x0, x1] = [0.702 + i * 0.6, 0.698 + (i + 1) * 0.6];
    const front = (y0, y1) => box([x0, y0, 0.56], [x1, y1, 0.58], 'Oak');
    if (i === 3) {
      // Under the hob: two deep drawers.
      p.push(...front(0.104, 0.488), ...front(0.492, TOP - 0.004), ...handle(x0 + 0.17, x1 - 0.17, 0.45), ...handle(x0 + 0.17, x1 - 0.17, 0.84));
    } else {
      p.push(...front(0.104, 0.71), ...front(0.714, TOP - 0.004), ...handle(x0 + 0.17, x1 - 0.17, 0.67), ...handle(x0 + 0.17, x1 - 0.17, 0.84));
    }
  }
  // The white stone worktop, with the sink cut out of it in the second cupboard.
  const s = { x0: 1.36, x1: 1.84, z0: 0.08, z1: 0.5 };
  p.push(...box([0.7, TOP, 0], [s.x0, 0.92, D], 'Quartz'));
  p.push(...box([s.x1, TOP, 0], [L, 0.92, D], 'Quartz'));
  p.push(...box([s.x0, TOP, 0], [s.x1, 0.92, s.z0], 'Quartz', { skip: ['left', 'right'] }));
  p.push(...box([s.x0, TOP, s.z1], [s.x1, 0.92, D], 'Quartz', { skip: ['left', 'right'] }));
  p.push(...tub([s.x0, 0.72, s.z0], [s.x1, 0.92, s.z1], 'Steel'));
  // The tap: a pillar, a spout reaching over the sink, and its end.
  p.push(...cylinder([1.6, 0.92, 0.04], 0.018, 0.3, 'Steel'));
  p.push(...placed(cylinder([0, 0, 0], 0.012, 0.19, 'Steel'), rotX(90), [1.6, 1.2, 0.04]));
  p.push(...cylinder([1.6, 1.13, 0.225], 0.012, 0.08, 'Steel'));
  // The splashback: stone tiles, up to the cupboards.
  p.push(...box([0.7, 0.92, 0], [L, 1.55, 0.015], 'StoneTiles', { skip: ['back'] }));
  // The hob in the fourth cupboard, and its four rings.
  const [h0, h1] = [2.52, 3.08];
  p.push(...box([h0, 0.92, 0.07], [h1, 0.926, 0.57], 'HobGlass'));
  for (const [x, z, r] of [[2.66, 0.2, 0.075], [2.94, 0.2, 0.065], [2.66, 0.44, 0.065], [2.94, 0.44, 0.09]]) {
    p.push(...cylinder([x, 0.926, z], r, 0.0008, 'Ring', { bottom: false }));
  }
  // The hood, and its chimney to the ceiling.
  p.push(...box([h0 - 0.01, 1.58, 0.015], [h1 + 0.01, 1.66, 0.5], 'Steel'));
  p.push(...box([2.66, 1.66, 0.015], [2.94, H, 0.27], 'Steel'));
  // The cupboards above, either side of the hood.
  for (const [x0, x1] of [[0.7, 2.5], [3.1, L]]) {
    p.push(...box([x0, 1.55, 0.015], [x1, 2.25, 0.33], 'Carcass'));
    const n = Math.round((x1 - x0) / 0.6);
    for (let i = 0; i < n; i++) {
      const [a, b] = [x0 + (i * (x1 - x0)) / n + 0.002, x0 + ((i + 1) * (x1 - x0)) / n - 0.002];
      p.push(...box([a, 1.552, 0.33], [b, 2.248, 0.35], 'Oak'));
      p.push(...box([a + 0.17, 1.6, 0.35], [b - 0.17, 1.612, 0.37], 'Steel'));
    }
  }
  writeModel('kitchen.glb', p);
}

/** The island: 2 by 0.9 m, drawers on the kitchen's side (-z), a white stone top that overhangs 0.28 m for three stools (+z), and stone ends to the floor. */
function island() {
  const p = [];
  p.push(...box([-0.94, 0, -0.4], [0.94, 0.1, 0.14], 'Plinth'));
  p.push(...box([-0.97, 0.1, -0.43], [0.97, 0.88, 0.17], 'Carcass'));
  for (let i = 0; i < 3; i++) {
    const [x0, x1] = [-0.97 + (i * 1.94) / 3 + 0.002, -0.97 + ((i + 1) * 1.94) / 3 - 0.002];
    p.push(...box([x0, 0.104, -0.45], [x1, 0.488, -0.43], 'Oak'), ...box([x0, 0.492, -0.45], [x1, 0.876, -0.43], 'Oak'));
    for (const y of [0.45, 0.84]) p.push(...box([x0 + 0.18, y - 0.006, -0.47], [x1 - 0.18, y + 0.006, -0.45], 'Steel'));
  }
  p.push(...box([-0.97, 0.1, 0.17], [0.97, 0.88, 0.185], 'Oak'));
  p.push(...box([-1.0, 0.88, -0.45], [1.0, 0.92, 0.45], 'Quartz'));
  p.push(...box([-1.0, 0, -0.45], [-0.97, 0.88, 0.45], 'Quartz', { skip: ['top'] }));
  p.push(...box([0.97, 0, -0.45], [1.0, 0.88, 0.45], 'Quartz', { skip: ['top'] }));
  writeModel('island.glb', p);
}

// ---- The bedroom ------------------------------------------------------------------------

/** A king-size bed: a white oak platform, a grey wool headboard (its back at z = 0), a mattress, an off-white duvet, pillows, and a wool throw. */
function bed() {
  const p = [];
  p.push(...box([-0.8, 0, 0.25], [0.8, 0.1, 1.9], 'Plinth'));
  p.push(...box([-0.95, 0.1, 0.07], [0.95, 0.3, 2.1], 'WhiteOak'));
  p.push(...box([-0.95, 0.1, 0], [0.95, 1.15, 0.07], 'Wool'));
  p.push(...box([-0.9, 0.3, 0.1], [0.9, 0.52, 2.07], 'Sheet'));
  // The duvet over the lower two thirds, over the sides and the foot, and turned down at the top.
  p.push(...box([-0.93, 0.52, 0.74], [0.93, 0.575, 2.09], 'Cotton', { skip: ['bottom'] }));
  p.push(...box([-0.95, 0.33, 0.74], [-0.93, 0.575, 2.11], 'Cotton', { skip: ['right'] }));
  p.push(...box([0.93, 0.33, 0.74], [0.95, 0.575, 2.11], 'Cotton', { skip: ['left'] }));
  p.push(...box([-0.93, 0.33, 2.09], [0.93, 0.575, 2.11], 'Cotton', { skip: ['back'] }));
  p.push(...box([-0.93, 0.575, 0.74], [0.93, 0.6, 0.92], 'Cotton'));
  // The throw across the foot.
  p.push(...box([-0.955, 0.575, 1.55], [0.955, 0.59, 1.9], 'Wool'));
  p.push(...box([-0.965, 0.42, 1.55], [-0.955, 0.59, 1.9], 'Wool'), ...box([0.955, 0.42, 1.55], [0.965, 0.59, 1.9], 'Wool'));
  // Pillows.
  for (const x of [-0.44, 0.44]) p.push(...ellipsoid([x, 0.6, 0.34], [0.36, 0.085, 0.2], 'Sheet'));
  writeModel('bed.glb', p);
}

/** A wardrobe: 1.7 m wide, 2.4 tall, 0.6 deep (its back at z = 0), three white doors with steel bar handles. */
function wardrobe() {
  const p = [...box([-0.84, 0, 0.04], [0.84, 0.08, 0.54], 'Plinth'), ...box([-0.85, 0.08, 0], [0.85, 2.4, 0.58], 'DoorPaint')];
  const w = 1.7 / 3;
  for (let i = 0; i < 3; i++) {
    const [x0, x1] = [-0.85 + i * w + 0.002, -0.85 + (i + 1) * w - 0.002];
    p.push(...box([x0, 0.084, 0.58], [x1, 2.396, 0.6], 'DoorPaint'));
    const x = i === 0 ? x1 - 0.05 : x0 + 0.05;
    p.push(...box([x - 0.006, 0.8, 0.6], [x + 0.006, 1.4, 0.625], 'Steel'));
  }
  writeModel('wardrobe.glb', p);
}

// ---- The bathroom ------------------------------------------------------------------------

/** A bath: 0.8 by 1.7 m (x and z, centred), 0.55 high, white, with a spout at its -z end. */
function bath() {
  const [x, z, h, rim] = [0.4, 0.85, 0.55, 0.07];
  const p = [...box([-x, 0, -z], [x, h, z], 'Ceramic', { skip: ['top'] })];
  p.push(...quad([-x, h, -z + rim], [2 * x, 0, 0], [0, 0, -rim], 'Ceramic'));
  p.push(...quad([-x, h, z], [2 * x, 0, 0], [0, 0, -rim], 'Ceramic'));
  p.push(...quad([-x, h, z - rim], [rim, 0, 0], [0, 0, -2 * (z - rim)], 'Ceramic'));
  p.push(...quad([x - rim, h, z - rim], [rim, 0, 0], [0, 0, -2 * (z - rim)], 'Ceramic'));
  p.push(...tub([-x + rim, 0.12, -z + rim], [x - rim, h, z - rim], 'Ceramic'));
  p.push(...cylinder([0, h, -z + 0.035], 0.016, 0.16, 'Steel'));
  p.push(...placed(cylinder([0, 0, 0], 0.011, 0.14, 'Steel'), rotX(90), [0, h + 0.15, -z + 0.035]));
  writeModel('bath.glb', p);
}

/** A walk-in shower: a white tray 1 m square (centred), its drain, and a rain head on a pipe from the outer wall (+x). */
function shower() {
  const p = [...box([-0.5, 0, -0.5], [0.5, 0.04, 0.5], 'Ceramic'), ...box([0.25, 0.04, -0.05], [0.35, 0.042, 0.05], 'Steel')];
  p.push(...cylinder([0.465, 0.95, 0.15], 0.012, 1.17, 'Steel'));
  p.push(...placed(cylinder([0, 0, 0], 0.035, 0.05, 'Steel'), rotZ(-90), [0.45, 1.05, 0.15]));
  p.push(...placed(cylinder([0, 0, 0], 0.01, 0.28, 'Steel'), rotZ(90), [0.465, 2.1, 0.15]));
  p.push(...cylinder([0.2, 2.06, 0.15], 0.11, 0.014, 'Steel'));
  writeModel('shower.glb', p);
}

/** A basin on a wall-hung white drawer with a stone top (its back at z = 0), a tap from the wall, and a mirror above. */
function vanity() {
  const p = [...box([-0.5, 0.4, 0], [0.5, 0.82, 0.45], 'Lacquer'), ...box([-0.2, 0.754, 0.45], [0.2, 0.766, 0.47], 'Steel')];
  p.push(...box([-0.5, 0.82, 0], [0.5, 0.85, 0.47], 'Quartz'));
  // The basin: a white bowl standing on the top.
  const [bx, b0, b1, bh, rim] = [0.26, 0.1, 0.43, 0.98, 0.015];
  p.push(...box([-bx, 0.85, b0], [bx, bh, b1], 'Ceramic', { skip: ['top', 'bottom'] }));
  p.push(...quad([-bx, bh, b0 + rim], [2 * bx, 0, 0], [0, 0, -rim], 'Ceramic'));
  p.push(...quad([-bx, bh, b1], [2 * bx, 0, 0], [0, 0, -rim], 'Ceramic'));
  p.push(...quad([-bx, bh, b1 - rim], [rim, 0, 0], [0, 0, b0 + rim - (b1 - rim)], 'Ceramic'));
  p.push(...quad([bx - rim, bh, b1 - rim], [rim, 0, 0], [0, 0, b0 + rim - (b1 - rim)], 'Ceramic'));
  p.push(...tub([-bx + rim, 0.87, b0 + rim], [bx - rim, bh, b1 - rim], 'Ceramic'));
  // The tap from the wall, and its handle.
  p.push(...placed(cylinder([0, 0, 0], 0.011, 0.17, 'Steel'), rotX(90), [0, 1.08, 0]));
  p.push(...placed(cylinder([0, 0, 0], 0.02, 0.05, 'Steel'), rotX(90), [0.13, 1.08, 0]));
  p.push(...box([-0.45, 1.13, 0.004], [0.45, 1.88, 0.012], 'Mirror'));
  writeModel('vanity.glb', p);
}

/** A wall-hung toilet (its back at z = 0) and the flush plate above it. */
function toilet() {
  const p = [...box([-0.1, 0.95, 0], [0.1, 1.1, 0.008], 'Plastic')];
  p.push(...box([-0.092, 0.958, 0.008], [-0.004, 1.092, 0.012], 'Rocker'), ...box([0.004, 0.958, 0.008], [0.092, 1.092, 0.012], 'Rocker'));
  p.push(...box([-0.17, 0.22, 0], [0.17, 0.4, 0.22], 'Ceramic'));
  p.push(...cylinder([0, 0.22, 0.29], 0.18, 0.18, 'Ceramic', { rx: 0.18, rz: 0.26 }));
  p.push(...cylinder([0, 0.4, 0.29], 0.185, 0.03, 'Plastic', { rx: 0.185, rz: 0.265, bottom: false }));
  writeModel('toilet.glb', p);
}

/** White tiles on the bathroom's walls, 2 mm off them: to 1.2 m, and to 2.3 m in the shower. */
function bathTiles() {
  const r = ROOMS.find((x) => x.floor === 'tiles');
  const [e, low, high, sx, sz] = [0.002, 1.2, 2.3, 5.0, -1.81];
  const doorway = WALLS.find((w) => w.name === 'middle').openings.find((o) => o.from < r.z1 && o.to > r.z0);
  const p = [];
  // Against the middle wall (facing +x), either side of the door.
  const west = (a, b) => quad([r.x0 + e, 0, b], [0, 0, a - b], [0, low, 0], 'WallTiles');
  p.push(...west(r.z0, doorway.from), ...west(doorway.to, r.z1));
  // The entrance wall (facing +z).
  p.push(...quad([r.x0, 0, r.z0 + e], [r.x1 - r.x0, 0, 0], [0, low, 0], 'WallTiles'));
  // The outer wall (facing -x): the bath, then the shower.
  p.push(...quad([r.x1 - e, 0, r.z0], [0, 0, sz - r.z0], [0, low, 0], 'WallTiles'));
  p.push(...quad([r.x1 - e, 0, sz], [0, 0, r.z1 - sz], [0, high, 0], 'WallTiles'));
  // The bedroom's wall (facing -z): the basin, then the shower.
  p.push(...quad([sx, 0, r.z1 - e], [r.x0 - sx, 0, 0], [0, low, 0], 'WallTiles'));
  p.push(...quad([r.x1, 0, r.z1 - e], [sx - r.x1, 0, 0], [0, high, 0], 'WallTiles'));
  writeModel('bath-tiles.glb', p);
}

// ---- Smaller things -----------------------------------------------------------------------

/** The living room's rug: 2.4 by 1.7 m, 12 mm thick, grey wool. */
function rug() {
  writeModel('rug.glb', box([-1.2, 0, -0.85], [1.2, 0.012, 0.85], 'Wool', { skip: ['bottom'] }));
}

/** A seeded random number generator, so the books come out the same every time. */
function random(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cloth bindings in quiet colours. */
const BINDINGS = {
  Navy: { color: '#27344a', rough: 0.8 },
  Rust: { color: '#8a4b33', rough: 0.8 },
  Sage: { color: '#7d8a70', rough: 0.8 },
  Cream: { color: '#e4dccb', rough: 0.85 },
  Charcoal: { color: '#34363a', rough: 0.8 },
  Ochre: { color: '#b58a3c', rough: 0.8 },
};

/** A row of books standing on a shelf, spines to +z, about a metre long; a few lie flat in a pile. */
function books(file, seed) {
  const rand = random(seed);
  const colours = Object.keys(BINDINGS);
  const p = [];
  let x = -0.5;
  while (x < 0.45) {
    const colour = colours[Math.floor(rand() * colours.length)];
    if (rand() < 0.08 && x < 0.2) {
      // A pile lying flat.
      let y = 0;
      for (let k = 0; k < 3 + Math.floor(rand() * 3); k++) {
        const [w, t] = [0.2 + rand() * 0.06, 0.025 + rand() * 0.02];
        p.push(...box([x, y, -0.12], [x + w, y + t, -0.12 + 0.15 + rand() * 0.05], colours[Math.floor(rand() * colours.length)]));
        y += t;
      }
      x += 0.3;
      continue;
    }
    const [t, h, d] = [0.018 + rand() * 0.035, 0.2 + rand() * 0.11, 0.15 + rand() * 0.08];
    p.push(...box([x, 0, -0.12], [x + t, h, -0.12 + d], colour));
    x += t + 0.002;
    if (rand() < 0.06) x += 0.06;
  }
  writeModel(file, p, BINDINGS);
}

// ---- The roof terrace ---------------------------------------------------------------------

/** The terrace's deck of weathered planks, and its edge. */
function deck() {
  const { x0, x1, z0, z1 } = TERRACE.deck;
  writeModel('deck.glb', box([x0, -0.3, z0], [x1, 0, z1], 'Decking', { skip: ['bottom'] }));
}

/** A glass railing a metre long (along +x from 0), a metre high, with a steel top rail and a black shoe; the page stretches it to each side of the deck. */
function railing() {
  writeModel('railing.glb', [
    ...box([0, 0.07, -0.006], [1, 1.0, 0.006], 'Glass', { skip: ['left', 'right', 'top', 'bottom'] }),
    ...box([0, 1.0, -0.022], [1, 1.04, 0.022], 'Steel'),
    ...box([0, 0, -0.03], [1, 0.08, 0.03], 'BlackSteel'),
  ]);
}

/** The stair house: a small rendered block over the stairs, a roof that overhangs, and a step at its door (the page puts the door on its +z side). */
function stairHouse() {
  const { x0, x1, z0, z1, height } = TERRACE.house;
  writeModel('stair-house.glb', [
    ...box([x0, 0, z0], [x1, height, z1], 'Render', { skip: ['bottom'] }),
    ...box([x0 - 0.12, height, z0 - 0.12], [x1 + 0.12, height + 0.12, z1 + 0.12], 'BlackSteel'),
  ]);
}

/** A sun lounger: a frame of planks, a flat part and a back that leans up (its foot at +z), with a cushion. */
function lounger() {
  const p = [];
  for (const x of [-0.3, 0.26]) for (const z of [0.1, 1.85]) p.push(...box([x, 0, z], [x + 0.04, 0.26, z + 0.05], 'Decking'));
  p.push(...box([-0.32, 0.26, 0.05], [0.32, 0.32, 1.95], 'Decking'));
  p.push(...box([-0.3, 0.32, 0.6], [0.3, 0.38, 1.93], 'Cushion'));
  // The back, leaning up from z = 0.6 toward -z.
  const back = [...box([-0.32, 0, -0.7], [0.32, 0.05, 0], 'Decking'), ...box([-0.3, 0.05, -0.68], [0.3, 0.11, 0], 'Cushion')];
  p.push(...placed(back, rotX(38), [0, 0.3, 0.62]));
  writeModel('lounger.glb', p);
}

// ---- The page's walls, windows, and furniture ----------------------------------------------

const num = (v) => String(Math.round(v * 1000) / 1000);
const vec = (a) => a.map(num).join(' ');

/** The markup prepare.mjs writes into index.holoml: the walls, the windows, and the furniture that stays put. */
function markup() {
  const lines = [];
  lines.push('<!-- The walls: a box of paint stretched to each piece, every one solid. -->');
  lines.push('<group solid shadows>');
  for (const w of WALLS) {
    for (const b of wallBoxes(w)) {
      const centre = [0, 1, 2].map((k) => (b.min[k] + b.max[k]) / 2);
      const size = [0, 1, 2].map((k) => b.max[k] - b.min[k]);
      lines.push(`  <model src="models/wall.glb" position="${vec(centre)}" scale="${vec(size)}" />`);
    }
  }
  lines.push('  <model src="models/brick-wall.glb" />');
  lines.push('</group>');
  lines.push('<!-- The floor, the ceiling, the windows, and the furniture. -->');
  lines.push('<group shadows>');
  lines.push('  <model src="models/floor.glb" />');
  lines.push('  <model id="ceiling" src="models/ceiling.glb" />');
  const wins = windowsInWalls();
  for (const w of wins) lines.push(`  <model src="models/${w.file}" position="${vec(w.at)}" rotation="0 ${num(w.turn)} 0" />`);
  for (const f of FURNITURE) {
    const turn = f.turn ? ` rotation="0 ${num(f.turn)} 0"` : '';
    const scale = f.scale === undefined ? '' : ` scale="${Array.isArray(f.scale) ? vec(f.scale) : num(f.scale)}"`;
    lines.push(`  <model src="models/${f.src}.glb" position="${vec(f.at)}"${turn}${scale}${f.solid ? ' solid' : ''} />`);
  }
  lines.push('</group>');
  lines.push("<!-- The glass: outside the shadows, so the sun comes through. -->");
  for (const w of wins) {
    const centre = [w.at[0], w.at[1] + w.height / 2, w.at[2]];
    lines.push(`<model src="models/${w.frosted ? 'frosted' : 'glass'}.glb" position="${vec(centre)}" rotation="0 ${num(w.turn)} 0" scale="${vec([w.width, w.height, 1])}" />`);
  }
  for (const s of SCREENS) lines.push(`<model src="models/glass.glb" position="${vec(s.at)}" rotation="0 ${num(s.turn)} 0" scale="${vec([s.width, s.height, 1])}" solid />`);
  return lines;
}

const FROM = '<!-- prepare.mjs: from here';
const TO = '<!-- prepare.mjs: to here';

/** Writes the markup into index.holoml, between its two prepare.mjs comments, at their indent. */
function page() {
  const file = join(site, 'index.holoml');
  const text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const from = lines.findIndex((l) => l.trim().startsWith(FROM));
  const to = lines.findIndex((l) => l.trim().startsWith(TO));
  if (from < 0 || to < from) throw new Error(`index.holoml needs the comments "${FROM} ... -->" and "${TO} -->"`);
  const indent = lines[from].match(/^\s*/)[0];
  const made = markup().map((l) => indent + l);
  writeFileSync(file, [...lines.slice(0, from + 1), ...made, ...lines.slice(to)].join('\n'));
  console.log(`index.holoml: ${made.length} lines of walls, windows, and furniture`);
}

// ---- The floor plan ------------------------------------------------------------------------

/** 100 pixels a metre, over OUTSIDE: the plan's `area`. */
const PX = 100;

/** Each piece of furniture on the plan: a turned box, or a circle, from its model's box. */
function footprints() {
  return FURNITURE.filter((f) => f.plan !== false).map((f) => {
    const b = BOUNDS.get(f.src);
    if (!b) throw new Error(`no box for ${f.src}`);
    const s = f.scale === undefined ? [1, 1, 1] : Array.isArray(f.scale) ? f.scale : [f.scale, f.scale, f.scale];
    const turn = rotY(f.turn ?? 0);
    const corners = [
      [b.min[0], b.min[2]],
      [b.max[0], b.min[2]],
      [b.max[0], b.max[2]],
      [b.min[0], b.max[2]],
    ].map(([x, z]) => {
      const q = turn([x * s[0], 0, z * s[2]]);
      return [f.at[0] + q[0], f.at[2] + q[2]];
    });
    if (f.plan === 'round') {
      const cx = corners.reduce((n, c) => n + c[0], 0) / 4;
      const cz = corners.reduce((n, c) => n + c[1], 0) / 4;
      const r = (Math.max((b.max[0] - b.min[0]) * s[0], (b.max[2] - b.min[2]) * s[2])) / 2;
      return { circle: [cx, cz, r] };
    }
    return { polygon: corners };
  });
}

/** What the plan shows, in metres: rooms, walls, windows, doors, and furniture (drawn by drawPlan in a canvas). */
function planData() {
  const solid = WALLS.flatMap((w) => wallBoxes(w).filter((b) => b.min[1] === 0 && b.max[1] === H)).map((b) => [b.min[0], b.min[2], b.max[0], b.max[2]]);
  const [a, b] = BRICK_WALL.across;
  const brick = [
    [a, BRICK_WALL.from, b, BRICK_WALL.door.from],
    [a, BRICK_WALL.door.to, b, BRICK_WALL.to],
  ];
  const windows = windowsInWalls().map((w) => {
    const along = w.turn === 0 || w.turn === 180;
    return along ? [w.at[0] - w.width / 2, w.at[2] - 0.1, w.at[0] + w.width / 2, w.at[2] + 0.1] : [w.at[0] - 0.1, w.at[2] - w.width / 2, w.at[0] + 0.1, w.at[2] + w.width / 2];
  });
  const doors = DOORS.map((d) => ({ hinge: d.hinge, shut: d.shut, open: d.open, width: LEAF.width }));
  // The doors that stay shut: the front door, and the door up to the terrace.
  const entrance = WALLS.find((w) => w.name === 'entrance').openings[0];
  const shut = [
    [[entrance.from, -3.85], [entrance.to, -3.85]],
    [[-6.1, BRICK_WALL.door.from], [-6.1, BRICK_WALL.door.to]],
  ];
  return { area: OUTSIDE, px: PX, rooms: ROOMS, solid, brick, windows, doors, shut, furniture: footprints() };
}

/** Draws the plan in a canvas (runs in a hidden window) and returns it as a PNG data address. */
function drawPlan(d) {
  const { area, px } = d;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round((area.x1 - area.x0) * px);
  canvas.height = Math.round((area.z1 - area.z0) * px);
  const c = canvas.getContext('2d');
  const X = (x) => (x - area.x0) * px;
  const Y = (z) => (z - area.z0) * px;
  const rect = (r) => [X(r[0]), Y(r[1]), X(r[2]) - X(r[0]), Y(r[3]) - Y(r[1])];
  c.fillStyle = '#f7f4ee';
  c.fillRect(0, 0, canvas.width, canvas.height);
  // Floors: oak, and the bathroom's tiles.
  for (const r of d.rooms) {
    c.fillStyle = r.floor === 'tiles' ? '#e3e9eb' : '#efe6d8';
    c.fillRect(X(r.x0), Y(r.z0), X(r.x1) - X(r.x0), Y(r.z1) - Y(r.z0));
  }
  // Furniture: quiet outlines.
  c.lineWidth = 3;
  for (const f of d.furniture) {
    c.fillStyle = '#e2d7c5';
    c.strokeStyle = '#a99b86';
    c.beginPath();
    if (f.circle) c.arc(X(f.circle[0]), Y(f.circle[1]), f.circle[2] * px, 0, 2 * Math.PI);
    else f.polygon.forEach(([x, z], i) => (i ? c.lineTo(X(x), Y(z)) : c.moveTo(X(x), Y(z))));
    c.closePath();
    c.fill();
    c.stroke();
  }
  // Door swings: the open leaf, and the arc it sweeps.
  c.strokeStyle = '#8b939c';
  c.lineWidth = 3;
  for (const door of d.doors) {
    const [hx, hz] = door.hinge;
    const a = (deg) => (-deg * Math.PI) / 180;
    const r = door.width * px;
    c.beginPath();
    c.moveTo(X(hx), Y(hz));
    c.lineTo(X(hx) + r * Math.cos(a(door.open)), Y(hz) + r * Math.sin(a(door.open)));
    c.stroke();
    c.setLineDash([10, 8]);
    c.beginPath();
    const [s, e] = [a(door.shut), a(door.open)];
    const ccw = ((e - s + 3 * Math.PI) % (2 * Math.PI)) - Math.PI < 0;
    c.arc(X(hx), Y(hz), r, s, e, ccw);
    c.stroke();
    c.setLineDash([]);
  }
  // Walls, the old brick wall, and the windows in them.
  c.fillStyle = '#2d3239';
  for (const w of d.solid) c.fillRect(...rect(w));
  c.fillStyle = '#6e3d2e';
  for (const w of d.brick) c.fillRect(...rect(w));
  for (const w of d.windows) {
    c.fillStyle = '#f7f4ee';
    c.fillRect(...rect(w));
    c.strokeStyle = '#2d3239';
    c.lineWidth = 3;
    c.strokeRect(...rect(w));
    c.strokeStyle = '#5fa3c7';
    c.lineWidth = 4;
    c.beginPath();
    const [x0, y0, ww, hh] = rect(w);
    if (ww > hh) {
      c.moveTo(x0, y0 + hh / 2);
      c.lineTo(x0 + ww, y0 + hh / 2);
    } else {
      c.moveTo(x0 + ww / 2, y0);
      c.lineTo(x0 + ww / 2, y0 + hh);
    }
    c.stroke();
  }
  c.strokeStyle = '#2d3239';
  c.lineWidth = 6;
  for (const [[x0, z0], [x1, z1]] of d.shut) {
    c.beginPath();
    c.moveTo(X(x0), Y(z0));
    c.lineTo(X(x1), Y(z1));
    c.stroke();
  }
  // The rooms' names and sizes, over everything, with a halo.
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  const say = (text, x, y, font, colour) => {
    c.font = font;
    c.strokeStyle = 'rgba(247,244,238,0.92)';
    c.lineWidth = 12;
    c.strokeText(text, x, y);
    c.fillStyle = colour;
    c.fillText(text, x, y);
  };
  for (const r of d.rooms) {
    const [x, y] = [X(r.label?.[0] ?? (r.x0 + r.x1) / 2), Y(r.label?.[1] ?? (r.z0 + r.z1) / 2)];
    say(r.name, x, y - 26, '700 54px "Segoe UI", system-ui, sans-serif', '#262b31');
    say(`${r.area} m²`, x, y + 32, '500 40px "Segoe UI", system-ui, sans-serif', '#5b6470');
  }
  return canvas.toDataURL('image/png');
}

async function plan() {
  const win = new BrowserWindow({ show: false, width: 400, height: 300 });
  try {
    await win.loadURL('data:text/html;charset=utf-8,<!doctype html><title>plan</title>');
    const url = await win.webContents.executeJavaScript(`(${drawPlan.toString()})(${JSON.stringify(planData())})`);
    mkdirSync(join(site, 'plans'), { recursive: true });
    writeFileSync(join(site, 'plans', 'loft.png'), Buffer.from(url.split(',')[1], 'base64'));
  } finally {
    win.destroy();
  }
}

// ---- The sky, the light, the sounds, the credits --------------------------------------------

/** The harbour: its 1k HDR panorama lights the scene; Poly Haven's own picture of it, 4096 by 2048, is the sky. */
function light() {
  mkdirSync(join(site, 'light'), { recursive: true });
  copyFileSync(join(cache, 'light', 'simons_town_harbour.hdr'), join(site, 'light', 'harbour.hdr'));
  const sky = nativeImage.createFromPath(join(cache, 'light', 'simons_town_harbour.jpg')).resize({ width: 4096, height: 2048, quality: 'best' });
  writeFileSync(join(site, 'light', 'sky.jpg'), sky.toJPEG(84));
}

const RATE = 22050;

/** 16-bit mono WAV from samples between -1 and 1. */
function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const head = Buffer.alloc(44);
  head.write('RIFF', 0, 'ascii');
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVEfmt ', 8, 'ascii');
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(RATE, 24);
  head.writeUInt32LE(RATE * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36, 'ascii');
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

/** A click: a short knock of noise through a ringing filter, at `at` seconds, into `out`. */
function click(out, at, { freq, ring, loud, rand }) {
  const start = Math.round(at * RATE);
  // A two-pole resonator: the knock rings at `freq` and dies away in `ring` seconds.
  const r = Math.exp(-1 / (ring * RATE));
  const w = (2 * Math.PI * freq) / RATE;
  const [a1, a2] = [2 * r * Math.cos(w), -r * r];
  let [y1, y2] = [0, 0];
  for (let i = 0; start + i < out.length && i < RATE * ring * 8; i++) {
    const x = i < 0.0015 * RATE ? (rand() * 2 - 1) * (1 - i / (0.0015 * RATE)) : 0;
    const y = x + a1 * y1 + a2 * y2;
    [y2, y1] = [y1, y];
    out[start + i] += y * loud;
  }
}

/** The switch: the rocker's two quick clicks. */
function switchSound() {
  const rand = random(3);
  const out = new Float32Array(Math.round(0.12 * RATE));
  click(out, 0.004, { freq: 2600, ring: 0.006, loud: 0.5, rand });
  click(out, 0.012, { freq: 1500, ring: 0.01, loud: 0.35, rand });
  click(out, 0.028, { freq: 3400, ring: 0.004, loud: 0.2, rand });
  return out;
}

/** A door: a soft swing of air, and the latch at the end. */
function doorSound() {
  const rand = random(5);
  const out = new Float32Array(Math.round(0.75 * RATE));
  // The swing: noise, low-passed, swelling and fading over half a second.
  let lp = 0;
  let lp2 = 0;
  for (let i = 0; i < 0.55 * RATE; i++) {
    const t = i / (0.55 * RATE);
    lp += 0.04 * (rand() * 2 - 1 - lp);
    lp2 += 0.04 * (lp - lp2);
    out[i] += lp2 * Math.sin(Math.PI * t) ** 1.5 * 1.6;
  }
  // The latch: a metal knock, a bounce, and the leaf settling.
  click(out, 0.56, { freq: 1900, ring: 0.02, loud: 0.45, rand });
  click(out, 0.57, { freq: 3100, ring: 0.012, loud: 0.3, rand });
  click(out, 0.6, { freq: 240, ring: 0.03, loud: 0.5, rand });
  return out;
}

function sounds() {
  mkdirSync(join(site, 'sounds'), { recursive: true });
  writeFileSync(join(site, 'sounds', 'switch.wav'), wav(switchSound()));
  writeFileSync(join(site, 'sounds', 'door.wav'), wav(doorSound()));
}

function credits() {
  const list = JSON.parse(readFileSync(join(cache, 'credits.json'), 'utf8'));
  const line = (c) => `- **${c.name}** (${c.kind}) by ${c.authors.join(', ')}: ${c.page}`;
  writeFileSync(
    join(MODELS, 'CREDITS.md'),
    `# Credits for Harbour Loft's models, textures, and light

All from **Poly Haven** (https://polyhaven.com), under Creative Commons
Zero (CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/):
no conditions. Poly Haven and its artists ask for credit as thanks.

${list.map(line).join('\n')}

Made from them by ../tools/prepare.mjs: the pictures re-encoded for the
web (the small pieces' at half size), the waffle cotton recoloured
off-white for the duvet, the floor tiles recoloured grey, the parquet
made matte, the lamps without their own glow, the shelves
at their real size, the sky (Poly Haven's own picture of the harbour,
at 4096 by 2048), and the light (its 1k HDR). The walls, floor,
ceiling, brick wall, windows, doors, switches, kitchen, island, bed,
wardrobe, bathroom, rug, books, the lamps' glow, the terrace's deck,
railings, stair house, and sun loungers, the floor plan, and the
sounds are made there too, under the repository's licence (Apache 2.0).
`,
  );
}

// Not awaited at the top: Electron fires "ready" only once this module has loaded.
void app.whenReady().then(async () => {
  try {
    rmSync(MODELS, { recursive: true, force: true });
    mkdirSync(MODELS, { recursive: true });
    textures();
    copies();
    wall();
    floor();
    ceiling();
    brickWall();
    windows();
    glass();
    door();
    lightSwitch();
    glow();
    kitchen();
    island();
    bed();
    wardrobe();
    bath();
    shower();
    vanity();
    toilet();
    bathTiles();
    rug();
    books('books.glb', 11);
    books('books-2.glb', 23);
    deck();
    railing();
    stairHouse();
    lounger();
    light();
    sounds();
    credits();
    page();
    await plan();
    console.log('done');
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    app.quit();
  }
});
