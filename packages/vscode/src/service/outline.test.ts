import { describe, expect, it } from 'vitest';
import { containerAt, elementAt, elements, readOutline, startTagAt, textOf } from './outline.ts';

const names = (text: string) => [...elements(readOutline(text))].map((e) => e.name);

describe('the forgiving reader', () => {
  it('reads elements, attributes, values, and comments, with where each ends', () => {
    const text = '<holoml version="0.2"><!-- note --><scene><model src=\'a.glb\' solid /></scene></holoml>';
    const outline = readOutline(text);
    const [root] = outline.roots;
    expect(root!.name).toBe('holoml');
    expect(root!.end).toBe(text.length);
    expect(root!.attributes[0]).toMatchObject({ name: 'version', value: { text: '0.2', quote: '"', closed: true } });
    expect(outline.comments).toEqual([{ start: 22, end: 35, closed: true }]);
    const model = root!.children[0]!.children[0]!;
    expect(model).toMatchObject({ name: 'model', selfClosed: true });
    expect(model.attributes.map((a) => [a.name, a.value?.text ?? null])).toEqual([
      ['src', 'a.glb'],
      ['solid', null],
    ]);
    expect(text.slice(model.start, model.end)).toBe("<model src='a.glb' solid />");
  });

  it('never stops: an unfinished tag, a missing quote, and a missing end tag still give the page its shape', () => {
    const text = '<holoml version="0.2">\n<scene>\n<model src="a.glb\n<light type="point" />\n<la';
    const outline = readOutline(text);
    expect(names(text)).toEqual(['holoml', 'scene', 'model', 'light', 'la']);
    const model = [...elements(outline)].find((e) => e.name === 'model')!;
    // The value stops at its line's end, as the quote is missing.
    expect(model.attributes[0]!.value).toMatchObject({ text: 'a.glb', closed: false });
    const scene = outline.roots[0]!.children[0]!;
    expect(scene.end).toBe(text.length);
    expect(scene.endTag).toBeUndefined();
  });

  it('closes an element at the end tag of one around it, as HTML does', () => {
    const text = '<scene><group><model src="a.glb"></scene>';
    const outline = readOutline(text);
    const scene = outline.roots[0]!;
    expect(scene.endTag).toBeDefined();
    const group = scene.children[0]!;
    expect(group.endTag).toBeUndefined();
    expect(group.end).toBe(text.indexOf('</scene>'));
  });

  it('ignores an end tag that closes nothing, and a "<" that starts no tag', () => {
    expect(names('<scene></group> 1 < 2 <label>x</label></scene>')).toEqual(['scene', 'label']);
  });

  it('skips a byte order mark', () => {
    expect(readOutline('﻿<holoml></holoml>').roots[0]!.start).toBe(1);
  });

  it('finds the element, the content, and the start tag at an offset', () => {
    const text = '<scene>\n  <group id="g">\n    \n  </group>\n</scene>';
    const outline = readOutline(text);
    const inGroup = text.indexOf('\n    \n') + 3;
    expect(containerAt(outline, inGroup)?.name).toBe('group');
    expect(elementAt(outline, inGroup)?.name).toBe('group');
    expect(startTagAt(outline, text.indexOf('id='))?.name).toBe('group');
    expect(startTagAt(outline, inGroup)).toBeUndefined();
    expect(containerAt(outline, 0)).toBeUndefined();
  });

  it('gives an element its text without tags or comments', () => {
    const outline = readOutline('<panel>Two <!-- x -->\n  lines</panel>');
    expect(textOf(outline, outline.roots[0]!)).toBe('Two lines');
    // A comment that holds what looks like another one, and one never closed, are left out whole.
    const tricky = readOutline('<label>A<!-- <!-- b --> c<!-- d</label>');
    expect(textOf(tricky, tricky.roots[0]!)).toBe('A c');
  });
});
