// Z6: every element, attribute, and code has help on hover.
import { PARSE_ERROR_CODES } from '@holoml/parser';
import { ELEMENTS, PROBLEM_CODES } from '@holoml/schema';
import { describe, expect, it } from 'vitest';
import { forHover } from '../docs-build.ts';
import { at, specDocs } from '../test-support.ts';
import { diagnose } from './diagnostics.ts';
import { attributeText, elementText, hover } from './hover.ts';

const value = (marked: string) => {
  const { doc, outline, offset } = at(marked);
  const h = hover(doc, outline, offset, specDocs(), diagnose(doc, outline));
  return h && typeof h.contents === 'object' && 'value' in h.contents ? h.contents.value : null;
};

describe('help on hover', () => {
  it.each(Object.keys(ELEMENTS))('<%s> and each of its attributes have hover text, with the version each came in', (name) => {
    const rule = ELEMENTS[name]!;
    const text = elementText(name, specDocs())!;
    expect(text).toContain(`<${name}>`);
    expect(text).toContain(specDocs().elements[name]!.summary);
    expect(text.includes('HoloML 0.2')).toBe(rule.since === '0.2');
    for (const [attr, r] of Object.entries(rule.attributes)) {
      const words = attributeText(name, attr, specDocs());
      expect(words, `${name} ${attr}`).toBeTruthy();
      expect(words!.includes('HoloML 0.2')).toBe(r.since === '0.2');
      expect(words!.includes('required')).toBe(r.required === true);
      expect(specDocs().elements[name]!.attributes[attr]!.meaning).not.toBe('');
    }
  });

  it.each([...PARSE_ERROR_CODES, ...PROBLEM_CODES])('the code %s has its meaning', (code) => {
    expect(specDocs().codes[code]).toBeTruthy();
  });

  it('shows the element on its start and end tag, and the attribute on its name', () => {
    expect(value('<holoml version="0.2"><scene><mo‸del src="m.glb" /></scene></holoml>')).toContain('A 3D model from a glTF 2.0 file.');
    expect(value('<holoml version="0.2"><scene></sc‸ene></holoml>')).toContain('Everything that is shown.');
    const src = value('<holoml version="0.2"><scene><model s‸rc="m.glb" /></scene></holoml>')!;
    expect(src).toContain('**`src`** on `<model>` · required');
    expect(value('<holoml version="0.2"><scene><model src="m‸.glb" /></scene></holoml>')).toBeNull();
  });

  it("adds a mistake's code and its meaning over the mistake", () => {
    expect(value('<holoml version="0.2"><scene><mo‸dl /></scene></holoml>')).toContain("`unknown-element`: An element that is not in the page's HoloML version.");
  });

  it("makes the specification's links absolute, and its requirement words plain", () => {
    expect(forHover('See [section 6](#6-space) and [a sample](conformance/valid/a.holoml). It MUST be so.')).toBe(
      'See [section 6](https://srajpal.github.io/holoml/spec/#6-space) and [a sample](https://github.com/srajpal/holoml/blob/main/conformance/valid/a.holoml). It must be so.',
    );
  });
});
