// Reading and writing binary glTF (.glb) files for the aquarium's tools,
// without any package: a file's JSON and its one binary chunk, the
// numbers an accessor holds, and a writer that packs new data and
// pictures after it.

import { readFileSync } from 'node:fs';
import { Chunk, glbBytes } from '../../tools/shapes.mjs';

const COMPONENTS = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const SIZES = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

/** A .glb file's JSON and binary chunk. */
export function readGlb(file) {
  const b = readFileSync(file);
  if (b.toString('latin1', 0, 4) !== 'glTF') throw new Error(`${file}: not a binary glTF file`);
  const jsonLength = b.readUInt32LE(12);
  const json = JSON.parse(b.toString('utf8', 20, 20 + jsonLength));
  const at = 20 + jsonLength;
  const bin = at + 8 <= b.length ? b.subarray(at + 8, at + 8 + b.readUInt32LE(at)) : Buffer.alloc(0);
  return { json, bin };
}

/** An accessor's numbers, as a typed array of its components (dense; sparse accessors are not used by these files). */
export function readAccessor(g, bin, index) {
  const a = g.accessors[index];
  if (a.sparse) throw new Error('sparse accessors are not read here');
  const Type = COMPONENTS[a.componentType];
  const size = SIZES[a.type];
  const out = new Type(a.count * size);
  if (a.bufferView === undefined) return out;
  const v = g.bufferViews[a.bufferView];
  const start = (v.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const stride = v.byteStride ?? size * Type.BYTES_PER_ELEMENT;
  const view = new DataView(bin.buffer, bin.byteOffset + start);
  const read = {
    5120: (o) => view.getInt8(o),
    5121: (o) => view.getUint8(o),
    5122: (o) => view.getInt16(o, true),
    5123: (o) => view.getUint16(o, true),
    5125: (o) => view.getUint32(o, true),
    5126: (o) => view.getFloat32(o, true),
  }[a.componentType];
  for (let i = 0; i < a.count; i++) {
    for (let k = 0; k < size; k++) out[i * size + k] = read(i * stride + k * Type.BYTES_PER_ELEMENT);
  }
  if (a.normalized) {
    const max = { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 }[a.componentType];
    return Float32Array.from(out, (x) => Math.max(x / max, -1));
  }
  return out;
}

/** A picture's bytes and type, from an image of the file. */
export function readImage(g, bin, index) {
  const im = g.images[index];
  if (im.bufferView === undefined) throw new Error(`image ${index} is not in the file`);
  const v = g.bufferViews[im.bufferView];
  return { bytes: Buffer.from(bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength)), mimeType: im.mimeType };
}

/**
 * Builds a new binary chunk: add() puts in a typed array (as an accessor
 * when given a type) or raw bytes, 4-byte aligned; write() makes the file.
 */
export class GlbWriter {
  constructor(json) {
    this.json = json;
    this.json.bufferViews = [];
    this.json.accessors = [];
    this.chunk = new Chunk();
  }

  /** Raw bytes as a buffer view; its index. */
  bytes(data, target) {
    const buf = Buffer.from(data.buffer ?? data, data.byteOffset ?? 0, data.byteLength ?? data.length);
    this.json.bufferViews.push({ buffer: 0, byteOffset: this.chunk.append(buf), byteLength: buf.length, ...(target ? { target } : {}) });
    return this.json.bufferViews.length - 1;
  }

  /** A typed array as an accessor of `type` (SCALAR, VEC2, VEC3, VEC4, MAT4); its index. */
  accessor(array, type, { target, bounds = false, normalized = false } = {}) {
    const componentType = array instanceof Float32Array ? 5126 : array instanceof Uint32Array ? 5125 : array instanceof Uint16Array ? 5123 : array instanceof Uint8Array ? 5121 : null;
    if (!componentType) throw new Error('unsupported array');
    const size = SIZES[type];
    const a = { bufferView: this.bytes(array, target), componentType, count: array.length / size, type, ...(normalized ? { normalized: true } : {}) };
    if (bounds) {
      const min = new Array(size).fill(Infinity);
      const max = new Array(size).fill(-Infinity);
      for (let i = 0; i < array.length; i++) {
        min[i % size] = Math.min(min[i % size], array[i]);
        max[i % size] = Math.max(max[i % size], array[i]);
      }
      Object.assign(a, { min, max });
    }
    this.json.accessors.push(a);
    return this.json.accessors.length - 1;
  }

  /** The .glb file's bytes. */
  write() {
    return glbBytes(this.json, this.chunk.bytes());
  }
}

// ---- Small matrix and quaternion helpers (column-major, as glTF) ----------------------------

export function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return out;
}

/** A node's own matrix, from its matrix or its translation, rotation, and scale. */
export function nodeMatrix(n) {
  if (n.matrix) return [...n.matrix];
  const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = n.scale ?? [1, 1, 1];
  const [tx, ty, tz] = n.translation ?? [0, 0, 0];
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
}

export function transformPoint(m, p) {
  return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
}

export function transformDirection(m, d) {
  const v = [m[0] * d[0] + m[4] * d[1] + m[8] * d[2], m[1] * d[0] + m[5] * d[1] + m[9] * d[2], m[2] * d[0] + m[6] * d[1] + m[10] * d[2]];
  const l = Math.hypot(...v) || 1;
  return v.map((x) => x / l);
}

/** A quaternion (x, y, z, w) turning `angle` radians about the unit `axis`. */
export function axisAngle(axis, angle) {
  const s = Math.sin(angle / 2);
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(angle / 2)];
}
