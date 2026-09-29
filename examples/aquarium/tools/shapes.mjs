// Shapes for the aquarium's own models (prepare.mjs): the tank, the
// tunnel, the gallery, the sand, the water's surface, bubbles, food, and
// swaying plants; a thinner copy of a detailed model; and writing a
// model's parts and materials into a .glb file.

import { GlbWriter, axisAngle } from './glb.mjs';

export const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** A colour from "#rrggbb" to glTF's linear red, green, and blue. */
export function linear(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
}

/** A glTF material: a colour (sRGB), how rough and how metallic, a glow, see-through, both sides, and pictures by texture index. */
export function material(name, { color = '#ffffff', rough = 0.8, metal = 0, glow, opacity = 1, doubleSided = false, map, normalMap, roughnessMap, unlit = false } = {}) {
  const m = {
    name,
    pbrMetallicRoughness: {
      baseColorFactor: [...linear(color), opacity],
      metallicFactor: metal,
      roughnessFactor: rough,
      ...(map !== undefined ? { baseColorTexture: { index: map } } : {}),
      ...(roughnessMap !== undefined ? { metallicRoughnessTexture: { index: roughnessMap } } : {}),
    },
    ...(normalMap !== undefined ? { normalTexture: { index: normalMap } } : {}),
  };
  if (opacity < 1) m.alphaMode = 'BLEND';
  if (glow) m.emissiveFactor = linear(glow);
  if (doubleSided) m.doubleSided = true;
  if (unlit) m.extensions = { KHR_materials_unlit: {} };
  return m;
}

/** A flat rectangle: its corner, two edges (its front is where u × v points), its material, and how its picture tiles (metres a tile). */
export function quad(origin, u, v, mat, tile = null) {
  const n = cross(u, v);
  if (len(n) < 1e-9) return [];
  const normal = unit(n);
  const p = [origin, add3(origin, u), add3(add3(origin, u), v), add3(origin, v)];
  const [su, sv] = tile ? [len(u) / tile, len(v) / tile] : [1, 1];
  return [{ positions: p.flat(), normals: [normal, normal, normal, normal].flat(), uvs: [0, sv, su, sv, su, 0, 0, 0], indices: [0, 1, 2, 0, 2, 3], material: mat }];
}

/** A box between two corners, its faces outward; `skip` leaves faces out ("top", "bottom", "left", "right", "front", "back"). */
export function box(min, max, mat, { skip = [], tile = null } = {}) {
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
    .flatMap(([, [o, u, v]]) => quad(o, u, v, mat, tile));
}

/**
 * A half-cylinder along z over the ground (the tunnel's glass): radius r,
 * from z0 to z1, its outside facing out (both sides are drawn where the
 * material says so).
 */
export function arch(r, z0, z1, mat, { segments = 40, rings = 26 } = {}) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  for (let j = 0; j <= rings; j++) {
    const z = z0 + ((z1 - z0) * j) / rings;
    for (let i = 0; i <= segments; i++) {
      const a = (Math.PI * i) / segments;
      const [c, s] = [Math.cos(a), Math.sin(a)];
      positions.push(r * c, r * s, z);
      normals.push(c, s, 0);
      uvs.push(i / segments, j / rings);
    }
  }
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i;
      const b = a + segments + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return [{ positions, normals, uvs, indices, material: mat }];
}

/** A ring of the tunnel's frame: a flat band following the arch at z, `width` along z and `depth` out from the glass. */
export function archRing(r, z, width, depth, mat, segments = 40) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const faces = [
    [r + depth, 1, 0], // outside, facing out
    [r - 0.01, -1, 0], // inside, facing in
  ];
  for (const [radius, out] of faces) {
    const base = positions.length / 3;
    for (let i = 0; i <= segments; i++) {
      const a = (Math.PI * i) / segments;
      const [c, s] = [Math.cos(a), Math.sin(a)];
      for (const dz of [-width / 2, width / 2]) {
        positions.push(radius * c, radius * s, z + dz);
        normals.push(c * out, s * out, 0);
        uvs.push(i / segments, dz > 0 ? 1 : 0);
      }
    }
    for (let i = 0; i < segments; i++) {
      const k = base + i * 2;
      if (out > 0) indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      else indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  return [{ positions, normals, uvs, indices, material: mat }];
}

/**
 * Ground as a height field: a grid over x0..x1 and z0..z1, `step` metres
 * apart, its height from height(x, z), its picture tiling every `tile`
 * metres; normals from the slopes.
 */
export function ground(x0, x1, z0, z1, step, height, mat, tile) {
  const nx = Math.round((x1 - x0) / step);
  const nz = Math.round((z1 - z0) / step);
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const [x, z] = [x0 + i * step, z0 + j * step];
      const y = height(x, z);
      const e = step / 2;
      const n = unit([height(x - e, z) - height(x + e, z), 2 * e, height(x, z - e) - height(x, z + e)]);
      positions.push(x, y, z);
      normals.push(...n);
      uvs.push(x / tile, z / tile);
    }
  }
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      const b = a + nx + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return [{ positions, normals, uvs, indices, material: mat }];
}

/** A round thing (a bubble, a stone): an ellipsoid of `rings` by `segments`. */
export function ellipsoid(centre, radii, mat, { segments = 16, rings = 10 } = {}) {
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
  return [{ positions, normals, uvs, indices, material: mat }];
}

/** Joins the parts of each material into one primitive. */
export function merge(parts) {
  const byMaterial = new Map();
  for (const p of parts) byMaterial.set(p.material, [...(byMaterial.get(p.material) ?? []), p]);
  return [...byMaterial.entries()].map(([mat, list]) => {
    const indices = [];
    let base = 0;
    for (const p of list) {
      for (const i of p.indices) indices.push(i + base);
      base += p.positions.length / 3;
    }
    return {
      positions: new Float32Array(list.flatMap((p) => Array.from(p.positions))),
      normals: new Float32Array(list.flatMap((p) => Array.from(p.normals))),
      uvs: new Float32Array(list.flatMap((p) => Array.from(p.uvs))),
      indices: base > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
      material: mat,
      ...(list[0].joints ? { joints: new Uint8Array(list.flatMap((p) => Array.from(p.joints))), weights: new Float32Array(list.flatMap((p) => Array.from(p.weights))) } : {}),
    };
  });
}

/**
 * A thinner copy of a detailed mesh: vertices within the same `cell`
 * (metres) and the same part of the picture are joined into one, and
 * triangles that vanish are dropped; normals are made again.
 */
export function thinner(mesh, cell, uvCells = 48) {
  const { positions: p, uvs } = mesh;
  const clusters = new Map();
  const map = new Uint32Array(p.length / 3);
  for (let i = 0; i < p.length / 3; i++) {
    const key = `${Math.floor(p[i * 3] / cell)},${Math.floor(p[i * 3 + 1] / cell)},${Math.floor(p[i * 3 + 2] / cell)},${Math.floor(uvs[i * 2] * uvCells)},${Math.floor(uvs[i * 2 + 1] * uvCells)}`;
    let c = clusters.get(key);
    if (!c) {
      c = { index: clusters.size, p: [0, 0, 0], uv: [0, 0], n: 0 };
      clusters.set(key, c);
    }
    c.p = [c.p[0] + p[i * 3], c.p[1] + p[i * 3 + 1], c.p[2] + p[i * 3 + 2]];
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
  return { positions, normals, uvs: uv, indices: positions.length / 3 > 65535 ? Uint32Array.from(indices) : Uint16Array.from(indices), material: mesh.material };
}

/**
 * A plant that sways (seagrass or kelp): blades that rise from its foot,
 * each a thin strip made of `rows` pieces, leaning and curling a little;
 * a chain of bones up its middle that every blade follows by height; and
 * "Sway", a slow back-and-forth in two directions, as in a current.
 */
export function swayingPlant(name, { blades, height, spread, width, rows = 8, bones = 4, beat = 5, lean = 0.25, seed = 1, leaves = false }) {
  let s = seed;
  const random = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const joints = [];
  const weights = [];
  const top = height * 1.15;
  const boneY = Array.from({ length: bones }, (_, k) => (top * k) / bones);
  const follow = (y) => {
    const f = Math.min(bones - 1.0001, (y / top) * bones);
    const a = Math.floor(f);
    const t = f - a;
    return [[a, Math.min(a + 1, bones - 1), 0, 0], [1 - t, t, 0, 0]];
  };
  for (let b = 0; b < blades; b++) {
    const h = height * (0.55 + 0.45 * random());
    const angle = random() * Math.PI * 2;
    const r = spread * Math.sqrt(random());
    const foot = [r * Math.cos(angle), 0, r * Math.sin(angle)];
    const facing = random() * Math.PI;
    const side = [Math.cos(facing), 0, Math.sin(facing)];
    const tilt = [Math.cos(angle) * lean * random(), 0, Math.sin(angle) * lean * random()];
    const base = positions.length / 3;
    for (let i = 0; i <= rows; i++) {
      const t = i / rows;
      const y = h * t;
      // Narrower toward the tip; kelp's blade is widest in its middle.
      const w = width * (leaves ? Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.05)) * 1.6 : 1 - 0.7 * t);
      const centre = [foot[0] + tilt[0] * y * t, y, foot[2] + tilt[2] * y * t];
      const normal = unit(cross(side, [tilt[0] * t, 1, tilt[2] * t]));
      for (const k of [-0.5, 0.5]) {
        positions.push(centre[0] + side[0] * w * k, centre[1], centre[2] + side[2] * w * k);
        normals.push(...normal);
        uvs.push(k + 0.5, 1 - t);
        const [j, wt] = follow(y);
        joints.push(...j);
        weights.push(...wt);
      }
    }
    for (let i = 0; i < rows; i++) {
      const a = base + i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const nodes = [
    { name, children: [1, 2] },
    { name: `${name}-leaves`, mesh: 0, skin: 0 },
    ...boneY.map((y, k) => ({ name: `${name}-bone-${k}`, translation: [0, k === 0 ? 0 : boneY[k] - boneY[k - 1], 0], ...(k < bones - 1 ? { children: [3 + k] } : {}) })),
  ];
  const ibm = new Float32Array(bones * 16);
  boneY.forEach((y, k) => ibm.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -y, 0, 1], k * 16));
  // Sway: every bone leans a little, more toward the top, in a slow figure of two waves.
  const steps = 48;
  const times = Array.from({ length: steps + 1 }, (_, i) => (beat * i) / steps);
  const channels = boneY.map((_, k) => {
    const amount = (0.05 + 0.1 * (k / (bones - 1))) * (leaves ? 0.9 : 1.2);
    return times.map((_, i) => {
      const t = (2 * Math.PI * i) / steps;
      const qa = axisAngle([1, 0, 0], amount * Math.sin(t - 0.5 * k));
      const qb = axisAngle([0, 0, 1], amount * 0.6 * Math.sin(2 * t - 0.4 * k + 1));
      return [qa, qb];
    });
  });
  return {
    part: { positions, normals, uvs, indices, joints, weights },
    nodes,
    ibm,
    times: Float32Array.from(times),
    channels,
  };
}

/**
 * Writes a model's parts and their materials into a .glb file's bytes.
 * `textures` are the file's pictures in order ({ bytes, mimeType }), which
 * the materials name by index; `repeat` makes them tile.
 */
export function modelBytes(name, parts, materials, { textures = [], repeat = false } = {}) {
  const prims = merge(parts);
  const names = Object.keys(materials);
  const json = {
    asset: { version: '2.0', generator: 'HoloML examples/aquarium/tools/prepare.mjs' },
    scene: 0,
    scenes: [{ name, nodes: [0] }],
    nodes: [{ name, mesh: 0 }],
    meshes: [{ name, primitives: [] }],
    materials: names.map((n) => materials[n]),
  };
  if (names.some((n) => materials[n].extensions?.KHR_materials_unlit)) json.extensionsUsed = ['KHR_materials_unlit'];
  const w = new GlbWriter(json);
  for (const p of prims) {
    json.meshes[0].primitives.push({
      attributes: {
        POSITION: w.accessor(p.positions, 'VEC3', { target: 34962, bounds: true }),
        NORMAL: w.accessor(p.normals, 'VEC3', { target: 34962 }),
        TEXCOORD_0: w.accessor(p.uvs, 'VEC2', { target: 34962 }),
      },
      indices: w.accessor(p.indices, 'SCALAR', { target: 34963 }),
      material: names.indexOf(p.material),
    });
  }
  addTextures(json, w, textures, repeat);
  return w.write();
}

function addTextures(json, w, textures, repeat) {
  if (!textures.length) return;
  json.images = textures.map((t) => ({ mimeType: t.mimeType, bufferView: w.bytes(t.bytes) }));
  json.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: repeat ? 10497 : 33071, wrapT: repeat ? 10497 : 33071 }];
  json.textures = textures.map((_, i) => ({ source: i, sampler: 0 }));
}

/** Writes a swaying plant (swayingPlant) with its material into a .glb file's bytes. */
export function plantBytes(plant, mat) {
  const { part, nodes, ibm, times, channels } = plant;
  const json = {
    asset: { version: '2.0', generator: 'HoloML examples/aquarium/tools/prepare.mjs' },
    scene: 0,
    scenes: [{ name: nodes[0].name, nodes: [0] }],
    nodes,
    meshes: [{ name: nodes[1].name, primitives: [] }],
    materials: [mat],
    skins: [{ joints: nodes.slice(2).map((_, k) => 2 + k), skeleton: 2 }],
    animations: [{ name: 'Sway', channels: [], samplers: [] }],
  };
  const w = new GlbWriter(json);
  json.meshes[0].primitives.push({
    attributes: {
      POSITION: w.accessor(Float32Array.from(part.positions), 'VEC3', { target: 34962, bounds: true }),
      NORMAL: w.accessor(Float32Array.from(part.normals), 'VEC3', { target: 34962 }),
      TEXCOORD_0: w.accessor(Float32Array.from(part.uvs), 'VEC2', { target: 34962 }),
      JOINTS_0: w.accessor(Uint8Array.from(part.joints), 'VEC4', { target: 34962 }),
      WEIGHTS_0: w.accessor(Float32Array.from(part.weights), 'VEC4', { target: 34962 }),
    },
    indices: w.accessor(part.positions.length / 3 > 65535 ? Uint32Array.from(part.indices) : Uint16Array.from(part.indices), 'SCALAR', { target: 34963 }),
    material: 0,
  });
  json.skins[0].inverseBindMatrices = w.accessor(ibm, 'MAT4');
  const input = w.accessor(times, 'SCALAR', { bounds: true });
  channels.forEach((frames, k) => {
    const quats = new Float32Array(frames.length * 4);
    frames.forEach(([qa, qb], i) => {
      // Two small turns, one after the other.
      const [ax, ay, az, aw] = qa;
      const [bx, by, bz, bw] = qb;
      quats.set([aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx, aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz], i * 4);
    });
    json.animations[0].samplers.push({ input, output: w.accessor(quats, 'VEC4'), interpolation: 'LINEAR' });
    json.animations[0].channels.push({ sampler: k, target: { node: 2 + k, path: 'rotation' } });
  });
  return w.write();
}
