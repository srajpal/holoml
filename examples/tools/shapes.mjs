// What the example sites' tools share when they make models from
// shapes (Harbour Loft's rooms, the sneaker store's hall, the aquarium's
// tank): vectors, colours, the faces of a box, an ellipsoid, joining
// parts by material, and the bytes of a binary glTF file. Each tool keeps
// its own rectangle (`quad`), since each places its pictures its own way,
// and its own materials.
//
// A part is { positions, normals, uvs, indices, material }: plain arrays
// of numbers (three a position and a normal, two a picture coordinate),
// and its material's name.

export const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
/** A vector one long the same way (a vector of no length stays as it is). */
export const unit = (a) => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** A colour from "#rrggbb" to its red, green, and blue, 0 to 255. */
export function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

/** A colour from "#rrggbb" to glTF's linear red, green, and blue. */
export function linear(hex) {
  return rgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
}

/** How light a pixel is, from 0 (black) to 1 (white), from its red, green, and blue (0 to 255 each). */
export const luminance = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/**
 * The faces of a box between two corners, each as a rectangle's corner
 * and two edges, its front outward; `skip` leaves faces out ("top",
 * "bottom", "left", "right", "front", "back").
 */
export function boxFaces(min, max, skip = []) {
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
    .map(([, face]) => face);
}

/** A round thing (a pillow, a plant's leaves, a bubble): an ellipsoid of `rings` by `segments`. */
export function ellipsoid(centre, radii, material, { segments, rings }) {
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

/**
 * Joins the parts of each material into one primitive, as typed arrays
 * (a part's joints and weights too, where the first part of a material
 * has them).
 */
export function merge(parts) {
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
      positions: new Float32Array(list.flatMap((p) => Array.from(p.positions))),
      normals: new Float32Array(list.flatMap((p) => Array.from(p.normals))),
      uvs: new Float32Array(list.flatMap((p) => Array.from(p.uvs))),
      indices: base > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
      material,
      ...(list[0].joints ? { joints: new Uint8Array(list.flatMap((p) => Array.from(p.joints))), weights: new Float32Array(list.flatMap((p) => Array.from(p.weights))) } : {}),
    };
  });
}

/**
 * The one binary chunk of a .glb file as it is put together: each piece
 * starts at a multiple of four bytes, as glTF asks.
 */
export class Chunk {
  constructor() {
    this.pieces = [];
    this.length = 0;
  }

  /** Adds bytes; where they start. */
  append(bytes) {
    const pad = (4 - (this.length % 4)) % 4;
    if (pad) {
      this.pieces.push(Buffer.alloc(pad));
      this.length += pad;
    }
    const at = this.length;
    this.pieces.push(bytes);
    this.length += bytes.length;
    return at;
  }

  /** The chunk's bytes, filled to a multiple of four. */
  bytes() {
    return Buffer.concat([...this.pieces, Buffer.alloc((4 - (this.length % 4)) % 4)]);
  }
}

/** A binary glTF file (.glb): its JSON (which gets its one buffer's size here), then its binary chunk. */
export function glbBytes(json, bin) {
  json.buffers = [{ byteLength: bin.length }];
  const text = Buffer.from(JSON.stringify(json));
  const padded = Buffer.concat([text, Buffer.alloc((4 - (text.length % 4)) % 4, 0x20)]);
  const chunk = (type, data) => {
    const head = Buffer.alloc(8);
    head.writeUInt32LE(data.length, 0);
    head.write(type, 4, 'latin1');
    return Buffer.concat([head, data]);
  };
  const header = Buffer.alloc(12);
  header.write('glTF', 0, 'latin1');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + padded.length + 8 + bin.length, 8);
  return Buffer.concat([header, chunk('JSON', padded), chunk('BIN\0', bin)]);
}
