// Z7 and Z8: tags kept in step, the outline, and folding.
import { describe, expect, it } from 'vitest';
import { at, document } from '../test-support.ts';
import { readOutline } from './outline.ts';
import { folding, symbols } from './structure.ts';
import { autoClose, linkedEditing } from './tags.ts';

describe('the outline', () => {
  it('lists the elements as the page nests them, by name, id, and what tells them apart', () => {
    const { doc, outline } = document('<holoml version="0.2">\n<scene>\n<model id="car" src="car.glb" />\n<label>Sale today</label>\n</scene>\n</holoml>');
    const [root] = symbols(doc, outline);
    expect(root!.name).toBe('holoml');
    const scene = root!.children![0]!;
    expect(scene.children!.map((s) => [s.name, s.detail])).toEqual([
      ['model #car', 'car.glb'],
      ['label', 'Sale today'],
    ]);
    expect(scene.children![0]!.selectionRange).toEqual({ start: { line: 2, character: 1 }, end: { line: 2, character: 6 } });
  });
});

describe('folding', () => {
  it('folds elements over several lines, comments, and regions', () => {
    const text = ['<holoml version="0.2">', '<scene>', '<!--', 'a note', '-->', '<!-- #region shelves -->', '<model src="a.glb" />', '<!-- #endregion -->', '</scene>', '</holoml>'].join('\n');
    const { doc, outline } = document(text);
    expect(folding(doc, outline)).toEqual([
      { startLine: 0, endLine: 8 },
      { startLine: 1, endLine: 7 },
      { startLine: 2, endLine: 4, kind: 'comment' },
      { startLine: 5, endLine: 7, kind: 'region' },
    ]);
  });
});

describe('end tags written as you type', () => {
  const close = (marked: string, typed: '>' | '/') => {
    const { outline, offset } = at(marked);
    return autoClose(outline, offset, typed);
  };

  it('writes the end tag after ">" finishes a start tag', () => {
    expect(close('<holoml version="0.2"><scene><group>‸</scene></holoml>', '>')).toBe('$0</group>');
    expect(close('<holoml version="0.2"><scene><label position="0 1 0">‸', '>')).toBe('$0</label>');
  });

  it('writes nothing for an element that holds nothing, a "/>", or a tag already closed', () => {
    expect(close('<scene><light type="point">‸</scene>', '>')).toBeNull();
    expect(close('<scene><group />‸</scene>', '>')).toBeNull();
    expect(close('<scene><group>‸</group></scene>', '>')).toBeNull();
    expect(close('<scene><model src="a>‸"', '>')).toBeNull();
  });

  it('writes the name of the element still open after "</"', () => {
    expect(close('<holoml><scene><group></‸', '/')).toBe('group>');
    expect(close('<holoml><scene><group></group></‸</holoml>', '/')).toBe('scene>');
    expect(close('<holoml></‸scene>', '/')).toBeNull();
  });
});

describe('linked editing', () => {
  it("gives the start and end tag's names together, from either", () => {
    for (const marked of ['<scene><gro‸up></group></scene>', '<scene><group></gr‸oup></scene>']) {
      const { doc, outline, offset } = at(marked);
      expect(linkedEditing(doc, outline, offset)?.ranges).toEqual([
        { start: { line: 0, character: 8 }, end: { line: 0, character: 13 } },
        { start: { line: 0, character: 16 }, end: { line: 0, character: 21 } },
      ]);
    }
  });

  it('gives nothing for a tag without its pair', () => {
    const { doc, offset } = at('<scene><gro‸up /></scene>');
    expect(linkedEditing(doc, readOutline(doc.getText()), offset)).toBeNull();
  });
});
