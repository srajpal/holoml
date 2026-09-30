import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PARSE_ERROR_CODES } from '@holoml/parser';
import { EMBEDDED, block, embedded } from './embedded.ts';
import { relaxNg } from './relaxng.ts';
import { ELEMENTS } from './rules.ts';

const root = new URL('../../../', import.meta.url);
const read = (file: string) => readFileSync(new URL(file, root), 'utf8').replace(/\r\n/g, '\n');

/** An ABNF text without its comments (a ";" inside a quoted string is not one). */
function withoutComments(abnf: string): string {
  let out = '';
  for (let i = 0; i < abnf.length; i++) {
    const c = abnf[i]!;
    if (c === '"') {
      const end = abnf.indexOf('"', i + 1);
      out += abnf.slice(i, end + 1);
      i = end;
    } else if (c === ';') {
      while (i < abnf.length && abnf[i] !== '\n') i++;
      out += '\n';
    } else out += c;
  }
  return out;
}

/** RFC 5234's core rules. */
const CORE = new Set(['ALPHA', 'BIT', 'CHAR', 'CR', 'CRLF', 'CTL', 'DIGIT', 'DQUOTE', 'HEXDIG', 'HTAB', 'LF', 'LWSP', 'OCTET', 'SP', 'VCHAR', 'WSP']);

describe('Y2: the formal grammar (browser milestone 22)', () => {
  it("the RELAX NG schema is the one made from the checker's table", () => {
    expect(read('spec/holoml.rnc')).toBe(relaxNg());
  });

  it('the RELAX NG schema has every element and attribute', () => {
    const rnc = read('spec/holoml.rnc');
    for (const [name, rule] of Object.entries(ELEMENTS)) {
      expect(rnc, name).toMatch(new RegExp(`element \\\\?${name} \\{`));
      const body = rnc.slice(rnc.indexOf(`element ${name} {`) >= 0 ? rnc.indexOf(`element ${name} {`) : rnc.indexOf(`element \\${name} {`));
      const own = body.slice(0, body.indexOf('\n  }'));
      for (const attribute of Object.keys(rule.attributes)) expect(own, `${name} ${attribute}`).toMatch(new RegExp(`attribute \\\\?${attribute} \\{`));
    }
  });

  it('the ABNF names every syntax error the parser gives', () => {
    const abnf = read('spec/holoml.abnf');
    for (const code of PARSE_ERROR_CODES) expect(abnf, code).toMatch(new RegExp(`; ${code}:|; ${code} `));
  });

  it('every rule the ABNF uses is defined, and every rule it defines is used', () => {
    const text = withoutComments(read('spec/holoml.abnf'));
    const rules = new Map<string, string>();
    let current = '';
    for (const line of text.split('\n')) {
      const head = /^([A-Za-z][A-Za-z0-9-]*)\s*=\/?(.*)$/.exec(line);
      if (head) {
        current = head[1]!;
        rules.set(current, (rules.get(current) ?? '') + ' ' + head[2]);
      } else if (current && /^\s/.test(line)) rules.set(current, rules.get(current)! + ' ' + line);
    }
    const used = new Set<string>();
    for (const body of rules.values()) {
      const bare = body.replace(/%[si]?"[^"]*"/g, ' ').replace(/"[^"]*"/g, ' ').replace(/%[xdb][0-9A-Fa-f.-]+/g, ' ');
      for (const m of bare.matchAll(/[A-Za-z][A-Za-z0-9-]*/g)) used.add(m[0]);
    }
    expect([...used].filter((name) => !rules.has(name) && !CORE.has(name))).toEqual([]);
    expect([...rules.keys()].filter((name) => name !== 'document' && !used.has(name))).toEqual([]);
  });

  it('SPEC.md holds each file of spec/ as it is', () => {
    const spec = read('SPEC.md');
    for (const { file, lang } of EMBEDDED) expect(embedded(spec, file), file).toBe(block(file, lang));
  });
});
