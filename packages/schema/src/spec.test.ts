import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PARSE_ERROR_CODES } from '@holoml/parser';
import { examplesIn, examplesProblems } from './examples-in-text.ts';
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

/** The text outside code blocks. */
const prose = spec.replace(/^```[^\n]*\n[\s\S]*?^```$/gm, '');

describe('O1: the specification', () => {
  it('lists exactly the syntax errors the parser gives', () => {
    expect(codesIn(section('### Syntax errors'))).toEqual([...PARSE_ERROR_CODES].sort());
  });

  it('lists exactly the problems the checker reports', () => {
    expect(codesIn(section('## 8. Checking'))).toEqual([...PROBLEM_CODES].sort());
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

describe('Y1: the specification in the form of W3C specifications (browser milestone 22)', () => {
  const KEYWORD = /\b(MUST NOT|MUST|REQUIRED|SHALL NOT|SHALL|SHOULD NOT|SHOULD|NOT RECOMMENDED|RECOMMENDED|MAY|OPTIONAL)\b/;

  it('has the sections a standard has', () => {
    for (const heading of [
      '## Abstract',
      '## Status of this document',
      '## 2. Conformance',
      '### Requirement words',
      '### Conformance classes',
      '### The conformance samples',
      '## 3. Terminology',
      '## 9. Processing model',
      '## 10. Scripts and the scene API',
      '## 11. Versions',
      '## 12. Security considerations',
      '## 13. Privacy considerations',
      '## 14. Accessibility considerations',
      '## 15. Internationalization considerations',
      '## Appendix A. The formal grammar',
      '## Appendix B. IANA considerations',
      '## Appendix C. Changes',
      '## Index',
      '## References',
      '### Normative references',
      '### Informative references',
      '## Acknowledgements',
    ]) {
      expect(spec, heading).toContain(`\n${heading}\n`);
    }
  });

  it('says how its requirement words are meant (BCP 14)', () => {
    expect(section('### Requirement words').replace(/\s+/g, ' ')).toContain(
      'are to be interpreted as described in BCP 14 [RFC2119] [RFC8174] when, and only when, they appear in all capitals, as shown here.',
    );
  });

  it('writes requirement words in capitals: no lower-case must, should, or shall outside code', () => {
    expect(prose.match(/\b(must|should|shall)\b/g) ?? []).toEqual([]);
  });

  it('uses requirement words only in normative text: not in examples, notes, or non-normative sections', () => {
    const lines = spec.split('\n');
    const found: string[] = [];
    let [code, informative, note, words] = [false, false, false, false];
    lines.forEach((line, i) => {
      if (line.startsWith('```')) {
        code = !code;
        return;
      }
      if (/^## /.test(line)) informative = /non-normative/.test(lines.slice(i + 1, i + 4).join(' '));
      if (/^#{2,3} /.test(line)) words = line === '### Requirement words';
      if (line.startsWith('*Note (non-normative):*')) note = true;
      if (line.trim() === '') note = false;
      if ((code || informative || note) && !words && KEYWORD.test(line)) found.push(`${i + 1}: ${line}`);
    });
    expect(found).toEqual([]);
  });

  it('lists every reference it cites, and cites every reference it lists', () => {
    const listed = [...section('## References').matchAll(/^- \[([A-Z0-9-]+)\]/gm)].map((m) => m[1]).sort();
    const body = prose.slice(0, prose.indexOf('\n## References\n'));
    const cited = [...new Set([...body.matchAll(/\[([A-Z][A-Z0-9-]+)\](?!\()/g)].map((m) => m[1]))].sort();
    expect(cited).toEqual(listed);
  });

  it('points only to sections, appendices, and headings it has', () => {
    const sections = new Set([...spec.matchAll(/^## (\d+)\. /gm)].map((m) => m[1]));
    const numbers = [...prose.matchAll(/\b[Ss]ections? (\d+(?:(?:,? and |, | to )\d+)*)/g)].flatMap((m) => m[1]!.match(/\d+/g)!);
    expect(numbers.filter((n) => !sections.has(n))).toEqual([]);
    const appendices = new Set([...spec.matchAll(/^## Appendix ([A-Z])\. /gm)].map((m) => m[1]));
    const letters = [...prose.matchAll(/\b[Aa]ppendix ([A-Z])\b/g)].map((m) => m[1]!);
    expect(letters.filter((l) => !appendices.has(l))).toEqual([]);
    // Links within the page go to headings, by GitHub's anchors (the site makes the same).
    const slug = (h: string) => h.toLowerCase().replace(/[^a-z0-9 -]/g, '').trim().replace(/ /g, '-');
    const anchors = new Set([...spec.matchAll(/^#{1,4} (.+)$/gm)].map((m) => slug(m[1]!)));
    const links = [...prose.matchAll(/\]\(#([^)]+)\)/g)].map((m) => m[1]!);
    expect(links.filter((a) => !anchors.has(a))).toEqual([]);
  });
});

describe('Y4: every HoloML example in the specification is right', () => {
  const examples = examplesIn(spec);

  it('has its examples marked as HoloML', () => {
    expect(examples.length).toBeGreaterThan(25);
  });

  for (const example of examples) {
    it(`the ${example.lang} example at line ${example.line}`, () => {
      expect(examplesProblems(example)).toEqual([]);
    });
  }
});
