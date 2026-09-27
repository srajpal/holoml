/**
 * The conformance samples (conformance/ at the repository root): each
 * .holoml file has a .expected.json beside it with what any HoloML 0.1
 * reader must produce for it: the tree (valid samples), the syntax error
 * (syntax-errors/), or the checker's problems (problems/). SPEC.md,
 * "Conformance", describes the format.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HoloParseError, parse, type HoloNode } from '@holoml/parser';
import { check } from './index.ts';

export const CONFORMANCE_DIR = fileURLToPath(new URL('../../../conformance/', import.meta.url));
export const GROUPS = ['valid', 'syntax-errors', 'problems'] as const;

type Json = string | null | Json[] | { [key: string]: Json };

export interface Expected {
  tree?: Json;
  error?: { code: string; line: number; column: number };
  problems?: { code: string; line: number; column: number }[];
}

const at = (p: { line: number; column: number }) => `${p.line}:${p.column}`;

/** A tree as plain JSON: names, attributes, text, and where each starts. */
export function treeJson(node: HoloNode): Json {
  if (node.type === 'text') return { text: node.value, at: at(node.start) };
  return {
    element: node.name,
    at: at(node.start),
    attributes: node.attributes.map((a) => [a.name, a.value, at(a.start)]),
    children: node.children.map(treeJson),
  };
}

/** What a HoloML 0.1 reader produces for a sample's text. */
export function actual(text: string): Expected {
  let doc;
  try {
    doc = parse(text);
  } catch (e) {
    if (!(e instanceof HoloParseError)) throw e;
    return { error: { code: e.code, line: e.position.line, column: e.position.column } };
  }
  const problems = check(doc).map(({ code, line, column }) => ({ code, line, column }));
  return { tree: treeJson(doc.root), problems };
}

/** Every sample: its group, name, text, and the expected result (null when not written yet). */
export function samples(): { group: (typeof GROUPS)[number]; name: string; path: string; text: string; expected: Expected | null }[] {
  return GROUPS.flatMap((group) =>
    readdirSync(join(CONFORMANCE_DIR, group))
      .filter((f) => f.endsWith('.holoml'))
      .sort()
      .map((file) => {
        const path = join(CONFORMANCE_DIR, group, file);
        const expectedPath = path.replace(/\.holoml$/, '.expected.json');
        let expected: Expected | null = null;
        try {
          expected = JSON.parse(readFileSync(expectedPath, 'utf8')) as Expected;
        } catch {
          expected = null;
        }
        return { group, name: file.replace(/\.holoml$/, ''), path, text: readFileSync(path, 'utf8'), expected };
      }),
  );
}

/** The expected file for a result: valid samples keep their tree; the others keep only what they test. */
export function expectedFor(group: (typeof GROUPS)[number], result: Expected): Expected {
  if (group === 'valid') return { tree: result.tree ?? null, problems: result.problems ?? [] };
  if (group === 'syntax-errors') return result.error ? { error: result.error } : { problems: result.problems ?? [] };
  return result.error ? { error: result.error } : { problems: result.problems ?? [] };
}
