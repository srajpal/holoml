/**
 * Features about values (features 9 to 11): colour swatches and the colour
 * picker; going to the element a "#name" names, and finding every
 * reference to a name; and links to the files a page names.
 */
import { COLOR_PATTERN, whole } from '@holoml/schema';
import type { Color, ColorInformation, ColorPresentation, DocumentLink, Location, Range } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { attribute, elements, startTagAt, type AttributeNode, type ElementNode, type Outline } from './outline.ts';
import { isReference, pageVersion, valueKind } from './rules.ts';

const COLOR = whole(COLOR_PATTERN);

/** The range of a value's text, inside its quotes, without the whitespace around it. */
function valueRange(doc: TextDocument, attr: AttributeNode): Range {
  const value = attr.value!;
  const quote = value.quote === '' ? 0 : 1;
  const lead = value.text.length - value.text.trimStart().length;
  const start = value.start + quote + lead;
  const end = start + value.text.trim().length;
  return { start: doc.positionAt(start), end: doc.positionAt(end) };
}

// ---------------------------------------------------------------------------
// Colours

export function colors(doc: TextDocument, outline: Outline): ColorInformation[] {
  const version = pageVersion(outline);
  const out: ColorInformation[] = [];
  for (const el of elements(outline)) {
    for (const attr of el.attributes) {
      if (!attr.value || valueKind(el, attr.name, version)?.kind !== 'color') continue;
      const color = parseColor(attr.value.text.trim());
      if (color) out.push({ range: valueRange(doc, attr), color });
    }
  }
  return out;
}

/** A colour written `#rgb` or `#rrggbb`. */
export function parseColor(value: string): Color | null {
  if (!COLOR.test(value)) return null;
  const hex = value.length === 4 ? [...value.slice(1)].map((c) => c + c).join('') : value.slice(1);
  const channel = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255;
  return { red: channel(0), green: channel(2), blue: channel(4), alpha: 1 };
}

/** HoloML has no transparent colours: the picker always writes `#rrggbb`. */
export function colorPresentations(color: Color, range: Range): ColorPresentation[] {
  const hex = (n: number) =>
    Math.round(Math.min(1, Math.max(0, n)) * 255)
      .toString(16)
      .padStart(2, '0');
  const label = `#${hex(color.red)}${hex(color.green)}${hex(color.blue)}`;
  return [{ label, textEdit: { range, newText: label } }];
}

// ---------------------------------------------------------------------------
// Names

interface Named {
  el: ElementNode;
  attr: AttributeNode;
}

/** The id (or the reference) whose value holds the offset, and the name it gives. */
function nameAt(outline: Outline, offset: number): { name: string; declaration: boolean } | null {
  const el = startTagAt(outline, offset);
  const attr = el?.attributes.find((a) => a.value && a.value.start < offset && offset <= a.value.end);
  if (!el || !attr?.value) return null;
  const value = attr.value.text;
  if (attr.name === 'id') return value ? { name: value, declaration: true } : null;
  if (isReference(el, attr.name, pageVersion(outline)) && value.startsWith('#') && value.length > 1) return { name: value.slice(1), declaration: false };
  return null;
}

function declarations(outline: Outline, name: string): Named[] {
  return [...elements(outline)].flatMap((el) => {
    const attr = attribute(el, 'id');
    return attr?.value?.text === name ? [{ el, attr }] : [];
  });
}

function references(outline: Outline, name: string): Named[] {
  const version = pageVersion(outline);
  return [...elements(outline)].flatMap((el) => el.attributes.filter((a) => a.value?.text === `#${name}` && isReference(el, a.name, version)).map((attr) => ({ el, attr })));
}

export function definition(doc: TextDocument, outline: Outline, offset: number): Location[] {
  const at = nameAt(outline, offset);
  if (!at || at.declaration) return [];
  return declarations(outline, at.name).map(({ attr }) => ({ uri: doc.uri, range: valueRange(doc, attr) }));
}

export function findReferences(doc: TextDocument, outline: Outline, offset: number, includeDeclaration: boolean): Location[] {
  const at = nameAt(outline, offset);
  if (!at) return [];
  const found = [...(includeDeclaration ? declarations(outline, at.name) : []), ...references(outline, at.name)];
  return found.map(({ attr }) => ({ uri: doc.uri, range: valueRange(doc, attr) }));
}

// ---------------------------------------------------------------------------
// Links to files

/**
 * Links for the files a page names by a relative address: models,
 * pictures, sounds, scripts, surroundings, and other pages. Only a file
 * that is on the computer becomes a link (`exists`); an address on the
 * web, or one from the site's root ("/..."), does not, and nothing is
 * fetched.
 */
export function links(doc: TextDocument, outline: Outline, exists: (uri: string) => boolean): DocumentLink[] {
  if (!doc.uri.startsWith('file:')) return [];
  const version = pageVersion(outline);
  const out: DocumentLink[] = [];
  for (const el of elements(outline)) {
    for (const attr of el.attributes) {
      if (!attr.value || valueKind(el, attr.name, version)?.kind !== 'url') continue;
      const address = attr.value.text.trim().split(/[?#]/)[0]!;
      if (address === '' || address.startsWith('/') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(address)) continue;
      let target: string;
      try {
        target = new URL(address, doc.uri).href;
      } catch {
        continue;
      }
      if (!target.startsWith('file:') || !exists(target)) continue;
      out.push({ range: valueRange(doc, attr), target, tooltip: 'Open the file' });
    }
  }
  return out;
}
