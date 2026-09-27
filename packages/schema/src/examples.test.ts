import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from '@holoml/parser';
import { check } from './index.ts';

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

  it('the showroom links to pages that exist, and its model has the materials it changes', () => {
    const gltf = JSON.parse(readFileSync(join(EXAMPLES, 'showroom/models/placeholder-car.gltf'), 'utf8')) as { materials: { name: string }[] };
    const names = gltf.materials.map((m) => m.name);
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const [, href] of text.matchAll(/href="([^"]+\.holoml)"/g)) {
        expect(files.some((f) => f.replace(/\\/g, '/').endsWith(`/${href}`)), href).toBe(true);
      }
      for (const [, name] of text.matchAll(/<material name="([^"]+)"/g)) expect(names).toContain(name);
    }
  });
});
