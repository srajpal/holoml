/**
 * The patterns of HoloML's values (SPEC.md section 6), each written
 * once. The checker tests values with them, and the RELAX NG schema
 * (relaxng.ts) is written from the same texts, so that a change to a
 * pattern cannot leave the schema behind (review 134, L9).
 *
 * Each is written in the part of regular-expression syntax that
 * JavaScript and XML Schema read alike: groups, classes, and counts,
 * with "[0-9]" for a digit. A pattern describes a whole value, as XML
 * Schema's always do; whole() makes the JavaScript expression that does.
 *
 * None can take time that grows faster than the value's length: no two
 * neighbouring parts of a pattern can match the same characters, so a
 * value that fails is given up after one pass (review 134, L1: the
 * number's "[0-9]+\.?[0-9]*" let both runs share the digits, and
 * 160,000 digits took 42 seconds).
 */

/** A number without its sign: digits with an optional fraction, or a fraction alone, and an optional exponent. */
const UNSIGNED = '([0-9]+(\\.[0-9]*)?|\\.[0-9]+)([eE][+\\-]?[0-9]+)?';

/** A number: `0.4`, `-2`, `.5`, `1.`, `1e3`. */
export const NUMBER_PATTERN = `-?${UNSIGNED}`;

/** A colour: `#` and 3 or 6 hexadecimal digits. */
export const COLOR_PATTERN = '#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})';

/** A time: a number and its unit, `s` or `ms`. */
export const DURATION_PATTERN = '([0-9]+(\\.[0-9]+)?|\\.[0-9]+)(ms|s)';

/** An id: a letter, then letters, digits, `-`, or `_`. */
export const ID_PATTERN = '[A-Za-z][A-Za-z0-9_\\-]*';

/** A reference to an id: `#` and the id. */
export const IDREF_PATTERN = `#${ID_PATTERN}`;

/** A count of 1 or more: a whole number that is not zero. */
export const COUNT_PATTERN = '0*[1-9][0-9]*';

/** The word for repeating without end, in place of a count. */
export const INDEFINITE = 'indefinite';

/** The file extensions each kind of address may end with, in lower case; a page may write them in either case. */
export const FILE_EXTENSIONS = {
  model: ['gltf', 'glb'],
  script: ['js', 'mjs'],
  sound: ['ogg', 'mp3', 'wav'],
  picture: ['png', 'jpg', 'jpeg', 'webp'],
  environment: ['hdr', 'png', 'jpg', 'jpeg'],
} as const satisfies Record<string, readonly string[]>;

/** The JavaScript expression for a pattern: the whole value, from start to end. */
export function whole(pattern: string): RegExp {
  return new RegExp(`^(?:${pattern})$`);
}

/** Does a path end with one of these extensions, in either case? */
export function endsWithExtension(extensions: readonly string[]): RegExp {
  return new RegExp(`\\.(?:${extensions.join('|')})$`, 'i');
}
