import { describe, expect, it } from 'vitest';
import { parse, serialize, type HoloNode } from '@holoml/parser';
import { actual, expectedFor, samples } from './conformance.ts';
import { ELEMENTS } from './rules.ts';

const all = samples();

describe('conformance samples (O2, O3, O4)', () => {
  it('has samples in every group', () => {
    for (const group of ['valid', 'syntax-errors', 'problems'] as const) {
      expect(all.filter((s) => s.group === group).length, group).toBeGreaterThan(5);
    }
  });

  for (const sample of all) {
    it(`${sample.group}/${sample.name}`, () => {
      expect(sample.expected, 'the .expected.json file').not.toBeNull();
      const result = expectedFor(sample.group, actual(sample.text));
      expect(result).toEqual(sample.expected);
      // Each group tests what its name says.
      if (sample.group === 'valid') expect(result.problems).toEqual([]);
      if (sample.group === 'syntax-errors') expect(result.error).toBeDefined();
      if (sample.group === 'problems') expect(result.problems?.length ?? 0).toBeGreaterThan(0);
    });
  }

  it('every syntax-error sample named after an error code gives that code', () => {
    for (const s of all.filter((x) => x.group === 'syntax-errors')) {
      const code = s.expected?.error?.code;
      if (code && s.name.startsWith(code)) continue;
      // Other names describe a variant of a code.
      const variants: Record<string, string> = {
        'bare-ampersand': 'bad-character-reference',
        'inherited-reference': 'bad-character-reference',
        'null-in-comment': 'null-character',
      };
      expect(code, s.name).toBe(variants[s.name]);
    }
  });

  it('every problem sample gives the problem it is named after', () => {
    for (const s of all.filter((x) => x.group === 'problems')) {
      const codes = (s.expected?.problems ?? []).map((p) => p.code);
      const variants: Record<string, string> = {
        'bad-values': 'bad-value',
        'identifier-spaces': 'bad-value',
        overflow: 'bad-value',
        'inherited-names': 'unknown-attribute',
        // HoloML 0.2 (draft).
        'newer-than-declared': 'unknown-element',
        'bad-02-values': 'bad-value',
        'animated-light-targets': 'bad-target',
        'inline-script': 'text-not-allowed',
        'hud-in-group': 'child-not-allowed',
        // HoloML 0.2 (draft), browser milestone 18.
        'bad-slider': 'bad-value',
        'bad-choice': 'bad-target',
        // HoloML 0.2 (draft), browser milestone 19.
        'bad-click-actions': 'missing-attribute',
        // HoloML 0.2 (draft), browser milestone 20.
        'bad-loading-by-area': 'missing-attribute',
        // HoloML 0.2 (draft), browser milestone 21.
        'bad-water': 'missing-attribute',
      };
      expect(codes, s.name).toContain(variants[s.name] ?? s.name);
    }
  });
});

describe('O5: every element and attribute has a valid sample', () => {
  const used = new Map<string, Set<string>>();
  const visit = (node: HoloNode) => {
    if (node.type !== 'element') return;
    const attrs = used.get(node.name) ?? new Set<string>();
    for (const a of node.attributes) attrs.add(a.name);
    used.set(node.name, attrs);
    node.children.forEach(visit);
  };
  for (const s of all.filter((x) => x.group === 'valid')) visit(parse(s.text).root);

  for (const [name, rule] of Object.entries(ELEMENTS)) {
    it(`<${name}> and its attributes`, () => {
      expect(used.has(name), `<${name}> appears in a valid sample`).toBe(true);
      for (const attr of Object.keys(rule.attributes)) {
        expect(used.get(name)?.has(attr), `<${name} ${attr}> appears in a valid sample`).toBe(true);
      }
    });
  }
});

describe('O6: round trip', () => {
  const shape = (node: HoloNode): unknown =>
    node.type === 'text'
      ? node.value.replace(/\s+/g, ' ').trim()
      : [node.name, node.attributes.map((a) => [a.name, a.value]), node.children.map(shape)];

  for (const s of all.filter((x) => x.group === 'valid')) {
    it(`valid/${s.name} writes out and reads back the same`, () => {
      const doc = parse(s.text);
      const again = parse(serialize(doc));
      expect(shape(again.root)).toEqual(shape(doc.root));
    });
  }
});
