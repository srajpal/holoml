import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Chunk, boxFaces, ellipsoid, glbBytes, linear, luminance, merge, rgb, unit } from './shapes.mjs';
import { RATE, random, wav } from './sound.mjs';

const EXAMPLES = fileURLToPath(new URL('../', import.meta.url));

describe("Sm10: what the examples' tools share is written once (review 134)", () => {
  /** Every tool of every example, by its path from examples/. */
  const tools = readdirSync(EXAMPLES, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'tools' && existsSync(join(EXAMPLES, e.name, 'tools')))
    .flatMap((e) => readdirSync(join(EXAMPLES, e.name, 'tools')).filter((f) => f.endsWith('.mjs')).map((f) => `${e.name}/tools/${f}`));

  it('no tool keeps a copy of its own', () => {
    expect(tools.length).toBeGreaterThan(15);
    // What sound.mjs, shapes.mjs, and pictures.mjs give, and the pieces of them that were copied about.
    const shared = ['wav', 'random', 'add3', 'sub', 'cross', 'dot', 'len', 'unit', 'rgb', 'linear', 'luminance', 'merge', 'decode', 'encode'];
    const copies: string[] = [];
    for (const tool of tools) {
      const text = readFileSync(join(EXAMPLES, tool), 'utf8');
      for (const name of shared) if (new RegExp(`^(?:export )?(?:function ${name}\\(|const ${name} = )`, 'm').test(text)) copies.push(`${tool}: ${name}`);
      if (/head\.write\('RIFF'|header\.write\('glTF'|right: \[\[x1, y0, z1\]/.test(text)) copies.push(`${tool}: a WAV header, a .glb header, or a box's faces`);
      if (/const RATE = /.test(text)) copies.push(`${tool}: RATE`);
    }
    // Two are left. The showroom's prepare-cars.mjs writes its own .glb header: it needs Kenney's Car Kit, which
    // is not kept here, so it could not be run to show that its files stay the same, and was left as it is. The
    // sofa studio's merge joins typed arrays its own way, for primitives already made.
    expect(copies).toEqual(["showroom/tools/prepare-cars.mjs: a WAV header, a .glb header, or a box's faces", 'sofa-studio/tools/prepare.mjs: merge']);
  });

  it('a sound is a 16-bit mono WAV at 22,050 samples a second', () => {
    const file = wav(Float32Array.from([0, 1, -1, 0.5, 2]));
    expect(RATE).toBe(22050);
    expect(file.length).toBe(44 + 10);
    expect(file.toString('ascii', 0, 4)).toBe('RIFF');
    expect(file.readUInt32LE(4)).toBe(36 + 10);
    expect(file.toString('ascii', 8, 16)).toBe('WAVEfmt ');
    expect([file.readUInt16LE(20), file.readUInt16LE(22), file.readUInt32LE(24), file.readUInt32LE(28), file.readUInt16LE(32), file.readUInt16LE(34)]).toEqual([1, 1, 22050, 44100, 2, 16]);
    expect(file.readUInt32LE(40)).toBe(10);
    // Samples past 1 are held at 1.
    expect([0, 1, 2, 3, 4].map((i) => file.readInt16LE(44 + i * 2))).toEqual([0, 32767, -32767, 16384, 32767]);
  });

  it('the random numbers are the same every time', () => {
    const [a, b] = [random(7), random(7)];
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect(first.every((v) => v >= 0 && v < 1)).toBe(true);
    expect(random(8)()).not.toBe(first[0]);
  });

  it('lightness is from 0 to 1 in every tool (it had come to mean 0 to 255 in one)', () => {
    expect(luminance(0, 0, 0)).toBe(0);
    expect(luminance(255, 255, 255)).toBeCloseTo(1, 12);
    expect(luminance(0, 255, 0)).toBeCloseTo(0.7152, 12);
    expect(rgb('#ff8000')).toEqual([255, 128, 0]);
    expect(linear('#ffffff')).toEqual([1, 1, 1]);
    expect(linear('#000000')).toEqual([0, 0, 0]);
    expect(unit([0, 0, 0])).toEqual([0, 0, 0]);
    expect(unit([0, 3, 4])).toEqual([0, 0.6, 0.8]);
  });

  it("a box has six faces, less those left out, and parts join by material", () => {
    expect(boxFaces([0, 0, 0], [1, 2, 3])).toHaveLength(6);
    const faces = boxFaces([0, 0, 0], [1, 2, 3], ['top', 'bottom']);
    expect(faces).toHaveLength(4);
    expect(faces[0]).toEqual([[1, 0, 3], [0, 0, -3], [0, 2, 0]]);
    const ball = ellipsoid([0, 0, 0], [1, 1, 1], 'Glass', { segments: 8, rings: 4 });
    expect(ball[0]!.positions).toHaveLength(9 * 5 * 3);
    expect(ball[0]!.indices).toHaveLength(8 * 4 * 6);
    const joined = merge([...ball, ...ball, { ...ball[0]!, material: 'Frame' }]) as { positions: Float32Array; indices: Uint16Array; material: string }[];
    expect(joined.map((p) => p.material)).toEqual(['Glass', 'Frame']);
    expect(joined[0]!.positions).toHaveLength(2 * 45 * 3);
    expect(Math.max(...joined[0]!.indices)).toBe(2 * 45 - 1);
  });

  it('a .glb file is its JSON and one binary chunk, each a multiple of four bytes', () => {
    const chunk = new Chunk();
    expect(chunk.append(Buffer.from([1, 2, 3]))).toBe(0);
    expect(chunk.append(Buffer.from([4, 5]))).toBe(4);
    const bin = chunk.bytes();
    expect([...bin]).toEqual([1, 2, 3, 0, 4, 5, 0, 0]);
    const json: { asset: { version: string }; buffers?: { byteLength: number }[] } = { asset: { version: '2.0' } };
    const file = glbBytes(json, bin);
    expect(file.toString('latin1', 0, 4)).toBe('glTF');
    expect(file.readUInt32LE(4)).toBe(2);
    expect(file.readUInt32LE(8)).toBe(file.length);
    const jsonLength = file.readUInt32LE(12);
    expect(jsonLength % 4).toBe(0);
    expect(file.toString('latin1', 16, 20)).toBe('JSON');
    expect(JSON.parse(file.toString('utf8', 20, 20 + jsonLength))).toEqual({ asset: { version: '2.0' }, buffers: [{ byteLength: 8 }] });
    expect(file.readUInt32LE(20 + jsonLength)).toBe(8);
    expect(file.toString('latin1', 24 + jsonLength, 28 + jsonLength)).toBe('BIN\0');
    expect([...file.subarray(28 + jsonLength)]).toEqual([...bin]);
  });
});
