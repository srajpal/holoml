import { describe, expect, it } from 'vitest';
import { parse } from '@holoml/parser';
import { check } from './index.ts';

const codes = (text: string) => check(parse(text)).map((p) => p.code);
const scene = (inner: string, version = '0.2') => `<holoml version="${version}"><scene>${inner}</scene></holoml>`;
const link = (href: string) => scene(`<a href="${href}"><label>x</label></a>`);
const animate = (extra: string) => scene(`<group id="g" /><animate target="#g" attribute="position" to="0 1 0" ${extra} />`, '0.1');

describe('addresses (review 134, L2)', () => {
  it('a control character cannot hide a scheme: an address with one is a bad value', () => {
    expect(codes(link('&#1;javascript:alert(1)'))).toEqual(['bad-value']);
    expect(codes(link('java&#9;script:alert(1)'))).toEqual(['bad-value']);
    expect(codes(link('java&#10;script:alert(1)'))).toEqual(['bad-value']);
    expect(codes(link('&#31;javascript:alert(1)'))).toEqual(['bad-value']);
    expect(codes(link('&#127;javascript:alert(1)'))).toEqual(['bad-value']);
    expect(codes(scene('<model src="&#1;data:model/gltf-binary;base64,AAAA.glb" />'))).toEqual(['bad-value']);
    expect(codes(scene('<model src="models/&#8;car.glb" />'))).toEqual(['bad-value']);
  });

  it('whitespace around an address is ignored, as a URL parser ignores it, and the scheme is still seen', () => {
    expect(codes(link(' javascript:alert(1) '))).toEqual(['unsafe-link']);
    expect(codes(link('&#9;&#10;JAVASCRIPT:alert(1)&#13;'))).toEqual(['unsafe-link']);
    expect(codes(link(' coupe.holoml '))).toEqual([]);
    expect(codes(link('https://example.org/a?b=1#c'))).toEqual([]);
  });

  it('no other space is ignored or allowed: a no-break space, U+2028, or U+FEFF in an address is a bad value', () => {
    for (const c of ['&#160;', '&#133;', '&#5760;', '&#8192;', '&#8232;', '&#8233;', '&#8239;', '&#8287;', '&#12288;', '&#65279;']) {
      expect(codes(link(`${c}coupe.holoml`)), c).toEqual(['bad-value']);
      expect(codes(link(`coupe.holoml${c}`)), c).toEqual(['bad-value']);
      expect(codes(link(`cou${c}pe.holoml`)), c).toEqual(['bad-value']);
    }
  });
});

describe('whitespace in values is the four characters of the syntax (review 134, L5)', () => {
  it('a space, a tab, a line feed, and a carriage return separate numbers and are ignored around them', () => {
    expect(codes(scene('<group position="1&#9;2&#10;3" scale="&#13;2&#9;" />'))).toEqual([]);
    expect(codes(scene('<group position=" 1  2   3 " />'))).toEqual([]);
    expect(codes(scene('<plan src="p.png" area="&#10;0 0&#9;1 1&#13;&#10;" />'))).toEqual([]);
  });

  it('no other space does', () => {
    for (const c of ['&#160;', '&#11;', '&#12;', '&#5760;', '&#8192;', '&#8202;', '&#8232;', '&#8233;', '&#8239;', '&#8287;', '&#12288;', '&#65279;']) {
      expect(codes(scene(`<group position="1${c}2${c}3" />`)), c).toEqual(['bad-value']);
      expect(codes(scene(`<group position="${c}1 2 3" />`)), c).toEqual(['bad-value']);
      expect(codes(scene(`<group scale="2${c}" />`)), c).toEqual(['bad-value']);
      expect(codes(scene(`<light type="ambient" intensity="${c}1" color="#fff${c}" />`)), c).toEqual(['bad-value', 'bad-value']);
      expect(codes(scene(`<model src="a.glb"><material name="m" repeat="2${c}2" /></model>`)), c).toEqual(['bad-value']);
      expect(codes(scene(`<water size="1${c}1${c}1" />`)), c).toEqual(['bad-value']);
      expect(codes(scene(`<plan src="p.png" area="0${c}0 1 1" />`)), c).toEqual(['bad-value']);
      expect(codes(animate(`duration="1s${c}"`)), c).toEqual(['bad-value']);
      expect(codes(animate(`duration="1s" repeat="${c}2"`)), c).toEqual(['bad-value']);
      expect(codes(scene(`<slider min="${c}0" max="2">x</slider>`)), c).toEqual(['bad-value']);
    }
  });

  it('text that is a no-break space is text, not whitespace', () => {
    expect(codes(scene('<label>&#160;</label>'))).toEqual([]);
    expect(codes(scene('<label> &#9;&#10;&#13;</label>'))).toEqual(['empty-text']);
    expect(codes(scene('<choice><option>A&#160;B</option><option>A B</option></choice>'))).toEqual([]);
    expect(codes(scene('<choice><option>A &#9; B</option><option>&#10;A B </option></choice>'))).toEqual(['bad-value']);
  });
});

describe('a time is a number more than 0 and its unit (review 134, L5)', () => {
  it('takes every form of number: a fraction, a dot alone after digits, an exponent', () => {
    for (const d of ['2s', '500ms', '1.5s', '.5s', '1.s', '1.ms', '1e3ms', '1E3ms', '1.5e-3s', '.5e1s', '1e+2ms', ' 2s ']) {
      expect(codes(animate(`duration="${d}"`)), d).toEqual([]);
    }
  });

  it('refuses a sign, a missing or other unit, a space before the unit, zero, and a number too large', () => {
    for (const d of ['-1s', '+1s', '10', '1', 's', 'ms', '1 s', '1S', '1MS', '1sec', '1m', '1es', '1e', '0s', '0ms', '0.0s', '1e-999s', '1e999s', '1e999ms', '']) {
      expect(codes(animate(`duration="${d}"`)), d).toEqual(['bad-value']);
    }
  });
});

describe('empty text (review 134, L5)', () => {
  const head = (inner: string) => `<holoml version="0.2"><head>${inner}</head><scene /></holoml>`;

  it("a meta's content may be empty, as in HTML; its name may not", () => {
    expect(codes(head('<meta name="description" content="" />'))).toEqual([]);
    expect(codes(head('<meta name="description" content="  " />'))).toEqual([]);
    expect(codes(head('<meta name="" content="x" />'))).toEqual(['bad-value']);
    expect(codes(head('<meta name=" &#9;" content="x" />'))).toEqual(['bad-value']);
    expect(codes(head('<meta name="description" />'))).toEqual(['missing-attribute']);
    expect(codes(head('<meta name="description" content />'))).toEqual(['bad-value']);
  });

  it('every other text attribute says something: empty, or whitespace alone, is a bad value', () => {
    expect(codes(scene('<model src="a.glb" animation="" />'))).toEqual(['bad-value']);
    expect(codes(scene('<model src="a.glb"><material name="" /></model>'))).toEqual(['bad-value']);
    expect(codes(scene('<viewpoint label=" " />'))).toEqual(['bad-value']);
    expect(codes(scene('<plan src="p.png" area="0 0 1 1" label="" />'))).toEqual(['bad-value']);
    expect(codes(scene('<choice label=""><option>A</option></choice>'))).toEqual(['bad-value']);
    expect(codes(scene('<choice><option value="">A</option></choice>'))).toEqual(['bad-value']);
    expect(codes(scene('<model id="m" src="a.glb" /><sound src="a.ogg" begin="click" trigger="#m" label="" />'))).toEqual(['bad-value']);
    expect(codes(scene('<model id="m" src="a.glb" /><animate target="#m" attribute="rotation" to="0 9 0" duration="1s" begin="click" label="&#10;" />'))).toEqual(['bad-value']);
  });
});
