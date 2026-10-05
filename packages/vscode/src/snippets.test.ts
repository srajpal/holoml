// Feature 6: every snippet, filled in with its defaults, is valid HoloML.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { diagnose } from './service/diagnostics.ts';
import { PACKAGE, document, page } from './test-support.ts';

const snippets = JSON.parse(readFileSync(join(PACKAGE, 'snippets/holoml.json'), 'utf8')) as Record<string, { prefix: string; body: string[] }>;

/** A snippet as VS Code writes it when every place is left as it is: its defaults, and a choice's first option. */
const expand = (body: string[]) =>
  body
    .join('\n')
    .replace(/\$\{\d+\|([^,|]*)[^|]*\|\}/g, '$1')
    .replace(/\$\{\d+:([^}]*)\}/g, '$1')
    .replace(/\$\d+/g, '')
    .replace(/\t/g, '  ');

describe('snippets', () => {
  it.each(Object.entries(snippets))('%s is valid HoloML as it is written', (name, snippet) => {
    const text = expand(snippet.body);
    const full = snippet.prefix === 'holoml' ? text : page(text);
    const { doc, outline } = document(full);
    expect(diagnose(doc, outline), full).toEqual([]);
  });

  it('every choice of every snippet is valid too', () => {
    for (const snippet of Object.values(snippets)) {
      const body = snippet.body.join('\n');
      for (const m of body.matchAll(/\$\{\d+\|([^|]*)\|\}/g)) {
        for (const option of m[1]!.split(',')) {
          const text = expand([body.replace(m[0], option)]);
          const { doc, outline } = document(snippet.prefix === 'holoml' ? text : page(text));
          expect(diagnose(doc, outline), `${snippet.prefix}: ${option}`).toEqual([]);
        }
      }
    }
  });
});
