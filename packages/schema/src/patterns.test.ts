import { describe, expect, it } from 'vitest';
import { parse } from '@holoml/parser';
import { check } from './index.ts';
import { COLOR_PATTERN, COUNT_PATTERN, DURATION_PATTERN, ID_PATTERN, IDREF_PATTERN, INDEFINITE, NOT_IN_ADDRESS_RNC, NUMBER_PATTERN, whole } from './rules.ts';
import { relaxNg } from './relaxng.ts';

const scene = (inner: string, version = '0.2') => `<holoml version="${version}"><scene>${inner}</scene></holoml>`;
const codes = (text: string) => check(parse(text)).map((p) => p.code);

/** How long the checker takes over a page, in milliseconds: the best of three runs, so that a busy computer does not decide. */
function checkTime(text: string): number {
  const doc = parse(text);
  let best = Infinity;
  for (let k = 0; k < 3; k++) {
    const start = performance.now();
    check(doc);
    best = Math.min(best, performance.now() - start);
  }
  return best;
}

describe('the patterns of values take time that grows with the length only (review 134, L1)', () => {
  const digits = '1'.repeat(200_000);

  it('a 200,000-digit non-number is rejected in under 100 ms, alone and inside a vector', () => {
    const alone = scene(`<light type="ambient" intensity="${digits}x" />`);
    expect(codes(alone)).toEqual(['bad-value']);
    expect(checkTime(alone)).toBeLessThan(100);
    const vector = scene(`<group position="0 ${digits}x 0" />`);
    expect(codes(vector)).toEqual(['bad-value']);
    expect(checkTime(vector)).toBeLessThan(100);
  });

  it('so is every other kind of value a long run of digits can come near', () => {
    const near: Record<string, string> = {
      scale: scene(`<group scale="${digits}x" />`),
      tiling: scene(`<model src="a.glb"><material name="m" repeat="${digits}x" /></model>`),
      area: scene(`<plan src="p.png" area="0 0 ${digits}x 1" />`),
      size: scene(`<water size="1 ${digits}x 1" />`),
      duration: scene(`<group id="g" /><animate target="#g" attribute="position" to="1 1 1" duration="${digits}x" />`),
      'a duration with a fraction': scene(`<group id="g" /><animate target="#g" attribute="position" to="1 1 1" duration="1.${digits}x" />`),
      repeat: scene(`<group id="g" /><animate target="#g" attribute="position" to="1 1 1" duration="1s" repeat="${digits}x" />`),
      colour: scene(`<label color="#${digits}">x</label>`),
      id: scene(`<group id="a${digits}!" />`),
      'a slider': scene(`<slider min="${digits}x">x</slider>`),
    };
    for (const [kind, text] of Object.entries(near)) {
      expect(codes(text), kind).toEqual(['bad-value']);
      expect(checkTime(text), kind).toBeLessThan(100);
    }
  });

  it('each pattern alone gives up on 200,000 characters in under 100 ms', () => {
    const misses: [string, string][] = [
      [NUMBER_PATTERN, `${digits}x`],
      [NUMBER_PATTERN, `${digits}.${digits}x`],
      [NUMBER_PATTERN, `1e${digits}x`],
      [DURATION_PATTERN, `${digits}.${digits}m`],
      [COUNT_PATTERN, `${digits}x`],
      [COUNT_PATTERN, `${'0'.repeat(200_000)}`],
      [ID_PATTERN, `a${digits}!`],
      [IDREF_PATTERN, `#a${digits}!`],
      [COLOR_PATTERN, `#${digits}`],
    ];
    for (const [pattern, value] of misses) {
      const expression = whole(pattern);
      const start = performance.now();
      expect(expression.test(value), pattern).toBe(false);
      expect(performance.now() - start, pattern).toBeLessThan(100);
    }
  });

  it('the number pattern matches what it matched before: a sign, digits, a fraction, an exponent', () => {
    const NUMBER = whole(NUMBER_PATTERN);
    const before = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
    for (const v of ['0', '-0', '1', '-2', '0.4', '1.', '.5', '-.5', '1e3', '1E3', '1e+3', '1.5e-3', '1.e3', '.5e2', '007', '', '-', '.', '+1', '1e', 'e3', '1..2', '1.2.3', '--1', '1 ', ' 1', '1,5', '0x10', 'Infinity', 'NaN', '1e3.5', '١']) {
      expect(NUMBER.test(v), JSON.stringify(v)).toBe(before.test(v));
    }
  });
});

describe('the RELAX NG schema takes its patterns from the checker (review 134, L9)', () => {
  const schema = relaxNg();
  const written = [...new Set([...schema.matchAll(/pattern = "([^"]*)"/g)].map((m) => m[1]!))];

  it("every pattern in the schema is one of the checker's, or an address's", () => {
    const known = new Set([NUMBER_PATTERN, COLOR_PATTERN, DURATION_PATTERN, ID_PATTERN, IDREF_PATTERN, `${COUNT_PATTERN}|${INDEFINITE}`]);
    const others = written.filter((p) => !known.has(p));
    expect(written.filter((p) => known.has(p)).length).toBe(known.size);
    // What is left are addresses: any characters but those an address may not hold, and for a file its extensions.
    expect(others.length).toBeGreaterThan(0);
    for (const p of others) expect(p.startsWith(`[^${NOT_IN_ADDRESS_RNC}`), p).toBe(true);
  });

  /**
   * Whether the schema takes a value for an element's attribute: its
   * pattern matches the whole value, as XML Schema's do, and a token or a
   * number is read without the whitespace around it, runs of it inside
   * made one space (a string is read as written).
   */
  const schemaTakes = (element: string, attribute: string): ((value: string) => boolean) => {
    const body = schema.slice(schema.indexOf(`element ${element} {`));
    const line = body.slice(0, body.indexOf('\n  }')).split('\n').find((l) => l.includes(`attribute ${attribute} {`));
    const m = /xsd:(\w+) \{ pattern = "([^"]*)"/.exec(line ?? '');
    if (!m) throw new Error(`the schema has no pattern for ${element} ${attribute}`);
    // The compact syntax's "\x{...}" is JavaScript's "\u{...}".
    const pattern = new RegExp(`^(?:${m[2]!.replaceAll('\\x{', '\\u{')})$`, 'u');
    const collapse = (v: string) => v.split(/[ \t\n\r]+/).filter(Boolean).join(' ');
    return (value) => pattern.test(m[1] === 'string' ? value : collapse(value));
  };

  /** A value as a page writes it between double quotes: what is not plain ASCII as a character reference. */
  const asWritten = (value: string) => [...value].map((c) => (/^[ -~]$/.test(c) && !'<&"'.includes(c) ? c : `&#${c.codePointAt(0)};`)).join('');

  it('the schema and the checker take and refuse the same values', () => {
    const anim = (extra: string) => scene(`<group id="g" /><animate target="#g" attribute="position" to="1 1 1" ${extra} />`);
    const cases: { element: string; attribute: string; page: (v: string) => string; values: string[] }[] = [
      {
        element: 'light',
        attribute: 'intensity',
        page: (v) => scene(`<light type="ambient" intensity="${v}" />`),
        values: ['0', '1', '1.', '.5', '1e3', '1E+3', '2.5e-1', '007', ' 1 ', '\t1\n', '+1', '1e', 'e3', '.', '1..2', '0x10', 'bright', '1,5', '\u00A01', '1\u3000', ''],
      },
      {
        element: 'label',
        attribute: 'color',
        page: (v) => scene(`<label color="${v}">x</label>`),
        values: ['#fff', '#FFF', '#c0182a', '#C0182A', ' #fff ', '#ffff', '#12345', '#1234567', 'fff', '#ggg', 'red', '\u00A0#fff'],
      },
      {
        element: 'animate',
        attribute: 'duration',
        page: (v) => anim(`duration="${v}"`),
        values: ['2s', '500ms', '1.5s', '.5s', '1.s', '1e3ms', '1.5E-1s', ' 2s ', '10', 's', 'ms', '1 s', '2S', '1sec', '-1s', '+1s', '1ems', '2s\u00A0'],
      },
      {
        element: 'animate',
        attribute: 'repeat',
        page: (v) => anim(`duration="1s" repeat="${v}"`),
        values: ['1', '2', '010', '9007199254740991', 'indefinite', '0', '00', '-1', '1.5', '1e3', 'Indefinite', 'forever'],
      },
      {
        element: 'group',
        attribute: 'id',
        page: (v) => scene(`<group id="${v}" />`),
        values: ['a', 'A', 'a1', 'a-b', 'a_b', 'coupe', '1a', '-a', '_a', 'a b', ' a ', 'a.b', 'é'],
      },
      {
        element: 'animate',
        attribute: 'target',
        page: (v) => scene(`<group id="g" /><animate target="${v}" attribute="position" to="1 1 1" duration="1s" />`),
        values: ['#g', 'g', '##g', '#', '#1', '# g', ' #g '],
      },
      {
        element: 'a',
        attribute: 'href',
        page: (v) => scene(`<a href="${v}"><label>x</label></a>`),
        values: [
          'coupe.holoml',
          ' coupe.holoml ',
          'https://example.org/café?x=1#door',
          '\u{1F468}\u200D\u{1F469}.holoml',
          '',
          ' ',
          'a b.holoml',
          'a\tb.holoml',
          '\u0001coupe.holoml',
          'coupe\u001f.holoml',
          'coupe.holoml\u007f',
          'coupe\u0085.holoml',
          '\u00A0coupe.holoml',
          'coupe.holoml\u3000',
          'a\u2028b',
          '\uFEFFcoupe.holoml',
        ],
      },
      {
        element: 'model',
        attribute: 'src',
        page: (v) => scene(`<model src="${v}" />`),
        values: ['a.glb', 'a.GLB', 'models/a.gltf?v=1', 'a.glb#x', '.glb', ' a.glb ', 'a.obj', 'a.glb.txt', 'dir.glb/file', 'a.glb?x y', 'a.glb?\u0001', '\u00A0a.glb', 'a\u0001.glb'],
      },
    ];
    for (const c of cases) {
      const takes = schemaTakes(c.element, c.attribute);
      for (const v of c.values) {
        expect(takes(v), `${c.element} ${c.attribute}=${JSON.stringify(v)}`).toBe(codes(c.page(asWritten(v))).length === 0);
      }
    }
  });
});
