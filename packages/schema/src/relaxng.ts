import {
  COLOR_PATTERN,
  COUNT_PATTERN,
  DURATION_PATTERN,
  ELEMENTS,
  FILE_EXTENSIONS,
  ID_PATTERN,
  IDREF_PATTERN,
  INDEFINITE,
  LANGUAGE_PATTERN,
  NOT_IN_ADDRESS_RNC,
  NUMBER_PATTERN,
  VERSION,
  VERSIONS,
  atLeast,
  type AttributeRule,
  type ElementRule,
  type ValueKind,
} from './rules.ts';

/**
 * The structure of a HoloML page as a RELAX NG schema in its compact
 * syntax (ISO/IEC 19757-2), made from the checker's table: which element
 * may hold which, and each attribute's values, for the newest version.
 * SPEC.md's appendix A holds it, and spec/holoml.rnc is this text (a test
 * makes it again and compares; `pnpm grammar:update` writes the file).
 *
 * HoloML is not XML, but a page's tree is: a flag (`autoplay`, written
 * alone) is an attribute with an empty value here. The schema is
 * informative; the checker's other rules (section 8's problem codes,
 * such as every id being unique) are not in it.
 */
export function relaxNg(): string {
  const lines = [
    `# HoloML ${VERSION}: the structure of a page, in RELAX NG's compact syntax`,
    '# (ISO/IEC 19757-2). Made from the checker\'s table and its patterns',
    '# (packages/schema/src/rules.ts) by packages/schema/src/relaxng.ts:',
    '# do not edit; run `pnpm grammar:update`. Informative: SPEC.md and the',
    '# checker say what a page may be, and more than a schema can (unique',
    '# ids, targets that exist, values that depend on one another). A page',
    '# is read as XML would be: a flag, written alone (autoplay), is an',
    '# attribute with an empty value. "(0.2)" marks what a 0.1 page may',
    '# not use. An address holds no control character (\\p{Cc}), no space or',
    '# other separator (\\p{Z}), and no U+FEFF (written by its number).',
    '',
    'start = holoml',
    '',
  ];
  for (const [name, rule] of Object.entries(ELEMENTS)) {
    const parts = [...Object.entries(rule.attributes).map(([a, r]) => attribute(a, r)), content(name, rule)];
    lines.push(`${nameOf(name)} =${rule.since ? `  # (${rule.since})` : ''}`);
    lines.push(`  element ${nameOf(name)} {`);
    parts.forEach(({ code, note }, i) => lines.push(`    ${code}${i < parts.length - 1 ? ',' : ''}${note ? `  # ${note}` : ''}`));
    lines.push('  }');
    lines.push('');
  }
  lines.push(
    '# Values',
    '',
    '# A number: a decimal number, optionally with an exponent; never INF or NaN.',
    `number = xsd:double { pattern = "${NUMBER_PATTERN}" }`,
    `more-than-0 = xsd:double { pattern = "${NUMBER_PATTERN}" minExclusive = "0" }`,
    '# A flag, written alone in HoloML.',
    'flag = string ""',
    '',
  );
  return `${lines.join('\n')}`;
}

/** A line of an element's pattern: its code, and a comment after it. */
interface Part {
  code: string;
  note?: string;
}

/** The compact syntax's keywords: a name spelt as one is written with a backslash (animate's `\attribute`). */
const KEYWORDS = new Set(
  'attribute default datatypes div element empty external grammar include inherit list mixed namespace notAllowed parent start string text token'.split(' '),
);
const nameOf = (name: string) => (KEYWORDS.has(name) ? `\\${name}` : name);

function attribute(name: string, rule: AttributeRule): Part {
  const code = `attribute ${nameOf(name)} { ${value(rule.value)} }${rule.required ? '' : '?'}`;
  return rule.since ? { code, note: `(${rule.since})` } : { code };
}

function value(kind: ValueKind): string {
  switch (kind.kind) {
    case 'text':
      // A token is read without the whitespace around it, so one of length 1 or more is not empty.
      return kind.empty ? 'text' : 'xsd:token { minLength = "1" }';
    case 'number': {
      const facets: string[] = [];
      if (kind.positive) facets.push('minExclusive = "0"');
      if (kind.min !== undefined) facets.push(`minInclusive = "${kind.min}"`);
      if (kind.max !== undefined) facets.push(`maxInclusive = "${kind.max}"`);
      if (!facets.length) return 'number';
      return `xsd:double { pattern = "${NUMBER_PATTERN}" ${facets.join(' ')} }`;
    }
    case 'vector3':
      return 'list { number, number, number }';
    case 'scale':
      return 'list { number } | list { number, number, number }';
    case 'color':
      return `xsd:token { pattern = "${COLOR_PATTERN}" }`;
    case 'duration':
      return `xsd:token { pattern = "${DURATION_PATTERN}" }`;
    case 'url': {
      if (kind.for === 'link') return `xsd:token { pattern = "[^${NOT_IN_ADDRESS_RNC}]+" }`;
      // A page may write an extension in either case; XML Schema's patterns have no switch for that.
      const anyCase = FILE_EXTENSIONS[kind.for].map((e) => e.replace(/[a-z]/g, (c) => `[${c}${c.toUpperCase()}]`)).join('|');
      return `xsd:token { pattern = "[^${NOT_IN_ADDRESS_RNC}?#]*\\.(${anyCase})([?#][^${NOT_IN_ADDRESS_RNC}]*)?" }`;
    }
    case 'tiling':
      return 'list { more-than-0 } | list { more-than-0, more-than-0 }';
    case 'area':
      return 'list { number, number, number, number }';
    case 'size':
      return 'list { more-than-0, more-than-0, more-than-0 }';
    case 'id':
      return `xsd:string { pattern = "${ID_PATTERN}" }`;
    case 'idref':
      return `xsd:string { pattern = "${IDREF_PATTERN}" }`;
    case 'language':
      return `xsd:string { pattern = "${LANGUAGE_PATTERN}" }`;
    case 'choice':
      return kind.values.map((v) => `string "${v}"`).join(' | ');
    case 'flag':
      return 'flag';
    case 'version':
      return VERSIONS.map((v) => `string "${v}"`).join(' | ');
    case 'repeat':
      return `xsd:token { pattern = "${COUNT_PATTERN}|${INDEFINITE}" }`;
    case 'animation-value':
      return 'text';
  }
}

function content(name: string, rule: ElementRule): Part {
  if (rule.children === 'text') return rule.emptyText ? { code: 'text', note: 'may be empty' } : { code: 'text', note: 'not empty' };
  if (rule.children === 'none') return { code: 'empty' };
  // The root's head comes before its scene (the checker's wrong-order).
  if (name === 'holoml') return { code: 'head?, scene' };
  const counted = rule.children.map((child) => {
    // The newest version's rule: a child a later version allows several times is many, from that version on.
    const many = rule.manyFrom?.[child];
    const once = rule.once?.includes(child) && !(many !== undefined && atLeast(VERSION, many));
    const needed = rule.needs?.includes(child);
    return `${child}${once ? (needed ? '' : '?') : needed ? '+' : '*'}`;
  });
  return { code: counted.length === 1 ? counted[0]! : `(${counted.join(' & ')})` };
}
