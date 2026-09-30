import { describe, expect, it } from 'vitest';
import { parse } from '@holoml/parser';
import { check } from './index.ts';

const problems = (text: string) => check(parse(text)).map((p) => `${p.code} ${p.line}:${p.column}`);
const scene = (version: string, inner: string) => `<holoml version="${version}"><scene>\n${inner}\n</scene></holoml>`;

describe("a page is checked by its own version's rules only (review 134, L6)", () => {
  it('a 0.1 page that writes a click action is told the attributes are unknown, and no more', () => {
    const page = scene('0.1', '<model id="m" src="m.glb" />\n<animate target="#m" attribute="rotation" to="0 90 0" duration="1s" trigger="#m" toggle />');
    expect(problems(page)).toEqual(['unknown-attribute 3:69', 'unknown-attribute 3:82']);
    // The same in a 0.2 page is a click action without its begin="click".
    expect(problems(page.replace('0.1', '0.2'))).toEqual(['missing-attribute 3:69', 'missing-attribute 3:82']);
  });

  it("a 0.1 page's click action on a light is not asked for a trigger, nor its toggle for one run", () => {
    const page = scene('0.1', '<light id="l" type="point" />\n<model id="m" src="m.glb" />\n<animate target="#m" attribute="rotation" to="0 90 0" duration="1s" begin="click" toggle repeat="2" trigger="#l" />');
    expect(problems(page)).toEqual(['unknown-attribute 4:69', 'unknown-attribute 4:83', 'unknown-attribute 4:101']);
  });

  it("a 0.1 light's shadows is unknown, and not also an attribute its type does not use", () => {
    expect(problems(scene('0.1', '<light type="ambient" shadows />'))).toEqual(['unknown-attribute 2:23']);
    expect(problems(scene('0.2', '<light type="ambient" shadows />'))).toEqual(['attribute-not-for-type 2:23']);
    // What 0.1 has is still checked in a 0.1 page.
    expect(problems(scene('0.1', '<light type="ambient" position="0 1 0" />'))).toEqual(['attribute-not-for-type 2:23']);
  });
});

describe('every id counts, wherever its element stands (review 134, L6)', () => {
  it('an id inside a misplaced element is found, and the reference to it is not reported as unknown', () => {
    const page = scene('0.2', '<model src="m.glb"><label id="sign">x</label></model>\n<animate target="#sign" attribute="position" to="0 1 0" duration="1s" />');
    expect(problems(page)).toEqual(['child-not-allowed 2:20']);
  });

  it('an id inside an unknown element is found too', () => {
    const page = scene('0.2', '<cube><group id="g" /></cube>\n<animate target="#g" attribute="position" to="0 1 0" duration="1s" />');
    expect(problems(page)).toEqual(['unknown-element 2:1']);
  });

  it('a reference to an unknown element itself says nothing more: the element is already reported', () => {
    const page = scene(
      '0.2',
      '<cube id="c" />\n<model id="m" src="m.glb" />\n<animate target="#c" attribute="position" to="0 1 0" duration="1s" />\n<animate target="#m" attribute="rotation" to="0 9 0" duration="1s" begin="click" trigger="#c" />\n<choice target="#c" material="Paint"><option>A</option></choice>',
    );
    expect(problems(page)).toEqual(['unknown-element 2:1']);
    // A 0.2 element in a 0.1 page is unknown there in the same way.
    expect(problems(scene('0.1', '<sound id="s" src="s.ogg" />\n<animate target="#s" attribute="position" to="0 1 0" duration="1s" />'))).toEqual(['unknown-element 2:1']);
  });

  it('a reference that is not well formed is a bad value, and not an unknown target as well', () => {
    expect(problems(scene('0.2', '<animate target="#no such" attribute="position" to="0 1 0" duration="1s" />'))).toEqual(['bad-value 2:10']);
    expect(problems(scene('0.2', '<model id="m" src="m.glb" />\n<sound src="s.ogg" begin="click" trigger="#1" />'))).toEqual(['bad-value 3:34']);
    expect(problems(scene('0.2', '<choice target="#" material="Paint"><option>A</option></choice>'))).toEqual(['bad-value 2:9']);
    // A well-formed reference to nothing is still an unknown target.
    expect(problems(scene('0.2', '<animate target="#nothing" attribute="position" to="0 1 0" duration="1s" />'))).toEqual(['unknown-target 2:10']);
  });

  it('two elements with one id are reported wherever they stand', () => {
    expect(problems(scene('0.2', '<model src="m.glb"><label id="a">x</label></model>\n<group id="a" />'))).toEqual(['child-not-allowed 2:20', 'duplicate-id 3:8']);
    expect(problems(scene('0.1', '<group id="a" />\n<group id="a" />\n<group id="a" />'))).toEqual(['duplicate-id 3:8', 'duplicate-id 4:8']);
  });
});
