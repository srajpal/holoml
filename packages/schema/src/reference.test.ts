import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PARSE_ERROR_CODES } from '@holoml/parser';
import { ELEMENTS, PROBLEM_CODES } from './index.ts';
import { indexIn, REFERENCE_PAGES, section, specIndex } from './reference.ts';

const root = new URL('../../../', import.meta.url);
const read = (file: string) => readFileSync(new URL(file, root), 'utf8').replace(/\r\n/g, '\n');
const spec = read('SPEC.md');

describe('Y4: the reference pages say what the table, the codes, and the specification say (browser milestone 22)', () => {
  for (const [file, page] of Object.entries(REFERENCE_PAGES)) {
    it(`${file} is up to date (pnpm reference:update writes it)`, () => {
      expect(read(file)).toBe(page());
    });
  }
});

describe("Y1: the specification's index (browser milestone 22)", () => {
  const index = indexIn(spec) ?? '';

  it('is up to date (pnpm reference:update writes it)', () => {
    expect(index, 'SPEC.md has <!-- index --> and <!-- /index -->').not.toBe('');
    expect(index).toBe(specIndex(spec));
  });

  it('is its own non-normative section, before the references', () => {
    const text = section(spec, '## Index');
    expect(text.trim().startsWith('*This section is non-normative.*')).toBe(true);
    expect(text).toContain(index);
    expect(spec.indexOf('\n## Index\n')).toBeLessThan(spec.indexOf('\n## References\n'));
  });

  const listed = (heading: string) => [...section(index, heading).matchAll(/\[`([a-z0-9-]+)`\]/g)].map((m) => m[1]!).sort();

  it('lists every element, with a link to its section', () => {
    expect(listed('### Elements')).toEqual(Object.keys(ELEMENTS).sort());
  });

  it('lists every attribute, with the elements that have it', () => {
    const attributes = section(index, '### Attributes');
    for (const [element, rule] of Object.entries(ELEMENTS)) {
      for (const attribute of Object.keys(rule.attributes)) {
        const line = attributes.split('\n').find((l) => l.startsWith(`- \`${attribute}\`:`)) ?? '';
        expect(line, `${attribute} on ${element}`).toContain(`[\`${element}\`](#${element})`);
      }
    }
  });

  it('lists every syntax error code and every problem code', () => {
    expect(listed('### Syntax error codes')).toEqual([...PARSE_ERROR_CODES].sort());
    expect(listed('### Problem codes')).toEqual([...PROBLEM_CODES].sort());
  });

  it('lists the terms the specification defines', () => {
    for (const term of ['page', 'reader', 'checker', 'renderer', 'viewer', 'conforming page', 'conforming checker', 'conforming renderer']) {
      expect(section(index, '### Terms').replace(/\s+/g, ' '), term).toContain(`[${term}](#`);
    }
  });
});
