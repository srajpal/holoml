import { ELEMENTS, VERSION, type AttributeRule, type ElementRule, type ValueKind } from './rules.ts';

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
    '# (ISO/IEC 19757-2). Made from the checker\'s table',
    '# (packages/schema/src/rules.ts) by packages/schema/src/relaxng.ts:',
    '# do not edit; run `pnpm grammar:update`. Informative: SPEC.md and the',
    '# checker say what a page may be, and more than a schema can (unique',
    '# ids, targets that exist, values that depend on one another). A page',
    '# is read as XML would be: a flag, written alone (autoplay), is an',
    '# attribute with an empty value. "(0.2)" marks what a 0.1 page may',
    '# not use.',
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
    'number = xsd:double { pattern = "-?([0-9]+\\.?[0-9]*|\\.[0-9]+)([eE][+\\-]?[0-9]+)?" }',
    'more-than-0 = xsd:double { pattern = "-?([0-9]+\\.?[0-9]*|\\.[0-9]+)([eE][+\\-]?[0-9]+)?" minExclusive = "0" }',
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
      return 'text';
    case 'number': {
      const facets: string[] = [];
      if (kind.positive) facets.push('minExclusive = "0"');
      if (kind.min !== undefined) facets.push(`minInclusive = "${kind.min}"`);
      if (kind.max !== undefined) facets.push(`maxInclusive = "${kind.max}"`);
      if (!facets.length) return 'number';
      return `xsd:double { pattern = "-?([0-9]+\\.?[0-9]*|\\.[0-9]+)([eE][+\\-]?[0-9]+)?" ${facets.join(' ')} }`;
    }
    case 'vector3':
      return 'list { number, number, number }';
    case 'scale':
      return 'list { number } | list { number, number, number }';
    case 'color':
      return 'xsd:token { pattern = "#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})" }';
    case 'duration':
      return 'xsd:token { pattern = "([0-9]+(\\.[0-9]+)?|\\.[0-9]+)(ms|s)" }';
    case 'url': {
      const ext = { model: 'gltf|glb', script: 'js|mjs', sound: 'ogg|mp3|wav', picture: 'png|jpe?g|webp', environment: 'hdr|png|jpe?g' }[
        kind.for as Exclude<typeof kind.for, 'link'>
      ];
      if (!ext) return 'xsd:token { pattern = "[^\\s]+" }';
      const anyCase = ext
        .split('|')
        .map((e) => e.replace(/[a-z]/g, (c) => `[${c}${c.toUpperCase()}]`))
        .join('|');
      return `xsd:token { pattern = "[^\\s?#]*\\.(${anyCase})([?#][^\\s]*)?" }`;
    }
    case 'tiling':
      return 'list { more-than-0 } | list { more-than-0, more-than-0 }';
    case 'area':
      return 'list { number, number, number, number }';
    case 'size':
      return 'list { more-than-0, more-than-0, more-than-0 }';
    case 'id':
      return 'xsd:string { pattern = "[A-Za-z][A-Za-z0-9_\\-]*" }';
    case 'idref':
      return 'xsd:string { pattern = "#[A-Za-z][A-Za-z0-9_\\-]*" }';
    case 'choice':
      return kind.values.map((v) => `string "${v}"`).join(' | ');
    case 'flag':
      return 'flag';
    case 'version':
      return 'string "0.1" | string "0.2"';
    case 'repeat':
      return 'xsd:token { pattern = "[0-9]*[1-9][0-9]*|indefinite" }';
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
    const once = rule.once?.includes(child) && !(rule.manyFrom?.[child] === VERSION);
    const needed = rule.needs?.includes(child);
    return `${child}${once ? (needed ? '' : '?') : needed ? '+' : '*'}`;
  });
  return { code: counted.length === 1 ? counted[0]! : `(${counted.join(' & ')})` };
}
