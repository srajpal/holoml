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

describe('a version the reader does not know (SPEC.md section 11; review 134, L8)', () => {
  const page = (version: string) => `<holoml${version}>\n<scene>\n<hud>Score</hud>\n<cube />\n</scene>\n</holoml>`;

  it('is reported, and the rest of the page is checked by the newest version the reader knows', () => {
    expect(problems(page(' version="0.3"'))).toEqual(['unsupported-version 1:9', 'unknown-element 4:1']);
    expect(problems(page(' version="0.2 "'))).toEqual(['unsupported-version 1:9', 'unknown-element 4:1']);
    // A reader that knows only 0.1 goes by 0.1, where a hud is unknown too.
    const older = check(parse(page(' version="0.2"')), { versions: ['0.1'] }).map((p) => `${p.code} ${p.line}:${p.column}`);
    expect(older).toEqual(['unsupported-version 1:9', 'unknown-element 3:1', 'unknown-element 4:1']);
  });

  it('a page that declares no version is checked in the same way', () => {
    expect(problems(page(''))).toEqual(['missing-attribute 1:1', 'unknown-element 4:1']);
    const older = check(parse(page('')), { versions: ['0.1'] }).map((p) => `${p.code} ${p.line}:${p.column}`);
    expect(older).toEqual(['missing-attribute 1:1', 'unknown-element 3:1', 'unknown-element 4:1']);
  });
});

describe('rules between attributes leave alone a value that is already reported (SPEC.md section 8)', () => {
  const toggle = (repeat: string) =>
    scene('0.2', `<model id="m" src="m.glb" />\n<animate target="#m" attribute="rotation" to="0 9 0" duration="1s" begin="click" toggle repeat="${repeat}" />`);

  it("a toggle's repeat is 1, however it is written; a repeat that is not a count is reported once", () => {
    expect(problems(toggle('1'))).toEqual([]);
    expect(problems(toggle(' 01 '))).toEqual([]);
    expect(problems(toggle('2'))).toEqual(['bad-value 3:89']);
    expect(problems(toggle('indefinite'))).toEqual(['bad-value 3:89']);
    expect(problems(toggle('often'))).toEqual(['bad-value 3:89']);
    expect(problems(toggle('99999999999999999999'))).toEqual(['bad-value 3:89']);
  });
});
