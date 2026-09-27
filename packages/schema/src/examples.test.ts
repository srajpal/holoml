import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from '@holoml/parser';
import { check } from './index.ts';

interface GltfJson {
  materials?: { name: string }[];
  images?: { uri?: string }[];
  meshes?: { primitives: { indices?: number; attributes: Record<string, number> }[] }[];
  accessors: { count: number }[];
}

const EXAMPLES = fileURLToPath(new URL('../../../examples/', import.meta.url));

function holomlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? holomlFiles(join(dir, e.name)) : e.name.endsWith('.holoml') ? [join(dir, e.name)] : [],
  );
}

describe('examples', () => {
  const files = holomlFiles(EXAMPLES);

  it('has example pages', () => {
    expect(files.length).toBeGreaterThanOrEqual(2);
  });

  for (const file of files) {
    it(`${file.slice(EXAMPLES.length).replace(/\\/g, '/')} is valid HoloML 0.1`, () => {
      expect(check(parse(readFileSync(file, 'utf8')))).toEqual([]);
    });
  }

  /** A glTF or GLB file's JSON part. */
  const gltfJson = (file: string) => {
    const b = readFileSync(file);
    if (b.toString('ascii', 0, 4) !== 'glTF') return JSON.parse(b.toString('utf8')) as GltfJson;
    return JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8')) as GltfJson;
  };

  it('the showroom links to pages that exist, and each model has the materials its page changes', () => {
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const [, href] of text.matchAll(/href="([^":]+\.holoml)"/g)) {
        expect(files.some((f) => f.replace(/\\/g, '/').endsWith(`/${href}`)), href).toBe(true);
      }
      for (const [, src, body] of text.matchAll(/<model src="([^"]+)"[^>]*?(?:\/>|>([\s\S]*?)<\/model>)/g)) {
        const names = (gltfJson(join(dirname(file), src!)).materials ?? []).map((m) => m.name);
        for (const [, name] of (body ?? '').matchAll(/<material name="([^"]+)"/g)) expect(names, `${src} in ${file}`).toContain(name);
      }
    }
  });

  it('the showroom stays small: under 10 MB and 200,000 triangles for the hall', () => {
    const hall = readFileSync(join(EXAMPLES, 'showroom/index.holoml'), 'utf8');
    const srcs = [...hall.matchAll(/<model src="([^"]+)"/g)].map((m) => m[1]!);
    let bytes = 0;
    let triangles = 0;
    for (const src of srcs) {
      const path = join(EXAMPLES, 'showroom', src);
      bytes += statSync(path).size;
      const g = gltfJson(path);
      for (const image of g.images ?? []) if (image.uri && !image.uri.startsWith('data:')) bytes += statSync(join(dirname(path), image.uri)).size;
      for (const mesh of g.meshes ?? []) for (const p of mesh.primitives) triangles += g.accessors[p.indices ?? p.attributes['POSITION']!]!.count / 3;
    }
    expect(srcs.length).toBeGreaterThan(5);
    expect(bytes).toBeLessThan(10 * 1024 * 1024);
    expect(triangles).toBeLessThan(200_000);
  });

  it('Blockworld names only files that exist, and stays small', () => {
    const dir = join(EXAMPLES, 'blockworld');
    const page = readFileSync(join(dir, 'index.holoml'), 'utf8');
    const game = readFileSync(join(dir, 'game.js'), 'utf8');
    const named = [
      ...[...page.matchAll(/src="([^"]+)"/g)].map((m) => m[1]!),
      // The blocks the script adds: models/<kind>.gltf for each kind it knows.
      ...[...game.matchAll(/^ {2}(\w+): \{ name:/gm)].map((m) => `models/${m[1]}.gltf`),
    ];
    expect(named).toContain('game.js');
    expect(named).toContain('models/grass.gltf');
    let bytes = 0;
    for (const src of named) {
      bytes += statSync(join(dir, src)).size;
    }
    expect(bytes).toBeLessThan(2 * 1024 * 1024);
  });

  it('Blockworld credits its textures and sounds', () => {
    const credits = readFileSync(join(EXAMPLES, 'blockworld/models/CREDITS.md'), 'utf8');
    for (const pack of ['Voxel Pack', 'Impact Sounds', 'Interface Sounds', 'Music Jingles']) expect(credits).toContain(pack);
    expect(credits).toMatch(/CC0/);
    expect(credits).toMatch(/birds\.wav and crickets\.wav: made for this game/);
  });

  it('the showroom credits its models, and the about page says where they come from', () => {
    const credits = readFileSync(join(EXAMPLES, 'showroom/models/CREDITS.md'), 'utf8');
    expect(credits).toMatch(/Kenney/);
    expect(credits).toMatch(/CC0/);
    expect(readFileSync(join(EXAMPLES, 'showroom/about.holoml'), 'utf8')).toMatch(/Kenney's Car Kit \(kenney\.nl, CC0\)/);
  });
});
