/**
 * The reference pages in docs/reference/ (elements.md, codes.md, and
 * api.md) and SPEC.md's index, made from the checker's table, the codes,
 * the conformance samples, the Web IDL, and the specification's own
 * tables and words, so that they say what those say (browser milestone
 * 22). `pnpm reference:update` writes them; a test makes them again and
 * compares.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { PARSE_ERROR_CODES } from '@holoml/parser';
import { ELEMENTS, PROBLEM_CODES, type ElementRule } from './index.ts';

const root = new URL('../../../', import.meta.url);
const read = (file: string) => readFileSync(new URL(file, root), 'utf8').replace(/\r\n/g, '\n');

/** The text under a heading, to the next heading of the same or a higher level; code blocks are not headings. */
export function section(text: string, heading: string): string {
  const lines = text.split('\n');
  const level = heading.indexOf(' ');
  let [code, start] = [false, -1];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.startsWith('```')) code = !code;
    const m = code ? null : /^(#{1,6}) /.exec(line);
    if (!m) continue;
    if (start >= 0 && m[1]!.length <= level) return lines.slice(start, i).join('\n');
    if (start < 0 && line === heading) start = i + 1;
  }
  if (start < 0) throw new Error(`SPEC.md has no "${heading}"`);
  return lines.slice(start).join('\n');
}

/** The body rows of the first table in `text` whose first header cell is `first`, as trimmed cells. */
export function table(text: string, first: string): { header: string[]; rows: string[][] } {
  const lines = text.split('\n');
  const at = lines.findIndex((l) => l.startsWith(`| ${first} |`));
  if (at < 0) throw new Error(`no table that starts with "${first}"`);
  const cells = (l: string) => l.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const end = lines.findIndex((l, i) => i > at && !l.startsWith('|'));
  return { header: cells(lines[at]!), rows: lines.slice(at + 2, end < 0 ? undefined : end).map(cells) };
}

/** The names a table cell gives in backticks: `holoml.find(id)` is "find". */
const names = (cell: string) => [...cell.matchAll(/`(?:holoml\.)?(\w+)/g)].map((m) => m[1]!);

/**
 * The specification's words, for a reference page: its links made to work
 * from docs/reference/, and its requirement words (BCP 14) in lower case,
 * as a reference page restates the specification and is not normative.
 */
const fromReference = (markdown: string) =>
  markdown
    .replace(/\]\(#/g, '](../../SPEC.md#')
    .replace(/\b(MUST NOT|MUST|REQUIRED|SHALL NOT|SHALL|SHOULD NOT|SHOULD|NOT RECOMMENDED|RECOMMENDED|MAY|OPTIONAL)\b/g, (w) => w.toLowerCase());

/** The first sentence of a section's first paragraph. */
function firstSentence(text: string): string {
  const paragraph = text.trim().split('\n\n')[0]!.replace(/\s+/g, ' ');
  return /^.*?[.?!](?=\s|$)/.exec(paragraph)?.[0] ?? paragraph;
}

const GENERATED = 'This page is made by `pnpm reference:update`; do not edit it by hand.';

/** A paragraph in lines of at most 72 characters, as the rest of the documents. */
function wrap(text: string): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > 72) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  return [...lines, line];
}

// ---------------------------------------------------------------------------
// Elements and attributes

/** The elements in the order the specification gives them. */
function elementOrder(spec: string): string[] {
  const order = [...section(spec, '## 7. Elements').matchAll(/^### `(\w+)`$/gm)].map((m) => m[1]!);
  const missing = Object.keys(ELEMENTS).filter((e) => !order.includes(e));
  if (missing.length) throw new Error(`SPEC.md section 7 has no section for ${missing.join(', ')}`);
  return order;
}

/** How many of a child an element may hold, when not any number. */
function howMany(rule: ElementRule, child: string): string | null {
  const once = rule.once?.includes(child);
  const needed = rule.needs?.includes(child);
  const many = rule.manyFrom?.[child];
  if (once && needed) return 'exactly one';
  if (needed) return 'at least one';
  if (once) return many ? `at most one; (${many}) several` : 'at most one';
  return null;
}

function holds(rule: ElementRule): string {
  if (rule.children === 'text') return rule.emptyText ? 'text, which may be empty' : 'text';
  if (rule.children === 'none') return 'nothing';
  return rule.children
    .map((c) => {
      const since = ELEMENTS[c]?.since !== undefined && rule.since === undefined ? ELEMENTS[c]!.since : undefined;
      const notes = [since, howMany(rule, c)].filter((n) => n);
      return `[\`${c}\`](#${c})${notes.length ? ` (${notes.join('; ')})` : ''}`;
    })
    .join(', ');
}

function inside(name: string): string {
  const parents = Object.entries(ELEMENTS).filter(([, r]) => Array.isArray(r.children) && r.children.includes(name));
  return parents.length ? parents.map(([p]) => `[\`${p}\`](#${p})`).join(', ') : 'nothing; it is the root';
}

export function elementsPage(spec = read('SPEC.md')): string {
  const order = elementOrder(spec);
  const out = [
    '# Elements and attributes',
    '',
    ...wrap(
      'Every element of HoloML 0.2 at a glance: what it is, what it may hold, ' +
        'where it may be, and its attributes. Which elements and attributes ' +
        "there are, and where each may be, come from the checker's own table; " +
        'the words come from the [specification](../../SPEC.md#7-elements), which ' +
        'says exactly what each one means. An element may hold any number of ' +
        'each element it lists, unless it says otherwise. The kinds of value ' +
        '(number, vector, colour, address, and so on) are defined in ' +
        '[section 6](../../SPEC.md#6-space-units-and-values) of the ' +
        'specification. "(0.2)" marks what a 0.1 page may not use.',
    ),
    '',
    GENERATED,
    '',
    '| Element | What it is |',
    '|---|---|',
  ];
  const details: string[] = [];
  for (const name of order) {
    const rule = ELEMENTS[name]!;
    const text = section(spec, `### \`${name}\``);
    const since = rule.since ? `(${rule.since}) ` : '';
    const what = fromReference(firstSentence(text).replace(/^\(0\.2\) /, ''));
    out.push(`| [\`${name}\`](#${name}) | ${since}${what} |`);
    details.push('', `## \`${name}\``, '', `${since}${what} [In the specification](../../SPEC.md#${name}).`, '');
    details.push(`- Holds: ${holds(rule)}.`, `- May be in: ${inside(name)}.`);
    const attributes = Object.keys(rule.attributes);
    if (attributes.length === 0) {
      details.push('- Attributes: none.');
      continue;
    }
    const { header, rows } = table(text, 'Attribute');
    const col = (h: string) => header.indexOf(h);
    const unlisted = attributes.filter((a) => !rows.some((r) => r[0] === `\`${a}\``));
    if (unlisted.length) throw new Error(`SPEC.md's table for ${name} has no row for ${unlisted.join(', ')}`);
    details.push('', '| Attribute | Value | Default | Meaning |', '|---|---|---|---|');
    for (const row of rows) {
      const attr = /^`([a-z-]+)`$/.exec(row[0]!)?.[1];
      const r = attr === undefined ? undefined : rule.attributes[attr];
      if (attr === undefined || r === undefined) throw new Error(`SPEC.md's table for ${name} has a row the checker does not know: ${row[0]}`);
      const value = row[col('Value')]!;
      if (/\(required\)/.test(value) !== (r.required === true)) {
        throw new Error(`${name} ${attr}: the specification ${r.required ? 'does not say' : 'says'} it is required, and the checker ${r.required ? 'says' : 'does not say'} so`);
      }
      const meaning = row[col('Meaning')]!;
      const marked = meaning.startsWith('(0.2) ');
      if (rule.since === undefined && marked !== (r.since === '0.2')) {
        throw new Error(`${name} ${attr}: the specification ${marked ? 'marks' : 'does not mark'} it (0.2), and the checker ${r.since ? 'has it from 0.2' : 'has it from 0.1'}`);
      }
      const since = r.since !== undefined && rule.since === undefined ? ` (${r.since})` : '';
      const fallback = col('Default') < 0 ? '' : row[col('Default')]!;
      details.push(`| \`${attr}\`${since} | ${fromReference(value)} | ${fromReference(fallback)} | ${fromReference(meaning.replace(/^\(0\.2\) /, ''))} |`);
    }
  }
  return [...out, ...details, ''].join('\n');
}

// ---------------------------------------------------------------------------
// Codes

/** The conformance samples that show each code, by group. */
function samplesByCode(group: 'syntax-errors' | 'problems'): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const dir = `conformance/${group}/`;
  for (const file of readdirSync(new URL(dir, root)).filter((f) => f.endsWith('.expected.json')).sort()) {
    const expected = JSON.parse(read(dir + file)) as { error?: { code: string }; problems?: { code: string }[] };
    const codes = new Set(expected.error ? [expected.error.code] : (expected.problems ?? []).map((p) => p.code));
    for (const code of codes) out.set(code, [...(out.get(code) ?? []), file.replace(/\.expected\.json$/, '')]);
  }
  return out;
}

function codesTable(spec: string, heading: string, codes: readonly string[], group: 'syntax-errors' | 'problems'): string[] {
  const { rows } = table(section(spec, heading), 'Code');
  const samples = samplesByCode(group);
  const listed = rows.map((r) => r[0]!.replace(/`/g, ''));
  if ([...listed].sort().join() !== [...codes].sort().join()) throw new Error(`SPEC.md's "${heading}" does not list the codes the code gives`);
  return [
    '| Code | Meaning | Samples |',
    '|---|---|---|',
    ...rows.map((r) => {
      const code = r[0]!.replace(/`/g, '');
      const links = (samples.get(code) ?? []).map((s) => `[${s}](../../conformance/${group}/${s}.holoml)`);
      return `| \`${code}\` | ${fromReference(r[1]!)} | ${links.join(', ') || 'none yet'} |`;
    }),
  ];
}

export function codesPage(spec = read('SPEC.md')): string {
  return [
    '# Codes',
    '',
    ...wrap(
      'A reader reports two kinds of mistake, each with a code and the line ' +
        'and column where it is. A syntax error stops the reader at the first ' +
        'one ([section 5](../../SPEC.md#syntax-errors) of the specification). A ' +
        'problem breaks a rule of the language in a page whose syntax is right, ' +
        'and a checker reports every one ([section 8](../../SPEC.md#8-checking)). ' +
        'The samples are pages from the ' +
        '[conformance samples](../../SPEC.md#the-conformance-samples) that give ' +
        'the code; each has an `.expected.json` beside it with the place a ' +
        'reader gives.',
    ),
    '',
    GENERATED,
    '',
    '## Syntax errors',
    '',
    ...codesTable(spec, '### Syntax errors', PARSE_ERROR_CODES, 'syntax-errors'),
    '',
    '## Problems',
    '',
    ...codesTable(spec, '## 8. Checking', PROBLEM_CODES, 'problems'),
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// The scene API

interface Definition {
  parent: string | null;
  /** Each member's name and its declaration, as the Web IDL writes it. */
  members: { name: string; declaration: string }[];
}

/** The Web IDL's interfaces and dictionaries. */
export function definitions(idl = read('spec/holoml.webidl')): Map<string, Definition> {
  const out = new Map<string, Definition>();
  const text = idl.replace(/\/\/[^\n]*/g, '');
  for (const m of text.matchAll(/(?:interface|dictionary)\s+(\w+)(?:\s*:\s*(\w+))?\s*\{([^}]*)\};/g)) {
    const members = m[3]!
      .split(';')
      .map((s) => s.trim().replace(/\s+/g, ' '))
      .filter(Boolean)
      .map((declaration) => ({ name: /(\w+)\s*\(/.exec(declaration)?.[1] ?? declaration.split(' ').pop()!, declaration }));
    out.set(m[1]!, { parent: m[2] ?? null, members });
  }
  return out;
}

const KINDS = { model: 'ModelThing', group: 'GroupThing', light: 'LightThing', label: 'LabelThing', panel: 'PanelThing', sound: 'SoundThing', hud: 'HudThing', slider: 'SliderThing', choice: 'ChoiceThing' } as const;

export function apiPage(spec = read('SPEC.md'), idl = read('spec/holoml.webidl')): string {
  const defs = definitions(idl);
  const declaration = (iface: string, member: string): string => {
    const d = defs.get(iface);
    const own = d?.members.find((m) => m.name === member);
    if (own) return own.declaration;
    if (d?.parent) return declaration(d.parent, member);
    throw new Error(`the Web IDL's ${iface} has no ${member}`);
  };
  const code = (s: string) => `\`${s}\``;
  const decls = (list: string[]) => [...new Set(list)].map(code).join('<br>');

  const simple = (heading: string, iface: string) => {
    const { rows } = table(section(spec, heading), 'Member');
    return [
      '| Member | Web IDL | What it is |',
      '|---|---|---|',
      ...rows.map((r) => `| ${r[0]} | ${decls(names(r[0]!).map((n) => declaration(iface, n)))} | ${fromReference(r[1]!)} |`),
    ];
  };

  const things = table(section(spec, '### Things'), 'Member').rows;
  const common = things.filter((r) => r[1] === 'all').flatMap((r) => names(r[0]!));
  const byKind = Object.entries(KINDS).map(([kind, iface]) => {
    const members = things.filter((r) => r[1]!.split(', ').includes(kind)).flatMap((r) => names(r[0]!));
    return `| \`${kind}\` | \`${iface}\` | ${[...new Set(members)].map((m) => code(defs.get(iface)!.members.find((x) => x.name === m)?.declaration.includes('(') ? `${m}()` : m)).join(', ')} |`;
  });
  const thingRows = things.map((r) => {
    const kinds = r[1]!.split(', ');
    const ifaces = kinds.map((k) => (k === 'all' ? 'Thing' : KINDS[k as keyof typeof KINDS]));
    return `| ${r[0]} | ${r[1]} | ${decls(names(r[0]!).flatMap((n) => ifaces.map((i) => declaration(i, n))))} | ${fromReference(r[2]!)} |`;
  });

  const events = table(section(spec, '### Events'), 'Type').rows;
  const eventMembers = defs.get('HoloMLEvent')!.members;

  return [
    '# The scene API',
    '',
    ...wrap(
      "A 0.2 page's scripts reach the scene through one object, `holoml`. This " +
        'page lists what it offers at a glance, each member with its ' +
        'declaration in Web IDL, the notation web standards use to describe ' +
        'APIs. [Section 10](../../SPEC.md#10-scripts-and-the-scene-api) of the ' +
        'specification says exactly what each member does, and ' +
        '[appendix A.3](../../SPEC.md#a3-the-scene-api-in-web-idl) and ' +
        '[holoml.webidl](../../spec/holoml.webidl) give the whole API in Web IDL. ' +
        'Vectors are arrays of three numbers, `[x, y, z]`: metres for positions ' +
        'and degrees for rotations.',
    ),
    '',
    GENERATED,
    '',
    '## `holoml`',
    '',
    ...simple('### The `holoml` object', 'HoloML'),
    '',
    '## `holoml.viewer`',
    '',
    ...simple('### The viewer', 'HoloMLViewer'),
    '',
    '## Things',
    '',
    ...wrap(
      '`holoml.find(id)` and `holoml.add(markup, parent)` give things: handles ' +
        `on elements. Every thing has ${common.map((m) => code(m === 'remove' ? 'remove()' : m)).join(', ').replace(/, ([^,]+)$/, ', and $1')}; each kind ` +
        "has more. A member a thing's kind does not have is `undefined`.",
    ),
    '',
    '| Kind | Interface | Its own members |',
    '|---|---|---|',
    ...byKind,
    '',
    '| Member | Kinds | Web IDL | What it is |',
    '|---|---|---|---|',
    ...thingRows,
    '',
    '## Events',
    '',
    ...wrap(
      '`holoml.on(type, listener)` calls the listener with each event of that ' +
        'type, and returns a function that stops it. Every event has its `type`, ' +
        'and the members its type lists.',
    ),
    '',
    '| Type | When | Members | What they hold |',
    '|---|---|---|---|',
    ...events.map((r) => `| ${r[0]} | ${fromReference(r[1]!)} | ${r[2]} | ${fromReference(r[3]!)} |`),
    '',
    'The members, as the Web IDL\'s `HoloMLEvent` declares them:',
    '',
    '| Member | Web IDL |',
    '|---|---|',
    ...eventMembers.map((m) => `| \`${m.name}\` | ${code(m.declaration)} |`),
    '',
  ].join('\n');
}

/** The reference pages, by the file each is written to. */
export const REFERENCE_PAGES: Readonly<Record<string, () => string>> = {
  'docs/reference/elements.md': () => elementsPage(),
  'docs/reference/codes.md': () => codesPage(),
  'docs/reference/api.md': () => apiPage(),
};

// ---------------------------------------------------------------------------
// SPEC.md's index

const INDEX_START = '<!-- index -->';
const INDEX_END = '<!-- /index -->';

/** The terms the specification defines (in bold), with the heading each is defined under. */
function terms(spec: string): { term: string; anchor: string }[] {
  const from = (heading: string, anchor: string) =>
    [...section(spec, heading).matchAll(/\*\*([^*]+)\*\*/g)].map((m) => ({ term: m[1]!.toLowerCase(), anchor }));
  return [...from('## 3. Terminology', '3-terminology'), ...from('### Conformance classes', 'conformance-classes')];
}

/** What SPEC.md's index holds between its comments. */
export function specIndex(spec = read('SPEC.md')): string {
  const byName = (a: string, b: string) => a.localeCompare(b, 'en');
  const elements = Object.keys(ELEMENTS).sort(byName);
  const attributes = new Map<string, string[]>();
  for (const e of elements) for (const a of Object.keys(ELEMENTS[e]!.attributes)) attributes.set(a, [...(attributes.get(a) ?? []), e]);
  const list = (items: string[]) => wrap(items.join(', '));
  const defined = terms(spec).sort((a, b) => byName(a.term, b.term));
  return [
    INDEX_START,
    "<!-- Made from the checker's table, the codes, and the terms above by pnpm reference:update; do not edit by hand. -->",
    '',
    '### Elements',
    '',
    ...list(elements.map((e) => `[\`${e}\`](#${e})`)),
    '',
    '### Attributes',
    '',
    ...[...attributes.keys()].sort(byName).map((a) => `- \`${a}\`: ${attributes.get(a)!.map((e) => `[\`${e}\`](#${e})`).join(', ')}`),
    '',
    '### Terms',
    '',
    ...list(defined.map((t) => `[${t.term}](#${t.anchor})`)),
    '',
    '### Syntax error codes',
    '',
    ...list([...PARSE_ERROR_CODES].sort(byName).map((c) => `[\`${c}\`](#syntax-errors)`)),
    '',
    '### Problem codes',
    '',
    ...list([...PROBLEM_CODES].sort(byName).map((c) => `[\`${c}\`](#8-checking)`)),
    INDEX_END,
  ].join('\n');
}

/** What SPEC.md holds between the index's comments, or null when they are missing. */
export function indexIn(spec: string): string | null {
  const start = spec.indexOf(INDEX_START);
  const end = spec.indexOf(INDEX_END, start);
  return start < 0 || end < 0 ? null : spec.slice(start, end + INDEX_END.length);
}

/** SPEC.md with its index refreshed. */
export function withIndex(spec: string): string {
  const text = spec.replace(/\r\n/g, '\n');
  const now = indexIn(text);
  if (now === null) throw new Error('SPEC.md has no place for its index');
  return text.replace(now, () => specIndex(text));
}
