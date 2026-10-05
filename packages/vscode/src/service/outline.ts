/**
 * A forgiving reader of HoloML text, for the editor (browser milestone 23,
 * Q3 a). holoml's parser is strict: it stops at the first mistake and
 * records only where things start. While a page is being typed it is
 * nearly always unfinished, and suggestions, hover, folding, and the
 * outline still need its shape. This reader never stops: it finds the
 * tags, attributes, values, and comments, and where each starts and ends,
 * the way VS Code's own HTML support does.
 *
 * It decides nothing about whether a page is right; the strict parser and
 * the checker do (diagnostics.ts). All places are offsets into the text.
 */

export interface ValueNode {
  /** Where the value starts: its opening quote, or its first character when it has none. */
  start: number;
  /** Just after its closing quote, or where it stops when the quote is missing. */
  end: number;
  /** The value as written, without its quotes. */
  text: string;
  quote: '"' | "'" | '';
  closed: boolean;
}

export interface AttributeNode {
  name: string;
  start: number;
  nameEnd: number;
  /** Just after the value, or after the name when it has none. */
  end: number;
  value?: ValueNode;
}

export interface EndTag {
  start: number;
  nameStart: number;
  nameEnd: number;
  end: number;
}

export interface ElementNode {
  name: string;
  /** The "<" of its start tag. */
  start: number;
  nameEnd: number;
  /** Just after the start tag's ">" or "/>"; absent while the start tag is unfinished. */
  startTagEnd?: number;
  selfClosed: boolean;
  /** Its matching end tag, when it has one. */
  endTag?: EndTag;
  /** Just after the element: its end tag, its "/>", or where something else closed it. */
  end: number;
  attributes: AttributeNode[];
  children: ElementNode[];
  parent?: ElementNode;
}

export interface CommentNode {
  start: number;
  end: number;
  closed: boolean;
}

export interface Outline {
  text: string;
  roots: ElementNode[];
  comments: CommentNode[];
}

const isSpace = (c: string | undefined) => c === ' ' || c === '\t' || c === '\n' || c === '\r';
const isLetter = (c: string | undefined) => c !== undefined && ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'));
const isNameChar = (c: string | undefined) => isLetter(c) || (c !== undefined && ((c >= '0' && c <= '9') || c === '-'));
/** What may be in an attribute's name here: more than the syntax allows, so that a wrong name is still read as one. */
const isAttributeNameChar = (c: string | undefined) => c !== undefined && !isSpace(c) && !'"\'<>/='.includes(c);

/** Reads the shape of a page, however unfinished. */
export function readOutline(text: string): Outline {
  const len = text.length;
  const roots: ElementNode[] = [];
  const comments: CommentNode[] = [];
  const open: ElementNode[] = [];
  const add = (el: ElementNode) => {
    const parent = open.at(-1);
    if (parent) {
      el.parent = parent;
      parent.children.push(el);
    } else roots.push(el);
  };

  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  while (i < len) {
    const lt = text.indexOf('<', i);
    if (lt < 0) break;
    i = lt;
    if (text.startsWith('<!--', i)) {
      const close = text.indexOf('-->', i + 4);
      const end = close < 0 ? len : close + 3;
      comments.push({ start: i, end, closed: close >= 0 });
      i = end;
      continue;
    }
    if (text[i + 1] === '/') {
      i = endTag(i);
      continue;
    }
    if (!isLetter(text[i + 1])) {
      // A "<" that starts no tag is text here (the strict parser says what is wrong with it).
      i += 1;
      continue;
    }
    i = startTag(i);
  }
  // What is still open at the end of the text ends there.
  for (const el of open) el.end = len;
  return { text, roots, comments };

  /** An end tag at `at`: it closes the nearest open element of its name, and every element opened inside that one. */
  function endTag(at: number): number {
    const nameStart = at + 2;
    let j = nameStart;
    while (j < len && isNameChar(text[j])) j += 1;
    const nameEnd = j;
    while (j < len && text[j] !== '>' && text[j] !== '<') j += 1;
    const end = text[j] === '>' ? j + 1 : j;
    const name = text.slice(nameStart, nameEnd);
    const index = name === '' ? -1 : open.findLastIndex((el) => el.name === name);
    if (index >= 0) {
      while (open.length - 1 > index) open.pop()!.end = at;
      const el = open.pop()!;
      el.endTag = { start: at, nameStart, nameEnd, end };
      el.end = end;
    }
    return Math.max(end, at + 2);
  }

  function startTag(at: number): number {
    let j = at + 1;
    while (j < len && isNameChar(text[j])) j += 1;
    const el: ElementNode = { name: text.slice(at + 1, j), start: at, nameEnd: j, selfClosed: false, end: j, attributes: [], children: [] };
    add(el);
    for (;;) {
      while (j < len && isSpace(text[j])) j += 1;
      const c = text[j];
      if (j >= len || c === '<') {
        // An unfinished start tag holds nothing; it ends where its text stops.
        el.end = j;
        return j;
      }
      if (c === '>') {
        el.startTagEnd = el.end = j + 1;
        open.push(el);
        return j + 1;
      }
      if (c === '/' && text[j + 1] === '>') {
        el.startTagEnd = el.end = j + 2;
        el.selfClosed = true;
        return j + 2;
      }
      if (c === '"' || c === "'") {
        // A value with no name before it.
        j = quoted(j).end;
        continue;
      }
      if (!isAttributeNameChar(c)) {
        j += 1;
        continue;
      }
      const attr: AttributeNode = { name: '', start: j, nameEnd: j, end: j };
      while (j < len && isAttributeNameChar(text[j])) j += 1;
      attr.name = text.slice(attr.start, j);
      attr.nameEnd = attr.end = j;
      el.attributes.push(attr);
      let k = j;
      while (k < len && isSpace(text[k])) k += 1;
      if (text[k] === '=') {
        k += 1;
        while (k < len && isSpace(text[k])) k += 1;
        const q = text[k];
        if (q === '"' || q === "'") attr.value = quoted(k);
        else if (k < len && text[k] !== '>' && text[k] !== '<' && !text.startsWith('/>', k)) {
          let e = k;
          while (e < len && !isSpace(text[e]) && text[e] !== '>' && text[e] !== '<' && !text.startsWith('/>', e)) e += 1;
          attr.value = { start: k, end: e, text: text.slice(k, e), quote: '', closed: true };
        }
        if (attr.value) j = attr.end = attr.value.end;
      }
      el.end = attr.end;
    }
  }

  /**
   * A quoted value at `at`. A "<" after a line end, before the closing
   * quote, means the quote is missing (as the strict parser decides): the
   * value then stops at its first line end.
   */
  function quoted(at: number): ValueNode {
    const q = text[at] as '"' | "'";
    const close = text.indexOf(q, at + 1);
    const lt = text.indexOf('<', at + 1);
    const lineEnd = text.slice(at + 1, lt < 0 ? len : lt).search(/[\r\n]/);
    const missing = close < 0 || (lt >= 0 && lt < close && lineEnd >= 0);
    if (missing) {
      const stop = lineEnd >= 0 ? at + 1 + lineEnd : len;
      return { start: at, end: stop, text: text.slice(at + 1, stop), quote: q, closed: false };
    }
    return { start: at, end: close + 1, text: text.slice(at + 1, close), quote: q, closed: true };
  }
}

/** Every element, parents before their children, in document order. */
export function* elements(outline: Outline): Generator<ElementNode> {
  const walk = function* (list: ElementNode[]): Generator<ElementNode> {
    for (const el of list) {
      yield el;
      yield* walk(el.children);
    }
  };
  yield* walk(outline.roots);
}

/** The deepest element whose text (tags included) holds the offset. */
export function elementAt(outline: Outline, offset: number): ElementNode | undefined {
  let found: ElementNode | undefined;
  let list = outline.roots;
  for (;;) {
    const el = list.find((e) => e.start <= offset && offset < e.end);
    if (!el) return found;
    found = el;
    list = el.children;
  }
}

/** Where an element's content ends: its end tag, or where it ends. */
export function contentEnd(el: ElementNode): number {
  return el.endTag?.start ?? el.end;
}

/** The deepest element whose content (between its tags) holds the offset; undefined at the top level. */
export function containerAt(outline: Outline, offset: number): ElementNode | undefined {
  let found: ElementNode | undefined;
  let list = outline.roots;
  for (;;) {
    const el = list.find((e) => !e.selfClosed && e.startTagEnd !== undefined && e.startTagEnd <= offset && offset <= contentEnd(e));
    if (!el) return found;
    found = el;
    list = el.children;
  }
}

/** The start tag that holds the offset, past its "<". */
export function startTagAt(outline: Outline, offset: number): ElementNode | undefined {
  const el = elementAt(outline, offset);
  const inTag = (e: ElementNode) => e.start < offset && (e.startTagEnd === undefined ? offset <= e.end : offset < e.startTagEnd);
  if (el && inTag(el)) return el;
  // At the very end of an unfinished tag, the offset is past every element's text.
  const last = [...elements(outline)].reverse().find((e) => e.startTagEnd === undefined && e.end === offset);
  return last && inTag(last) ? last : undefined;
}

export function commentAt(outline: Outline, offset: number): CommentNode | undefined {
  return outline.comments.find((c) => c.start < offset && (c.closed ? offset < c.end : offset <= c.end));
}

export function attribute(el: ElementNode, name: string): AttributeNode | undefined {
  return el.attributes.find((a) => a.name === name);
}

/** The declared version of the page, from its root's `version`, when it has one. */
export function declaredVersion(outline: Outline): string | undefined {
  const root = outline.roots[0];
  return root ? attribute(root, 'version')?.value?.text : undefined;
}

/** The text an element holds, without its tags or comments, with its whitespace run together. */
export function textOf(outline: Outline, el: ElementNode): string {
  if (el.startTagEnd === undefined) return '';
  const stop = contentEnd(el);
  // What lies between its tags and is not text: its children, and the comments the reader found.
  const skip = [...el.children, ...outline.comments.filter((c) => c.start >= el.startTagEnd! && c.start < stop)].sort((a, b) => a.start - b.start);
  let out = '';
  let i = el.startTagEnd;
  for (const part of skip) {
    if (part.start < i) continue;
    out += outline.text.slice(i, part.start);
    i = Math.min(part.end, stop);
  }
  out += outline.text.slice(i, stop);
  return out.replace(/\s+/g, ' ').trim();
}
