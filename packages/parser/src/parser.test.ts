import { describe, expect, it } from 'vitest';
import { HoloParseError, MAX_DEPTH, parse, serialize, type ElementNode, type HoloNode } from './index.ts';

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

/** A tree without positions, for comparing: every text exactly as it is, whitespace included. */
function shape(node: HoloNode): unknown {
  if (node.type === 'text') return node.value;
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
    expect(label.children).toEqual([
      { type: 'text', value: 'Hi & bye', start: { line: 3, column: 23, offset: 55 }, visible: { line: 3, column: 23, offset: 55 } },
    ]);
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

describe('limits and inherited names (issues #1, #2, #5)', () => {
  const nested = (depth: number) => '<a>'.repeat(depth) + '</a>'.repeat(depth);

  it(`reads elements nested ${MAX_DEPTH} deep, and stops one deeper with too-deep at its place`, () => {
    const doc = parse(nested(MAX_DEPTH));
    let depth = 0;
    for (let n: HoloNode | undefined = doc.root; n?.type === 'element'; n = n.children[0]) depth += 1;
    expect(depth).toBe(MAX_DEPTH);
    expect(errorOf(nested(MAX_DEPTH + 1))).toBe(`too-deep 1:${MAX_DEPTH * 3 + 1}`);
    // Far deeper input stops the same way, instead of overflowing the stack.
    expect(errorOf(nested(100_000))).toBe(`too-deep 1:${MAX_DEPTH * 3 + 1}`);
  });

  it('writes out a tree at the deepest allowed nesting', () => {
    const doc = parse(nested(MAX_DEPTH));
    expect(shape(parse(serialize(doc)).root)).toEqual(shape(doc.root));
  });

  it('knows only its own character reference names, never inherited ones', () => {
    for (const name of ['constructor', 'toString', 'valueOf', '__proto__', 'hasOwnProperty']) {
      expect(errorOf(`<a>&${name};</a>`), name).toBe('bad-character-reference 1:4');
    }
  });

  it('rejects a null character inside a comment, before and after the root too', () => {
    expect(errorOf('<a><!-- x\u0000 --></a>')).toBe('null-character 1:10');
    expect(errorOf('<!--\u0000--><a />')).toBe('null-character 1:5');
    expect(errorOf('<a /><!-- ok -->\n<!--\u0000-->')).toBe('null-character 2:5');
    expect(errorOf('<!-- fine --><a /><!-- fine -->')).toBe('no error');
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

  it('writes every text back exactly: its whitespace, its parts around a comment, and whitespace from references (review 134, L7)', () => {
    for (const text of [
      // A comment parts text in two; read again, it is two texts still, not one with a space.
      '<label>a<!-- c -->b</label>',
      '<label>a<!-- c --> b<!-- d -->c </label>',
      // Whitespace at the start and end, written as itself and as references.
      '<label>  two spaces each side  </label>',
      '<label>&#32;x&#32;</label>',
      '<label>&#10;&#13;&#9;x</label>',
      '<label>\n      Whitespace   kept,\r\n\tline by line\r    </label>',
      // Whitespace alone, which only a reference can make.
      '<label>&#32;</label>',
      '<label> &#9; </label>',
      '<label>&#10;<!-- c -->&#13;&#10;</label>',
      // Text beside elements, where indenting would add to the text.
      '<scene>Loose <model src="a.glb" /> text<group><label> x </label></group>\n</scene>',
      '<scene><group />tail</scene>',
      // Values keep their whitespace and line ends too.
      '<meta name=" a " content="one&#10;two&#13;&#10;three&#9;" />',
      '<a b="&lt;&amp;&gt;&quot;\'" c=\'"\' d="" e />',
    ]) {
      const doc = parse(text);
      const again = parse(serialize(doc));
      expect(shape(again.root), text).toEqual(shape(doc.root));
      // And what is written is stable: writing it again gives the same text.
      expect(serialize(again), text).toBe(serialize(doc));
    }
  });

  it('writes an element without text in lines, and one with text as it is', () => {
    expect(serialize(parse('<scene><group><model src="a.glb" /></group><label> a <!-- c -->b</label></scene>'))).toBe(
      ['<scene>', '  <group>', '    <model src="a.glb" />', '  </group>', '  <label> a <!---->b</label>', '</scene>', ''].join('\n'),
    );
  });
});

describe('places (review 134, L7)', () => {
  it('after a byte order mark, line 1 counts its columns from the first character after the mark', () => {
    expect(errorOf('\uFEFF<A/>')).toBe('uppercase-name 1:2');
    expect(errorOf('<A/>')).toBe('uppercase-name 1:2');
    expect(errorOf('\uFEFF')).toBe('no-root 1:1');
    expect(errorOf('\uFEFFx')).toBe('text-outside-root 1:1');
    const doc = parse('\uFEFF<a b="1">\n  <c /></a>');
    expect(doc.root.start).toEqual({ line: 1, column: 1, offset: 1 });
    expect(doc.root.attributes[0]!.start).toEqual({ line: 1, column: 4, offset: 4 });
    // Later lines are as they were.
    expect((doc.root.children[0] as ElementNode).start).toEqual({ line: 2, column: 3, offset: 13 });
    // Only a mark at the very start is one: a second is text.
    expect(errorOf('\uFEFF\uFEFF<a />')).toBe('text-outside-root 1:1');
  });

  it('a text says where its first character that is not whitespace is written, a character reference counting as one', () => {
    const text = (source: string) => parse(source).root.children[0] as { start: unknown; visible: unknown };
    expect(text('<a>x</a>')).toMatchObject({ start: { line: 1, column: 4 }, visible: { line: 1, column: 4 } });
    expect(text('<a>\n   x</a>')).toMatchObject({ start: { line: 1, column: 4 }, visible: { line: 2, column: 4 } });
    expect(text('<a>\r\n\t x</a>')).toMatchObject({ start: { line: 1, column: 4 }, visible: { line: 2, column: 3 } });
    expect(text('<a>\r \r x</a>')).toMatchObject({ visible: { line: 3, column: 2 } });
    // A reference to whitespace is written with "&", which is not whitespace.
    expect(text('<a>&#10;&#10;x</a>')).toMatchObject({ start: { line: 1, column: 4 }, visible: { line: 1, column: 4 } });
    expect(text('<a>  &#32;x</a>')).toMatchObject({ visible: { line: 1, column: 6 } });
    expect(text('<a>\n  &#32;</a>')).toMatchObject({ visible: { line: 2, column: 3 } });
  });
});

describe('which error, and where (SPEC.md section 5, "What is reported, and where"; review 134, L3)', () => {
  const NUL = String.fromCharCode(0);

  it('the text ends inside a tag: unexpected-end at the tag, whatever was to come next', () => {
    for (const text of ['<', '<a', '<a ', '<a b', '<a b=', '<a b= ', '<a b="1"', '<a b="1" ', '<a/', '<a /']) {
      expect(errorOf(text), text).toBe('unexpected-end 1:1');
    }
    for (const text of ['<a><', '<a><b', '<a><b c=', '<a><b/', '<a></', '<a></a', '<a></a ']) {
      expect(errorOf(text), text).toBe('unexpected-end 1:4');
    }
    // Inside a value that was opened, it is the value that is not closed.
    expect(errorOf('<a b="1')).toBe('unclosed-value 1:6');
    expect(errorOf("<a b='")).toBe('unclosed-value 1:6');
  });

  it('an end tag holds its name and nothing more: anything else before its ">" leaves it unfinished', () => {
    expect(errorOf('<a></a b>')).toBe('unexpected-end 1:4');
    expect(errorOf('<a></a/>')).toBe('unexpected-end 1:4');
    expect(errorOf('<a>\n</a\n b="1">')).toBe('unexpected-end 2:1');
    // Before its name is compared: an unfinished end tag of another name is unfinished first.
    expect(errorOf('<a></b c>')).toBe('unexpected-end 1:4');
    expect(errorOf('<a></b >')).toBe('mismatched-end-tag 1:4');
    expect(errorOf('<a></ a>')).toBe('invalid-name 1:6');
    expect(errorOf('<a></A>')).toBe('uppercase-name 1:6');
  });

  it('a "<" in a value is reported where it is, or, after a line end in the value, as a value that is not closed', () => {
    expect(errorOf('<a b="1<2" />')).toBe('less-than-in-value 1:8');
    expect(errorOf('<a b="1 <c d="2" />')).toBe('less-than-in-value 1:9');
    expect(errorOf('<a b="1\n<c />')).toBe('unclosed-value 1:6');
    expect(errorOf('<a b="1\r  <c />')).toBe('unclosed-value 1:6');
    expect(errorOf('<a\n  b="1 />\n</a>')).toBe('unclosed-value 2:5');
    // A line end written as a reference is not one.
    expect(errorOf('<a b="1&#10;<c />')).toBe('less-than-in-value 1:13');
    // Without a "<" the value runs to the next quote, or to the end of the text.
    expect(errorOf('<a b="1 />\n')).toBe('unclosed-value 1:6');
  });

  it('in a tag: a name, a space, a value, a slash', () => {
    expect(errorOf('< a />')).toBe('invalid-name 1:2');
    expect(errorOf('<1a />')).toBe('invalid-name 1:2');
    expect(errorOf('<a ="1" />')).toBe('invalid-name 1:4');
    expect(errorOf('<a <!-- c --> />')).toBe('invalid-name 1:4');
    expect(errorOf('<a B="1" />')).toBe('uppercase-name 1:4');
    expect(errorOf('<aB />')).toBe('uppercase-name 1:2');
    expect(errorOf('<a_b />')).toBe('missing-space 1:3');
    expect(errorOf('<a"1" />')).toBe('missing-space 1:3');
    expect(errorOf('<a b c="1"d />')).toBe('missing-space 1:11');
    expect(errorOf('<a b = \t"1" c\n=\n\'2\' />')).toBe('no error');
    expect(errorOf('<a b=1 />')).toBe('unquoted-value 1:6');
    expect(errorOf('<a b= c="1" />')).toBe('unquoted-value 1:7');
    expect(errorOf('<a b=>')).toBe('unquoted-value 1:6');
    expect(errorOf('<a b c b />')).toBe('duplicate-attribute 1:8');
    expect(errorOf('<a / >')).toBe('stray-slash 1:4');
    expect(errorOf('<a /b>')).toBe('stray-slash 1:4');
  });

  it('a null character is reported as one in text, in a value, and in a comment; elsewhere as the mistake any character would be there', () => {
    expect(errorOf(`<a>x${NUL}</a>`)).toBe('null-character 1:5');
    expect(errorOf(`<a b="${NUL}" />`)).toBe('null-character 1:7');
    expect(errorOf(`<a><!--${NUL}--></a>`)).toBe('null-character 1:8');
    expect(errorOf(`${NUL}<a />`)).toBe('text-outside-root 1:1');
    expect(errorOf(`<a ${NUL}/>`)).toBe('invalid-name 1:4');
    expect(errorOf(`<a${NUL}/>`)).toBe('missing-space 1:3');
  });

  it('a comment: not closed, then "--" inside it, then a null character, in that order; all but the last at its "<"', () => {
    expect(errorOf('<a><!-- x </a>')).toBe('unclosed-comment 1:4');
    expect(errorOf('<a><!-->')).toBe('unclosed-comment 1:4');
    expect(errorOf('<a><!-- x -- y --></a>')).toBe('bad-comment 1:4');
    expect(errorOf(`<a><!-- ${NUL} -- --></a>`)).toBe('bad-comment 1:4');
    expect(errorOf('<a><!----></a>')).toBe('no error');
    expect(errorOf('<a><!-- x ---></a>')).toBe('no error');
    expect(errorOf('<a><!- x -></a>')).toBe('unsupported-markup 1:4');
    expect(errorOf('<a><![CDATA[x]]></a>')).toBe('unsupported-markup 1:4');
  });

  it('outside the root: an end tag, a second root, text, or no root at all', () => {
    expect(errorOf('</a>')).toBe('stray-end-tag 1:1');
    expect(errorOf('</')).toBe('stray-end-tag 1:1');
    expect(errorOf('<a />\n</a>')).toBe('stray-end-tag 2:1');
    expect(errorOf('<a />\n<!-- c --> <b />')).toBe('second-root 2:12');
    expect(errorOf('<a /> x')).toBe('text-outside-root 1:7');
    expect(errorOf('&amp;<a />')).toBe('text-outside-root 1:1');
    // No root: at the end of the text, after what little there is.
    expect(errorOf(' \n <!-- c -->\n')).toBe('no-root 3:1');
    expect(errorOf('  ')).toBe('no-root 1:3');
  });

  it('a character reference: a name of the five, or a number that is a character', () => {
    for (const ok of ['&amp;', '&lt;', '&gt;', '&quot;', '&apos;', '&#1;', '&#0000065;', '&#x41;', '&#xd7ff;', '&#xE000;', '&#x10FFFF;', '&#1114111;']) {
      expect(errorOf(`<a>${ok}</a>`), ok).toBe('no error');
      expect(errorOf(`<a b="${ok}" />`), ok).toBe('no error');
    }
    for (const bad of ['&', '&;', '&amp', '&AMP;', '&nbsp;', '&#;', '&#x;', '&#0;', '&#x0;', '&#xD800;', '&#xDFFF;', '&#55296;', '&#x110000;', '&#1114112;', '&#X41;', '&#00000065;', '&#x0000041;', '&# 65;', '&#6 5;', '&#-1;']) {
      expect(errorOf(`<a>x${bad}</a>`), bad).toBe('bad-character-reference 1:5');
      expect(errorOf(`<a b="${bad}" />`), bad).toBe('bad-character-reference 1:7');
    }
  });

  it('elements: one too deep, not closed, closed by another name', () => {
    expect(errorOf('<a>\n <b>\n  <c>')).toBe('unclosed-element 3:3');
    expect(errorOf('<a>\n <b>\n  <c />')).toBe('unclosed-element 2:2');
    expect(errorOf('<a>\n <b>\n </a>')).toBe('mismatched-end-tag 3:2');
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

  it('reads 200,000 short comments (1.6 MB) in under 100 ms: time grows with the size, not its square (PR #6 review)', () => {
    const time = (n: number) => {
      const text = '<holoml version="0.1"><scene>' + '<!--x-->'.repeat(n) + '</scene></holoml>';
      parse(text); // warm-up
      const runs: number[] = [];
      for (let k = 0; k < 5; k++) {
        const start = performance.now();
        parse(text);
        runs.push(performance.now() - start);
      }
      return runs.sort((a, b) => a - b)[2]!;
    };
    const small = time(50_000);
    const large = time(200_000);
    console.log(`O7: 200,000 comments read in ${large.toFixed(1)} ms; 50,000 in ${small.toFixed(1)} ms`);
    expect(large).toBeLessThan(100);
    // Four times the input may take somewhat more than four times as long, never sixteen.
    expect(large).toBeLessThan(Math.max(small * 8, 20));
  });
});
