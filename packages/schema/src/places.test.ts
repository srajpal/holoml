import { describe, expect, it } from 'vitest';
import { parse } from '@holoml/parser';
import { check } from './index.ts';

const problems = (text: string) => check(parse(text)).map((p) => `${p.code} ${p.line}:${p.column}`);

describe('where text that may not be there is reported (review 134, L7)', () => {
  const page = (scene: string) => `<holoml version="0.1">\n<scene>${scene}</scene>\n</holoml>`;

  it('at its first character that is not whitespace', () => {
    expect(problems(page('x'))).toEqual(['text-not-allowed 2:8']);
    expect(problems(page('  x'))).toEqual(['text-not-allowed 2:10']);
    expect(problems(page('\n    Loose text\n'))).toEqual(['text-not-allowed 3:5']);
    expect(problems(page('\r\n\tx'))).toEqual(['text-not-allowed 3:2']);
  });

  it('a character reference is written with "&", which is not whitespace, whatever it stands for', () => {
    // Two line feeds as references, on one line: the text is on line 2, where it is written, not on line 4.
    expect(problems(page('&#10;&#10;x'))).toEqual(['text-not-allowed 2:8']);
    expect(problems(page('&#32;x'))).toEqual(['text-not-allowed 2:8']);
    expect(problems(page('  &#9;x'))).toEqual(['text-not-allowed 2:10']);
    expect(problems(page('\n  &#13;&#10;x'))).toEqual(['text-not-allowed 3:3']);
    // After a reference, the places that follow are still where they are written.
    expect(problems(page('&#10;&#10;<cube />'))).toEqual(['text-not-allowed 2:8', 'unknown-element 2:18']);
  });

  it('after a byte order mark, places on line 1 count from the first character after it', () => {
    expect(problems('\uFEFF<holoml version="9.9"><scene fog="1" /></holoml>')).toEqual(['unsupported-version 1:9', 'unknown-attribute 1:30']);
  });
});
