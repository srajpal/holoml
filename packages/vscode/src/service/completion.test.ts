// Z5: suggestions offer exactly what the checker's table allows, for the page's version.
import { ELEMENTS, VERSIONS, atLeast, type Version } from '@holoml/schema';
import { describe, expect, it } from 'vitest';
import { at, specDocs } from '../test-support.ts';
import { complete, elementSnippet } from './completion.ts';
import { diagnose } from './diagnostics.ts';
import { document } from '../test-support.ts';

const labels = (marked: string) => {
  const { doc, outline, offset } = at(marked);
  return complete(doc, outline, offset, specDocs()).items.map((i) => i.label);
};
const items = (marked: string) => {
  const { doc, outline, offset } = at(marked);
  return complete(doc, outline, offset, specDocs()).items;
};

/** A valid page with an element of each kind open, so that "<" can be typed inside it. */
function inside(element: string, version: Version): string {
  const path: Record<string, string[]> = {
    holoml: [],
    head: ['head'],
    scene: ['scene'],
    group: ['scene', 'group'],
    a: ['scene', 'a href="x.holoml"'],
    model: ['scene', 'model src="m.glb"'],
    choice: ['scene', 'choice'],
  };
  const open = path[element]!;
  const tags = open.map((t) => `<${t}>`).join('');
  const ends = open
    .map((t) => `</${t.split(' ')[0]}>`)
    .reverse()
    .join('');
  return `<holoml version="${version}">${tags}<‸${ends}</holoml>`;
}

describe('suggestions', () => {
  for (const version of VERSIONS) {
    for (const element of ['holoml', 'head', 'scene', 'group', 'a', 'model', 'choice']) {
      const rule = ELEMENTS[element]!;
      if (!atLeast(version, rule.since)) continue;
      it(`inside <${element}> in a ${version} page: exactly the elements the table allows there`, () => {
        const allowed = (rule.children as readonly string[]).filter((c) => atLeast(version, ELEMENTS[c]!.since));
        expect(labels(inside(element, version)).sort()).toEqual([...allowed].sort());
      });
    }
  }

  it('offers no 0.2 element in a 0.1 page', () => {
    const offered = labels('<holoml version="0.1"><scene><‸</scene></holoml>');
    expect(offered).toContain('model');
    expect(offered).not.toContain('panel');
    expect(offered).not.toContain('water');
  });

  it('offers what may appear once only while it is not there yet', () => {
    expect(labels('<holoml version="0.2"><head><title>T</title><‸</head></holoml>')).not.toContain('title');
    expect(labels('<holoml version="0.2"><scene><water size="1 1 1" /><‸</scene></holoml>')).not.toContain('water');
    // Several viewpoints are allowed from 0.2, and not in 0.1.
    expect(labels('<holoml version="0.2"><scene><viewpoint id="a" /><‸</scene></holoml>')).toContain('viewpoint');
    expect(labels('<holoml version="0.1"><scene><viewpoint /><‸</scene></holoml>')).not.toContain('viewpoint');
  });

  it('offers the root in an empty file, and nothing beside it', () => {
    expect(labels('<‸')).toEqual(['holoml']);
    expect(labels('<holoml version="0.2"></holoml>\n<‸')).toEqual([]);
  });

  it('writes an element with its required attributes and its end', () => {
    const [model] = items('<holoml version="0.2"><scene><mo‸</scene></holoml>').filter((i) => i.label === 'model');
    expect(model!.textEdit).toMatchObject({ newText: 'model src="$1" />$0' });
    expect(elementSnippet('light', ELEMENTS['light']!, '0.2')).toBe('light type="${1|ambient,directional,point,spot|}" />$0');
    expect(elementSnippet('label', ELEMENTS['label']!, '0.2')).toBe('label>$0</label>');
    expect(elementSnippet('holoml', ELEMENTS['holoml']!, '0.2')).toBe('holoml version="${1|0.2,0.1,0.3|}">$0</holoml>');
  });

  it('changes only the name of a tag that is already written', () => {
    const [group] = items('<holoml version="0.2"><scene><mo‸del src="m.glb" /></scene></holoml>').filter((i) => i.label === 'group');
    expect(group!.textEdit).toMatchObject({ newText: 'group', range: { start: { character: 30 }, end: { character: 35 } } });
  });

  it("offers an element's attributes not yet written, required ones first, for the page's version", () => {
    const offered = items('<holoml version="0.2"><scene><model src="m.glb" ‸/></scene></holoml>');
    expect(offered.map((i) => i.label).sort()).toEqual(['animation', 'autoplay', 'id', 'position', 'rotation', 'scale', 'shadows', 'solid', 'stand-in'].sort());
    expect(labels('<holoml version="0.1"><scene><model src="m.glb" ‸/></scene></holoml>')).not.toContain('solid');
    const [autoplay] = offered.filter((i) => i.label === 'autoplay');
    expect(autoplay!.textEdit).toMatchObject({ newText: 'autoplay' });
    const first = items('<holoml version="0.2"><scene><light ‸ /></scene></holoml>').sort((a, b) => a.sortText!.localeCompare(b.sortText!))[0];
    expect(first!.label).toBe('type');
  });

  it("leaves out what a light's type does not use", () => {
    const offered = labels('<holoml version="0.2"><scene><light type="ambient" ‸/></scene></holoml>');
    expect(offered).toContain('intensity');
    expect(offered).not.toContain('position');
    expect(offered).not.toContain('angle');
  });

  it("offers an attribute's choices, the versions, and the page's ids in a value", () => {
    expect(labels('<holoml version="0.2"><scene><light type="‸" /></scene></holoml>')).toEqual(['ambient', 'directional', 'point', 'spot']);
    expect(labels('<holoml version="‸"></holoml>')).toEqual([...VERSIONS]);
    expect(labels('<holoml version="0.1"><scene><model id="car" src="c.glb" /><animate target="#car" attribute="‸" to="1 1 1" duration="1s" /></scene></holoml>')).toEqual(['position', 'rotation', 'scale']);
    const page = '<holoml version="0.2"><scene><model id="car" src="c.glb" /><label id="sign">S</label><animate target="‸" /></scene></holoml>';
    expect(labels(page)).toEqual(['#car', '#sign']);
    expect(labels('<holoml version="0.2"><scene><viewpoint id="door" /><a href="#‸"><label>Go</label></a></scene></holoml>')).toEqual(['#door']);
  });

  it('offers the element to close after "</"', () => {
    const offered = items('<holoml version="0.2"><scene><group></‸</scene></holoml>');
    expect(offered.map((i) => i.label)).toEqual(['/group']);
    expect(offered[0]!.textEdit).toMatchObject({ newText: '/group>' });
  });

  it('works in a page with a mistake in it, and offers nothing in a comment', () => {
    const marked = '<holoml version="0.2">\n<scene>\n<light type=point />\n<‸\n';
    const { doc, outline } = document(marked.replace('‸', ''));
    expect(diagnose(doc, outline)).toHaveLength(1);
    expect(labels(marked)).toContain('model');
    expect(labels('<holoml version="0.2"><scene><!-- <‸ --></scene></holoml>')).toEqual([]);
  });
});
