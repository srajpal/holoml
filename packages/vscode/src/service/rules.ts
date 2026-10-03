/**
 * What the checker's table says about the element or attribute under the
 * cursor, for the page's version. The table is holoml's own
 * (@holoml/schema), so a new element or attribute reaches the editor with
 * no change here.
 */
import { ANIMATION_VALUES, ELEMENTS, VERSION, VERSIONS, atLeast, type AttributeRule, type ElementRule, type ValueKind, type Version } from '@holoml/schema';
import { attribute, declaredVersion, type ElementNode, type Outline } from './outline.ts';

/** A dictionary's own entry, never an inherited one such as "constructor". */
export function own<T>(dictionary: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.hasOwn(dictionary, key) ? dictionary[key] : undefined;
}

/** The version the page's rules come from: the one it declares, or the newest when it declares none the checker knows. */
export function pageVersion(outline: Outline): Version {
  const declared = declaredVersion(outline);
  return (VERSIONS as readonly string[]).includes(declared ?? '') ? (declared as Version) : VERSION;
}

/** An element's rule, when the page's version has it. */
export function elementRule(name: string, version: Version): ElementRule | undefined {
  const rule = own(ELEMENTS, name);
  return rule && atLeast(version, rule.since) ? rule : undefined;
}

/** An attribute's rule on an element, when the page's version has both. */
export function attributeRule(el: ElementNode, name: string, version: Version): AttributeRule | undefined {
  const rule = elementRule(el.name, version);
  const attr = rule && own(rule.attributes, name);
  return attr && atLeast(version, attr.since) ? attr : undefined;
}

/** The kind of value an attribute takes; an animation's from and to by what it animates. */
export function valueKind(el: ElementNode, name: string, version: Version): ValueKind | undefined {
  const kind = attributeRule(el, name, version)?.value;
  if (kind?.kind !== 'animation-value') return kind;
  const which = attribute(el, 'attribute')?.value?.text;
  return which === undefined ? undefined : own(ANIMATION_VALUES, which);
}

/** Does this attribute name an element by its id ("#name")? A link's `href` does when it starts with "#" (a place). */
export function isReference(el: ElementNode, name: string, version: Version): boolean {
  if (el.name === 'a' && name === 'href') return attribute(el, 'href')?.value?.text.startsWith('#') ?? false;
  return valueKind(el, name, version)?.kind === 'idref';
}
