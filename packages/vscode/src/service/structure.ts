/**
 * The page's shape for the editor (feature 8): its elements in the Outline
 * view and the breadcrumbs, and folding by element, by comment, and by
 * `<!-- #region -->` and `<!-- #endregion -->`.
 */
import { DocumentSymbol, FoldingRangeKind, SymbolKind, type FoldingRange } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { attribute, elements, textOf, type ElementNode, type Outline } from './outline.ts';

const KINDS: Readonly<Record<string, SymbolKind>> = {
  holoml: SymbolKind.File,
  head: SymbolKind.Module,
  title: SymbolKind.String,
  meta: SymbolKind.Property,
  script: SymbolKind.File,
  scene: SymbolKind.Namespace,
  group: SymbolKind.Package,
  model: SymbolKind.Object,
  material: SymbolKind.Field,
  viewpoint: SymbolKind.Event,
  light: SymbolKind.Constant,
  water: SymbolKind.Struct,
  label: SymbolKind.String,
  panel: SymbolKind.String,
  a: SymbolKind.Interface,
  animate: SymbolKind.Function,
  sound: SymbolKind.Event,
  hud: SymbolKind.String,
  slider: SymbolKind.Number,
  choice: SymbolKind.Enum,
  option: SymbolKind.EnumMember,
  plan: SymbolKind.Array,
};

/** What tells one element from its neighbours in the outline: its file, its text, or what it is. */
function detail(outline: Outline, el: ElementNode): string | undefined {
  for (const name of ['src', 'href', 'name', 'type', 'label', 'target']) {
    const value = attribute(el, name)?.value?.text;
    if (value) return value;
  }
  const text = textOf(outline, el);
  if (text) return text.length > 60 ? `${text.slice(0, 59)}…` : text;
  return undefined;
}

export function symbols(doc: TextDocument, outline: Outline): DocumentSymbol[] {
  const symbol = (el: ElementNode): DocumentSymbol => {
    const id = attribute(el, 'id')?.value?.text;
    const range = { start: doc.positionAt(el.start), end: doc.positionAt(el.end) };
    return {
      name: id ? `${el.name} #${id}` : el.name || '<',
      detail: detail(outline, el),
      kind: Object.hasOwn(KINDS, el.name) ? KINDS[el.name]! : SymbolKind.Object,
      range,
      selectionRange: { start: doc.positionAt(el.start + 1), end: doc.positionAt(Math.max(el.start + 1, el.nameEnd)) },
      children: el.children.map(symbol),
    };
  };
  return outline.roots.map(symbol);
}

export function folding(doc: TextDocument, outline: Outline): FoldingRange[] {
  const out: FoldingRange[] = [];
  const line = (offset: number) => doc.positionAt(offset).line;
  for (const el of elements(outline)) {
    const start = line(el.start);
    // The end tag's line stays in view, as HTML folds.
    const end = el.endTag ? line(el.endTag.start) - 1 : line(el.end) - 1;
    if (end > start) out.push({ startLine: start, endLine: end });
  }
  const regions: number[] = [];
  for (const c of outline.comments) {
    const body = outline.text.slice(c.start + 4, c.end - 3);
    if (/^\s*#region\b/.test(body)) regions.push(line(c.start));
    else if (/^\s*#endregion\b/.test(body)) {
      const start = regions.pop();
      if (start !== undefined && line(c.start) > start) out.push({ startLine: start, endLine: line(c.start), kind: FoldingRangeKind.Region });
    } else if (line(c.end) > line(c.start)) out.push({ startLine: line(c.start), endLine: line(c.end), kind: FoldingRangeKind.Comment });
  }
  return out;
}
