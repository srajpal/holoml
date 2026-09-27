import { describe, expect, it } from 'vitest';
import { HoloParseError, parse, serialize, type ElementNode, type HoloNode } from './index.ts';

/** The error a text gives, as "code line:column". */
function errorOf(text: string): string {
  try {
    parse(text);
  } catch (e) {
    if (e instanceof HoloParseError) return `${e.code} ${e.position.line}:${e.position.column}`;
    throw e;
  }
  return 'no error';
}

/** A tree without positions, for comparing. */
function shape(node: HoloNode): unknown {
  if (node.type === 'text') return node.value.replace(/\s+/g, ' ').trim();
  return [node.name, node.attributes.map((a) => [a.name, a.value]), node.children.map(shape)];
}

describe('parse', () => {
  it('reads elements, attributes, and text with their places (written out by hand)', () => {
    const doc = parse('<holoml version="0.1">\n  <scene>\n    <label size=\'0.2\'>Hi &amp; bye</label>\n  </scene>\n</holoml>\n');
    const root = doc.root;
    expect(root).toMatchObject({ name: 'holoml', start: { line: 1, column: 1, offset: 0 } });
    expect(root.attributes).toEqual([{ name: 'version', value: '0.1', start: { line: 1, column: 9, offset: 8 } }]);
    const scene = root.children[0] as ElementNode;
    expect(scene).toMatchObject({ name: 'scene', start: { line: 2, column: 3 } });
    const label = scene.children[0] as ElementNode;
    expect(label.start).toMatchObject({ line: 3, column: 5 });
    expect(label.attributes).toEqual([{ name: 'size', value: '0.2', start: { line: 3, column: 12, offset: 44 } }]);
    expect(label.children).toEqual([{ type: 'text', value: 'Hi & bye', start: { line: 3, column: 23, offset: 55 } }]);
  });

  it('keeps an attribute written alone as a null value, and drops whitespace-only text and comments', () => {
    const doc = parse('<a b c="1"> <!-- note -->\n <d e /> </a>');
    expect(shape(doc.root)).toEqual(['a', [['b', null], ['c', '1']], [['d', [['e', null]], []]]]);
  });

  it('counts lines the same with \\n, \\r\\n, and \\r, and ignores a byte order mark', () => {
    for (const nl of ['\n', '\r\n', '\r']) {
      const doc = parse(`﻿<a>${nl}${nl}  <b />${nl}</a>`);
      expect((doc.root.children[0] as ElementNode).start).toMatchObject({ line: 3, column: 3 });
    }
  });

  it('decodes every kind of character reference, in text and in values', () => {
    const doc = parse('<a v="&quot;&apos;&lt;&gt;&amp;&#65;&#x42;">&#233;&#x1F697;</a>');
    expect(doc.root.attributes[0]!.value).toBe('"\'<>&AB');
    expect((doc.root.children[0] as { value: string }).value).toBe('é🚗');
  });

  it('stops at the first mistake, with the place (written out by hand)', () => {
    expect(errorOf('')).toBe('no-root 1:1');
    expect(errorOf('<a>')).toBe('unclosed-element 1:1');
    expect(errorOf('<a>\n  <b>\n</a>')).toBe('mismatched-end-tag 3:1');
    expect(errorOf('<a x=1 />')).toBe('unquoted-value 1:6');
    expect(errorOf('<a x="1" x="2" />')).toBe('duplicate-attribute 1:10');
    expect(errorOf('<a x="1"y="2" />')).toBe('missing-space 1:9');
    expect(errorOf('<A />')).toBe('uppercase-name 1:2');
    expect(errorOf('<a>&copy;</a>')).toBe('bad-character-reference 1:4');
    expect(errorOf('<a>&#0;</a>')).toBe('bad-character-reference 1:4');
    expect(errorOf('<a>&#xD800;</a>')).toBe('bad-character-reference 1:4');
    expect(errorOf('<a x="1\n<b />')).toBe('unclosed-value 1:6');
    expect(errorOf('<a x="1<2" />')).toBe('less-than-in-value 1:8');
    expect(errorOf('<a /><b />')).toBe('second-root 1:6');
    expect(errorOf('<?xml version="1.0"?><a />')).toBe('unsupported-markup 1:1');
  });

  it('gives a readable message naming the element that was left open', () => {
    try {
      parse('<holoml>\n  <scene>\n</holoml>');
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toBe('Expected </scene> (opened on line 2), found </holoml> (line 3, column 1)');
    }
  });
});

describe('serialize', () => {
  it('writes a tree that parses back to the same tree', () => {
    const text = '<holoml version="0.1"><scene background="#000"><model src="a &amp; b.glb" autoplay><material name="Paint" /></model><label>Say "hi" &lt;3</label></scene></holoml>';
    const doc = parse(text);
    const out = serialize(doc);
    expect(out).toBe(
      [
        '<holoml version="0.1">',
        '  <scene background="#000">',
        '    <model src="a &amp; b.glb" autoplay>',
        '      <material name="Paint" />',
        '    </model>',
        '    <label>Say "hi" &lt;3</label>',
        '  </scene>',
        '</holoml>',
        '',
      ].join('\n'),
    );
    expect(shape(parse(out).root)).toEqual(shape(doc.root));
  });
});

describe('O7: speed', () => {
  it('reads a 1 MB document in under 100 ms', () => {
    const rows: string[] = ['<holoml version="0.1">', '<scene>'];
    let size = 0;
    for (let i = 0; size < 1_000_000; i++) {
      const row = `  <group id="g${i}" position="${i} 0 ${-i}"><model src="models/car-${i % 7}.glb" rotation="0 ${i % 360} 0"><material name="Paint" color="#c0182a" /></model><label position="0 2 0">Car number ${i} &amp; friends</label></group>`;
      rows.push(row);
      size += row.length + 1;
    }
    rows.push('</scene>', '</holoml>');
    const text = rows.join('\n');
    expect(text.length).toBeGreaterThanOrEqual(1_000_000);
    parse(text); // warm-up
    const runs: number[] = [];
    for (let k = 0; k < 5; k++) {
      const start = performance.now();
      parse(text);
      runs.push(performance.now() - start);
    }
    const median = runs.sort((a, b) => a - b)[2]!;
    console.log(`O7: ${(text.length / 1e6).toFixed(2)} MB read in ${median.toFixed(1)} ms (median of five)`);
    expect(median, `median of five: ${median.toFixed(1)} ms`).toBeLessThan(100);
  });
});
