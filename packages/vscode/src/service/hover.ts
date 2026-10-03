/**
 * Help on hover (feature 5): what an element or attribute is, from the
 * specification's own words (docs.ts), with the version it came in; and,
 * over a mistake, what its code means.
 */
import { ELEMENTS } from '@holoml/schema';
import { MarkupKind, type Diagnostic, type Hover } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { ELEMENTS_URL, SPEC_URL, type Docs } from './docs.ts';
import { elementAt, type Outline } from './outline.ts';
import { own } from './rules.ts';

export function hover(doc: TextDocument, outline: Outline, offset: number, docs: Docs, diagnostics: readonly Diagnostic[] = []): Hover | null {
  const parts: string[] = [];
  let span: [number, number] | undefined;
  const el = elementAt(outline, offset);
  if (el) {
    const onName = el.start < offset && offset <= el.nameEnd;
    const onEndName = el.endTag !== undefined && el.endTag.nameStart <= offset && offset <= el.endTag.nameEnd;
    const attr = el.attributes.find((a) => a.start <= offset && offset <= a.nameEnd);
    if (onName || onEndName) {
      const text = elementText(el.name, docs);
      if (text) {
        parts.push(text);
        span = onName ? [el.start + 1, el.nameEnd] : [el.endTag!.nameStart, el.endTag!.nameEnd];
      }
    } else if (attr && (el.startTagEnd === undefined || offset < el.startTagEnd)) {
      const text = attributeText(el.name, attr.name, docs);
      if (text) {
        parts.push(text);
        span = [attr.start, attr.nameEnd];
      }
    }
  }
  const position = doc.positionAt(offset);
  const at = (d: Diagnostic) => {
    const start = doc.offsetAt(d.range.start);
    const end = doc.offsetAt(d.range.end);
    return start <= offset && (offset < end || (start === end && offset === start));
  };
  for (const d of diagnostics.filter(at)) {
    const meaning = typeof d.code === 'string' ? own(docs.codes, d.code) : undefined;
    if (meaning) parts.push(`\`${d.code}\`: ${meaning}.`);
  }
  if (parts.length === 0) return null;
  return {
    contents: { kind: MarkupKind.Markdown, value: parts.join('\n\n---\n\n') },
    range: span ? { start: doc.positionAt(span[0]), end: doc.positionAt(span[1]) } : { start: position, end: position },
  };
}

export function elementText(name: string, docs: Docs): string | null {
  const rule = own(ELEMENTS, name);
  const doc = own(docs.elements, name);
  if (!rule || !doc) return null;
  const since = rule.since ? ` · HoloML ${rule.since}` : '';
  const holds = rule.children === 'text' ? 'text' : rule.children === 'none' ? 'nothing' : rule.children.map((c) => `\`${c}\``).join(', ');
  const parents = Object.entries(ELEMENTS).filter(([, r]) => Array.isArray(r.children) && r.children.includes(name));
  const inside = parents.length ? parents.map(([p]) => `\`${p}\``).join(', ') : 'nothing; it is the root';
  return [
    `**\`<${name}>\`**${since}`,
    doc.summary,
    `Holds: ${holds}. May be in: ${inside}.`,
    `[Specification](${SPEC_URL}#${name}) · [Reference](${ELEMENTS_URL}#${name})`,
  ].join('\n\n');
}

export function attributeText(element: string, name: string, docs: Docs): string | null {
  const rule = own(ELEMENTS, element);
  const attr = rule && own(rule.attributes, name);
  const doc = own(docs.elements, element)?.attributes[name];
  if (!attr || !doc) return null;
  const notes = [attr.required ? 'required' : '', attr.since ? `HoloML ${attr.since}` : ''].filter(Boolean);
  return [
    `**\`${name}\`** on \`<${element}>\`${notes.length ? ` · ${notes.join(' · ')}` : ''}`,
    doc.meaning,
    `Value: ${doc.value.replace(/\s*\(required\)/, '')}${doc.default ? ` · Default: ${doc.default}` : ''}`,
  ].join('\n\n');
}
