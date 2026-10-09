import { describe, expect, it } from 'vitest';
import { PARSE_ERROR_CODES, parse, serialize, type HoloNode } from '@holoml/parser';
import { actual, expectedFor, samples } from './conformance.ts';
import { PROBLEM_CODES } from './index.ts';
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
        // The third edition of 0.2 (review 134).
        'after-byte-order-mark': 'uppercase-name',
        'reference-to-zero': 'bad-character-reference',
        'reference-to-surrogate': 'bad-character-reference',
        'reference-too-large': 'bad-character-reference',
        'reference-too-long': 'bad-character-reference',
        'reference-upper-case-x': 'bad-character-reference',
        'reference-in-value': 'bad-character-reference',
        'null-in-value': 'null-character',
        'null-in-tag': 'invalid-name',
        'end-tag-with-attribute': 'unexpected-end',
        'comment-in-tag': 'invalid-name',
        'value-without-name': 'invalid-name',
        'uppercase-attribute': 'uppercase-name',
        'underscore-in-name': 'missing-space',
        'cdata-section': 'unsupported-markup',
        'processing-instruction': 'unsupported-markup',
        'end-tag-after-root': 'stray-end-tag',
        'text-after-root': 'text-outside-root',
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
        // HoloML 0.2.
        'newer-than-declared': 'unknown-element',
        'bad-02-values': 'bad-value',
        'animated-light-targets': 'bad-target',
        'inline-script': 'text-not-allowed',
        'hud-in-group': 'child-not-allowed',
        // HoloML 0.2, browser milestone 18.
        'bad-slider': 'bad-value',
        'bad-choice': 'bad-target',
        // Issue #42: a value bad by its kind is not reported again by a choice's checks.
        'choice-values-bad-by-kind': 'bad-value',
        // HoloML 0.2, browser milestone 19.
        'bad-click-actions': 'missing-attribute',
        // HoloML 0.2, browser milestone 20.
        'bad-loading-by-area': 'missing-attribute',
        // HoloML 0.2, browser milestone 21.
        'bad-water': 'missing-attribute',
        // The third edition of 0.2 (review 134): values.
        'address-characters': 'bad-value',
        'other-spaces': 'bad-value',
        'bad-numbers': 'bad-value',
        'bad-times': 'bad-value',
        'empty-values': 'bad-value',
        // Versions and ids.
        'not-in-older-version': 'unknown-attribute',
        'ids-in-misplaced-elements': 'child-not-allowed',
        // Text.
        'text-after-references': 'text-not-allowed',
        'whitespace-text': 'empty-text',
        'element-in-text': 'child-not-allowed',
        // What is there once, the version, and rules between attributes.
        'choice-material-alone': 'missing-attribute',
        'three-of-one': 'too-many',
        'version-not-exact': 'unsupported-version',
        'unsupported-version-and-more': 'unsupported-version',
        'toggle-repeat': 'bad-value',
        // HoloML 0.3 (browser milestone 25).
        'bad-03-attributes': 'bad-value',
        'not-in-02': 'unknown-attribute',
      };
      expect(codes, s.name).toContain(variants[s.name] ?? s.name);
    }
  });

  it('every syntax error code and every problem code has a sample that gives it (review 134, L4)', () => {
    const errors = new Set(all.filter((s) => s.group === 'syntax-errors').map((s) => s.expected?.error?.code));
    expect(PARSE_ERROR_CODES.filter((code) => !errors.has(code))).toEqual([]);
    const problems = new Set(all.filter((s) => s.group === 'problems').flatMap((s) => (s.expected?.problems ?? []).map((p) => p.code)));
    expect(PROBLEM_CODES.filter((code) => !problems.has(code))).toEqual([]);
  });

  it('no sample has two codes at one place: the order of problems at one place is not defined (SPEC.md section 8)', () => {
    for (const s of all) {
      const at = new Map<string, string>();
      for (const p of s.expected?.problems ?? []) {
        const place = `${p.line}:${p.column}`;
        expect(at.get(place) ?? p.code, `${s.group}/${s.name} at ${place}`).toBe(p.code);
        at.set(place, p.code);
      }
    }
  });

  it("lists each sample's problems in the order of their places", () => {
    for (const s of all) {
      const places = (s.expected?.problems ?? []).map((p) => [p.line, p.column] as const);
      const sorted = [...places].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      expect(places, `${s.group}/${s.name}`).toEqual(sorted);
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
  // Exactly: every text with its whitespace as it was, and as many texts (review 134, L7).
  const shape = (node: HoloNode): unknown =>
    node.type === 'text' ? node.value : [node.name, node.attributes.map((a) => [a.name, a.value]), node.children.map(shape)];

  for (const s of all.filter((x) => x.group === 'valid')) {
    it(`valid/${s.name} writes out and reads back the same`, () => {
      const doc = parse(s.text);
      const again = parse(serialize(doc));
      expect(shape(again.root)).toEqual(shape(doc.root));
    });
  }
});
