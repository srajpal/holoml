/**
 * @holoml/schema: checks a parsed HoloML document against the HoloML
 * specification and lists every problem with its place (SPEC.md,
 * "Checking"). An empty list means the document is valid.
 *
 * A page is checked against the version it declares: a page that says
 * version="0.1" may use only what 0.1 has (SPEC.md, "Versions").
 */
import type { Attribute, ElementNode, HoloDocument, Position } from '@holoml/parser';
import { ANIMATABLE, ANIMATION_VALUES, ELEMENTS, LIGHT_ONLY, ROOT, VERSION, VERSIONS, atLeast, type Version, type ValueKind } from './rules.ts';

export { ANIMATABLE, ANIMATION_VALUES, ELEMENTS, LIGHT_ONLY, ROOT, VERSION, VERSIONS, atLeast } from './rules.ts';
export type { AttributeRule, ElementRule, ValueKind, Version } from './rules.ts';

export interface CheckOptions {
  /**
   * The versions the reader knows (default: every version this checker
   * knows). A reader that knows only "0.1" refuses a 0.2 page, as the
   * spec requires of an older reader.
   */
  versions?: readonly string[];
}

/** Every problem has one of these codes; SPEC.md lists them with their meaning. */
export const PROBLEM_CODES = [
  'wrong-root',
  'unsupported-version',
  'unknown-element',
  'child-not-allowed',
  'text-not-allowed',
  'empty-text',
  'too-many',
  'missing-child',
  'wrong-order',
  'unknown-attribute',
  'missing-attribute',
  'bad-value',
  'attribute-not-for-type',
  'duplicate-id',
  'unknown-target',
  'bad-target',
  'nested-link',
  'unsafe-link',
] as const;

export type ProblemCode = (typeof PROBLEM_CODES)[number];

export interface Problem {
  code: ProblemCode;
  message: string;
  line: number;
  column: number;
}

const NUMBER = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const DURATION = /^(\d+(?:\.\d+)?|\.\d+)(ms|s)$/;
const ID = /^[A-Za-z][A-Za-z0-9_-]*$/;
const MODEL_FILE = /\.(gltf|glb)$/i;
const SCRIPT_FILE = /\.(js|mjs)$/i;
const SOUND_FILE = /\.(ogg|mp3|wav)$/i;
/** Schemes a link or model may use; anything else (javascript:, data:, file:) is refused. */
const SAFE_SCHEMES = new Set(['http', 'https']);

/** A dictionary's own entry, never an inherited one such as "constructor" (issue #1). */
function own<T>(dictionary: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.hasOwn(dictionary, key) ? dictionary[key] : undefined;
}

/** Checks a document; returns every problem, in document order. */
export function check(doc: HoloDocument, options: CheckOptions = {}): Problem[] {
  const problems: Problem[] = [];
  const report = (code: ProblemCode, message: string, at: Position) =>
    problems.push({ code, message, line: at.line, column: at.column });

  const root = doc.root;
  if (root.name !== ROOT) {
    report('wrong-root', `The root element must be <${ROOT}>, not <${root.name}>`, root.start);
    return problems;
  }

  // The version the page declares picks the rules; one this reader does not
  // know is reported, and the page is checked against the newest rules.
  const known = options.versions ?? VERSIONS;
  const declared = attr(root, 'version')?.value;
  const version: Version =
    typeof declared === 'string' && known.includes(declared) && (VERSIONS as readonly string[]).includes(declared) ? (declared as Version) : VERSION;
  const ctx: Context = { version, known };

  const ids = new Map<string, ElementNode>();
  const animations: ElementNode[] = [];

  const visit = (el: ElementNode, insideLink: boolean) => {
    const rule = own(ELEMENTS, el.name);
    if (!rule || !atLeast(version, rule.since)) {
      report('unknown-element', `<${el.name}> is not a HoloML ${version} element${rule?.since ? ` (it is in HoloML ${rule.since})` : ''}`, el.start);
      return;
    }
    checkAttributes(el, report, ctx);
    const id = attr(el, 'id');
    if (id?.value && ID.test(id.value)) {
      if (ids.has(id.value)) report('duplicate-id', `The id "${id.value}" is used twice`, id.start);
      else ids.set(id.value, el);
    }
    if (el.name === 'animate') animations.push(el);
    if (el.name === 'a' && insideLink) report('nested-link', 'A link cannot be inside another link', el.start);

    // Children.
    if (rule.children === 'text') {
      let text = '';
      for (const child of el.children) {
        if (child.type === 'text') text += child.value;
        else report('child-not-allowed', `<${el.name}> holds only text, not <${child.name}>`, child.start);
      }
      if (text.trim() === '' && !rule.emptyText) report('empty-text', `<${el.name}> needs some text`, el.start);
      return;
    }
    const counts = new Map<string, number>();
    for (const child of el.children) {
      if (child.type === 'text') {
        report(
          'text-not-allowed',
          el.name === 'script'
            ? 'A <script> holds no code: put the code in a file of its own, and name it in "src"'
            : `Text is not allowed directly inside <${el.name}>; put it in a <label>`,
          firstVisible(child.value, child.start),
        );
        continue;
      }
      const childRule = own(ELEMENTS, child.name);
      const allowed = rule.children !== 'none' && rule.children.includes(child.name);
      if (!allowed && childRule && atLeast(version, childRule.since)) {
        report('child-not-allowed', `<${child.name}> cannot be inside <${el.name}>`, child.start);
        continue;
      }
      const n = (counts.get(child.name) ?? 0) + 1;
      counts.set(child.name, n);
      if (n === 2 && rule.once?.includes(child.name)) {
        report('too-many', `<${el.name}> may hold only one <${child.name}>`, child.start);
      }
      visit(child, insideLink || el.name === 'a');
    }
    for (const need of rule.needs ?? []) {
      if (!counts.has(need)) report('missing-child', `<${el.name}> needs a <${need}>`, el.start);
    }
    if (el.name === ROOT) {
      const names = el.children.flatMap((c) => (c.type === 'element' ? [c.name] : []));
      const head = names.indexOf('head');
      if (head > names.indexOf('scene') && names.includes('scene')) {
        const node = el.children.find((c) => c.type === 'element' && c.name === 'head')!;
        report('wrong-order', '<head> comes before <scene>', node.start);
      }
    }
  };
  visit(root, false);

  // Animation targets and values, once every id is known.
  for (const anim of animations) {
    const target = attr(anim, 'target');
    const which = attr(anim, 'attribute')?.value ?? undefined;
    const usable = animatable(which, version);
    if (!target?.value?.startsWith('#')) continue; // already reported as a bad value
    const el = ids.get(target.value.slice(1));
    if (!el) {
      report('unknown-target', `No element has the id "${target.value.slice(1)}"`, target.start);
      continue;
    }
    if (!usable) continue;
    const kinds = own(ANIMATABLE, which)?.filter((k) => atLeast(version, k.since)).map((k) => k.element) ?? [];
    if (!kinds.includes(el.name)) {
      report('bad-target', `The ${which} of a <${el.name}> cannot be animated`, target.start);
    } else if (el.name === 'light' && which === 'position' && attr(el, 'type')?.value === 'ambient') {
      report('bad-target', 'An ambient light has no position to animate', target.start);
    }
  }
  return problems;
}

interface Context {
  version: Version;
  known: readonly string[];
}

/** Can this attribute be animated in this version? */
function animatable(which: string | undefined, version: Version): which is string {
  const choice = ELEMENTS['animate']!.attributes['attribute']!.value;
  return which !== undefined && choice.kind === 'choice' && choice.values.includes(which) && atLeast(version, choice.since?.[which]);
}

/** Where the first character that is not whitespace in a text node is. */
function firstVisible(text: string, start: Position): Position {
  let { line, column, offset } = start;
  for (let k = 0; k < text.length; k++) {
    const c = text[k]!;
    if (c === '\n' || (c === '\r' && text[k + 1] !== '\n')) {
      line += 1;
      column = 1;
    } else if (c === ' ' || c === '\t' || c === '\r') {
      column += 1;
    } else {
      break;
    }
    offset += 1;
  }
  return { line, column, offset };
}

function finite(p: string): boolean {
  return Number.isFinite(Number(p));
}

function attr(el: ElementNode, name: string): Attribute | undefined {
  return el.attributes.find((a) => a.name === name);
}

function checkAttributes(el: ElementNode, report: (code: ProblemCode, message: string, at: Position) => void, ctx: Context): void {
  const rule = ELEMENTS[el.name]!;
  for (const a of el.attributes) {
    const r = own(rule.attributes, a.name);
    if (!r || !atLeast(ctx.version, r.since)) {
      report('unknown-attribute', `<${el.name}> has no attribute "${a.name}"${r?.since ? ` in HoloML ${ctx.version} (it is in HoloML ${r.since})` : ''}`, a.start);
      continue;
    }
    // An animation's from and to take a vector, a number, or a colour, by what
    // is animated; a vector when that is unknown (as in 0.1, where only
    // vectors were animated).
    let kind = r.value;
    if (kind.kind === 'animation-value') {
      const which = attr(el, 'attribute')?.value ?? undefined;
      kind = animatable(which, ctx.version) ? ANIMATION_VALUES[which]! : { kind: 'vector3' };
    }
    const problem = valueProblem(kind, a.value, a.name, ctx);
    if (problem) report(problem.code, problem.message, a.start);
  }
  for (const [name, r] of Object.entries(rule.attributes)) {
    if (r.required && atLeast(ctx.version, r.since) && !attr(el, name)) report('missing-attribute', `<${el.name}> needs the attribute "${name}"`, el.start);
  }
  // A slider's range: max above min, and its value between them (each
  // attribute that is not a number is already reported).
  if (el.name === 'slider') {
    const n = (name: string, fallback: number) => {
      const a = attr(el, name);
      if (!a) return { at: el.start, value: fallback, ok: true };
      const v = a.value?.trim() ?? '';
      return { at: a.start, value: Number(v), ok: NUMBER.test(v) && Number.isFinite(Number(v)) };
    };
    const min = n('min', 0);
    const max = n('max', 1);
    if (min.ok && max.ok && max.value <= min.value) {
      report('bad-value', `"max": must be more than "min" (${min.value})`, max.at);
    } else if (min.ok && max.ok) {
      const value = attr(el, 'value') ? n('value', min.value) : null;
      if (value?.ok && (value.value < min.value || value.value > max.value)) {
        report('bad-value', `"value": must be from "min" to "max" (${min.value} to ${max.value})`, value.at);
      }
    }
  }
  // Some light attributes belong to some types only; an unknown type is
  // already reported as a bad value.
  const type = el.name === 'light' ? attr(el, 'type')?.value : undefined;
  if (type && ['ambient', 'directional', 'point', 'spot'].includes(type)) {
    for (const a of el.attributes) {
      const types = own(LIGHT_ONLY, a.name);
      if (types && !types.includes(type)) report('attribute-not-for-type', `A ${type} light has no "${a.name}"`, a.start);
    }
  }
}

function valueProblem(kind: ValueKind, value: string | null, name: string, ctx: Context): { code: ProblemCode; message: string } | null {
  const bad = (why: string) => ({ code: 'bad-value' as const, message: `"${name}": ${why}` });
  if (kind.kind === 'flag') return value === null ? null : bad('written alone, without a value');
  if (value === null) return bad('needs a value');
  const v = value.trim();
  switch (kind.kind) {
    case 'text':
      return v === '' ? bad('cannot be empty') : null;
    case 'number': {
      if (!NUMBER.test(v)) return bad(`"${value}" is not a number`);
      const n = Number(v);
      if (!Number.isFinite(n)) return bad(`"${value}" is too large a number`);
      if (kind.positive && n <= 0) return bad('must be more than 0');
      if (kind.min !== undefined && n < kind.min) return bad(`must be at least ${kind.min}`);
      if (kind.max !== undefined && n > kind.max) return bad(`must be at most ${kind.max}`);
      return null;
    }
    case 'vector3': {
      const parts = v.split(/\s+/);
      if (parts.length !== 3 || !parts.every((p) => NUMBER.test(p))) return bad(`"${value}" is not three numbers, such as "0 1.5 -2"`);
      return parts.every(finite) ? null : bad(`"${value}" has a number too large`);
    }
    case 'scale': {
      const parts = v.split(/\s+/);
      if ((parts.length !== 1 && parts.length !== 3) || !parts.every((p) => NUMBER.test(p))) return bad(`"${value}" is not one number or three`);
      return parts.every(finite) ? null : bad(`"${value}" has a number too large`);
    }
    case 'color':
      return COLOR.test(v) ? null : bad(`"${value}" is not a colour such as "#c0182a" or "#fff"`);
    case 'duration': {
      const m = DURATION.exec(v);
      if (!m) return bad(`"${value}" is not a time such as "2s" or "500ms"`);
      const n = Number(m[1]);
      if (!Number.isFinite(n)) return bad(`"${value}" is too long a time`);
      return n > 0 ? null : bad(`"${value}" is not a time such as "2s" or "500ms"`);
    }
    // Written exactly: spaces around an id, a reference, a choice, or the
    // version are a mistake, not ignored (issue #4, SPEC.md section 4).
    case 'id':
      return ID.test(value) ? null : bad(`"${value}" must start with a letter and use only letters, digits, "-", and "_"`);
    case 'idref':
      return value.startsWith('#') && ID.test(value.slice(1)) ? null : bad(`"${value}" must be "#" and an id, such as "#coupe"`);
    case 'choice': {
      const values = kind.values.filter((x) => atLeast(ctx.version, kind.since?.[x]));
      if (values.includes(value)) return null;
      const later = kind.values.includes(value) ? kind.since?.[value] : undefined;
      return bad(`must be one of ${values.map((x) => `"${x}"`).join(', ')}${later ? ` ("${value}" is in HoloML ${later})` : ''}`);
    }
    case 'version':
      return ctx.known.includes(value) && (VERSIONS as readonly string[]).includes(value)
        ? null
        : { code: 'unsupported-version', message: `This checker knows HoloML ${ctx.known.join(' and ')}, not "${value}"` };
    case 'animation-value':
      return null; // chosen by what is animated, in checkAttributes()
    case 'repeat':
      if (v === 'indefinite') return null;
      if (!/^\d+$/.test(v) || Number(v) < 1) return bad('must be a whole number of times, or "indefinite"');
      return Number.isSafeInteger(Number(v)) ? null : bad(`"${value}" is too many times`);
    case 'url': {
      if (v === '' || /\s/.test(v)) return bad('must be an address without spaces');
      const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(v)?.[1]?.toLowerCase();
      if (scheme !== undefined && !SAFE_SCHEMES.has(scheme)) {
        return { code: 'unsafe-link', message: `"${name}": "${scheme}:" addresses are not allowed; use http, https, or a relative address` };
      }
      const path = v.split(/[?#]/)[0]!;
      if (kind.for === 'model' && !MODEL_FILE.test(path)) return bad('a model must be a glTF file (.gltf or .glb)');
      if (kind.for === 'script' && !SCRIPT_FILE.test(path)) return bad('a script must be a JavaScript file (.js or .mjs)');
      if (kind.for === 'sound' && !SOUND_FILE.test(path)) return bad('a sound must be an Ogg, MP3, or WAV file (.ogg, .mp3, or .wav)');
      return null;
    }
  }
}
