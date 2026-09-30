import { parse, serialize, type ElementNode, type HoloDocument } from '@holoml/parser';
import { check } from './index.ts';

/**
 * The HoloML examples in a Markdown text (SPEC.md and the guides), by the
 * language their code block names:
 *
 *   holoml         a whole page
 *   holoml-scene   what a scene holds, checked in a 0.2 page
 *   holoml-head    what a head holds, checked in a 0.2 page
 *   holoml-each    elements a scene may hold, each checked alone (for
 *                  alternatives, such as several ways to write a viewpoint)
 *
 * Other code blocks (JavaScript, grammars, plain text) are not HoloML.
 */
export interface Example {
  lang: string;
  code: string;
  /** The line of the Markdown text where the code starts. */
  line: number;
}

export function examplesIn(markdown: string): Example[] {
  const out: Example[] = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const open = /^```(holoml(?:-scene|-head|-each)?)\s*$/.exec(lines[i]!);
    if (!open) continue;
    const start = i + 1;
    let end = start;
    while (end < lines.length && lines[end] !== '```') end++;
    out.push({ lang: open[1]!, code: lines.slice(start, end).join('\n'), line: start + 1 });
    i = end;
  }
  return out;
}

const page = (head: string, scene: string) => `<holoml version="0.2">\n<head>${head}</head>\n<scene>\n${scene}\n</scene>\n</holoml>`;

/** What is wrong with an example: its syntax error or its problems, as text; empty when it is right. */
export function examplesProblems(example: Example): string[] {
  const read = (text: string): HoloDocument | string => {
    try {
      return parse(text);
    } catch (e) {
      return `syntax: ${(e as Error).message}`;
    }
  };
  const problems = (text: string): string[] => {
    const doc = read(text);
    if (typeof doc === 'string') return [doc];
    return check(doc).map((p) => `${p.code}: ${p.message}`);
  };
  switch (example.lang) {
    case 'holoml':
      return problems(example.code);
    case 'holoml-scene':
      return problems(page('', example.code));
    case 'holoml-head':
      return problems(page(example.code, ''));
    case 'holoml-each': {
      const doc = read(page('', example.code));
      if (typeof doc === 'string') return [doc];
      const scene = doc.root.children.find((c): c is ElementNode => c.type === 'element' && c.name === 'scene')!;
      return scene.children
        .filter((c): c is ElementNode => c.type === 'element')
        .flatMap((el) => problems(page('', serialize({ type: 'document', root: el }))));
    }
    default:
      return [`not a HoloML example: ${example.lang}`];
  }
}
