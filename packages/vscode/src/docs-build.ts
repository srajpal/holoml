/**
 * Gathers the hover's words from SPEC.md (docs.ts), with the helpers the
 * reference pages are made with, so that both say what the specification
 * says. Run when the extension is built; the tests run it too.
 */
import { PARSE_ERROR_CODES } from '@holoml/parser';
import { ELEMENTS, PROBLEM_CODES } from '@holoml/schema';
import { section, table } from '../../schema/src/reference.ts';
import { SPEC_URL, type Docs, type ElementDoc } from './service/docs.ts';

const REPOSITORY = 'https://github.com/srajpal/holoml/blob/main/';

/**
 * The specification's words for the editor: its links made absolute (a
 * section to the published specification, a file to the repository),
 * and its requirement words (BCP 14) in lower case, as the reference
 * pages write them, since hover text restates the specification and is
 * not normative.
 */
export function forHover(markdown: string): string {
  return markdown
    .replace(/\]\(#([^)]+)\)/g, `](${SPEC_URL}#$1)`)
    .replace(/\]\((?!https?:|#)([^)]+)\)/g, (_, path: string) => `](${REPOSITORY}${path.replace(/^(\.\.\/)+/, '')})`)
    .replace(/\b(MUST NOT|MUST|REQUIRED|SHALL NOT|SHALL|SHOULD NOT|SHOULD|NOT RECOMMENDED|RECOMMENDED|MAY|OPTIONAL)\b/g, (w) => w.toLowerCase());
}

/** The first sentence of a section's first paragraph. */
function firstSentence(text: string): string {
  const paragraph = text.trim().split('\n\n')[0]!.replace(/\s+/g, ' ');
  return /^.*?[.?!](?=\s|$)/.exec(paragraph)?.[0] ?? paragraph;
}

export function makeDocs(spec: string): Docs {
  spec = spec.replace(/\r\n/g, '\n');
  const elements: Record<string, ElementDoc> = {};
  for (const [name, rule] of Object.entries(ELEMENTS)) {
    const text = section(spec, `### \`${name}\``);
    const doc: ElementDoc = { summary: forHover(firstSentence(text).replace(/^\(0\.2\) /, '')), attributes: {} };
    if (Object.keys(rule.attributes).length > 0) {
      const { header, rows } = table(text, 'Attribute');
      const cell = (row: string[], heading: string) => (header.includes(heading) ? row[header.indexOf(heading)]! : '');
      for (const row of rows) {
        const attr = /^`([a-z-]+)`$/.exec(row[0]!)?.[1];
        if (attr === undefined) continue;
        doc.attributes[attr] = {
          value: forHover(cell(row, 'Value')),
          default: forHover(cell(row, 'Default')),
          meaning: forHover(cell(row, 'Meaning').replace(/^\(0\.2\) /, '')),
        };
      }
    }
    elements[name] = doc;
  }
  const codes: Record<string, string> = {};
  for (const [heading, list] of [
    ['### Syntax errors', PARSE_ERROR_CODES],
    ['## 8. Checking', PROBLEM_CODES],
  ] as const) {
    for (const row of table(section(spec, heading), 'Code').rows) {
      const code = row[0]!.replace(/`/g, '');
      if ((list as readonly string[]).includes(code)) codes[code] = forHover(row[1]!);
    }
  }
  return { elements, codes };
}
