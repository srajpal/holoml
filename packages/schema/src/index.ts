/**
 * @holoml/schema: checks a parsed HoloML document against the HoloML
 * specification and lists every problem with its place (SPEC.md,
 * "Checking"). An empty list means the document is valid.
 *
 * A page is checked against the version it declares: a page that says
 * version="0.1" may use only what 0.1 has (SPEC.md, "Versions").
 */
import type { Attribute, ElementNode, HoloDocument, Position } from '@holoml/parser';
import {
  ANIMATABLE,
  ANIMATION_VALUES,
  CLICKABLE,
  COLOR_PATTERN,
  COUNT_PATTERN,
  DURATION_PATTERN,
  ELEMENTS,
  FILE_EXTENSIONS,
  ID_PATTERN,
  INDEFINITE,
  LIGHT_ONLY,
  NUMBER_PATTERN,
  ROOT,
  VERSION,
  VERSIONS,
  atLeast,
  endsWithExtension,
  notInAddress,
  whole,
  type Version,
  type ValueKind,
} from './rules.ts';

export { ANIMATABLE, ANIMATION_VALUES, CLICKABLE, ELEMENTS, LIGHT_ONLY, ROOT, VERSION, VERSIONS, atLeast } from './rules.ts';
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

// The patterns are written once, in rules.ts; the RELAX NG schema is made from the same texts.
const NUMBER = whole(NUMBER_PATTERN);
const COLOR = whole(COLOR_PATTERN);
const DURATION = whole(DURATION_PATTERN);
const ID = whole(ID_PATTERN);
const COUNT = whole(COUNT_PATTERN);
const MODEL_FILE = endsWithExtension(FILE_EXTENSIONS.model);
const SCRIPT_FILE = endsWithExtension(FILE_EXTENSIONS.script);
const SOUND_FILE = endsWithExtension(FILE_EXTENSIONS.sound);
const PICTURE_FILE = endsWithExtension(FILE_EXTENSIONS.picture);
const ENVIRONMENT_FILE = endsWithExtension(FILE_EXTENSIONS.environment);
/** Schemes a link or model may use; anything else (javascript:, data:, file:) is refused. */
const SAFE_SCHEMES = new Set(['http', 'https']);

/**
 * Whitespace in a value is the syntax's own (SPEC.md sections 5 and 6):
 * the space, the tab, the line feed, and the carriage return. No other
 * character separates numbers or is ignored around a value: a no-break
 * space where a space is meant is a bad value (review 134, L5).
 */
const isSpace = (c: number) => c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;
const SPACES = /[ \t\n\r]+/;

/** A value without the whitespace around it. */
function trimSpace(s: string): string {
  let start = 0;
  let end = s.length;
  while (start < end && isSpace(s.charCodeAt(start))) start += 1;
  while (end > start && isSpace(s.charCodeAt(end - 1))) end -= 1;
  return s.slice(start, end);
}

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

  // Every id in the page, first, wherever its element stands: an element
  // inside one that is unknown or misplaced is not checked further, but a
  // reference to it still finds it, and is not reported as a second, false
  // "no element has the id" (review 134, L6).
  const ids = new Map<string, ElementNode>();
  const collect = (el: ElementNode) => {
    const id = attr(el, 'id');
    if (id?.value && ID.test(id.value)) {
      if (ids.has(id.value)) report('duplicate-id', `The id "${id.value}" is used twice`, id.start);
      else ids.set(id.value, el);
    }
    for (const child of el.children) if (child.type === 'element') collect(child);
  };
  collect(root);
  /** The id a reference names; null when it is absent or not a reference (already reported as a bad value). */
  const named = (reference: Attribute | undefined): string | null => {
    const value = reference?.value;
    return value?.startsWith('#') && ID.test(value.slice(1)) ? value.slice(1) : null;
  };
  /** Is this an element of the page's version? One that is not is already reported, and nothing more is said of it. */
  const inVersion = (el: ElementNode): boolean => {
    const rule = own(ELEMENTS, el.name);
    return rule !== undefined && atLeast(version, rule.since);
  };

  const animations: ElementNode[] = [];
  const choices: ElementNode[] = [];
  const sounds: ElementNode[] = [];
  const viewpoints: ElementNode[] = [];

  const visit = (el: ElementNode, insideLink: boolean) => {
    const rule = own(ELEMENTS, el.name);
    if (!rule || !atLeast(version, rule.since)) {
      report('unknown-element', `<${el.name}> is not a HoloML ${version} element${rule?.since ? ` (it is in HoloML ${rule.since})` : ''}`, el.start);
      return;
    }
    checkAttributes(el, report, ctx);
    if (el.name === 'animate') animations.push(el);
    if (el.name === 'choice') choices.push(el);
    if (el.name === 'sound') sounds.push(el);
    if (el.name === 'viewpoint') viewpoints.push(el);
    if (el.name === 'a' && insideLink) report('nested-link', 'A link cannot be inside another link', el.start);
    // Loading by area (0.2): "near" says how near a group that loads by area must be.
    if (el.name === 'group' && atLeast(version, '0.2')) {
      const near = attr(el, 'near');
      if (near && attr(el, 'load')?.value !== 'near') report('missing-attribute', '<group> with "near" needs the attribute load="near"', near.start);
    }

    // Children.
    if (rule.children === 'text') {
      let text = '';
      for (const child of el.children) {
        if (child.type === 'text') text += child.value;
        else report('child-not-allowed', `<${el.name}> holds only text, not <${child.name}>`, child.start);
      }
      if (trimSpace(text) === '' && !rule.emptyText) report('empty-text', `<${el.name}> needs some text`, el.start);
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
          // Where the text's first character that is not whitespace is written: the parser knows, as the
          // text itself no longer tells a character reference from the character (review 134, L7).
          child.visible,
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
      const many = rule.manyFrom?.[child.name];
      if (n === 2 && rule.once?.includes(child.name) && (many === undefined || !atLeast(version, many))) {
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
    const id = named(target);
    if (!target || id === null) continue;
    const el = ids.get(id);
    if (!el) {
      report('unknown-target', `No element has the id "${id}"`, target.start);
      continue;
    }
    if (!usable || !inVersion(el)) continue;
    const kinds = own(ANIMATABLE, which)?.filter((k) => atLeast(version, k.since)).map((k) => k.element) ?? [];
    if (!kinds.includes(el.name)) {
      report('bad-target', `The ${which} of a <${el.name}> cannot be animated`, target.start);
    } else if (el.name === 'light' && which === 'position' && attr(el, 'type')?.value === 'ambient') {
      report('bad-target', 'An ambient light has no position to animate', target.start);
    }
  }
  // Click actions (0.2): what begins them, and what can be clicked.
  const clickable = (trigger: Attribute, what: string): void => {
    const id = named(trigger);
    if (id === null) return;
    const el = ids.get(id);
    if (!el) report('unknown-target', `No element has the id "${id}"`, trigger.start);
    else if (inVersion(el) && !CLICKABLE.includes(el.name)) report('bad-target', `${what} begins when its trigger is clicked, and a <${el.name}> cannot be clicked`, trigger.start);
  };
  // A 0.1 page has no click actions: what it writes of them is already reported as unknown (review 134, L6).
  for (const anim of atLeast(version, '0.2') ? animations : []) {
    const onClick = attr(anim, 'begin')?.value === 'click';
    for (const name of ['trigger', 'toggle', 'label']) {
      const a = attr(anim, name);
      if (a && !onClick) report('missing-attribute', `<animate> with "${name}" needs the attribute begin="click"`, a.start);
    }
    if (!onClick) continue;
    const trigger = attr(anim, 'trigger');
    if (trigger) clickable(trigger, 'An <animate> with begin="click"');
    else {
      // Without a trigger, a click on the target begins it: the target must be something that can be clicked.
      const target = named(attr(anim, 'target'));
      const el = target === null ? undefined : ids.get(target);
      if (el && inVersion(el) && !CLICKABLE.includes(el.name)) report('missing-attribute', `<animate begin="click"> on a <${el.name}> needs a "trigger": a <${el.name}> cannot be clicked`, anim.start);
    }
    const repeat = attr(anim, 'repeat');
    if (attr(anim, 'toggle') && repeat && trimSpace(repeat.value ?? '') !== '1') report('bad-value', '"repeat": a toggle runs once each way, forward on one click and back on the next', repeat.start);
  }
  for (const sound of sounds) {
    // Sounds from a place: how far one comes needs where it comes from.
    const range = attr(sound, 'range');
    if (range && !attr(sound, 'position')) report('missing-attribute', '<sound> with "range" needs a "position", the place it comes from', range.start);
    const onClick = attr(sound, 'begin')?.value === 'click';
    const trigger = attr(sound, 'trigger');
    for (const name of ['trigger', 'label']) {
      const a = attr(sound, name);
      if (a && !onClick) report('missing-attribute', `<sound> with "${name}" needs the attribute begin="click"`, a.start);
    }
    if (!onClick) continue;
    if (!trigger) report('missing-attribute', '<sound begin="click"> needs a "trigger", the thing whose click plays it', sound.start);
    else clickable(trigger, 'A <sound> with begin="click"');
    const autoplay = attr(sound, 'autoplay');
    if (autoplay) report('bad-value', '"autoplay": a sound that begins on a click does not also play by itself', autoplay.start);
  }
  // Places (0.2): when a scene has several viewpoints, an address names one by its id.
  if (viewpoints.length > 1 && atLeast(version, '0.2')) {
    for (const vp of viewpoints) {
      if (!attr(vp, 'id')) report('missing-attribute', 'Each <viewpoint> of a scene with several needs an "id", its name in the page\'s address', vp.start);
    }
  }
  // Choices (0.2): what they change, and their options' values.
  for (const choice of choices) {
    const target = attr(choice, 'target');
    const material = attr(choice, 'material');
    if (target && !material) report('missing-attribute', '<choice> with a "target" needs the attribute "material"', choice.start);
    if (material && !target) report('missing-attribute', '<choice> with a "material" needs the attribute "target"', choice.start);
    const id = named(target);
    if (target && id !== null) {
      const el = ids.get(id);
      if (!el) report('unknown-target', `No element has the id "${id}"`, target.start);
      else if (inVersion(el) && el.name !== 'model') report('bad-target', `A <choice> changes a <model>'s material, not a <${el.name}>`, target.start);
    }
    const values = new Set<string>();
    for (const option of choice.children) {
      if (option.type !== 'element' || option.name !== 'option') continue;
      const given = attr(option, 'value');
      const text = trimSpace(option.children.map((c) => (c.type === 'text' ? c.value : '')).join('')).split(SPACES).join(' ');
      const value = given?.value ?? text;
      if (values.has(value)) report('bad-value', `Two options of this <choice> have the value "${value}"`, given?.start ?? option.start);
      values.add(value);
    }
    const chosen = attr(choice, 'value');
    if (chosen?.value !== undefined && chosen.value !== null && values.size > 0 && !values.has(chosen.value)) {
      report('bad-value', `"value": "${chosen.value}" is not one of its options' values`, chosen.start);
    }
  }
  // In document order (SPEC.md section 8): the checks above that need every id come after the walk.
  return problems.sort((a, b) => a.line - b.line || a.column - b.column);
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
      const v = trimSpace(a.value ?? '');
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
  // already reported as a bad value, and so is an attribute the page's
  // version does not have (a 0.1 light's `shadows`).
  const type = el.name === 'light' ? attr(el, 'type')?.value : undefined;
  if (type && ['ambient', 'directional', 'point', 'spot'].includes(type)) {
    for (const a of el.attributes) {
      const types = own(LIGHT_ONLY, a.name);
      if (types && atLeast(ctx.version, own(rule.attributes, a.name)?.since) && !types.includes(type)) report('attribute-not-for-type', `A ${type} light has no "${a.name}"`, a.start);
    }
  }
}

function valueProblem(kind: ValueKind, value: string | null, name: string, ctx: Context): { code: ProblemCode; message: string } | null {
  const bad = (why: string) => ({ code: 'bad-value' as const, message: `"${name}": ${why}` });
  if (kind.kind === 'flag') return value === null ? null : bad('written alone, without a value');
  if (value === null) return bad('needs a value');
  const v = trimSpace(value);
  switch (kind.kind) {
    case 'text':
      return v === '' && !kind.empty ? bad('cannot be empty') : null;
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
      const parts = v.split(SPACES);
      if (parts.length !== 3 || !parts.every((p) => NUMBER.test(p))) return bad(`"${value}" is not three numbers, such as "0 1.5 -2"`);
      return parts.every(finite) ? null : bad(`"${value}" has a number too large`);
    }
    case 'scale': {
      const parts = v.split(SPACES);
      if ((parts.length !== 1 && parts.length !== 3) || !parts.every((p) => NUMBER.test(p))) return bad(`"${value}" is not one number or three`);
      return parts.every(finite) ? null : bad(`"${value}" has a number too large`);
    }
    case 'color':
      return COLOR.test(v) ? null : bad(`"${value}" is not a colour such as "#c0182a" or "#fff"`);
    case 'duration': {
      if (!DURATION.test(v)) return bad(`"${value}" is not a time such as "2s" or "500ms"`);
      const n = Number(v.slice(0, v.endsWith('ms') ? -2 : -1));
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
    case 'area': {
      const parts = v.split(SPACES);
      if (parts.length !== 4 || !parts.every((p) => NUMBER.test(p))) return bad(`"${value}" is not four numbers, such as "-6 -4 6 4"`);
      if (!parts.every(finite)) return bad(`"${value}" has a number too large`);
      const [x0, z0, x1, z1] = parts.map(Number) as [number, number, number, number];
      return x1 > x0 && z1 > z0 ? null : bad('must be "x0 z0 x1 z1", with x1 more than x0 and z1 more than z0');
    }
    case 'size': {
      const parts = v.split(SPACES);
      if (parts.length !== 3 || !parts.every((p) => NUMBER.test(p))) return bad(`"${value}" is not three numbers, such as "12 4 20"`);
      if (!parts.every(finite)) return bad(`"${value}" has a number too large`);
      return parts.every((p) => Number(p) > 0) ? null : bad('each of the three must be more than 0');
    }
    case 'tiling': {
      const parts = v.split(SPACES);
      if ((parts.length !== 1 && parts.length !== 2) || !parts.every((p) => NUMBER.test(p))) return bad(`"${value}" is not one number or two, such as "3" or "3 2"`);
      return parts.every((p) => Number(p) > 0 && finite(p)) ? null : bad('must be more than 0');
    }
    case 'repeat':
      if (v === INDEFINITE) return null;
      if (!COUNT.test(v)) return bad('must be a whole number of times, or "indefinite"');
      return Number.isSafeInteger(Number(v)) ? null : bad(`"${value}" is too many times`);
    case 'url': {
      // Spaces and control characters: a URL parser drops or rewrites them, so the scheme test below could be fooled.
      if (v === '' || notInAddress.test(v)) return bad('must be an address, without spaces or control characters');
      const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(v)?.[1]?.toLowerCase();
      if (scheme !== undefined && !SAFE_SCHEMES.has(scheme)) {
        return { code: 'unsafe-link', message: `"${name}": "${scheme}:" addresses are not allowed; use http, https, or a relative address` };
      }
      const path = v.split(/[?#]/)[0]!;
      if (kind.for === 'model' && !MODEL_FILE.test(path)) return bad('a model must be a glTF file (.gltf or .glb)');
      if (kind.for === 'script' && !SCRIPT_FILE.test(path)) return bad('a script must be a JavaScript file (.js or .mjs)');
      if (kind.for === 'sound' && !SOUND_FILE.test(path)) return bad('a sound must be an Ogg, MP3, or WAV file (.ogg, .mp3, or .wav)');
      if (kind.for === 'picture' && !PICTURE_FILE.test(path)) return bad('a picture must be a PNG, JPEG, or WebP file (.png, .jpg, .jpeg, or .webp)');
      if (kind.for === 'environment' && !ENVIRONMENT_FILE.test(path)) return bad('the surroundings must be an HDR, PNG, or JPEG picture (.hdr, .png, .jpg, or .jpeg)');
      return null;
    }
  }
}
