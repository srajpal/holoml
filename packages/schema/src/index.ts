/**
 * @holoml/schema: checks a parsed HoloML document against the HoloML 0.1
 * specification and lists every problem with its place (SPEC.md,
 * "Checking"). An empty list means the document is valid.
 */
import type { Attribute, ElementNode, HoloDocument, Position } from '@holoml/parser';
import { ELEMENTS, LIGHT_ONLY, ROOT, VERSION, type ValueKind } from './rules.ts';

export { ELEMENTS, LIGHT_ONLY, ROOT, VERSION } from './rules.ts';
export type { AttributeRule, ElementRule, ValueKind } from './rules.ts';

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
/** Schemes a link or model may use; anything else (javascript:, data:, file:) is refused. */
const SAFE_SCHEMES = new Set(['http', 'https']);

/** Which element kinds each animated attribute applies to. */
const ANIMATABLE: Record<string, readonly string[]> = {
  position: ['model', 'group', 'label'],
  rotation: ['model', 'group'],
  scale: ['model', 'group'],
};

/** Checks a document; returns every problem, in document order. */
export function check(doc: HoloDocument): Problem[] {
  const problems: Problem[] = [];
  const report = (code: ProblemCode, message: string, at: Position) =>
    problems.push({ code, message, line: at.line, column: at.column });

  const root = doc.root;
  if (root.name !== ROOT) {
    report('wrong-root', `The root element must be <${ROOT}>, not <${root.name}>`, root.start);
    return problems;
  }

  const ids = new Map<string, ElementNode>();
  const animations: ElementNode[] = [];

  const visit = (el: ElementNode, insideLink: boolean) => {
    const rule = ELEMENTS[el.name];
    if (!rule) {
      report('unknown-element', `<${el.name}> is not a HoloML 0.1 element`, el.start);
      return;
    }
    checkAttributes(el, report);
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
      if (text.trim() === '') report('empty-text', `<${el.name}> needs some text`, el.start);
      return;
    }
    const counts = new Map<string, number>();
    for (const child of el.children) {
      if (child.type === 'text') {
        report('text-not-allowed', `Text is not allowed directly inside <${el.name}>; put it in a <label>`, firstVisible(child.value, child.start));
        continue;
      }
      const allowed = rule.children !== 'none' && rule.children.includes(child.name);
      if (!allowed && ELEMENTS[child.name]) {
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

  // Animation targets, once every id is known.
  for (const anim of animations) {
    const target = attr(anim, 'target');
    const which = attr(anim, 'attribute')?.value;
    if (!target?.value?.startsWith('#')) continue; // already reported as a bad value
    const el = ids.get(target.value.slice(1));
    if (!el) {
      report('unknown-target', `No element has the id "${target.value.slice(1)}"`, target.start);
      continue;
    }
    const kinds = which ? ANIMATABLE[which] : undefined;
    if (kinds && !kinds.includes(el.name)) {
      report('bad-target', `The ${which} of a <${el.name}> cannot be animated`, target.start);
    }
  }
  return problems;
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

function attr(el: ElementNode, name: string): Attribute | undefined {
  return el.attributes.find((a) => a.name === name);
}

function checkAttributes(el: ElementNode, report: (code: ProblemCode, message: string, at: Position) => void): void {
  const rule = ELEMENTS[el.name]!;
  for (const a of el.attributes) {
    const r = rule.attributes[a.name];
    if (!r) {
      report('unknown-attribute', `<${el.name}> has no attribute "${a.name}"`, a.start);
      continue;
    }
    const problem = valueProblem(r.value, a.value, a.name);
    if (problem) report(problem.code, problem.message, a.start);
  }
  for (const [name, r] of Object.entries(rule.attributes)) {
    if (r.required && !attr(el, name)) report('missing-attribute', `<${el.name}> needs the attribute "${name}"`, el.start);
  }
  // Some light attributes belong to some types only; an unknown type is
  // already reported as a bad value.
  const type = el.name === 'light' ? attr(el, 'type')?.value : undefined;
  if (type && ['ambient', 'directional', 'point', 'spot'].includes(type)) {
    for (const a of el.attributes) {
      const types = LIGHT_ONLY[a.name];
      if (types && !types.includes(type)) report('attribute-not-for-type', `A ${type} light has no "${a.name}"`, a.start);
    }
  }
}

function valueProblem(kind: ValueKind, value: string | null, name: string): { code: ProblemCode; message: string } | null {
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
      if (kind.positive && n <= 0) return bad('must be more than 0');
      if (kind.min !== undefined && n < kind.min) return bad(`must be at least ${kind.min}`);
      if (kind.max !== undefined && n > kind.max) return bad(`must be at most ${kind.max}`);
      return null;
    }
    case 'vector3': {
      const parts = v.split(/\s+/);
      return parts.length === 3 && parts.every((p) => NUMBER.test(p)) ? null : bad(`"${value}" is not three numbers, such as "0 1.5 -2"`);
    }
    case 'scale': {
      const parts = v.split(/\s+/);
      return (parts.length === 1 || parts.length === 3) && parts.every((p) => NUMBER.test(p))
        ? null
        : bad(`"${value}" is not one number or three`);
    }
    case 'color':
      return COLOR.test(v) ? null : bad(`"${value}" is not a colour such as "#c0182a" or "#fff"`);
    case 'duration': {
      const m = DURATION.exec(v);
      return m && Number(m[1]) > 0 ? null : bad(`"${value}" is not a time such as "2s" or "500ms"`);
    }
    case 'id':
      return ID.test(v) ? null : bad(`"${value}" must start with a letter and use only letters, digits, "-", and "_"`);
    case 'idref':
      return v.startsWith('#') && ID.test(v.slice(1)) ? null : bad(`"${value}" must be "#" and an id, such as "#coupe"`);
    case 'choice':
      return kind.values.includes(v) ? null : bad(`must be one of ${kind.values.map((x) => `"${x}"`).join(', ')}`);
    case 'version':
      return v === VERSION ? null : { code: 'unsupported-version', message: `This checker knows HoloML ${VERSION}, not "${value}"` };
    case 'repeat':
      return v === 'indefinite' || (/^\d+$/.test(v) && Number(v) >= 1) ? null : bad('must be a whole number of times, or "indefinite"');
    case 'url': {
      if (v === '' || /\s/.test(v)) return bad('must be an address without spaces');
      const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(v)?.[1]?.toLowerCase();
      if (scheme !== undefined && !SAFE_SCHEMES.has(scheme)) {
        return { code: 'unsafe-link', message: `"${name}": "${scheme}:" addresses are not allowed; use http, https, or a relative address` };
      }
      if (kind.for === 'model' && !MODEL_FILE.test(v.split(/[?#]/)[0]!)) return bad('a model must be a glTF file (.gltf or .glb)');
      return null;
    }
  }
}
