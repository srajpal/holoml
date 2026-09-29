import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PARSE_ERROR_CODES } from '@holoml/parser';
import { ELEMENTS, PROBLEM_CODES } from './index.ts';

/** O1: SPEC.md and the code describe the same language. */
const spec = readFileSync(new URL('../../../SPEC.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

/** The text of a section, from its heading to the next heading of the same or a higher level. */
function section(heading: string): string {
  const start = spec.indexOf(`\n${heading}\n`);
  if (start < 0) return '';
  const level = heading.split(' ')[0]!;
  const rest = spec.slice(start + heading.length + 2);
  const next = rest.search(new RegExp(`\\n#{1,${level.length}} `));
  return next < 0 ? rest : rest.slice(0, next);
}

const codesIn = (text: string) => [...text.matchAll(/^\| `([a-z-]+)` \|/gm)].map((m) => m[1]).sort();

describe('O1: the specification', () => {
  it('lists exactly the syntax errors the parser gives', () => {
    expect(codesIn(section('### Syntax errors'))).toEqual([...PARSE_ERROR_CODES].sort());
  });

  it('lists exactly the problems the checker reports', () => {
    expect(codesIn(section('## 6. Checking'))).toEqual([...PROBLEM_CODES].sort());
  });

  for (const [name, rule] of Object.entries(ELEMENTS)) {
    it(`describes <${name}> with an example and every attribute`, () => {
      const text = section(`### \`${name}\``);
      expect(text, `a "### \`${name}\`" section`).not.toBe('');
      expect(text, 'an example').toContain('```');
      for (const attr of Object.keys(rule.attributes)) {
        expect(text, `the attribute ${attr}`).toContain(`| \`${attr}\` |`);
      }
    });
  }
});

describe('X1: HoloML 0.2 is complete (browser milestone 21)', () => {
  const text = spec.replace(/\s+/g, ' ');

  it('no sentence about 0.2 calls it a draft or lists anything still to come in it', () => {
    const sentences = text.split(/(?<=\.) /);
    const unfinished = sentences.filter((s) => /\b0\.2\b/.test(s) && /draft|still to come|to come in|is finished when/i.test(s));
    expect(unfinished).toEqual([]);
  });

  it('movement along paths is one of the ideas for later versions', () => {
    expect(text).toMatch(/Ideas for later versions: movement along paths/);
  });
});
