import { describe, expect, it } from 'vitest';
import { MAX_DEPTH, parse } from '@holoml/parser';
import { check } from './index.ts';

const codes = (text: string) => check(parse(text)).map((p) => p.code);
const scene = (inner: string) => `<holoml version="0.1"><scene>${inner}</scene></holoml>`;

describe('checking: limits, numbers, names, and ids (issues #1 to #4)', () => {
  it('checks a document at the deepest allowed nesting', () => {
    const groups = MAX_DEPTH - 2;
    expect(codes(scene('<group>'.repeat(groups) + '</group>'.repeat(groups)))).toEqual([]);
  });

  it('reports inherited names as unknown, without failing', () => {
    expect(codes(scene('<constructor />'))).toEqual(['unknown-element']);
    expect(codes(scene('<group constructor="x" />'))).toEqual(['unknown-attribute']);
    expect(codes(scene('<light type="point" constructor="1" />'))).toEqual(['unknown-attribute']);
    expect(codes(scene('<model id="m" src="m.glb" /><animate target="#m" attribute="constructor" to="1 1 1" duration="1s" />'))).toEqual(['bad-value']);
  });

  it('rejects numbers too large to represent, in every kind of value', () => {
    for (const attrs of ['position="1e999 0 0"', 'position="0 -1e999 0"', 'scale="1e999"', 'scale="1 1e999 1"', 'rotation="0 0 1e999"']) {
      expect(codes(scene(`<group ${attrs} />`)), attrs).toEqual(['bad-value']);
    }
    expect(codes(scene('<light type="ambient" intensity="1e999" />'))).toEqual(['bad-value']);
    expect(codes(scene('<label size="1e-999">x</label>'))).toEqual(['bad-value']); // underflows to 0
    const anim = (extra: string) => scene(`<model id="m" src="m.glb" /><animate target="#m" attribute="position" to="1 1 1" ${extra} />`);
    expect(codes(anim('duration="1e999s"'))).toEqual(['bad-value']);
    expect(codes(anim('duration="1s" repeat="99999999999999999999"'))).toEqual(['bad-value']);
    expect(codes(anim('duration="1s" repeat="9007199254740991"'))).toEqual([]);
    expect(codes(scene('<group position="1e308 0 0" />'))).toEqual([]);
  });

  it('takes ids, references, and choices exactly, as written', () => {
    expect(codes(scene('<group id=" a " />'))).toEqual(['bad-value']);
    expect(codes(scene('<group id="a" /><animate target=" #a " attribute="position" to="1 2 3" duration="1s" />'))).toEqual(['bad-value']);
    expect(codes(scene('<group id="a" /><animate target="#a" attribute=" position " to="1 2 3" duration="1s" />'))).toEqual(['bad-value']);
    expect(codes(scene('<light type=" point " />'))).toEqual(['bad-value']);
    expect(codes('<holoml version=" 0.1 "><scene /></holoml>')).toEqual(['unsupported-version']);
    // Spaces around numbers and vectors stay harmless.
    expect(codes(scene('<group id="a" position=" 1 2 3 " /><animate target="#a" attribute="position" to=" 1 2 3 " duration=" 1s " />'))).toEqual([]);
  });
});
