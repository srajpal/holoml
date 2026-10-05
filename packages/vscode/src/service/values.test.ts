// Z8: colours, names, and links to files.
import { describe, expect, it } from 'vitest';
import { at, document } from '../test-support.ts';
import { colorPresentations, colors, definition, findReferences, links, parseColor } from './values.ts';

describe('colours', () => {
  it('shows a swatch for every colour value, an animation of a colour too', () => {
    const text = '<holoml version="0.2"><scene background=" #fff "><light id="l" type="point" color="#c0182a" /><animate target="#l" attribute="color" to="#000000" duration="1s" /><label color="red">x</label></scene></holoml>';
    const { doc, outline } = document(text);
    const found = colors(doc, outline);
    expect(found.map((c) => text.slice(doc.offsetAt(c.range.start), doc.offsetAt(c.range.end)))).toEqual(['#fff', '#c0182a', '#000000']);
    expect(found[1]!.color).toEqual({ red: 0xc0 / 255, green: 0x18 / 255, blue: 0x2a / 255, alpha: 1 });
  });

  it('reads #rgb and #rrggbb, and the picker writes #rrggbb', () => {
    expect(parseColor('#0f0')).toEqual({ red: 0, green: 1, blue: 0, alpha: 1 });
    expect(parseColor('#12345')).toBeNull();
    const range = { start: { line: 0, character: 0 }, end: { line: 0, character: 4 } };
    expect(colorPresentations({ red: 1, green: 0.5, blue: 0, alpha: 0.3 }, range)).toEqual([{ label: '#ff8000', textEdit: { range, newText: '#ff8000' } }]);
  });
});

describe('names', () => {
  const text = (mark: string) =>
    `<holoml version="0.2"><scene><viewpoint id="door" /><model id="${mark === 'id' ? 'l‸amp' : 'lamp'}" src="l.glb" /><animate target="${mark === 'ref' ? '#la‸mp' : '#lamp'}" attribute="position" to="0 1 0" duration="1s" /><sound src="s.ogg" begin="click" trigger="#lamp" /><a href="${mark === 'place' ? '#do‸or' : '#door'}"><label>In</label></a></scene></holoml>`;
  const spans = (marked: string, run: (a: ReturnType<typeof at>) => { range: { start: { character: number }; end: { character: number } } }[]) => {
    const a = at(marked);
    return run(a).map((l) => a.doc.getText().slice(l.range.start.character, l.range.end.character));
  };

  it('goes to the element a "#name" names, a place too', () => {
    const a = at(text('ref'));
    const [loc] = definition(a.doc, a.outline, a.offset);
    expect(a.doc.getText().slice(loc!.range.start.character, loc!.range.end.character)).toBe('lamp');
    expect(a.doc.getText().slice(loc!.range.start.character - 4, loc!.range.start.character)).toBe('id="');
    expect(spans(text('place'), (b) => definition(b.doc, b.outline, b.offset))).toEqual(['door']);
  });

  it('finds every reference to a name, from its id or from a reference', () => {
    expect(spans(text('id'), (b) => findReferences(b.doc, b.outline, b.offset, true))).toEqual(['lamp', '#lamp', '#lamp']);
    expect(spans(text('ref'), (b) => findReferences(b.doc, b.outline, b.offset, false))).toEqual(['#lamp', '#lamp']);
  });
});

describe('links to files', () => {
  it('links the files a page names when they are on the computer, and nothing on the web', () => {
    const text = '<holoml version="0.2"><scene environment="sky.hdr"><model src="models/car.glb?v=2" /><model src="https://example.com/x.glb" /><model src="/root.glb" /><model src="gone.glb" /><a href="next.holoml"><label>N</label></a><a href="#here"><label>H</label></a></scene></holoml>';
    const { doc, outline } = document(text, 'file:///c%3A/site/page.holoml');
    const there = new Set(['file:///c%3A/site/sky.hdr', 'file:///c%3A/site/models/car.glb', 'file:///c%3A/site/next.holoml', 'file:///c%3A/site/root.glb']);
    const asked: string[] = [];
    const found = links(doc, outline, (uri) => {
      asked.push(uri);
      return there.has(uri);
    });
    expect(found.map((l) => l.target)).toEqual(['file:///c%3A/site/sky.hdr', 'file:///c%3A/site/models/car.glb', 'file:///c%3A/site/next.holoml']);
    expect(asked).not.toContain('file:///root.glb');
    // Only files on the computer are asked about: never the address on the web.
    expect(asked.map((u) => new URL(u).protocol)).toEqual(['file:', 'file:', 'file:', 'file:']);
  });

  it('gives no links for a page that is not a file', () => {
    const { doc, outline } = document('<holoml version="0.2"><scene><model src="a.glb" /></scene></holoml>', 'untitled:Untitled-1');
    expect(links(doc, outline, () => true)).toEqual([]);
  });
});
