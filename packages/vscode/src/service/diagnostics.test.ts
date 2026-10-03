// Z4: the mistakes the editor shows are holoml's own, for every
// conformance sample and every example site.
import { describe, expect, it } from 'vitest';
import { document, pages, read } from '../test-support.ts';
import { CODES_URL } from './docs.ts';
import { diagnose, extent } from './diagnostics.ts';
import { readOutline } from './outline.ts';

interface Expected {
  error?: { code: string; line: number; column: number };
  problems?: { code: string; line: number; column: number }[];
}

// VS Code takes a byte order mark out of a file's text, as the editor does here.
const shown = (path: string) => {
  const { doc, outline } = document(read(path).replace(/^\ufeff/, ''));
  return diagnose(doc, outline).map((d) => ({ code: d.code, line: d.range.start.line + 1, column: d.range.start.character + 1 }));
};

describe('mistakes as the checker finds them', () => {
  it.each(pages('conformance/syntax-errors'))('%s shows its syntax error where the sample says', (path) => {
    const expected = JSON.parse(read(path.replace(/\.holoml$/, '.expected.json'))) as Expected;
    expect(shown(path)).toEqual([expected.error]);
  });

  it.each(pages('conformance/problems'))('%s shows every problem the sample lists', (path) => {
    const expected = JSON.parse(read(path.replace(/\.holoml$/, '.expected.json'))) as Expected;
    expect(shown(path)).toEqual(expected.problems);
  });

  it.each([...pages('conformance/valid'), ...pages('examples')])('%s shows none', (path) => {
    expect(shown(path)).toEqual([]);
  });

  it('marks each with its code, the checker, and the page of codes', () => {
    const { doc, outline } = document('<holoml version="0.2"><scene><modl /></scene></holoml>');
    expect(diagnose(doc, outline)).toEqual([
      {
        range: { start: { line: 0, character: 29 }, end: { line: 0, character: 34 } },
        severity: 1,
        source: 'holoml',
        code: 'unknown-element',
        codeDescription: { href: `${CODES_URL}#problems` },
        message: '<modl> is not a HoloML 0.2 element',
      },
    ]);
  });

  it('underlines a whole attribute, a tag and its name, or the word there', () => {
    const text = '<scene background="red"> word </scene>';
    const outline = readOutline(text);
    const slice = (offset: number) => text.slice(...extent(outline, offset));
    expect(slice(text.indexOf('background'))).toBe('background="red"');
    expect(slice(0)).toBe('<scene');
    expect(slice(text.indexOf('word'))).toBe('word');
    expect(slice(text.indexOf('</'))).toBe('</scene>');
    expect(extent(outline, text.length)).toEqual([text.length, text.length]);
  });
});
