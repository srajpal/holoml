/**
 * The words the extension shows on hover: each element's first sentence
 * and its attributes' rows from SPEC.md, and each code's meaning. They are
 * gathered from the specification when the extension is built
 * (docs-build.ts) into dist/docs.json; nothing is read at run time but
 * that file.
 */

export interface AttributeDoc {
  /** The specification's "Value" cell. */
  value: string;
  /** Its "Default" cell; empty when there is none. */
  default: string;
  meaning: string;
}

export interface ElementDoc {
  summary: string;
  attributes: Record<string, AttributeDoc>;
}

export interface Docs {
  elements: Record<string, ElementDoc>;
  /** Every syntax error and problem code, and what it means. */
  codes: Record<string, string>;
}

/** The published site, where the hover's links lead. */
export const SITE = 'https://srajpal.github.io/holoml/';
export const SPEC_URL = `${SITE}spec/`;
export const ELEMENTS_URL = `${SITE}docs/reference/elements.html`;
export const CODES_URL = `${SITE}docs/reference/codes.html`;

export const NO_DOCS: Docs = { elements: {}, codes: {} };
