// Makes the sneaker store's files from what download.mjs saved in
// tools/cache/ (the Materials Variants Shoe from the Khronos glTF Sample
// Assets, © 2021 Shopify, Inc., CC BY 4.0) and from ../colourways.js:
//
// - the shoe's ten colourways: its own three pictures (midnight, beach,
//   street) and seven more, made by recolouring the knit and the trim of
//   its own; in every one the mark on the heel tab is painted out, and
//   the lettering on the midsole too (the shoe's licence leaves out
//   logos);
// - models/shoe.glb (the shoe page's shoe, its pictures at 1024 pixels),
//   models/shoe-<colour>.glb (the store's, at 512), and
//   models/shoe-<colour>-far.glb (their stand-ins: about a ninth of the
//   triangles, and a picture of 64 pixels);
// - colours/<colour>.jpg (the shoe page's colour choice);
// - the store's room, walls, bays, bench, counter, plants, and entrance,
//   and the shoe page's turntable, each one .glb file;
// - sounds/add.wav, models/CREDITS.md;
// - and the parts of index.holoml and shoe.holoml between their
//   "prepare.mjs" comments: the places, the shelves, the bays, and the
//   colour options.
//
// It uses Electron's picture decoder and encoder, so run it with Electron
// (any recent version) from the repository root:
//
//   electron examples/sneaker-store/tools/prepare.mjs
import { app, nativeImage } from 'electron';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLOURWAYS, SHOE } from '../colourways.js';

const here = dirname(fileURLToPath(import.meta.url));
const cache = join(here, 'cache');
const site = join(here, '..');
const MODELS = join(site, 'models');
const SHOE_DIR = join(cache, 'shoe', 'glTF');

// ---- Pictures ------------------------------------------------------------------------

/** A picture's pixels at `size` by `size`: 4 bytes a pixel (blue, green, red, alpha). */
function load(file, size) {
  let image = nativeImage.createFromPath(file);
  if (image.isEmpty()) throw new Error(`${file}: not a picture Electron can read`);
  if (image.getSize().width !== size) image = image.resize({ width: size, height: size, quality: 'best' });
  return { width: size, height: size, data: Buffer.from(image.toBitmap()) };
}

const jpeg = (picture, quality) => nativeImage.createFromBitmap(picture.data, { width: picture.width, height: picture.height }).toJPEG(quality);

function resized(picture, size) {
  const image = nativeImage.createFromBitmap(picture.data, { width: picture.width, height: picture.height }).resize({ width: size, height: size, quality: 'best' });
  return { width: size, height: size, data: Buffer.from(image.toBitmap()) };
}

const luminance = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

/**
 * Where the shoe's colours are, from its three pictures (at 1024 by
 * 1024): what differs between them is coloured, the rest (the white
 * sole, the black and grey parts) is the same in every colourway. Of
 * the coloured, the trim is what the street picture has red; the rest is
 * the knit. Each keeps midnight's light and shade, to be recoloured.
 */
function regions(midnight, beach, street) {
  const n = midnight.width * midnight.height;
  const kind = new Uint8Array(n); // 0 the same in all, 1 knit, 2 trim
  for (let i = 0; i < n; i++) {
    const [m, b, s] = [midnight, beach, street].map((p) => [p.data[i * 4 + 2], p.data[i * 4 + 1], p.data[i * 4]]);
    const differs = Math.max(Math.abs(m[0] - b[0]), Math.abs(m[1] - b[1]), Math.abs(m[2] - b[2]), Math.abs(m[0] - s[0]), Math.abs(m[1] - s[1]), Math.abs(m[2] - s[2])) > 28;
    if (!differs) continue;
    kind[i] = s[0] > 110 && s[0] > s[1] + 55 && s[0] > s[2] + 45 ? 2 : 1;
  }
  return kind;
}

/**
 * The mark on the heel tab (a small figure in the trim's colour on the
 * black tab): painted out with the tab's own black, so no picture of the
 * store shows it. The shoe's licence (CC BY 4.0) leaves out logos.
 */
const MARK = { x0: 277, y0: 290, x1: 330, y1: 370 };

function paintOutMark(picture, kind) {
  const { width } = picture;
  const black = [];
  for (let y = MARK.y0; y < MARK.y1; y++) {
    for (let x = MARK.x0; x < MARK.x1; x++) {
      const i = y * width + x;
      const l = luminance(picture.data[i * 4 + 2], picture.data[i * 4 + 1], picture.data[i * 4]);
      if (!kind[i] && l < 40) black.push(i);
    }
  }
  if (black.length < 50) throw new Error('the heel tab was not where it was expected');
  const mean = [0, 1, 2].map((k) => Math.round(black.reduce((sum, i) => sum + picture.data[i * 4 + k], 0) / black.length));
  // The mark is what is coloured there; it has a thin grey outline, the same in every picture, so all of the box around it goes (2 pixels more each way, clear of the tab's stitching).
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (let y = MARK.y0; y < MARK.y1; y++) {
    for (let x = MARK.x0; x < MARK.x1; x++) {
      if (!kind[y * width + x]) continue;
      box.x0 = Math.min(box.x0, x);
      box.y0 = Math.min(box.y0, y);
      box.x1 = Math.max(box.x1, x);
      box.y1 = Math.max(box.y1, y);
    }
  }
  if (box.x1 - box.x0 < 10 || box.y1 - box.y0 < 10) throw new Error('no mark found on the heel tab');
  for (let y = box.y0 - 2; y <= box.y1 + 2; y++) {
    for (let x = box.x0 - 2; x <= box.x1 + 2; x++) {
      const i = y * width + x;
      for (let k = 0; k < 3; k++) picture.data[i * 4 + k] = mean[k];
    }
  }
  return box;
}

/**
 * The mark in the normal picture (in relief) and in the occlusion,
 * roughness, and metalness picture: its box (as found in the colour
 * pictures, and 3 pixels more) is filled with what surrounds it there.
 */
function fillMark(picture, box) {
  const { width } = picture;
  const [x0, y0, x1, y1] = [box.x0 - 3, box.y0 - 3, box.x1 + 3, box.y1 + 3];
  const around = [[], [], []];
  for (let y = y0 - 5; y <= y1 + 5; y++) {
    for (let x = x0 - 5; x <= x1 + 5; x++) {
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) continue;
      for (let k = 0; k < 3; k++) around[k].push(picture.data[(y * width + x) * 4 + k]);
    }
  }
  const median = around.map((values) => values.sort((a, b) => a - b)[values.length >> 1]);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) for (let k = 0; k < 3; k++) picture.data[(y * width + x) * 4 + k] = median[k];
}

/**
 * Lettering on the midsole ("///FOAM"), in relief in the normal picture
 * only: covered with the midsole's own pebbled relief from 60 pixels to
 * its left (clear of a seam between).
 */
const LETTERING = { x0: 864, y0: 368, x1: 904, y1: 512, from: -60 };

function paintOutLettering(normal) {
  const { width } = normal;
  const { x0, y0, x1, y1, from } = LETTERING;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const [to, src] = [(y * width + x) * 4, (y * width + x + from) * 4];
      for (let k = 0; k < 3; k++) normal.data[to + k] = normal.data[src + k];
    }
  }
}

/**
 * A colourway made from midnight's picture: the knit and the trim each
 * take a new colour, keeping their light and shade (each pixel's
 * lightness, within the region's own range, picks a colour from a shade
 * of the new one to a light of it).
 */
function recolour(midnight, kind, upper, trim) {
  const out = { ...midnight, data: Buffer.from(midnight.data) };
  for (const [which, hex] of [
    [1, upper],
    [2, trim],
  ]) {
    const lum = [];
    for (let i = 0; i < kind.length; i++) if (kind[i] === which) lum.push(luminance(midnight.data[i * 4 + 2], midnight.data[i * 4 + 1], midnight.data[i * 4]));
    const sorted = Float64Array.from(lum).sort();
    const [lo, hi] = [sorted[Math.floor(sorted.length * 0.02)], sorted[Math.floor(sorted.length * 0.98)]];
    const c = rgb(hex);
    const dark = c.map((v) => v * 0.6);
    const light = c.map((v) => Math.min(255, v * 1.12 + 10));
    for (let i = 0; i < kind.length; i++) {
      if (kind[i] !== which) continue;
      const l = luminance(midnight.data[i * 4 + 2], midnight.data[i * 4 + 1], midnight.data[i * 4]);
      const t = Math.min(1, Math.max(0, (l - lo) / Math.max(1, hi - lo)));
      out.data[i * 4 + 2] = Math.round(dark[0] + (light[0] - dark[0]) * t);
      out.data[i * 4 + 1] = Math.round(dark[1] + (light[1] - dark[1]) * t);
      out.data[i * 4] = Math.round(dark[2] + (light[2] - dark[2]) * t);
    }
  }
  return out;
}

/** Every colourway's picture at 1024 by 1024, by its id; and the shoe's normal and occlusion-roughness-metalness pictures. */
function pictures() {
  const own = Object.fromEntries(['Midnight', 'Beach', 'Street'].map((n) => [n.toLowerCase(), load(join(SHOE_DIR, `diffuse${n}.jpg`), 1024)]));
  const kind = regions(own.midnight, own.beach, own.street);
  const colours = new Map();
  let mark = null;
  for (const c of COLOURWAYS) {
    const picture = own[c.id] ? { ...own[c.id], data: Buffer.from(own[c.id].data) } : recolour(own.midnight, kind, c.upper, c.trim);
    mark = paintOutMark(picture, kind);
    colours.set(c.id, picture);
  }
  // The mark is in relief too, and in the roughness; the lettering on the midsole, in relief only.
  const normal = load(join(SHOE_DIR, 'normal.jpg'), 1024);
  const orm = load(join(SHOE_DIR, 'occlusionRougnessMetalness.jpg'), 1024);
  fillMark(normal, mark);
  fillMark(orm, mark);
  paintOutLettering(normal);
  return { colours, normal, orm };
}

// ---- The shoe's mesh --------------------------------------------------------------------

/** The shoe's positions, normals, texture places, and triangles, with its node's scale and place applied (its sole on y = 0, its toe to +x). */
function shoeMesh() {
  const g = JSON.parse(readFileSync(join(SHOE_DIR, 'MaterialsVariantsShoe.gltf'), 'utf8'));
  const bin = readFileSync(join(SHOE_DIR, 'MaterialsVariantsShoe.bin'));
  const read = (i) => {
    const a = g.accessors[i];
    const v = g.bufferViews[a.bufferView];
    const at = bin.byteOffset + (v.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const count = a.count * { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type];
    const Type = a.componentType === 5126 ? Float32Array : a.componentType === 5125 ? Uint32Array : Uint16Array;
    return new Type(bin.buffer.slice(at, at + count * Type.BYTES_PER_ELEMENT));
  };
  const prim = g.meshes[0].primitives[0];
  const node = g.nodes.find((n) => n.matrix);
  const [s, t] = [node.matrix[0], node.matrix.slice(12, 15)];
  const positions = read(prim.attributes.POSITION).map((v, i) => v * s + t[i % 3]);
  return { positions: Float32Array.from(positions), normals: read(prim.attributes.NORMAL), uvs: read(prim.attributes.TEXCOORD_0), indices: Uint16Array.from(read(prim.indices)) };
}

/**
 * A lighter shoe for far away (a stand-in): vertices within the same
 * `cell` (metres) and the same part of the picture are joined into one,
 * and triangles that vanish are dropped; normals are made again.
 */
function lighter(mesh, cell) {
  const { positions: p, uvs } = mesh;
  const clusters = new Map();
  const map = new Uint32Array(p.length / 3);
  for (let i = 0; i < p.length / 3; i++) {
    const key = `${Math.floor(p[i * 3] / cell)},${Math.floor(p[i * 3 + 1] / cell)},${Math.floor(p[i * 3 + 2] / cell)},${Math.floor(uvs[i * 2] * 24)},${Math.floor(uvs[i * 2 + 1] * 24)}`;
    let c = clusters.get(key);
    if (!c) {
      c = { index: clusters.size, p: [0, 0, 0], uv: [0, 0], n: 0 };
      clusters.set(key, c);
    }
    c.p = c.p.map((v, k) => v + p[i * 3 + k]);
    c.uv = [c.uv[0] + uvs[i * 2], c.uv[1] + uvs[i * 2 + 1]];
    c.n++;
    map[i] = c.index;
  }
  const list = [...clusters.values()];
  const positions = new Float32Array(list.length * 3);
  const uv = new Float32Array(list.length * 2);
  for (const c of list) {
    positions.set(c.p.map((v) => v / c.n), c.index * 3);
    uv.set([c.uv[0] / c.n, c.uv[1] / c.n], c.index * 2);
  }
  const seen = new Set();
  const indices = [];
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const [a, b, c] = [map[mesh.indices[i]], map[mesh.indices[i + 1]], map[mesh.indices[i + 2]]];
    if (a === b || b === c || a === c) continue;
    const key = [a, b, c].sort((x, y) => x - y).join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    indices.push(a, b, c);
  }
  // Smooth normals, each face counted by its area.
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = [indices[i], indices[i + 1], indices[i + 2]].map((v) => [positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]]);
    const n = cross(sub(b, a), sub(c, a));
    for (const v of [indices[i], indices[i + 1], indices[i + 2]]) for (let k = 0; k < 3; k++) normals[v * 3 + k] += n[k];
  }
  for (let v = 0; v < normals.length; v += 3) {
    const l = Math.hypot(normals[v], normals[v + 1], normals[v + 2]) || 1;
    for (let k = 0; k < 3; k++) normals[v + k] /= l;
  }
  return { positions, normals, uvs: uv, indices: Uint16Array.from(indices) };
}

// ---- Materials -----------------------------------------------------------------------

/**
 * The materials of the models made here: a colour (sRGB), how rough and
 * how metallic, a glow for the lights, and see-through for glass.
 */
const PALETTE = {
  Floor: { color: '#d3cbbf', rough: 0.4 },
  Rug: { color: '#30343b', rough: 0.95 },
  Wall: { color: '#f3f1ed', rough: 0.9 },
  // A little light of its own, so the ceiling reads white though lit from below only.
  Ceiling: { color: '#f7f6f3', glow: '#6e6c69', rough: 0.95 },
  Strip: { color: '#ffffff', glow: '#fff6e8', rough: 1 },
  Daylight: { color: '#ffffff', glow: '#dfe9ef', rough: 1 },
  Oak: { color: '#c7a276', rough: 0.55 },
  White: { color: '#f8f7f4', rough: 0.45 },
  Kraft: { color: '#b98f5f', rough: 0.85 },
  Lid: { color: '#8e6943', rough: 0.85 },
  Seat: { color: '#d9d2c4', rough: 0.95 },
  Black: { color: '#1c1d20', rough: 0.4 },
  Screen: { color: '#0e1116', glow: '#223447', rough: 0.15 },
  Frame: { color: '#2b2d31', metal: 0.5, rough: 0.35 },
  Pot: { color: '#e7e2d8', rough: 0.7 },
  Soil: { color: '#3a2c20', rough: 1 },
  Leaf: { color: '#4c7a44', rough: 0.75 },
  Studio: { color: '#e4e0d9', rough: 0.85 },
  Plinth: { color: '#fafaf8', rough: 0.35 },
};

/** A colour from "#rrggbb" to glTF's linear red, green, and blue. */
function linear(hex) {
  return rgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
}

function gltfMaterial(name, spec) {
  const m = {
    name,
    pbrMetallicRoughness: { baseColorFactor: [...linear(spec.color ?? '#ffffff'), spec.opacity ?? 1], metallicFactor: spec.metal ?? 0, roughnessFactor: spec.rough ?? 0.8 },
  };
  if ((spec.opacity ?? 1) < 1) m.alphaMode = 'BLEND';
  if (spec.glow) m.emissiveFactor = linear(spec.glow);
  return m;
}

// ---- Geometry ------------------------------------------------------------------------

const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => {
  const l = len(a);
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** A flat rectangle: its corner, two edges (its front is where u × v points), and its material. */
function quad(origin, u, v, material) {
  const n = cross(u, v);
  if (len(n) < 1e-9) return [];
  const normal = unit(n);
  const p = [origin, add3(origin, u), add3(add3(origin, u), v), add3(origin, v)];
  return [{ positions: p.flat(), normals: [normal, normal, normal, normal].flat(), uvs: [0, 1, 1, 1, 1, 0, 0, 0], indices: [0, 1, 2, 0, 2, 3], material }];
}

/** A box between two corners, its faces outward; `skip` leaves out faces ("top", "bottom", "left", "right", "front", "back"). */
function box(min, max, material, { skip = [] } = {}) {
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
    .flatMap(([, [o, u, v]]) => quad(o, u, v, material));
}

/** An upright cylinder standing on `base`, with its top and bottom. */
function cylinder(base, radius, height, material, { segments = 32, top = true, bottom = true } = {}) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * 2 * Math.PI;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    for (const y of [0, height]) {
      positions.push(base[0] + radius * c, base[1] + y, base[2] + radius * s);
      normals.push(c, 0, s);
      uvs.push(i / segments, y / Math.max(height, 1e-6));
    }
  }
  for (let i = 0; i < segments; i++) {
    const k = i * 2;
    indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
  }
  const parts = [{ positions, normals, uvs, indices, material }];
  const cap = (y, up) => {
    const cp = [base[0], base[1] + y, base[2]];
    const cn = [0, up ? 1 : -1, 0];
    const cu = [0.5, 0.5];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * 2 * Math.PI;
      cp.push(base[0] + radius * Math.cos(a), base[1] + y, base[2] + radius * Math.sin(a));
      cn.push(0, up ? 1 : -1, 0);
      cu.push(0.5 + Math.cos(a) / 2, 0.5 + Math.sin(a) / 2);
    }
    const ci = [];
    for (let i = 1; i <= segments; i++) ci.push(...(up ? [0, i + 1, i] : [0, i, i + 1]));
    parts.push({ positions: cp, normals: cn, uvs: cu, indices: ci, material });
  };
  if (top) cap(height, true);
  if (bottom) cap(0, false);
  return parts;
}

/** An ellipsoid: a plant's leaves, as a soft round mass. */
function ellipsoid(centre, radii, material, { segments = 20, rings = 12 } = {}) {
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

/** Joins the parts of each material into one. */
function merge(parts) {
  const byMaterial = new Map();
  for (const p of parts) byMaterial.set(p.material, [...(byMaterial.get(p.material) ?? []), p]);
  return [...byMaterial.entries()].map(([material, list]) => {
    const indices = [];
    let base = 0;
    for (const p of list) {
      for (const i of p.indices) indices.push(i + base);
      base += p.positions.length / 3;
    }
    return {
      positions: new Float32Array(list.flatMap((p) => p.positions)),
      normals: new Float32Array(list.flatMap((p) => p.normals)),
      uvs: new Float32Array(list.flatMap((p) => p.uvs)),
      indices: base > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
      material,
    };
  });
}

// ---- Writing models ------------------------------------------------------------------

/** The glTF of some primitives (each with its material, as glTF), their buffer, and the pictures (JPEG bytes) the materials name by index. */
function gltfOf(name, prims) {
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
  const boundsOf = (p) => {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < p.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], p[i + k]);
        max[k] = Math.max(max[k], p[i + k]);
      }
    }
    return { min, max };
  };
  const materials = [];
  const primitives = prims.map((p) => {
    materials.push(p.gltfMaterial);
    return {
      attributes: {
        POSITION: add(p.positions, 'VEC3', 34962, boundsOf(p.positions)),
        NORMAL: add(p.normals, 'VEC3', 34962),
        TEXCOORD_0: add(p.uvs, 'VEC2', 34962),
      },
      indices: add(p.indices, 'SCALAR', 34963),
      material: materials.length - 1,
    };
  });
  const gltf = {
    asset: { version: '2.0', generator: 'HoloML examples/sneaker-store/tools/prepare.mjs' },
    scene: 0,
    scenes: [{ name, nodes: [0] }],
    nodes: [{ name, mesh: 0 }],
    meshes: [{ name, primitives }],
    materials,
    buffers: [{ byteLength: length }],
    bufferViews: views,
    accessors,
  };
  return { gltf, buffer: Buffer.concat(chunks) };
}

/**
 * Writes a model as one binary glTF file (.glb): its JSON, then its
 * buffer and its pictures (JPEG bytes, one for each of its images, in
 * order) in the one binary chunk.
 */
function writeGlb(file, g, buffer, pictures = []) {
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
  append(buffer);
  if (pictures.length) {
    g.images = pictures.map((p) => {
      g.bufferViews.push({ buffer: 0, byteOffset: append(p.bytes), byteLength: p.bytes.length });
      return { name: p.name, mimeType: 'image/jpeg', bufferView: g.bufferViews.length - 1 };
    });
    g.textures = pictures.map((_, i) => ({ source: i, sampler: 0 }));
    g.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }];
  }
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
  const whole = Buffer.concat([header, chunk('JSON', json), chunk('BIN\0', bin)]);
  writeFileSync(join(MODELS, file), whole);
  return whole.length;
}

/** A model made here from parts, its materials from PALETTE. */
function writeModel(file, parts) {
  const prims = merge(parts).map((p) => {
    if (!PALETTE[p.material]) throw new Error(`${file}: no material ${p.material}`);
    return { ...p, gltfMaterial: gltfMaterial(p.material, PALETTE[p.material]) };
  });
  const { gltf, buffer } = gltfOf(file.replace(/\.glb$/, ''), prims);
  return writeGlb(file, gltf, buffer);
}

/** The shoe with its pictures: colour, then the normal picture, then occlusion, roughness, and metalness (in one, as the shoe's own). */
function writeShoe(file, mesh, colour, normal, orm) {
  const material = {
    name: 'Shoe',
    pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], baseColorTexture: { index: 0 }, metallicFactor: 1, roughnessFactor: 1, metallicRoughnessTexture: { index: 2 } },
    normalTexture: { index: 1 },
    occlusionTexture: { index: 2 },
  };
  const { gltf, buffer } = gltfOf('Shoe', [{ ...mesh, gltfMaterial: material }]);
  return writeGlb(file, gltf, buffer, [
    { name: 'colour', bytes: colour },
    { name: 'normal', bytes: normal },
    { name: 'occlusion-roughness-metalness', bytes: orm },
  ]);
}

/** A stand-in: the lighter shoe with a small colour picture, plain (no normal or roughness picture). */
function writeStandIn(file, mesh, colour) {
  const material = { name: 'Shoe', pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.7 } };
  const { gltf, buffer } = gltfOf('Shoe', [{ ...mesh, gltfMaterial: material }]);
  return writeGlb(file, gltf, buffer, [{ name: 'colour', bytes: colour }]);
}

// ---- The store -------------------------------------------------------------------------

/** The hall: 10 m wide (x from -5 to 5) and 26 m long (z from 0 at the entrance to -26), 4.2 m high. */
export const HALL = { x: 5, z: -26, h: 4.2 };
/** The bays along each wall (their centres), the left wall's colourways first. */
export const BAY_Z = [-4, -8.5, -13, -17.5, -22];
/** A bay: its width, its depth from the wall, and its height. */
const BAY = { w: 3.0, d: 0.46, h: 2.62 };
/** Its cubbies: the columns' middles, and the tops of the floors of the two rows (and of the top of the second). */
const CUBBY_X = [-0.95, 0, 0.95];
const SHELF_Y = [0.98, 1.6, 2.22];
/** Where a shoe stands in its cubby (from the wall), and each cubby's turn of its shoe: its toe right, or left, in turn. */
const SHOE_OUT = 0.25;
const TURNS = [
  [-20, 200, -20],
  [200, -20, 200],
];

/** The floor and a runner down the hall (they take the shadows of what stands on them). */
function floor() {
  const { x, z } = HALL;
  return writeModel('floor.glb', [...box([-x, -0.1, z], [x, 0, 0], 'Floor', { skip: ['bottom'] }), ...box([-1.1, 0, -24], [1.1, 0.012, -2.6], 'Rug', { skip: ['bottom'] })]);
}

/** The ceiling, with three rows of light along it (it casts no shadow, or the sun from above would darken the hall). */
function ceiling() {
  const { x, z, h } = HALL;
  return writeModel('ceiling.glb', [
    ...box([-x, h, z], [x, h + 0.1, 0], 'Ceiling', { skip: ['top'] }),
    ...[-2.6, 0, 2.6].flatMap((cx) => box([cx - 0.06, h - 0.03, -24.5], [cx + 0.06, h, -1.5], 'Strip', { skip: ['top'] })),
  ]);
}

/** A wall: a box a metre each way, scaled in the page, solid. */
const wall = () => writeModel('wall.glb', box([-0.5, 0, -0.5], [0.5, 1, 0.5], 'Wall'));

/** The entrance: a pair of glass doors onto a bright street (drawn as light), in the wall behind the start. */
function entrance() {
  const parts = [];
  // The frame, and the doors' stiles and a push bar each.
  parts.push(...box([-1.3, 0, -0.06], [1.3, 2.7, -0.02], 'Frame', { skip: ['front'] }));
  parts.push(...box([-1.22, 0.08, -0.08], [1.22, 2.62, -0.06], 'Daylight', { skip: ['front'] }));
  for (const sx of [-1.22, -0.03, 0.03, 1.22]) parts.push(...box([sx - 0.04, 0.08, -0.1], [sx + 0.04, 2.62, -0.06], 'Frame'));
  parts.push(...box([-1.22, 2.54, -0.1], [1.22, 2.62, -0.06], 'Frame'), ...box([-1.22, 0.08, -0.1], [1.22, 0.16, -0.06], 'Frame'));
  for (const [x0, x1] of [
    [-0.9, -0.25],
    [0.25, 0.9],
  ])
    parts.push(...box([x0, 1.02, -0.16], [x1, 1.06, -0.12], 'Frame'));
  return writeModel('entrance.glb', parts);
}

/**
 * A bay of the sneaker wall, in its own space: its back on the wall at
 * z = 0, facing +z, BAY.w wide. Two rows of three lit cubbies (an oak
 * back, a strip of light along each one's top), a band for the
 * colourway's name above them, a white canopy, and a cabinet of shoe
 * boxes below. The cubbies' floors, where the shoes stand, are a model of
 * their own (ledge.glb), so that they alone take the shoes' shadows: the
 * rest of the bay casts none, and takes none.
 */
function bay() {
  const { w, d, h } = BAY;
  const x = w / 2;
  const parts = [];
  parts.push(...box([-x, 0, 0], [x, h, 0.04], 'Oak', { skip: ['back'] }));
  parts.push(...box([-x, 0, 0], [-x + 0.06, h, d], 'White'), ...box([x - 0.06, 0, 0], [x, h, d], 'White'));
  parts.push(...box([-x, h - 0.06, 0], [x, h, d], 'White'), ...box([-x + 0.1, h - 0.075, d - 0.14], [x - 0.1, h - 0.06, d - 0.06], 'Strip', { skip: ['top'] }));
  // The cubbies: dividers between the columns, and a light along the top of each.
  for (const cx of CUBBY_X.slice(0, -1).map((c, i) => (c + CUBBY_X[i + 1]) / 2)) parts.push(...box([cx - 0.02, SHELF_Y[0], 0.04], [cx + 0.02, SHELF_Y[2], d - 0.02], 'White'));
  for (const y of SHELF_Y.slice(1)) {
    for (const cx of CUBBY_X) parts.push(...box([cx - 0.36, y - 0.055, d - 0.2], [cx + 0.36, y - 0.04, d - 0.14], 'Strip', { skip: ['top'] }));
  }
  // The cabinet below, open at the front, two rows of three shoe boxes in it.
  parts.push(...box([-x + 0.06, 0, 0.04], [x - 0.06, 0.08, d - 0.02], 'White', { skip: ['bottom'] }));
  parts.push(...box([-x + 0.06, 0.46, 0.04], [x - 0.06, 0.5, d - 0.02], 'White'));
  for (const y of [0.08, 0.5]) {
    for (const cx of CUBBY_X) {
      parts.push(...box([cx - 0.4, y, 0.08], [cx + 0.4, y + 0.3, d - 0.04], 'Kraft', { skip: ['bottom', 'back'] }));
      parts.push(...box([cx - 0.405, y + 0.25, 0.075], [cx + 0.405, y + 0.31, d - 0.035], 'Lid', { skip: ['bottom', 'back'] }));
    }
  }
  return writeModel('bay.glb', parts);
}

/** A bay's cubby floors, where its shoes stand (the lowest also tops the cabinet), in the bay's space. */
function ledge() {
  const x = BAY.w / 2 - 0.06;
  return writeModel(
    'ledge.glb',
    SHELF_Y.flatMap((y) => box([-x, y - 0.04, 0.04], [x, y, BAY.d - 0.02], 'White')),
  );
}

/** A sign on a stand: a slim pole on a round foot, for a panel at the top (the page puts the panel there). */
function signStand() {
  return writeModel('sign.glb', [...cylinder([0, 0, 0], 0.2, 0.02, 'Frame', { bottom: false }), ...cylinder([0, 0.02, 0], 0.018, 1.2, 'Frame', { top: false, bottom: false, segments: 12 })]);
}

/** A long bench down the middle of the hall: an upholstered seat on three oak blocks, 4 m long along z. */
function bench() {
  return writeModel('bench.glb', [
    ...box([-0.28, 0.36, -2], [0.28, 0.46, 2], 'Seat'),
    ...[-1.6, 0, 1.6].flatMap((z) => box([-0.24, 0, z - 0.18], [0.24, 0.36, z + 0.18], 'Oak', { skip: ['bottom'] })),
  ]);
}

/** The counter at the far end: white, an oak top, a till's screen, and a stack of shoe boxes. */
function counter() {
  const parts = [...box([-1.6, 0, -0.4], [1.6, 1.0, 0.4], 'White', { skip: ['bottom'] }), ...box([-1.65, 1.0, -0.45], [1.65, 1.05, 0.45], 'Oak')];
  parts.push(...box([0.64, 1.05, -0.12], [0.68, 1.22, -0.08], 'Black'), ...box([0.45, 1.18, -0.16], [0.87, 1.44, -0.12], 'Black'), ...box([0.47, 1.2, -0.12], [0.85, 1.42, -0.115], 'Screen'));
  for (const [i, dz] of [0, 1, 2].entries()) {
    const y = 1.05 + i * 0.13;
    parts.push(...box([-1.35, y, -0.2 + dz * 0.01], [-0.99, y + 0.12, 0.04 + dz * 0.01], 'Kraft'), ...box([-1.355, y + 0.09, -0.205 + dz * 0.01], [-0.985, y + 0.13, 0.045 + dz * 0.01], 'Lid'));
  }
  return writeModel('counter.glb', parts);
}

/** A plant in a pot: three soft masses of leaves. */
function plant() {
  return writeModel('plant.glb', [
    ...cylinder([0, 0, 0], 0.28, 0.55, 'Pot', { top: false }),
    ...cylinder([0, 0.5, 0], 0.26, 0.02, 'Soil', { bottom: false }),
    ...ellipsoid([0, 1.05, 0], [0.42, 0.52, 0.42], 'Leaf'),
    ...ellipsoid([0.2, 1.38, 0.08], [0.28, 0.34, 0.28], 'Leaf'),
    ...ellipsoid([-0.17, 1.28, -0.12], [0.27, 0.3, 0.27], 'Leaf'),
  ]);
}

/** The shoe page's floor and turntable: a wide pale floor (to its edge far off), and a white disc 60 cm across. */
function studio() {
  writeModel('studio.glb', cylinder([0, -0.02, 0], 9, 0.02, 'Studio', { bottom: false, segments: 96 }));
  return writeModel('turntable.glb', [...cylinder([0, 0, 0], 0.3, 0.035, 'Plinth', { bottom: false, segments: 64 }), ...cylinder([0, 0, 0], 0.305, 0.012, 'Frame', { top: false, bottom: false, segments: 64 })]);
}

// ---- The pages ---------------------------------------------------------------------------

/** Replaces what lies between two lines of a page (the lines kept). */
function between(file, start, end, lines) {
  const path = join(site, file);
  const text = readFileSync(path, 'utf8');
  const a = text.indexOf(start);
  const b = text.indexOf(end);
  if (a < 0 || b < a) throw new Error(`${file}: the "${start}" and "${end}" comments were not found`);
  const from = text.indexOf('\n', a) + 1;
  const to = text.lastIndexOf('\n', b) + 1;
  writeFileSync(path, text.slice(0, from) + lines.join('\n') + '\n' + text.slice(to));
}

const fixed = (n) => String(Math.round(n * 1000) / 1000);
const vec = (...v) => v.map(fixed).join(' ');

/** Each bay's place: the left wall's (x < 0) for the first five colourways, the right wall's for the rest. */
function bays() {
  return COLOURWAYS.map((c, i) => {
    const left = i < 5;
    const z = BAY_Z[i % 5];
    return { c, left, z, wallX: left ? -HALL.x : HALL.x, turn: left ? 90 : -90, side: left ? -1 : 1 };
  });
}

/** index.holoml: the places and the shelves (each bay's shoe loads by area), and the bays themselves. */
function storePage() {
  const places = [];
  const shelves = [];
  const bayModels = [];
  const ledges = [];
  for (const b of bays()) {
    places.push(`    <viewpoint id="${b.c.id}" mode="walk" position="${vec(b.side * 1.9, 1.6, b.z)}" look-at="${vec(b.wallX, 1.45, b.z)}" label="${b.c.name}" />`);
    // The bay's six shoes, one in each cubby, in a group placed as the bay (its place, for loading, at the bay's foot on the wall).
    const shoes = TURNS.flatMap((row, r) =>
      row.map((turn, k) => {
        const n = r * 3 + k + 1;
        return `        <model id="shoe-${b.c.id}-${n}" src="models/shoe-${b.c.id}.glb" stand-in="models/shoe-${b.c.id}-far.glb" position="${vec(CUBBY_X[k], SHELF_Y[r], SHOE_OUT)}" rotation="0 ${turn} 0" />`;
      }),
    );
    shelves.push(
      `    <group load="near" near="7.5" position="${vec(b.wallX, 0, b.z)}" rotation="0 ${b.turn} 0" shadows>`,
      `      <a href="shoe.holoml?colour=${b.c.id}">`,
      ...shoes,
      `        <panel position="${vec(0, 2.39, BAY.d + 0.01)}" width="2.4" size="0.06" color="#1f2328" background="#fbfaf7">`,
      `          ${b.c.name} · $${b.c.price}`,
      ``,
      `          ${SHOE}, ${b.c.note.toLowerCase()}`,
      `        </panel>`,
      `      </a>`,
      `    </group>`,
    );
    bayModels.push(`      <model src="models/bay.glb" position="${vec(b.wallX, 0, b.z)}" rotation="0 ${b.turn} 0" />`);
    ledges.push(`      <model src="models/ledge.glb" position="${vec(b.wallX, 0, b.z)}" rotation="0 ${b.turn} 0" />`);
  }
  between('index.holoml', '<!-- prepare.mjs: the places and the shelves', '<!-- end of prepare.mjs', [...places, '', ...shelves]);
  between('index.holoml', '<!-- prepare.mjs: the bays', '<!-- end of the bays', bayModels);
  between('index.holoml', '<!-- prepare.mjs: the ledges', '<!-- end of the ledges', ledges);
}

/** shoe.holoml: the colour choice's options, each colourway's picture (midnight is the model's own). */
function shoePage() {
  between(
    'shoe.holoml',
    '<!-- prepare.mjs: the colours',
    '<!-- end of prepare.mjs',
    COLOURWAYS.map((c, i) => (i === 0 ? `      <option value="${c.id}">${c.name}</option>` : `      <option value="${c.id}" map="colours/${c.id}.jpg">${c.name}</option>`)),
  );
}

// ---- The sound and the credits -----------------------------------------------------------

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

/** Added to the cart: two soft chimes, a fifth apart. */
function chime() {
  const out = new Float32Array(Math.round(0.7 * RATE));
  for (const [at, freq] of [
    [0, 880],
    [0.09, 1320],
  ]) {
    const start = Math.round(at * RATE);
    for (let i = 0; start + i < out.length; i++) {
      const t = i / RATE;
      out[start + i] += 0.28 * Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 7) * Math.min(1, t * 400);
    }
  }
  return out;
}

function credits(sizes) {
  const list = COLOURWAYS.map((c) => c.name).join(', ');
  writeFileSync(
    join(MODELS, 'CREDITS.md'),
    `# Credits for the sneaker store's models

## The shoe

"Materials Variants Shoe" © 2021 Shopify, Inc., from the Khronos glTF
Sample Assets (https://github.com/KhronosGroup/glTF-Sample-Assets,
Models/MaterialsVariantsShoe), under the Creative Commons Attribution
4.0 International licence (CC BY 4.0,
https://creativecommons.org/licenses/by/4.0/). That licence leaves out
logos and trademarks.

Changed by ../tools/prepare.mjs, and shared here under the same licence:

- its size and place taken into its points (its sole on the ground, its
  toe forward), its material named "Shoe", and its own three colours
  (midnight, beach, street) kept as three of the store's ten;
- seven more colourways made from its midnight picture by recolouring
  its knit and its trim (${list.split(', ').slice(3).join(', ')});
- the mark on its heel tab painted out in every colourway, and from its
  relief and roughness, and the lettering on its midsole from its relief;
- its pictures re-encoded for the web: at 1024 pixels in shoe.glb and
  the shoe page's colours/, at 512 in each shoe-<colour>.glb;
- a lighter copy for far away in each shoe-<colour>-far.glb (about
  ${sizes.standInTriangles.toLocaleString('en')} triangles of its ${sizes.triangles.toLocaleString('en')}, with a picture of 64 pixels).

"${SHOE}", its colourways' names (${list}), and its prices are
made up for this example; the shoe is Shopify's model.

## Everything else

The room, its walls, the bays and their shoe boxes, the bench, the
counter, the plants, the entrance, the turntable, and the chime
(sounds/add.wav) are made by ../tools/prepare.mjs, under the
repository's licence (Apache 2.0).
`,
  );
}

// Not awaited at the top: Electron fires "ready" only once this module has loaded.
void app.whenReady().then(() => {
  try {
    rmSync(MODELS, { recursive: true, force: true });
    rmSync(join(site, 'colours'), { recursive: true, force: true });
    mkdirSync(MODELS, { recursive: true });
    mkdirSync(join(site, 'colours'), { recursive: true });
    mkdirSync(join(site, 'sounds'), { recursive: true });
    const { colours, normal, orm } = pictures();
    const mesh = shoeMesh();
    const far = lighter(mesh, 0.02);
    const sizes = { triangles: mesh.indices.length / 3, standInTriangles: far.indices.length / 3 };
    const small = (p) => jpeg(resized(p, 512), 88);
    const [normal512, orm512] = [small(normal), small(orm)];
    let total = 0;
    for (const c of COLOURWAYS) {
      const picture = colours.get(c.id);
      writeFileSync(join(site, 'colours', `${c.id}.jpg`), jpeg(picture, 86));
      total += writeShoe(`shoe-${c.id}.glb`, mesh, small(picture), normal512, orm512);
      total += writeStandIn(`shoe-${c.id}-far.glb`, far, jpeg(resized(picture, 64), 85));
    }
    writeShoe('shoe.glb', mesh, jpeg(colours.get('midnight'), 86), jpeg(normal, 90), jpeg(orm, 90));
    floor();
    ceiling();
    wall();
    entrance();
    bay();
    ledge();
    signStand();
    bench();
    counter();
    plant();
    studio();
    writeFileSync(join(site, 'sounds', 'add.wav'), wav(chime()));
    credits(sizes);
    storePage();
    shoePage();
    console.log(`the shoe: ${sizes.triangles} triangles, its stand-in ${sizes.standInTriangles}; the colourways' models ${(total / 1048576).toFixed(1)} MB`);
    console.log('done');
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    app.quit();
  }
});
