/**
 * Suggestions (feature 4): after "<", the elements allowed where the
 * cursor is; after "</", the element to close; in a tag, its attributes
 * not yet written; in a value, an attribute's choices, the versions, or
 * the page's ids. Only what the page's version has is offered, so a 0.1
 * page is never offered 0.2's elements.
 */
import { LIGHT_ONLY, ROOT, VERSIONS, atLeast, type AttributeRule, type ElementRule, type Version } from '@holoml/schema';
import { CompletionItemKind, InsertTextFormat, MarkupKind, type CompletionItem, type CompletionList, type Range } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { Docs } from './docs.ts';
import { attribute, commentAt, containerAt, elements, startTagAt, type ElementNode, type Outline } from './outline.ts';
import { attributeRule, elementRule, isReference, own, pageVersion, valueKind } from './rules.ts';

export function complete(doc: TextDocument, outline: Outline, offset: number, docs: Docs): CompletionList {
  const items = completions(doc, outline, offset, docs);
  return { isIncomplete: false, items };
}

function completions(doc: TextDocument, outline: Outline, offset: number, docs: Docs): CompletionItem[] {
  if (commentAt(outline, offset)) return [];
  const text = outline.text;
  const version = pageVersion(outline);
  const range = (start: number, end: number): Range => ({ start: doc.positionAt(start), end: doc.positionAt(end) });

  const tag = startTagAt(outline, offset);
  if (tag && offset > tag.nameEnd) {
    const attr = tag.attributes.find((a) => a.value && a.value.start < offset && (a.value.closed ? offset < a.value.end : offset <= a.value.end));
    if (attr?.value) {
      const quote = attr.value.quote === '' ? 0 : 1;
      const end = attr.value.closed ? attr.value.end - quote : attr.value.end;
      return valueItems(outline, tag, attr.name, version, range(attr.value.start + quote, end));
    }
    const named = tag.attributes.find((a) => a.start <= offset && offset <= a.nameEnd);
    // Between attributes, only after whitespace: right after a value, a space comes first.
    if (!named && !/\s/.test(text[offset - 1] ?? '')) return [];
    const replace = named ? range(named.start, named.nameEnd) : range(offset, offset);
    return attributeItems(tag, version, replace, docs, named?.name);
  }

  const before = text.slice(Math.max(0, offset - 64), offset);
  const closing = /<\/([A-Za-z0-9-]*)$/.exec(before);
  if (closing) {
    let el = containerAt(outline, offset - closing[0].length);
    while (el?.endTag && el.endTag.start !== offset - closing[0].length) el = el.parent;
    if (!el) return [];
    const after = text.slice(offset).match(/^[A-Za-z0-9-]*\s*>?/)![0];
    return [
      {
        label: `/${el.name}`,
        kind: CompletionItemKind.Property,
        filterText: `/${el.name}`,
        textEdit: { range: range(offset - closing[1]!.length - 1, offset + after.length), newText: `/${el.name}>` },
      },
    ];
  }

  const opening = /<([A-Za-z][A-Za-z0-9-]*)?$/.exec(before);
  if (opening) {
    const start = offset - (opening[1]?.length ?? 0);
    const editing = tag && tag.start === start - 1 ? tag : undefined;
    // Renaming a tag that already has attributes, or is finished, changes only its name.
    const nameOnly = editing !== undefined && (editing.attributes.length > 0 || editing.startTagEnd !== undefined);
    const end = editing ? editing.nameEnd : offset;
    return elementItems(outline, start - 1, version, range(start, end), docs, nameOnly, editing);
  }
  return [];
}

function elementItems(outline: Outline, at: number, version: Version, replace: Range, docs: Docs, nameOnly: boolean, editing: ElementNode | undefined): CompletionItem[] {
  const parent = containerAt(outline, at);
  let names: readonly string[];
  if (!parent) names = outline.roots.some((r) => r !== editing) ? [] : [ROOT];
  else {
    const rule = elementRule(parent.name, version);
    names = rule && Array.isArray(rule.children) ? rule.children : [];
  }
  const parentRule = parent && elementRule(parent.name, version);
  return names
    .filter((name) => elementRule(name, version) !== undefined)
    .filter((name) => {
      // What may appear once, and is already there, is not offered again.
      if (!parent || !parentRule?.once?.includes(name)) return true;
      const many = parentRule.manyFrom?.[name];
      if (many !== undefined && atLeast(version, many)) return true;
      return !parent.children.some((c) => c !== editing && c.name === name);
    })
    .map((name, index) => {
      const rule = elementRule(name, version)!;
      const doc = own(docs.elements, name);
      return {
        label: name,
        kind: CompletionItemKind.Property,
        sortText: String(index).padStart(3, '0'),
        detail: rule.since ? `HoloML ${rule.since}` : undefined,
        documentation: doc ? { kind: MarkupKind.Markdown, value: doc.summary } : undefined,
        insertTextFormat: InsertTextFormat.Snippet,
        textEdit: { range: replace, newText: nameOnly ? name : elementSnippet(name, rule, version) },
      };
    });
}

/** Elements that may hold others but seldom do: a model holds a material only to change one. They are written closed, with "/>". */
const USUALLY_EMPTY: readonly string[] = ['model'];

/** An element with its required attributes, each a place to type, and its end, as its rule says. */
export function elementSnippet(name: string, rule: ElementRule, version: Version): string {
  let stop = 1;
  const attrs = Object.entries(rule.attributes)
    .filter(([, r]) => r.required && atLeast(version, r.since))
    .map(([attr, r]) => ` ${attributeSnippet(attr, r, version, () => stop++)}`)
    .join('');
  if (rule.children === 'none' || USUALLY_EMPTY.includes(name)) return `${name}${attrs} />$0`;
  return `${name}${attrs}>$0</${name}>`;
}

function attributeSnippet(name: string, rule: AttributeRule, version: Version, next: () => number): string {
  const kind = rule.value;
  if (kind.kind === 'flag') return name;
  if (kind.kind === 'choice') {
    const values = kind.values.filter((v) => atLeast(version, kind.since?.[v]));
    return `${name}="\${${next()}|${values.join(',')}|}"`;
  }
  if (kind.kind === 'version') return `${name}="\${${next()}|${[version, ...VERSIONS.filter((v) => v !== version)].join(',')}|}"`;
  return `${name}="\$${next()}"`;
}

function attributeItems(el: ElementNode, version: Version, replace: Range, docs: Docs, current: string | undefined): CompletionItem[] {
  const rule = elementRule(el.name, version);
  if (!rule) return [];
  const type = el.name === 'light' ? attribute(el, 'type')?.value?.text : undefined;
  return Object.entries(rule.attributes)
    .filter(([name, r]) => atLeast(version, r.since) && (name === current || !attribute(el, name)))
    .filter(([name]) => !type || !own(LIGHT_ONLY, name) || own(LIGHT_ONLY, name)!.includes(type))
    .map(([name, r]) => {
      const doc = own(docs.elements, el.name)?.attributes[name];
      const kind = r.value.kind;
      return {
        label: name,
        kind: CompletionItemKind.Value,
        detail: [r.required ? 'required' : '', r.since ? `HoloML ${r.since}` : ''].filter(Boolean).join(' · ') || undefined,
        documentation: doc ? { kind: MarkupKind.Markdown, value: doc.meaning } : undefined,
        // Required attributes first.
        sortText: `${r.required ? 0 : 1}${name}`,
        insertTextFormat: InsertTextFormat.Snippet,
        textEdit: { range: replace, newText: attributeSnippet(name, r, version, () => 1) },
        command: kind === 'idref' ? { title: 'Suggest', command: 'editor.action.triggerSuggest' } : undefined,
      };
    });
}

function valueItems(outline: Outline, el: ElementNode, name: string, version: Version, replace: Range): CompletionItem[] {
  const kind = valueKind(el, name, version);
  const item = (value: string, itemKind: CompletionItemKind, detail?: string): CompletionItem => ({ label: value, kind: itemKind, detail, textEdit: { range: replace, newText: value } });
  if (kind?.kind === 'choice') return kind.values.filter((v) => atLeast(version, kind.since?.[v])).map((v) => item(v, CompletionItemKind.EnumMember));
  if (kind?.kind === 'version') return VERSIONS.map((v) => item(v, CompletionItemKind.EnumMember));
  if (attributeRule(el, name, version) && (kind?.kind === 'idref' || isReferenceToPlace(el, name))) {
    const out: CompletionItem[] = [];
    for (const other of elements(outline)) {
      const id = attribute(other, 'id')?.value?.text;
      if (id && other !== el) out.push(item(`#${id}`, CompletionItemKind.Reference, `<${other.name}>`));
    }
    return out;
  }
  return [];
}

/** A link's `href` that names a place in the page ("#name"). */
function isReferenceToPlace(el: ElementNode, name: string): boolean {
  return el.name === 'a' && name === 'href' && isReference(el, name, '0.2');
}
