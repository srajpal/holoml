/**
 * Mistakes, as holoml's own parser and checker find them (feature 3): the
 * first syntax error, or every problem, with the checker's code and
 * words. The editor and HyperSpace 3D never disagree, since both use the
 * same code. The strict reader gives only where a mistake starts; the
 * forgiving outline gives how far to underline.
 */
import { HoloParseError, parse } from '@holoml/parser';
import { check } from '@holoml/schema';
import { DiagnosticSeverity, type Diagnostic } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { CODES_URL } from './docs.ts';
import { elements, type Outline } from './outline.ts';

export const SOURCE = 'holoml';

export function diagnose(doc: TextDocument, outline: Outline): Diagnostic[] {
  const text = doc.getText();
  let tree;
  try {
    tree = parse(text);
  } catch (e) {
    if (!(e instanceof HoloParseError)) throw e;
    return [diagnostic(doc, outline, e.position.offset, e.code, e.detail, 'syntax-errors')];
  }
  // A problem gives its line and column as the parser counts them: line 1 starts after a byte order mark.
  const bom = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  return check(tree).map((p) => {
    const offset = doc.offsetAt({ line: p.line - 1, character: p.column - 1 + (p.line === 1 ? bom : 0) });
    return diagnostic(doc, outline, offset, p.code, p.message, 'problems');
  });
}

function diagnostic(doc: TextDocument, outline: Outline, offset: number, code: string, message: string, group: 'syntax-errors' | 'problems'): Diagnostic {
  const [start, end] = extent(outline, offset);
  return {
    range: { start: doc.positionAt(start), end: doc.positionAt(end) },
    severity: DiagnosticSeverity.Error,
    source: SOURCE,
    code,
    codeDescription: { href: `${CODES_URL}#${group}` },
    message,
  };
}

/**
 * How much to underline for a mistake reported at an offset: a whole
 * attribute, a tag's "<" and name, or the word there.
 */
export function extent(outline: Outline, offset: number): [number, number] {
  const text = outline.text;
  for (const el of elements(outline)) {
    if (el.start === offset) return [offset, el.nameEnd];
    if (el.endTag?.start === offset) return [offset, el.endTag.end];
    const attr = el.attributes.find((a) => a.start === offset);
    if (attr) return [offset, attr.end];
    const value = el.attributes.find((a) => a.value?.start === offset)?.value;
    if (value) return [offset, value.end];
  }
  let end = offset;
  while (end < text.length && /[^\s<>"'=]/.test(text[end]!)) end += 1;
  return [offset, Math.max(end, Math.min(offset + 1, text.length))];
}
