// Makes the aquarium's files from what download.mjs saved in tools/cache/
// (the fish that tools/fish.mjs lists, and Poly Haven's boulder, log,
// shell, and sand, every one with its licence) and from ../ocean.js (the
// layout):
//
// - models/<fish>.glb: each fish fitted for the tank (fit.mjs: materials
//   three.js can draw, its head to +z, its length in metres, its own swim
//   kept as "Swim"), or, for a fish whose file has no swim, given a
//   skeleton and one (rig.mjs); its pictures at most 1,024 pixels a side
//   (512 for small fish);
// - the tank (its walls and its water's surface), the sand, the tunnel,
//   its ledges, the gallery, the walls' pieces, the rocks, the log, the
//   shell (the Poly Haven models made lighter), plants that sway,
//   bubbles, food, and air stones, each one .glb file;
// - sounds/water.wav, bubbles.wav, plop.wav, and blip.wav, made here;
// - models/CREDITS.md;
// - and the parts of index.holoml between its "prepare.mjs" comments: the
//   tank's rocks, plants, and air stones, and the fish.
//
// It uses Electron's picture decoder and encoder, so run it with Electron
// (any recent version) from the repository root:
//
//   electron examples/aquarium/tools/prepare.mjs
import { app, nativeImage } from 'electron';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AIRSTONES, GALLERY, KINDS, LOGS, PLANTS, ROCKS, ROCKWORK, SHELLS, TANK, TUNNEL } from '../ocean.js';
import { FISH } from './fish.mjs';
import { fitFish, fitMaterials } from './fit.mjs';
import { multiply, nodeMatrix, readAccessor, readGlb, readImage, transformDirection, transformPoint } from './glb.mjs';
import { placedFish, riggedFish } from './rig.mjs';
import { arch, archRing, box, ellipsoid, ground, material, modelBytes, plantBytes, quad, swayingPlant, thinner } from './shapes.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const cache = join(here, 'cache');
const site = join(here, '..');
const MODELS = join(site, 'models');
const SOUNDS = join(site, 'sounds');
const POLYHAVEN = join(cache, 'polyhaven');

/** A picture at most `side` pixels a side: JPEG, or PNG where it has see-through parts. */
function picture(bytes, side, keepAlpha = false) {
  let image = nativeImage.createFromBuffer(bytes);
  if (image.isEmpty()) throw new Error('a picture Electron cannot read');
  const { width, height } = image.getSize();
  if (Math.max(width, height) > side) {
    const k = side / Math.max(width, height);
    image = image.resize({ width: Math.round(width * k), height: Math.round(height * k), quality: 'best' });
  }
  return keepAlpha ? { bytes: image.toPNG(), mimeType: 'image/png' } : { bytes: image.toJPEG(88), mimeType: 'image/jpeg' };
}

const sizes = [];
function write(file, bytes) {
  writeFileSync(join(MODELS, file), bytes);
  sizes.push([file, bytes.length]);
  console.log(`models/${file}: ${(bytes.length / 1e6).toFixed(2)} MB`);
}

// ---- The fish -------------------------------------------------------------------------

/** Which of the file's images a see-through material uses as its colour (kept as PNG). */
function seeThrough(g) {
  const out = new Set();
  for (const m of fitMaterials(g)) {
    const t = m.pbrMetallicRoughness?.baseColorTexture?.index;
    if (t !== undefined && m.alphaMode && m.alphaMode !== 'OPAQUE') out.add(g.textures[t].source);
  }
  return out;
}

function fish() {
  for (const f of FISH) {
    const { json: g, bin } = readGlb(join(cache, `${f.id}.glb`));
    const side = f.length < 0.3 ? 512 : 1024;
    const alpha = seeThrough(g);
    const pictures = (i) => picture(readImage(g, bin, i).bytes, side, alpha.has(i));
    let out;
    if (f.clip || f.turtle) {
      out = fitFish(f.id, g, bin, f, pictures);
    } else {
      const prims = placedFish(g, bin, f);
      out = riggedFish(f.id, prims, { materials: fitMaterials(g), length: f.length, ...(f.rig ?? {}) });
      if (g.images) {
        out.json.images = g.images.map((_, i) => {
          const p = pictures(i);
          return { mimeType: p.mimeType, bufferView: out.writer.bytes(p.bytes) };
        });
        out.json.textures = g.textures;
        out.json.samplers = g.samplers ?? [];
      }
    }
    write(`${f.id}.glb`, out.writer.write());
  }
}

// ---- Poly Haven's models, made lighter --------------------------------------------------

/** A Poly Haven model (glTF with its buffer and pictures beside it) as one part, placed by its nodes, and its three pictures. */
function polyHaven(id) {
  const folder = join(POLYHAVEN, id);
  const g = JSON.parse(readFileSync(join(folder, `${id}.gltf`), 'utf8'));
  const bin = readFileSync(join(folder, g.buffers[0].uri));
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const visit = (i, parent) => {
    const n = g.nodes[i];
    const m = multiply(parent, nodeMatrix(n));
    if (n.mesh !== undefined) {
      for (const p of g.meshes[n.mesh].primitives) {
        const base = positions.length / 3;
        const pos = readAccessor(g, bin, p.attributes.POSITION);
        const nor = readAccessor(g, bin, p.attributes.NORMAL);
        const uv = readAccessor(g, bin, p.attributes.TEXCOORD_0);
        for (let v = 0; v < pos.length / 3; v++) {
          positions.push(...transformPoint(m, [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]]));
          normals.push(...transformDirection(m, [nor[v * 3], nor[v * 3 + 1], nor[v * 3 + 2]]));
          uvs.push(uv[v * 2], uv[v * 2 + 1]);
        }
        for (const k of readAccessor(g, bin, p.indices)) indices.push(k + base);
      }
    }
    for (const c of n.children ?? []) visit(c, m);
  };
  for (const r of g.scenes[g.scene ?? 0].nodes) visit(r, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  // Standing on y = 0.
  let low = Infinity;
  for (let i = 1; i < positions.length; i += 3) low = Math.min(low, positions[i]);
  for (let i = 1; i < positions.length; i += 3) positions[i] -= low;
  const file = (kind) => readFileSync(join(folder, 'textures', `${id}_${kind}_1k.jpg`));
  return {
    mesh: { positions: Float32Array.from(positions), normals: Float32Array.from(normals), uvs: Float32Array.from(uvs), indices: Uint32Array.from(indices), material: id },
    textures: [picture(file('diff'), 1024), picture(file('nor_gl'), 1024), picture(file('arm'), 1024)],
  };
}

function decor() {
  const lighter = [
    ['boulder_01', 'boulder.glb', 0.045],
    ['dead_tree_trunk_02', 'log.glb', 0.04],
    ['lambis_shell', 'shell.glb', 0],
  ];
  for (const [id, file, cell] of lighter) {
    const { mesh, textures } = polyHaven(id);
    const part = cell ? thinner(mesh, cell) : mesh;
    console.log(`${file}: ${mesh.indices.length / 3} triangles${cell ? `, ${part.indices.length / 3} made lighter` : ''}`);
    write(file, modelBytes(id, [part], { [id]: material(id, { rough: 1, map: 0, normalMap: 1, roughnessMap: 2 }) }, { textures }));
  }
}

// ---- The tank, the tunnel, and the gallery --------------------------------------------------

const PALETTE = {
  GalleryFloor: material('GalleryFloor', { color: '#1c2229', rough: 0.55 }),
  Ceiling: material('Ceiling', { color: '#141a21', rough: 0.95 }),
  Wall: material('Wall', { color: '#22303c', rough: 0.9 }),
  Glass: material('Glass', { color: '#d9f0f7', opacity: 0.1, rough: 0.03, doubleSided: true }),
  Frame: material('Frame', { color: '#2a3138', metal: 0.6, rough: 0.35 }),
  Walkway: material('Walkway', { color: '#262b31', rough: 0.85 }),
  Strip: material('Strip', { color: '#9fdcff', glow: '#5cbfe8', rough: 1 }),
  Ledge: material('Ledge', { color: '#2b3743', rough: 0.7 }),
  Surface: material('Surface', { color: '#9fd4e6', unlit: true, doubleSided: true }),
  Bubble: material('Bubble', { color: '#eef8fb', opacity: 0.45, rough: 0.02, metal: 0.3 }),
  Flake: material('Flake', { color: '#b8652f', rough: 0.9 }),
  Airstone: material('Airstone', { color: '#3b3f44', rough: 0.95 }),
};

/**
 * A wall with the tunnel's arch cut out of it, facing +z (`front`) or -z,
 * over x0..x1 and y 0..top at z: strips from the arch out to the
 * rectangle's edges.
 */
function archedWall(x0, x1, top, z, facing, mat, tile = null) {
  const r = TUNNEL.radius;
  const n = 40;
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  // Rays out from the arch's middle, with two more through the rectangle's top corners so that no corner is cut.
  const angles = [...Array.from({ length: n + 1 }, (_, i) => (Math.PI * i) / n), Math.atan2(top, x1), Math.atan2(top, x0)].sort((p, q) => p - q);
  for (const a of angles) {
    const [c, s] = [Math.cos(a), Math.sin(a)];
    // Where the ray at this angle leaves the rectangle.
    const t = Math.min(c > 1e-6 ? x1 / c : c < -1e-6 ? x0 / c : Infinity, s > 1e-6 ? top / s : Infinity);
    for (const [x, y] of [[r * c, r * s], [t * c, t * s]]) {
      positions.push(x, y, z);
      normals.push(0, 0, facing);
      uvs.push(tile ? x / tile : (x - x0) / (x1 - x0), tile ? -y / tile : 1 - y / top);
    }
  }
  for (let i = 0; i < angles.length - 1; i++) {
    const k = i * 2;
    if (facing > 0) indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    else indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
  }
  return [{ positions, normals, uvs, indices, material: mat }];
}

function tank() {
  const [x0, , z0] = TANK.min;
  const [x1, top, z1] = TANK.max;
  // Painted the water's own blue, as aquariums paint theirs, so that they fade into it and the water seems to go on.
  const Painted = material('Painted', { color: '#2f7a98', rough: 0.95 });
  const height = 7;
  const parts = [
    // The back wall and the sides, their faces into the tank.
    ...quad([x1, 0, z0], [x0 - x1, 0, 0], [0, height, 0], 'Painted'),
    ...quad([x0, 0, z0], [0, 0, z1 - z0], [0, height, 0], 'Painted'),
    ...quad([x1, 0, z1], [0, 0, z0 - z1], [0, height, 0], 'Painted'),
    // The front wall's inside, round the tunnel's mouth.
    ...archedWall(x0, x1, height, z1, -1, 'Painted'),
    // The water's surface, bright from below.
    ...quad([x0, top, z1], [x1 - x0, 0, 0], [0, 0, z0 - z1], 'Surface'),
  ];
  write('tank.glb', modelBytes('tank', parts, { Painted, Surface: PALETTE.Surface }));

  // The sand: flat by the tunnel, rising in dunes toward the walls.
  const sandPictures = ['Diffuse', 'nor_gl', 'Rough'].map((m) => picture(readFileSync(join(POLYHAVEN, 'aerial_beach_01', `${m}.jpg`)), 1024));
  const Sand = material('Sand', { color: '#e8e2d6', rough: 1, map: 0, normalMap: 1, roughnessMap: 2 });
  const smooth = (e0, e1, v) => {
    const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  const dunes = (x, z) => {
    const away = smooth(TUNNEL.radius, TUNNEL.radius + 1.2, Math.abs(x));
    const rise = Math.max(0, Math.abs(x) - TUNNEL.radius - 0.4) * 0.09;
    const waves = 0.1 * Math.sin(x * 1.3 + z * 0.4) + 0.06 * Math.sin(z * 0.9 - x * 0.35) + 0.04 * Math.sin(x * 2.7 - z * 1.9);
    return away * (rise + waves + 0.08) - 0.02;
  };
  write('sand.glb', modelBytes('sand', ground(x0, x1, z0, z1, 0.5, dunes, 'Sand', 5), { Sand }, { textures: sandPictures, repeat: true }));

  // The tunnel: its glass, a frame every 2.6 m, the walkway with lights along its edges, and its end.
  const r = TUNNEL.radius;
  const rings = [];
  for (let z = TUNNEL.from; z >= TUNNEL.to - 0.01; z -= 2.6) rings.push(...archRing(r, z, 0.12, 0.08, 'Frame'));
  const endCap = [];
  {
    // The tunnel's far end: a half-disc of glass.
    const n = 40;
    const positions = [0, 0, TUNNEL.to];
    const normals = [0, 0, 1];
    const uvs = [0.5, 1];
    const indices = [];
    for (let i = 0; i <= n; i++) {
      const a = (Math.PI * i) / n;
      positions.push(r * Math.cos(a), r * Math.sin(a), TUNNEL.to);
      normals.push(0, 0, 1);
      uvs.push(0.5 + Math.cos(a) / 2, 1 - Math.sin(a));
      if (i > 0) indices.push(0, i, i + 1);
    }
    endCap.push({ positions, normals, uvs, indices, material: 'Glass' });
  }
  write(
    'tunnel.glb',
    modelBytes(
      'tunnel',
      [
        ...arch(r, TUNNEL.to, TUNNEL.from, 'Glass'),
        ...endCap,
        ...rings,
        ...box([-2.3, -0.06, TUNNEL.to], [2.3, 0, TUNNEL.from], 'Walkway', { skip: ['bottom'] }),
        ...box([-1.72, 0, TUNNEL.to + 0.2], [-1.68, 0.02, TUNNEL.from], 'Strip'),
        ...box([1.68, 0, TUNNEL.to + 0.2], [1.72, 0.02, TUNNEL.from], 'Strip'),
      ],
      { Glass: PALETTE.Glass, Frame: PALETTE.Frame, Walkway: PALETTE.Walkway, Strip: PALETTE.Strip },
    ),
  );
  // A ledge along each side, low enough to lean on, that keeps walkers off the curved glass; and a rail across the end.
  write('ledge.glb', modelBytes('ledge', box([-0.175, 0, -13], [0.175, 0.75, 13], 'Ledge'), { Ledge: PALETTE.Ledge }));
  write('rail.glb', modelBytes('rail', [...box([-1.8, 0.85, -0.03], [1.8, 0.93, 0.03], 'Frame'), ...[-1.7, -0.6, 0.6, 1.7].flatMap((x) => box([x - 0.03, 0, -0.03], [x + 0.03, 0.85, 0.03], 'Frame'))], { Frame: PALETTE.Frame }));

  // The gallery: its floor, its ceiling, and the front wall round the tunnel's mouth (the side walls are wall.glb pieces).
  const [gx0, , gz0] = GALLERY.min;
  const [gx1, gTop, gz1] = GALLERY.max;
  write(
    'gallery.glb',
    modelBytes(
      'gallery',
      [
        ...box([gx0, -0.06, gz0], [gx1, 0, gz1], 'GalleryFloor', { skip: ['bottom'] }),
        ...quad([gx0, gTop, gz0], [gx1 - gx0, 0, 0], [0, 0, gz1 - gz0], 'Ceiling'),
        ...archedWall(-2.7, 2.7, gTop, gz0 + 0.001, 1, 'Wall'),
        ...archRing(r, gz0 + 0.02, 0.2, 0.12, 'Frame'),
      ],
      { GalleryFloor: PALETTE.GalleryFloor, Ceiling: PALETTE.Ceiling, Wall: PALETTE.Wall, Frame: PALETTE.Frame },
    ),
  );
  // A piece of wall, one metre each way, standing on y = 0: placed and scaled in the page (solid pieces stop the walker).
  write('wall.glb', modelBytes('wall', box([-0.5, 0, -0.5], [0.5, 1, 0.5], 'Wall'), { Wall: PALETTE.Wall }));

  // Bubbles, food, and the air stones they rise from.
  write('bubble.glb', modelBytes('bubble', ellipsoid([0, 0, 0], [0.012, 0.011, 0.012], 'Bubble', { segments: 12, rings: 8 }), { Bubble: PALETTE.Bubble }));
  write('flake.glb', modelBytes('flake', ellipsoid([0, 0, 0], [0.014, 0.002, 0.01], 'Flake', { segments: 8, rings: 4 }), { Flake: PALETTE.Flake }));
  write('airstone.glb', modelBytes('airstone', ellipsoid([0, 0.03, 0], [0.07, 0.04, 0.07], 'Airstone', { segments: 14, rings: 8 }), { Airstone: PALETTE.Airstone }));

  // Plants that sway.
  const Seagrass = material('Seagrass', { color: '#5a9443', rough: 0.7, doubleSided: true });
  const Kelp = material('Kelp', { color: '#7b6a26', rough: 0.7, doubleSided: true });
  write('seagrass-a.glb', plantBytes(swayingPlant('seagrass-a', { blades: 16, height: 0.8, spread: 0.3, width: 0.02, seed: 7, beat: 4.5 }), Seagrass));
  write('seagrass-b.glb', plantBytes(swayingPlant('seagrass-b', { blades: 12, height: 0.6, spread: 0.25, width: 0.018, seed: 29, beat: 5.2 }), Seagrass));
  write('kelp.glb', plantBytes(swayingPlant('kelp', { blades: 9, height: 5.6, spread: 0.45, width: 0.26, rows: 28, bones: 6, seed: 11, beat: 7, lean: 0.14, leaves: true }), Kelp));
}

// ---- Sounds ---------------------------------------------------------------------------------

const RATE = 22050;

/** A mono 16-bit WAV file of samples from -1 to 1. */
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

/** The same random numbers every time the tools run. */
function randoms(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** A bubble's bloop: a tone that rises quickly and dies away. */
function bloop(out, at, { from = 320, to = 1200, rise = 0.035, decay = 0.045, gain = 0.3 }) {
  const start = Math.round(at * RATE);
  let phase = 0;
  const n = Math.round((rise + decay * 5) * RATE);
  for (let i = 0; i < n && start + i < out.length; i++) {
    const t = i / RATE;
    const f = from + (to - from) * Math.min(1, t / rise);
    phase += (2 * Math.PI * f) / RATE;
    const env = Math.min(1, t / 0.002) * Math.exp(-t / decay);
    out[start + i] += Math.sin(phase) * env * gain;
  }
}

function sounds() {
  mkdirSync(SOUNDS, { recursive: true });
  // The water: a low, slow rush that repeats without a seam (its last second crossfaded into its first).
  {
    const random = randoms(3);
    const seconds = 8;
    const n = (seconds + 1) * RATE;
    const raw = new Float32Array(n);
    let brown = 0;
    let low = 0;
    for (let i = 0; i < n; i++) {
      brown = brown * 0.995 + (random() * 2 - 1) * 0.1;
      low += (brown - low) * 0.08;
      const t = i / RATE;
      raw[i] = low * (0.75 + 0.25 * Math.sin((2 * Math.PI * t) / seconds));
    }
    let peak = 0;
    for (const v of raw) peak = Math.max(peak, Math.abs(v));
    const out = new Float32Array(seconds * RATE);
    for (let i = 0; i < out.length; i++) {
      const tail = i < RATE ? raw[seconds * RATE + i] * (1 - i / RATE) + raw[i] * (i / RATE) : raw[i];
      out[i] = (tail / peak) * 0.3;
    }
    writeFileSync(join(SOUNDS, 'water.wav'), wav(out));
  }
  // Bubbles from an air stone: bloops at uneven times, none across the loop's end.
  {
    const random = randoms(17);
    const out = new Float32Array(4 * RATE);
    for (let i = 0; i < 16; i++) bloop(out, 0.05 + random() * 3.6, { from: 250 + random() * 250, to: 900 + random() * 900, gain: 0.12 + random() * 0.18 });
    writeFileSync(join(SOUNDS, 'bubbles.wav'), wav(out));
  }
  // Food dropped in: a falling plop and a small splash.
  {
    const random = randoms(5);
    const out = new Float32Array(Math.round(0.6 * RATE));
    bloop(out, 0.01, { from: 1100, to: 260, rise: 0.06, decay: 0.07, gain: 0.55 });
    for (let i = 0; i < 0.05 * RATE; i++) out[i] += (random() * 2 - 1) * 0.12 * Math.exp(-i / (0.012 * RATE));
    bloop(out, 0.16, { from: 400, to: 1300, gain: 0.18 });
    writeFileSync(join(SOUNDS, 'plop.wav'), wav(out));
  }
  // A fish's button: one soft bubble.
  {
    const out = new Float32Array(Math.round(0.3 * RATE));
    bloop(out, 0.01, { from: 380, to: 1400, rise: 0.05, decay: 0.05, gain: 0.35 });
    writeFileSync(join(SOUNDS, 'blip.wav'), wav(out));
  }
}

// ---- The page's parts -----------------------------------------------------------------------

const fixed = (n) => String(Math.round(n * 1000) / 1000);
const vec = (...v) => v.map(fixed).join(' ');

/** Replaces the lines between index.holoml's "prepare.mjs: name" comment and its end comment. */
function between(file, name, lines) {
  const path = join(site, file);
  const text = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  const start = text.indexOf(`<!-- prepare.mjs: ${name}`);
  const end = text.indexOf(`<!-- /prepare.mjs: ${name} -->`);
  if (start < 0 || end < 0) throw new Error(`${file}: no prepare.mjs: ${name} comments`);
  const lineEnd = text.indexOf('\n', start) + 1;
  const indent = text.slice(text.lastIndexOf('\n', end) + 1, end);
  writeFileSync(path, text.slice(0, lineEnd) + lines.map((l) => `${indent}${l}\n`).join('') + text.slice(end - indent.length));
}

/** Where each fish starts: spread through the tank at its kind's depth, clear of the tunnel. */
function starts() {
  const random = randoms(41);
  const out = [];
  for (const k of KINDS) {
    for (let i = 0; i < k.count; i++) {
      let p;
      do {
        p = [TANK.min[0] + 1 + random() * (TANK.max[0] - TANK.min[0] - 2), k.depth[0] + random() * (k.depth[1] - k.depth[0]), TANK.min[2] + 1.5 + random() * (TANK.max[2] - TANK.min[2] - 3)];
      } while (Math.hypot(p[0], p[1]) < TUNNEL.radius + k.clearance + 0.5);
      out.push({ kind: k, id: `${k.kind}-${i + 1}`, at: p, turn: random() * 360 });
    }
  }
  return out;
}

function page() {
  const decorLines = [
    ...[...ROCKS, ...ROCKWORK].map((r) => `<model src="models/boulder.glb" position="${vec(...r.at)}" rotation="0 ${fixed(r.turn)} 0" scale="${fixed(r.scale)}" />`),
    ...LOGS.map((r) => `<model src="models/log.glb" position="${vec(...r.at)}" rotation="0 ${fixed(r.turn)} 0" scale="${fixed(r.scale)}" />`),
    ...SHELLS.map((r) => `<model src="models/shell.glb" position="${vec(...r.at)}" rotation="0 ${fixed(r.turn)} 0" scale="${fixed(r.scale)}" />`),
    ...AIRSTONES.map((a) => `<model src="models/airstone.glb" position="${vec(...a)}" />`),
  ];
  const plantLines = PLANTS.map((p) => `<model src="models/${p.kind}.glb" position="${vec(...p.at)}" rotation="0 ${fixed(p.turn)} 0" animation="Sway" autoplay />`);
  const soundLines = AIRSTONES.map((a, i) => `<sound id="bubbler-${i + 1}" src="sounds/bubbles.wav" position="${vec(a[0], a[1] + 0.3, a[2])}" range="9" volume="0.8" loop autoplay />`);
  const fishLines = [];
  const buttons = [];
  for (const f of starts()) {
    fishLines.push(`<model id="${f.id}" src="models/${f.kind.kind}.glb" position="${vec(...f.at)}" rotation="0 ${fixed(f.turn)} 0" animation="Swim" autoplay />`);
    // Each kind's first fish is a button in the outline too: for the keyboard and screen readers, "About" it.
    if (f.id.endsWith('-1')) buttons.push(`<sound src="sounds/blip.wav" begin="click" trigger="#${f.id}" label="About ${f.kind.about}" volume="0.5" />`);
  }
  between('index.holoml', 'the tank', [...decorLines, ...plantLines]);
  between('index.holoml', 'bubblers', soundLines);
  between('index.holoml', 'the fish', [...fishLines, ...buttons]);
}

// ---- Credits ------------------------------------------------------------------------------

function credits() {
  const ph = JSON.parse(readFileSync(join(POLYHAVEN, 'credits.json'), 'utf8'));
  const lines = [
    '# What the aquarium is made of',
    '',
    '## The fish',
    '',
    'Each fish was fitted for the tank by tools/prepare.mjs: its materials',
    'made drawable by three.js, turned, sized, and centred, its pictures made',
    'smaller, and, where its file had no swim, given a skeleton and one (made',
    'here). The Sketchfab models come from Objaverse, the Allen Institute for',
    "AI's copy of Sketchfab's free models (huggingface.co/datasets/allenai/objaverse),",
    'whose records give their authors and licences.',
    '',
    ...FISH.map((f) => `- ${f.id}.glb, ${f.name}: "${f.credit.title}" by ${f.credit.author}, ${f.credit.source}, ${f.credit.licence}.`),
    '',
    '## From Poly Haven (CC0)',
    '',
    'The boulder and the log made lighter (fewer triangles); every picture at 1k:',
    '',
    ...ph.map((a) => `- ${a.name} by ${a.authors.join(' and ')}, ${a.page} (${a.kind === 'texture' ? 'the sand' : a.id === 'boulder_01' ? 'boulder.glb' : a.id === 'lambis_shell' ? 'shell.glb' : 'log.glb'}).`),
    '',
    '## Made here',
    '',
    'The tank, the tunnel, the gallery, the plants and their sway, the',
    'bubbles, the food, the air stones, and the sounds (water, bubbles, the',
    "food's plop, and the fish buttons' blip) are made by tools/prepare.mjs.",
  ];
  writeFileSync(join(MODELS, 'CREDITS.md'), `${lines.join('\n')}\n`);
}

app.whenReady().then(() => {
  try {
    mkdirSync(MODELS, { recursive: true });
    fish();
    decor();
    tank();
    sounds();
    page();
    credits();
    const total = sizes.reduce((n, [, b]) => n + b, 0);
    console.log(`${sizes.length} models, ${(total / 1e6).toFixed(1)} MB`);
  } catch (e) {
    console.error(e);
    app.exit(1);
    return;
  }
  app.quit();
});
