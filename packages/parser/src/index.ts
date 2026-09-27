/**
 * @holoml/parser: reads HoloML text into a tree of elements and text,
 * with the line and column where each starts. The syntax is strict
 * (SPEC.md, "Syntax"): the first mistake stops the parse with a
 * HoloParseError that says what is wrong and where.
 *
 * No dependencies, so any renderer or tool can use it.
 */

/** A place in the text. Lines and columns start at 1; columns count UTF-16 code units, as most editors do. */
export interface Position {
  line: number;
  column: number;
  offset: number;
}

export interface Attribute {
  name: string;
  /** Null for an attribute written alone, such as `autoplay`. */
  value: string | null;
  start: Position;
}

export interface ElementNode {
  type: 'element';
  name: string;
  attributes: Attribute[];
  children: HoloNode[];
  start: Position;
}

export interface TextNode {
  type: 'text';
  /** The text with character references replaced; whitespace as written. */
  value: string;
  start: Position;
}

export type HoloNode = ElementNode | TextNode;

export interface HoloDocument {
  type: 'document';
  root: ElementNode;
}

/** Every syntax error has one of these codes; SPEC.md lists them with their meaning. */
export const PARSE_ERROR_CODES = [
  'no-root',
  'text-outside-root',
  'second-root',
  'unexpected-end',
  'invalid-name',
  'uppercase-name',
  'unquoted-value',
  'duplicate-attribute',
  'missing-space',
  'stray-slash',
  'unclosed-element',
  'mismatched-end-tag',
  'stray-end-tag',
  'bad-character-reference',
  'unclosed-comment',
  'bad-comment',
  'unsupported-markup',
  'less-than-in-value',
  'unclosed-value',
  'null-character',
] as const;

export type ParseErrorCode = (typeof PARSE_ERROR_CODES)[number];

export class HoloParseError extends Error {
  readonly code: ParseErrorCode;
  /** The message without its place. */
  readonly detail: string;
  readonly position: Position;

  constructor(code: ParseErrorCode, detail: string, position: Position) {
    super(`${detail} (line ${position.line}, column ${position.column})`);
    this.name = 'HoloParseError';
    this.code = code;
    this.detail = detail;
    this.position = position;
  }
}

const NAMED_REFERENCES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

const isSpace = (c: number) => c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;
const isLower = (c: number) => c >= 0x61 && c <= 0x7a;
const isUpper = (c: number) => c >= 0x41 && c <= 0x5a;
const isDigit = (c: number) => c >= 0x30 && c <= 0x39;
const isNameChar = (c: number) => isLower(c) || isDigit(c) || c === 0x2d || isUpper(c);

/** Reads HoloML text. Throws HoloParseError at the first mistake. */
export function parse(text: string): HoloDocument {
  return new Parser(text).document();
}

class Parser {
  private i = 0;
  /** Offsets where each line starts, for turning offsets into lines and columns. */
  private readonly lineStarts: number[] = [0];
  private readonly s: string;

  constructor(s: string) {
    this.s = s;
    for (let k = 0; k < s.length; k++) {
      const c = s.charCodeAt(k);
      if (c === 0x0a) this.lineStarts.push(k + 1);
      else if (c === 0x0d && s.charCodeAt(k + 1) !== 0x0a) this.lineStarts.push(k + 1);
    }
    if (s.charCodeAt(0) === 0xfeff) this.i = 1; // a byte order mark is allowed and ignored
  }

  document(): HoloDocument {
    let root: ElementNode | null = null;
    for (;;) {
      this.skipSpaceAndComments();
      if (this.i >= this.s.length) break;
      if (this.s.charCodeAt(this.i) !== 0x3c) {
        throw this.error('text-outside-root', 'Text must be inside the root element', this.i);
      }
      if (this.s.startsWith('</', this.i)) {
        throw this.error('stray-end-tag', 'An end tag with no element open', this.i);
      }
      if (root) throw this.error('second-root', 'A document has one root element; this is a second', this.i);
      root = this.element();
    }
    if (!root) throw this.error('no-root', 'The document has no root element', this.i);
    return { type: 'document', root };
  }

  private element(): ElementNode {
    const startOffset = this.i;
    this.i += 1; // <
    const c = this.s.charCodeAt(this.i);
    if (c === 0x21 /* ! */ || c === 0x3f /* ? */) {
      throw this.error('unsupported-markup', 'Declarations and processing instructions are not part of HoloML', startOffset);
    }
    const name = this.name('element');
    const node: ElementNode = { type: 'element', name, attributes: [], children: [], start: this.pos(startOffset) };
    const seen = new Set<string>();
    for (;;) {
      const hadSpace = this.skipSpace();
      if (this.i >= this.s.length) throw this.error('unexpected-end', `The <${name}> tag is not finished`, startOffset);
      const ch = this.s.charCodeAt(this.i);
      if (ch === 0x3e /* > */) {
        this.i += 1;
        break;
      }
      if (ch === 0x2f /* / */) {
        if (this.s.charCodeAt(this.i + 1) !== 0x3e) throw this.error('stray-slash', 'A "/" in a tag must be followed by ">"', this.i);
        this.i += 2;
        return node;
      }
      if (!hadSpace) throw this.error('missing-space', 'Attributes need a space before them', this.i);
      const attrStart = this.i;
      const attrName = this.name('attribute');
      if (seen.has(attrName)) throw this.error('duplicate-attribute', `The attribute "${attrName}" is given twice`, attrStart);
      seen.add(attrName);
      let value: string | null = null;
      const afterName = this.i;
      this.skipSpace();
      if (this.s.charCodeAt(this.i) === 0x3d /* = */) {
        this.i += 1;
        this.skipSpace();
        value = this.quoted(attrName);
      } else {
        this.i = afterName;
      }
      node.attributes.push({ name: attrName, value, start: this.pos(attrStart) });
    }
    // Content, up to the matching end tag.
    for (;;) {
      if (this.i >= this.s.length) throw this.error('unclosed-element', `The <${name}> element is never closed`, startOffset);
      if (this.s.startsWith('<!--', this.i)) {
        this.comment();
        continue;
      }
      if (this.s.charCodeAt(this.i) === 0x3c) {
        if (this.s.charCodeAt(this.i + 1) === 0x2f) {
          const endStart = this.i;
          this.i += 2;
          const endName = this.name('element');
          this.skipSpace();
          if (this.s.charCodeAt(this.i) !== 0x3e) throw this.error('unexpected-end', `The </${endName}> tag is not finished`, endStart);
          this.i += 1;
          if (endName !== name) {
            throw this.error('mismatched-end-tag', `Expected </${name}> (opened on line ${node.start.line}), found </${endName}>`, endStart);
          }
          return node;
        }
        node.children.push(this.element());
        continue;
      }
      const text = this.text();
      if (text) node.children.push(text);
    }
  }

  /** Text up to the next "<"; whitespace-only text is dropped. */
  private text(): TextNode | null {
    const start = this.i;
    let out = '';
    let run = start;
    let blank = true;
    while (this.i < this.s.length) {
      const c = this.s.charCodeAt(this.i);
      if (c === 0x3c) break;
      if (c === 0) throw this.error('null-character', 'A null character is not allowed', this.i);
      if (c === 0x26 /* & */) {
        out += this.s.slice(run, this.i) + this.reference();
        run = this.i;
        blank = false;
        continue;
      }
      if (!isSpace(c)) blank = false;
      this.i += 1;
    }
    out += this.s.slice(run, this.i);
    return blank ? null : { type: 'text', value: out, start: this.pos(start) };
  }

  private quoted(attrName: string): string {
    const q = this.s.charCodeAt(this.i);
    if (q !== 0x22 && q !== 0x27) throw this.error('unquoted-value', `The value of "${attrName}" needs quotes`, this.i);
    const open = this.i;
    this.i += 1;
    let out = '';
    let run = this.i;
    for (;;) {
      const unclosed = () => this.error('unclosed-value', `The value of "${attrName}" is never closed with ${q === 0x22 ? '"' : "'"}`, open);
      if (this.i >= this.s.length) throw unclosed();
      const c = this.s.charCodeAt(this.i);
      if (c === q) break;
      if (c === 0x3c) {
        // A "<" after a line break almost always means the closing quote is missing.
        if (/[\r\n]/.test(this.s.slice(open, this.i))) throw unclosed();
        throw this.error('less-than-in-value', `Write "&lt;" for "<" in the value of "${attrName}"`, this.i);
      }
      if (c === 0) throw this.error('null-character', 'A null character is not allowed', this.i);
      if (c === 0x26) {
        out += this.s.slice(run, this.i) + this.reference();
        run = this.i;
        continue;
      }
      this.i += 1;
    }
    out += this.s.slice(run, this.i);
    this.i += 1;
    return out;
  }

  /** A character reference at "&": &amp; &lt; &gt; &quot; &apos; &#65; &#x41;. */
  private reference(): string {
    const start = this.i;
    const end = this.s.indexOf(';', start);
    const body = end > start && end - start <= 10 ? this.s.slice(start + 1, end) : '';
    let char: string | undefined;
    if (/^#[0-9]{1,7}$/.test(body)) char = codePoint(Number(body.slice(1)));
    else if (/^#x[0-9a-fA-F]{1,6}$/.test(body)) char = codePoint(parseInt(body.slice(2), 16));
    else char = NAMED_REFERENCES[body];
    if (char === undefined) {
      throw this.error('bad-character-reference', 'Write "&amp;" for "&", or use &lt; &gt; &quot; &apos; or a number such as &#233;', start);
    }
    this.i = end + 1;
    return char;
  }

  private name(kind: 'element' | 'attribute'): string {
    const start = this.i;
    const first = this.s.charCodeAt(this.i);
    if (!isLower(first) && !isUpper(first)) {
      throw this.error('invalid-name', `Expected ${kind === 'element' ? 'an element' : 'an attribute'} name`, start);
    }
    while (this.i < this.s.length && isNameChar(this.s.charCodeAt(this.i))) this.i += 1;
    const name = this.s.slice(start, this.i);
    if (name !== name.toLowerCase()) {
      throw this.error('uppercase-name', `Names are written in lower case: "${name.toLowerCase()}", not "${name}"`, start);
    }
    return name;
  }

  private comment(): void {
    const start = this.i;
    const end = this.s.indexOf('-->', start + 4);
    if (end < 0) throw this.error('unclosed-comment', 'A comment is never closed with "-->"', start);
    if (this.s.slice(start + 4, end).includes('--')) throw this.error('bad-comment', 'A comment may not contain "--"', start);
    this.i = end + 3;
  }

  private skipSpace(): boolean {
    const start = this.i;
    while (this.i < this.s.length && isSpace(this.s.charCodeAt(this.i))) this.i += 1;
    return this.i > start;
  }

  private skipSpaceAndComments(): void {
    for (;;) {
      this.skipSpace();
      if (this.s.startsWith('<!--', this.i)) this.comment();
      else return;
    }
  }

  pos(offset: number): Position {
    // The last line start at or before the offset.
    let lo = 0;
    let hi = this.lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.lineStarts[mid]! <= offset) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo + 1, column: offset - this.lineStarts[lo]! + 1, offset };
  }

  private error(code: ParseErrorCode, detail: string, offset: number): HoloParseError {
    return new HoloParseError(code, detail, this.pos(Math.min(offset, this.s.length)));
  }
}

function codePoint(n: number): string | undefined {
  if (n === 0 || n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)) return undefined;
  return String.fromCodePoint(n);
}

/**
 * Writes a tree back out as HoloML text: two-space indentation, double
 * quotes, and elements without children closed with "/>". Parsing the
 * result gives the same tree (apart from positions).
 */
export function serialize(doc: HoloDocument): string {
  const out: string[] = [];
  const write = (node: HoloNode, depth: number) => {
    const pad = '  '.repeat(depth);
    if (node.type === 'text') {
      out.push(pad + escapeText(node.value.trim()));
      return;
    }
    const attrs = node.attributes.map((a) => (a.value === null ? ` ${a.name}` : ` ${a.name}="${escapeValue(a.value)}"`)).join('');
    if (node.children.length === 0) {
      out.push(`${pad}<${node.name}${attrs} />`);
      return;
    }
    // Text-only content stays on one line, as written in titles and labels.
    const only = node.children[0];
    if (node.children.length === 1 && only?.type === 'text') {
      out.push(`${pad}<${node.name}${attrs}>${escapeText(only.value)}</${node.name}>`);
      return;
    }
    out.push(`${pad}<${node.name}${attrs}>`);
    for (const child of node.children) write(child, depth + 1);
    out.push(`${pad}</${node.name}>`);
  };
  write(doc.root, 0);
  return out.join('\n') + '\n';
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeValue(s: string): string {
  return escapeText(s).replace(/"/g, '&quot;');
}
