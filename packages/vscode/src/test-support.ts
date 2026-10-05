/**
 * What the extension's unit tests share: a document from text with the
 * cursor marked "‸", the hover's words made from SPEC.md, and the
 * repository's pages (the conformance samples and the example sites).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { makeDocs } from './docs-build.ts';
import type { Docs } from './service/docs.ts';
import { readOutline, type Outline } from './service/outline.ts';

export const REPOSITORY = fileURLToPath(new URL('../../../', import.meta.url));
export const PACKAGE = fileURLToPath(new URL('../', import.meta.url));

export function document(text: string, uri = 'file:///c%3A/site/page.holoml'): { doc: TextDocument; outline: Outline } {
  return { doc: TextDocument.create(uri, 'holoml', 1, text), outline: readOutline(text) };
}

/** A document whose cursor is where "‸" is written (the mark itself is taken out). */
export function at(marked: string, uri?: string): { doc: TextDocument; outline: Outline; offset: number } {
  const offset = marked.indexOf('‸');
  if (offset < 0) throw new Error('no ‸ in the text');
  return { ...document(marked.slice(0, offset) + marked.slice(offset + 1), uri), offset };
}

let docs: Docs | undefined;
export function specDocs(): Docs {
  docs ??= makeDocs(readFileSync(join(REPOSITORY, 'SPEC.md'), 'utf8'));
  return docs;
}

/** Every .holoml file under a folder of the repository, by its path from the repository's root. */
export function pages(folder: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      if (name === 'node_modules' || name === 'tools') continue;
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith('.holoml')) out.push(relative(REPOSITORY, path).replace(/\\/g, '/'));
    }
  };
  walk(join(REPOSITORY, folder));
  return out;
}

export function read(path: string): string {
  return readFileSync(join(REPOSITORY, path), 'utf8');
}

/** A page around some scene content, for the tests that need a valid page. */
export function page(content: string, version = '0.2'): string {
  return `<holoml version="${version}">\n  <scene>\n${content}\n  </scene>\n</holoml>\n`;
}
