// Writes models/placeholder-car.gltf: a car made of boxes, with three
// materials (Paint, Glass, Tyre) that pages can change. It was made for
// this project, so the example uses no third-party model.
//
//   node examples/showroom/make-model.mjs
import { writeFileSync } from 'node:fs';

// One unit box (1 x 1 x 1, centred), four corners per face so each face
// has its own normal.
const faces = [
  { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
];
const positions = [];
const normals = [];
const indices = [];
for (const { n, u, v } of faces) {
  const base = positions.length / 3;
  for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    for (let k = 0; k < 3; k++) positions.push(0.5 * (n[k] + su * u[k] + sv * v[k]));
    normals.push(...n);
  }
  indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

const posBytes = Buffer.from(new Float32Array(positions).buffer);
const normBytes = Buffer.from(new Float32Array(normals).buffer);
const indexBytes = Buffer.from(new Uint16Array(indices).buffer);
const buffer = Buffer.concat([posBytes, normBytes, indexBytes]);

const material = (name, color, metallic, roughness, alpha = 1) => ({
  name,
  pbrMetallicRoughness: { baseColorFactor: [...color, alpha], metallicFactor: metallic, roughnessFactor: roughness },
  ...(alpha < 1 ? { alphaMode: 'BLEND' } : {}),
});
const mesh = (name, materialIndex) => ({
  name,
  primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: materialIndex }],
});
const box = (name, meshIndex, translation, scale) => ({ name, mesh: meshIndex, translation, scale });

const gltf = {
  asset: { version: '2.0', generator: 'HoloML examples/showroom/make-model.mjs' },
  scene: 0,
  scenes: [{ name: 'PlaceholderCar', nodes: [0] }],
  nodes: [
    { name: 'Car', children: [1, 2, 3, 4, 5, 6] },
    box('Body', 0, [0, 0.55, 0], [4.2, 0.6, 1.8]),
    box('Cabin', 1, [-0.2, 1.12, 0], [2.2, 0.55, 1.6]),
    box('WheelFrontLeft', 2, [1.3, 0.35, 0.85], [0.7, 0.7, 0.35]),
    box('WheelFrontRight', 2, [1.3, 0.35, -0.85], [0.7, 0.7, 0.35]),
    box('WheelRearLeft', 2, [-1.3, 0.35, 0.85], [0.7, 0.7, 0.35]),
    box('WheelRearRight', 2, [-1.3, 0.35, -0.85], [0.7, 0.7, 0.35]),
  ],
  meshes: [mesh('Body', 0), mesh('Cabin', 1), mesh('Wheel', 2)],
  materials: [
    material('Paint', [0.75, 0.75, 0.78], 0.6, 0.35),
    material('Glass', [0.55, 0.7, 0.85], 0.1, 0.05, 0.45),
    material('Tyre', [0.04, 0.04, 0.04], 0, 0.9),
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: 24, type: 'VEC3', min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] },
    { bufferView: 1, componentType: 5126, count: 24, type: 'VEC3' },
    { bufferView: 2, componentType: 5123, count: 36, type: 'SCALAR' },
  ],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: posBytes.length, target: 34962 },
    { buffer: 0, byteOffset: posBytes.length, byteLength: normBytes.length, target: 34962 },
    { buffer: 0, byteOffset: posBytes.length + normBytes.length, byteLength: indexBytes.length, target: 34963 },
  ],
  buffers: [{ byteLength: buffer.length, uri: `data:application/octet-stream;base64,${buffer.toString('base64')}` }],
};

const out = new URL('./models/placeholder-car.gltf', import.meta.url);
writeFileSync(out, JSON.stringify(gltf, null, 2) + '\n');
console.log(`wrote ${out.pathname} (${buffer.length} bytes of geometry)`);
