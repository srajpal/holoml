// Fits a fish's own glTF file for the tank (the aquarium's tools,
// prepare.mjs), keeping its meshes, skeleton, and one swimming clip:
//
// - materials in the older specular-glossiness form, which three.js no
//   longer reads, become metal-rough (their diffuse picture the base
//   colour); unlit ones are lit; colours kept in the vertices for another
//   viewer's animation are dropped;
// - the file is turned so that the fish's head faces +z, scaled to its
//   length, and centred on its middle, by a new root node;
// - its swimming clip is kept as "Swim" (moving on the spot: the skeleton's
//   root does not travel) and its other clips are dropped;
// - a file more detailed than the tank needs is made lighter, to at most
//   `triangles` for the whole fish (shapes.mjs thinTo), keeping each
//   vertex's joints and weights.
//
// The binary chunk is packed again with only what is kept, and pictures
// come from the caller (resized there).

import { GlbWriter, multiply, nodeMatrix, readAccessor, transformPoint } from './glb.mjs';
import { budgetShares, thinTo } from './shapes.mjs';

const TURN = {
  '+z': [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  '-z': [-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1],
  '+x': [0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1],
  '-x': [0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
};

/** Materials three.js can draw: metal-rough and lit, whatever form the file used. */
export function fitMaterials(g) {
  return (g.materials ?? []).map((m) => {
    const out = { ...m, extensions: { ...(m.extensions ?? {}) } };
    const sg = out.extensions.KHR_materials_pbrSpecularGlossiness;
    if (sg) {
      out.pbrMetallicRoughness = {
        ...(sg.diffuseTexture ? { baseColorTexture: sg.diffuseTexture } : {}),
        baseColorFactor: sg.diffuseFactor ?? [1, 1, 1, 1],
        metallicFactor: 0,
        roughnessFactor: Math.min(0.8, Math.max(0.35, 1 - (sg.glossinessFactor ?? 0.6))),
      };
      delete out.extensions.KHR_materials_pbrSpecularGlossiness;
    }
    if (out.extensions.KHR_materials_unlit) {
      delete out.extensions.KHR_materials_unlit;
      out.pbrMetallicRoughness = { ...(out.pbrMetallicRoughness ?? {}), metallicFactor: 0, roughnessFactor: 0.5 };
    }
    if (!Object.keys(out.extensions).length) delete out.extensions;
    return out;
  });
}

/** Each node's matrix in the file's world, at rest. */
function worldMatrices(g) {
  const world = new Array(g.nodes.length);
  const visit = (i, parent) => {
    world[i] = multiply(parent, nodeMatrix(g.nodes[i]));
    for (const c of g.nodes[i].children ?? []) visit(c, world[i]);
  };
  for (const r of g.scenes[g.scene ?? 0].nodes) visit(r, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  return world;
}

/**
 * The fish's box as three.js draws it at the start of `clip` (or at rest
 * without one), in the file's world: each skinned vertex placed by its
 * joints' weights (joint world matrix times inverse bind matrix), other
 * meshes by their nodes.
 */
function poseBox(g, bin, clip) {
  const nodes = g.nodes.map((n) => ({ ...n }));
  const a = clip ? (g.animations ?? []).find((x) => x.name === clip) : null;
  for (const c of a?.channels ?? []) {
    const size = { translation: 3, rotation: 4, scale: 3 }[c.target.path];
    if (!size || nodes[c.target.node].matrix) continue;
    nodes[c.target.node][c.target.path] = Array.from(readAccessor(g, bin, a.samplers[c.sampler].output).subarray(0, size));
  }
  const world = worldMatrices({ ...g, nodes });
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const add = (q) => {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], q[k]);
      max[k] = Math.max(max[k], q[k]);
    }
  };
  nodes.forEach((n, i) => {
    if (n.mesh === undefined || !world[i]) return;
    const skin = n.skin !== undefined ? g.skins[n.skin] : null;
    const ibm = skin?.inverseBindMatrices !== undefined ? readAccessor(g, bin, skin.inverseBindMatrices) : null;
    const jointMatrices = skin ? skin.joints.map((j, k) => multiply(world[j], ibm ? Array.from(ibm.subarray(k * 16, k * 16 + 16)) : [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])) : null;
    for (const p of g.meshes[n.mesh].primitives) {
      const pos = readAccessor(g, bin, p.attributes.POSITION);
      const js = skin && p.attributes.JOINTS_0 !== undefined ? readAccessor(g, bin, p.attributes.JOINTS_0) : null;
      const ws = skin && p.attributes.WEIGHTS_0 !== undefined ? readAccessor(g, bin, p.attributes.WEIGHTS_0) : null;
      for (let v = 0; v < pos.length / 3; v++) {
        const at = [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]];
        if (!js || !ws) {
          add(transformPoint(world[i], at));
          continue;
        }
        const q = [0, 0, 0];
        let total = 0;
        for (let k = 0; k < 4; k++) {
          const wk = ws[v * 4 + k];
          if (!wk) continue;
          const r = transformPoint(jointMatrices[js[v * 4 + k]], at);
          q[0] += r[0] * wk;
          q[1] += r[1] * wk;
          q[2] += r[2] * wk;
          total += wk;
        }
        if (total > 0) add(q.map((x) => x / total));
      }
    }
  });
  return { min, max };
}

/**
 * The fish's file, fitted: its glTF and a GlbWriter with its data (the
 * caller adds the pictures with images()). `pictures(index)` gives the
 * new bytes and type of each of the file's images.
 */
/** A primitive's triangles. */
function trianglesOf(g, p) {
  return (p.indices !== undefined ? g.accessors[p.indices].count : g.accessors[p.attributes.POSITION].count) / 3;
}

/** A primitive as a mesh for thinTo: its positions, normals, picture coordinates, and indices, with its joints and weights kept. */
function primitiveMesh(g, bin, p) {
  const read = (k) => (p.attributes[k] !== undefined ? readAccessor(g, bin, p.attributes[k]) : null);
  const positions = Float32Array.from(read('POSITION'));
  const normals = read('NORMAL');
  const uvs = read('TEXCOORD_0');
  const extra = {};
  for (const k of ['JOINTS_0', 'WEIGHTS_0']) {
    const data = read(k);
    if (data) extra[k] = { data, size: 4 };
  }
  const count = positions.length / 3;
  const indices = p.indices !== undefined ? Uint32Array.from(readAccessor(g, bin, p.indices)) : Uint32Array.from({ length: count }, (_, i) => i);
  return { positions, normals: normals ? Float32Array.from(normals) : null, uvs: uvs ? Float32Array.from(uvs) : null, indices, extra, material: p.material };
}

export function fitFish(name, g, bin, { forward, length, clip, triangles }, pictures) {
  const turn = TURN[forward];
  const box = poseBox(g, bin, clip);
  const turned = [0, 1, 2].map(() => [Infinity, -Infinity]);
  for (const x of [box.min[0], box.max[0]]) {
    for (const y of [box.min[1], box.max[1]]) {
      for (const z of [box.min[2], box.max[2]]) {
        const p = transformPoint(turn, [x, y, z]);
        for (let k = 0; k < 3; k++) turned[k] = [Math.min(turned[k][0], p[k]), Math.max(turned[k][1], p[k])];
      }
    }
  }
  const scale = length / (turned[2][1] - turned[2][0]);
  const centre = turned.map(([a, b]) => (a + b) / 2);
  // The new root: scale, then the turn, after moving the middle to the origin (in the turned frame).
  const root = multiply([scale, 0, 0, 0, 0, scale, 0, 0, 0, 0, scale, 0, -centre[0] * scale, -centre[1] * scale, -centre[2] * scale, 1], turn);

  const json = {
    asset: { version: '2.0', generator: 'HoloML examples/aquarium/tools/prepare.mjs' },
    scene: 0,
    scenes: [{ name, nodes: [g.nodes.length] }],
    nodes: [...g.nodes.map((n) => ({ ...n })), { name, matrix: root, children: [...g.scenes[g.scene ?? 0].nodes] }],
    meshes: g.meshes,
    materials: fitMaterials(g),
    ...(g.skins ? { skins: g.skins.map((s) => ({ ...s })) } : {}),
    ...(g.textures ? { textures: g.textures, samplers: g.samplers ?? [] } : {}),
    animations: [],
  };
  // Vertex colours for another viewer's animation are not colours: dropped.
  json.meshes = g.meshes.map((m) => ({ ...m, primitives: m.primitives.map((p) => ({ ...p, attributes: Object.fromEntries(Object.entries(p.attributes).filter(([k]) => k !== 'COLOR_0')) })) }));

  const w = new GlbWriter(json);
  const moved = new Map(); // old accessor index -> new
  const copy = (index, opts = {}) => {
    if (index === undefined) return undefined;
    if (moved.has(index)) return moved.get(index);
    const a = g.accessors[index];
    let data = readAccessor(g, bin, index);
    if (data instanceof Int8Array || data instanceof Int16Array) data = Float32Array.from(data);
    const next = w.accessor(data, a.type, { bounds: opts.bounds ?? false, target: opts.target });
    moved.set(index, next);
    return next;
  };
  // The whole fish's triangles, shared among its big parts when it is made lighter (small ones are kept).
  const parts = json.meshes.flatMap((m) => m.primitives);
  const shares = triangles ? budgetShares(parts.map((p) => trianglesOf(g, p)), triangles) : parts.map(() => Infinity);
  for (const m of json.meshes) {
    for (const p of m.primitives) {
      const share = shares[parts.indexOf(p)];
      if (trianglesOf(g, p) > share && !p.targets) {
        const thin = thinTo(primitiveMesh(g, bin, p), share);
        const attributes = {
          POSITION: w.accessor(thin.positions, 'VEC3', { bounds: true, target: 34962 }),
          NORMAL: w.accessor(thin.normals, 'VEC3', { target: 34962 }),
        };
        if (thin.uvs) attributes.TEXCOORD_0 = w.accessor(thin.uvs, 'VEC2', { target: 34962 });
        for (const [k, { data }] of Object.entries(thin.extra ?? {})) attributes[k] = w.accessor(data, 'VEC4', { target: 34962 });
        p.attributes = attributes;
        p.indices = w.accessor(thin.indices, 'SCALAR', { target: 34963 });
        continue;
      }
      p.attributes = Object.fromEntries(Object.entries(p.attributes).map(([k, v]) => [k, copy(v, { bounds: k === 'POSITION', target: 34962 })]));
      if (p.indices !== undefined) p.indices = copy(p.indices, { target: 34963 });
      if (p.targets) p.targets = p.targets.map((t) => Object.fromEntries(Object.entries(t).map(([k, v]) => [k, copy(v, { bounds: k === 'POSITION' })])));
    }
  }
  for (const s of json.skins ?? []) if (s.inverseBindMatrices !== undefined) s.inverseBindMatrices = copy(s.inverseBindMatrices);

  if (clip) {
    const a = (g.animations ?? []).find((x) => x.name === clip);
    if (!a) throw new Error(`${name}: no clip named ${clip}`);
    // The skeleton's top joints, and the nodes above them, stay where they are: the fish swims on the spot, and the page moves it.
    const parents = new Map();
    g.nodes.forEach((n, i) => (n.children ?? []).forEach((c) => parents.set(c, i)));
    const joints = new Set((g.skins ?? []).flatMap((s) => s.joints));
    const tops = new Set([...joints].filter((j) => !joints.has(parents.get(j))));
    for (const j of [...tops]) for (let p = parents.get(j); p !== undefined; p = parents.get(p)) tops.add(p);
    const samplers = a.samplers.map((s, i) => {
      const channel = a.channels.find((c) => c.sampler === i);
      const input = copy(s.input);
      if (channel?.target.path === 'translation' && tops.has(channel.target.node)) {
        const values = readAccessor(g, bin, s.output);
        const first = Array.from(values.subarray(0, 3));
        const still = Float32Array.from(values, (_, k) => first[k % 3]);
        return { input, output: w.accessor(still, 'VEC3'), interpolation: s.interpolation ?? 'LINEAR' };
      }
      return { input, output: copy(s.output), interpolation: s.interpolation ?? 'LINEAR' };
    });
    json.animations.push({ name: 'Swim', channels: a.channels.map((c) => ({ ...c, target: { ...c.target } })), samplers });
  }
  if (!json.animations.length) delete json.animations;
  if (g.images) {
    json.images = g.images.map((im, i) => {
      const p = pictures(i);
      return { ...(im.name ? { name: im.name } : {}), mimeType: p.mimeType, bufferView: w.bytes(p.bytes) };
    });
  }
  return { json, writer: w };
}
