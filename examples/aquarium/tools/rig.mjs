// Gives a fish a skeleton and a swim, for fish whose files have none
// (the aquarium's tools, prepare.mjs).
//
// Its meshes are joined in the file's own world (every node's transform
// applied), turned so that its head faces +z and its back is up, scaled
// to its length in metres, and centred on its middle. A chain of bones
// runs from behind its head to the root of its tail; each vertex follows
// the two bones nearest it along the body, and the head stays stiff.
// "Swim" bends the body in a wave that runs from head to tail and
// repeats, as a fish's does: small at the head, most at the tail.

import { GlbWriter, axisAngle, multiply, nodeMatrix, readAccessor, transformDirection, transformPoint } from './glb.mjs';

/** Turns the model's forward axis to +z (its back stays up, +y). */
const TURN = {
  '+z': [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  '-z': [-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1],
  '+x': [0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1],
  '-x': [0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
};

/**
 * Every mesh of the file's scene, with what places it in the file's world
 * at rest: its node's matrix, or, for a skinned mesh (whose own node does
 * not place it), the matrix of each of its joints times its inverse bind
 * matrix, to blend by the vertex's weights.
 */
function placedMeshes(g, bin) {
  const world = new Array(g.nodes.length);
  const visit = (index, parent) => {
    world[index] = multiply(parent, nodeMatrix(g.nodes[index]));
    for (const c of g.nodes[index].children ?? []) visit(c, world[index]);
  };
  for (const root of g.scenes[g.scene ?? 0].nodes) visit(root, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const out = [];
  g.nodes.forEach((n, i) => {
    if (n.mesh === undefined || !world[i]) return;
    if (n.skin === undefined) {
      out.push({ mesh: g.meshes[n.mesh], matrix: world[i], joints: null });
      return;
    }
    const s = g.skins[n.skin];
    const ibm = s.inverseBindMatrices !== undefined ? readAccessor(g, bin, s.inverseBindMatrices) : null;
    const joints = s.joints.map((j, k) => multiply(world[j], ibm ? Array.from(ibm.subarray(k * 16, k * 16 + 16)) : [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));
    out.push({ mesh: g.meshes[n.mesh], matrix: world[i], joints });
  });
  return out;
}

/** A vertex's matrix: its node's, or its joints' blended by its weights. */
function vertexMatrix(placed, js, ws, v) {
  if (!placed.joints || !js || !ws) return placed.matrix;
  const m = new Array(16).fill(0);
  let total = 0;
  for (let k = 0; k < 4; k++) {
    const w = ws[v * 4 + k];
    if (!w) continue;
    const j = placed.joints[js[v * 4 + k]];
    for (let e = 0; e < 16; e++) m[e] += j[e] * w;
    total += w;
  }
  return total > 0 ? m.map((x) => x / total) : placed.matrix;
}

/**
 * The fish's primitives in its new place (head to +z, centred, `length`
 * metres long): positions, normals, texture places, triangles, and the
 * file's material index of each.
 */
export function placedFish(g, bin, { forward, length, id }) {
  const turn = TURN[forward];
  if (!turn) throw new Error(`forward must be one of ${Object.keys(TURN).join(', ')}`);
  const prims = [];
  for (const placed of placedMeshes(g, bin)) {
    for (const p of placed.mesh.primitives) {
      if ((p.mode ?? 4) !== 4) continue; // triangles only (a fish has no lines or points)
      const pos = readAccessor(g, bin, p.attributes.POSITION);
      const nor = p.attributes.NORMAL !== undefined ? readAccessor(g, bin, p.attributes.NORMAL) : null;
      const uv = p.attributes.TEXCOORD_0 !== undefined ? readAccessor(g, bin, p.attributes.TEXCOORD_0) : null;
      const js = p.attributes.JOINTS_0 !== undefined ? readAccessor(g, bin, p.attributes.JOINTS_0) : null;
      const ws = p.attributes.WEIGHTS_0 !== undefined ? readAccessor(g, bin, p.attributes.WEIGHTS_0) : null;
      const count = pos.length / 3;
      const positions = new Float32Array(count * 3);
      const normals = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const m = multiply(turn, vertexMatrix(placed, js, ws, i));
        positions.set(transformPoint(m, [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]]), i * 3);
        if (nor) normals.set(transformDirection(m, [nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]]), i * 3);
      }
      const indices = p.indices !== undefined ? Uint32Array.from(readAccessor(g, bin, p.indices)) : Uint32Array.from({ length: count }, (_, i) => i);
      prims.push({ positions, normals: nor ? normals : null, uvs: uv ? Float32Array.from(uv) : null, indices, material: p.material });
    }
  }
  // Straightened: turned about the up axis so that its body's main direction across the ground lies along z
  // (some files have the fish turned a little).
  let [n, mx, mz] = [0, 0, 0];
  for (const p of prims) for (let i = 0; i < p.positions.length; i += 3) [n, mx, mz] = [n + 1, mx + p.positions[i], mz + p.positions[i + 2]];
  [mx, mz] = [mx / n, mz / n];
  let [sxx, szz, sxz] = [0, 0, 0];
  for (const p of prims) {
    for (let i = 0; i < p.positions.length; i += 3) {
      const [x, z] = [p.positions[i] - mx, p.positions[i + 2] - mz];
      [sxx, szz, sxz] = [sxx + x * x, szz + z * z, sxz + x * z];
    }
  }
  const phi = 0.5 * Math.atan2(2 * sxz, szz - sxx);
  const [c, s] = [Math.cos(-phi), Math.sin(-phi)];
  for (const p of prims) {
    for (const v of [p.positions, p.normals]) {
      if (!v) continue;
      for (let i = 0; i < v.length; i += 3) [v[i], v[i + 2]] = [v[i] * c + v[i + 2] * s, -v[i] * s + v[i + 2] * c];
    }
  }
  if (Math.abs(phi) > 0.01) console.log(`${id ?? "a fish"}: straightened by ${((phi * 180) / Math.PI).toFixed(1)} degrees`);
  // Centred on its middle, and scaled to its length along z.
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of prims) {
    for (let i = 0; i < p.positions.length; i++) {
      min[i % 3] = Math.min(min[i % 3], p.positions[i]);
      max[i % 3] = Math.max(max[i % 3], p.positions[i]);
    }
  }
  const scale = length / (max[2] - min[2]);
  const centre = [0, 1, 2].map((k) => (min[k] + max[k]) / 2);
  for (const p of prims) {
    for (let i = 0; i < p.positions.length; i++) p.positions[i] = (p.positions[i] - centre[i % 3]) * scale;
  }
  return prims;
}

/**
 * Writes a fish with a skeleton and "Swim" into a glTF (JSON and a
 * GlbWriter), from placedFish's primitives and the file's own materials
 * (already made fit for the viewer) and textures (the writer's images are
 * put in by the caller).
 *
 *   bones   how many bones along the body (default 6)
 *   beat    how long one beat of the tail takes, in seconds (default 1)
 *   sway    how far the tail swings each way, roughly, in degrees (default 30)
 *   bend    where along the body the bones run, as fractions of its length
 *           from its middle (ahead positive): default [0.15, -0.38], from
 *           behind the head to the root of the tail; a tuna bends only
 *           behind its middle
 */
export function riggedFish(name, prims, { materials, length, bones = 6, beat = 1, sway = 30, bend = [0.15, -0.38] }) {
  const [from, to] = bend;
  const zs = Array.from({ length: bones }, (_, k) => length * (from + ((to - from) * k) / (bones - 1)));
  const json = {
    asset: { version: '2.0', generator: 'HoloML examples/aquarium/tools/prepare.mjs' },
    scene: 0,
    scenes: [{ name, nodes: [0] }],
    nodes: [
      { name, children: [1, 2] },
      { name: `${name}-body`, mesh: 0, skin: 0 },
      ...zs.map((z, k) => ({ name: `${name}-bone-${k}`, translation: [0, 0, k === 0 ? z : z - zs[k - 1]], ...(k < bones - 1 ? { children: [3 + k] } : {}) })),
    ],
    materials,
    meshes: [{ name: `${name}-body`, primitives: [] }],
    skins: [{ name: `${name}-skeleton`, joints: zs.map((_, k) => 2 + k), skeleton: 2 }],
    animations: [],
  };
  const w = new GlbWriter(json);
  for (const p of prims) {
    const count = p.positions.length / 3;
    const joints = new Uint8Array(count * 4);
    const weights = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const z = p.positions[i * 3 + 2];
      let a = 0;
      let t = 0;
      if (z <= zs[bones - 1]) [a, t] = [bones - 1, 0];
      else if (z < zs[0]) {
        while (a < bones - 2 && z < zs[a + 1]) a++;
        t = (zs[a] - z) / (zs[a] - zs[a + 1]);
        t = t * t * (3 - 2 * t); // eased, so the body bends smoothly between bones
      }
      joints.set([a, Math.min(a + 1, bones - 1), 0, 0], i * 4);
      weights.set([1 - t, t, 0, 0], i * 4);
    }
    json.meshes[0].primitives.push({
      attributes: {
        POSITION: w.accessor(p.positions, 'VEC3', { target: 34962, bounds: true }),
        ...(p.normals ? { NORMAL: w.accessor(p.normals, 'VEC3', { target: 34962 }) } : {}),
        ...(p.uvs ? { TEXCOORD_0: w.accessor(p.uvs, 'VEC2', { target: 34962 }) } : {}),
        JOINTS_0: w.accessor(joints, 'VEC4', { target: 34962 }),
        WEIGHTS_0: w.accessor(weights, 'VEC4', { target: 34962 }),
      },
      indices: w.accessor(p.indices, 'SCALAR', { target: 34963 }),
      ...(p.material !== undefined ? { material: p.material } : {}),
    });
  }
  // Each bone's inverse bind matrix: its place along the body, undone.
  const ibm = new Float32Array(bones * 16);
  zs.forEach((z, k) => ibm.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -z, 1], k * 16));
  json.skins[0].inverseBindMatrices = w.accessor(ibm, 'MAT4');
  // Swim: each bone turns about the up axis, more toward the tail and a little later than the one before.
  const steps = 32;
  const times = Float32Array.from({ length: steps + 1 }, (_, i) => (beat * i) / steps);
  const input = w.accessor(times, 'SCALAR', { bounds: true });
  const channels = [];
  const samplers = [];
  const per = (sway * Math.PI) / 180 / 2.6;
  for (let k = 0; k < bones; k++) {
    // The head sways a little against the tail; then more and more toward the tail.
    const amplitude = k === 0 ? -0.18 * per : per * Math.pow(k / (bones - 1), 1.5);
    const lag = 0.75 * k;
    const quats = new Float32Array((steps + 1) * 4);
    for (let i = 0; i <= steps; i++) quats.set(axisAngle([0, 1, 0], amplitude * Math.sin((2 * Math.PI * i) / steps - lag)), i * 4);
    samplers.push({ input, output: w.accessor(quats, 'VEC4'), interpolation: 'LINEAR' });
    channels.push({ sampler: k, target: { node: 2 + k, path: 'rotation' } });
  }
  json.animations.push({ name: 'Swim', channels, samplers });
  return { json, writer: w };
}
