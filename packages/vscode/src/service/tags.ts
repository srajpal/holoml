/**
 * Tags kept in step (feature 7): the end tag written when a start tag is
 * finished, or when "</" is typed; and the start and end tag's names
 * edited together (linked editing), as VS Code's HTML support does.
 */
import { ELEMENTS } from '@holoml/schema';
import type { LinkedEditingRanges } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { containerAt, elements, type Outline } from './outline.ts';
import { own } from './rules.ts';

/**
 * What to insert after the character just typed at `offset` (">" or "/"),
 * as a snippet, or null. After ">" that finishes a start tag: "$0</name>"
 * (not for an element that holds nothing, which is closed with "/>").
 * After "</": the name of the element still open, and ">".
 */
export function autoClose(outline: Outline, offset: number, typed: '>' | '/'): string | null {
  const text = outline.text;
  if (typed === '>') {
    if (text[offset - 1] !== '>') return null;
    const el = [...elements(outline)].find((e) => e.startTagEnd === offset && !e.selfClosed);
    if (!el || el.name === '') return null;
    if (own(ELEMENTS, el.name)?.children === 'none') return null;
    if (el.endTag && el.endTag.start <= offset) return null;
    // An end tag right after the cursor is the one that closes it already.
    if (text.startsWith(`</${el.name}`, offset)) return null;
    return `$0</${el.name}>`;
  }
  if (!text.endsWith('</', offset)) return null;
  if (/^[A-Za-z]/.test(text[offset] ?? '')) return null;
  let el = containerAt(outline, offset - 2);
  while (el?.endTag && el.endTag.start !== offset - 2) el = el.parent;
  return el && el.name !== '' ? `${el.name}>` : null;
}

export function linkedEditing(doc: TextDocument, outline: Outline, offset: number): LinkedEditingRanges | null {
  for (const el of elements(outline)) {
    if (!el.endTag || el.selfClosed) continue;
    const onStart = el.start < offset && offset <= el.nameEnd;
    const onEnd = el.endTag.nameStart <= offset && offset <= el.endTag.nameEnd;
    if (!onStart && !onEnd) continue;
    if (text(el.start + 1, el.nameEnd) !== text(el.endTag.nameStart, el.endTag.nameEnd)) return null;
    return {
      ranges: [
        { start: doc.positionAt(el.start + 1), end: doc.positionAt(el.nameEnd) },
        { start: doc.positionAt(el.endTag.nameStart), end: doc.positionAt(el.endTag.nameEnd) },
      ],
      wordPattern: '[A-Za-z][A-Za-z0-9-]*',
    };
  }
  return null;

  function text(start: number, end: number) {
    return outline.text.slice(start, end);
  }
}
