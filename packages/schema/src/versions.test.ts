import { describe, expect, it } from 'vitest';
import { parse } from '@holoml/parser';
import { check } from './index.ts';

const page02 = `<holoml version="0.2">
  <head><script src="game.js" /></head>
  <scene>
    <sound src="pop.wav" />
    <hud>Score</hud>
  </scene>
</holoml>`;

describe('versions (HoloML 0.2)', () => {
  it('a 0.2 page is valid for a reader that knows 0.2', () => {
    expect(check(parse(page02))).toEqual([]);
  });

  it('a reader that knows only 0.1 refuses a 0.2 page', () => {
    const problems = check(parse(page02), { versions: ['0.1'] });
    expect(problems[0]).toMatchObject({ code: 'unsupported-version', line: 1, column: 9 });
  });

  it('a 0.1 page means the same to a reader that knows 0.2', () => {
    const page01 = '<holoml version="0.1"><scene><model src="car.glb" /></scene></holoml>';
    expect(check(parse(page01))).toEqual([]);
    expect(check(parse(page01), { versions: ['0.1'] })).toEqual([]);
  });

  it('a script holds no code: the message says to use a file', () => {
    const problems = check(parse('<holoml version="0.2"><head><script src="a.js">alert(1)</script></head><scene /></holoml>'));
    expect(problems.map((p) => p.code)).toEqual(['text-not-allowed']);
    expect(problems[0]!.message).toMatch(/file of its own/);
  });
});
