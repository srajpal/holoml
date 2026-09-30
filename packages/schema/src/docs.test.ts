import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { examplesIn, examplesProblems } from './examples-in-text.ts';

/** Y4: the guides (docs/, organised by Diátaxis): their HoloML is right, and they read as guides. */
const DOCS = fileURLToPath(new URL('../../../docs/', import.meta.url));

function markdown(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? markdown(join(dir, e.name)) : e.name.endsWith('.md') ? [join(dir, e.name)] : [],
  );
}

const files = markdown(DOCS);
const name = (file: string) => relative(DOCS, file).replace(/\\/g, '/');
const read = (file: string) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

describe('Y4: the guides (browser milestone 22)', () => {
  it('has the four kinds of guide, each with a page that lists its guides', () => {
    for (const kind of ['tutorials', 'how-to', 'reference', 'explanation']) {
      expect(files.map(name), kind).toContain(`${kind}/index.md`);
    }
    for (const kind of ['tutorials', 'how-to', 'explanation']) {
      expect(files.filter((f) => name(f).startsWith(`${kind}/`) && !name(f).endsWith('index.md')).length, kind).toBeGreaterThan(0);
    }
  });

  for (const file of files) {
    it(`${name(file)} starts with its title, and leaves requirement words to the specification`, () => {
      const text = read(file);
      expect(text.split('\n')[0], 'a "# Title" first line').toMatch(/^# \S/);
      const prose = text.replace(/^```[^\n]*\n[\s\S]*?^```$/gm, '');
      expect(prose.match(/\b(MUST NOT|MUST|SHALL NOT|SHALL|SHOULD NOT|SHOULD|REQUIRED|RECOMMENDED|OPTIONAL)\b/g) ?? []).toEqual([]);
    });
    for (const example of examplesIn(read(file))) {
      it(`${name(file)}: the ${example.lang} example at line ${example.line}`, () => {
        expect(examplesProblems(example)).toEqual([]);
      });
    }
  }
});
