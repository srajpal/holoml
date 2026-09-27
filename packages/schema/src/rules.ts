/**
 * The elements and attributes of HoloML 0.1 (SPEC.md, "Elements"), as
 * data: which children each element may hold, and each attribute's kind
 * of value. The checker reads this table, and a unit test makes sure
 * every entry has a conformance sample.
 */

export type ValueKind =
  | { kind: 'text' }
  | { kind: 'number'; min?: number; max?: number; positive?: boolean }
  | { kind: 'vector3' }
  /** One number (the same on every axis) or three. */
  | { kind: 'scale' }
  | { kind: 'color' }
  | { kind: 'duration' }
  | { kind: 'url'; for: 'model' | 'link' }
  | { kind: 'id' }
  /** "#" and the id of an element in the same document. */
  | { kind: 'idref' }
  | { kind: 'choice'; values: readonly string[] }
  /** Written alone (`autoplay`); a value is an error. */
  | { kind: 'flag' }
  | { kind: 'version' }
  | { kind: 'repeat' };

export interface AttributeRule {
  value: ValueKind;
  required?: boolean;
}

export interface ElementRule {
  /** Elements allowed directly inside; "text" allows text and nothing else. */
  children: readonly string[] | 'text' | 'none';
  attributes: Readonly<Record<string, AttributeRule>>;
  /** Children that may appear at most once. */
  once?: readonly string[];
  /** Children that must appear. */
  needs?: readonly string[];
}

const place = {
  id: { value: { kind: 'id' } },
  position: { value: { kind: 'vector3' } },
  rotation: { value: { kind: 'vector3' } },
  scale: { value: { kind: 'scale' } },
} as const satisfies Record<string, AttributeRule>;

/** What may stand in a scene or a group. */
const SCENE_CONTENT = ['group', 'model', 'light', 'label', 'a', 'animate'] as const;

export const ELEMENTS: Readonly<Record<string, ElementRule>> = {
  holoml: {
    children: ['head', 'scene'],
    once: ['head', 'scene'],
    needs: ['scene'],
    attributes: { version: { value: { kind: 'version' }, required: true } },
  },
  head: {
    children: ['title', 'meta'],
    once: ['title'],
    attributes: {},
  },
  title: { children: 'text', attributes: {} },
  meta: {
    children: 'none',
    attributes: {
      name: { value: { kind: 'text' }, required: true },
      content: { value: { kind: 'text' }, required: true },
    },
  },
  scene: {
    children: [...SCENE_CONTENT, 'viewpoint'],
    once: ['viewpoint'],
    attributes: { background: { value: { kind: 'color' } } },
  },
  group: {
    children: SCENE_CONTENT,
    attributes: { ...place },
  },
  model: {
    children: ['material'],
    attributes: {
      ...place,
      src: { value: { kind: 'url', for: 'model' }, required: true },
      animation: { value: { kind: 'text' } },
      autoplay: { value: { kind: 'flag' } },
    },
  },
  material: {
    children: 'none',
    attributes: {
      name: { value: { kind: 'text' }, required: true },
      color: { value: { kind: 'color' } },
      metalness: { value: { kind: 'number', min: 0, max: 1 } },
      roughness: { value: { kind: 'number', min: 0, max: 1 } },
      opacity: { value: { kind: 'number', min: 0, max: 1 } },
    },
  },
  viewpoint: {
    children: 'none',
    attributes: {
      position: { value: { kind: 'vector3' } },
      'look-at': { value: { kind: 'vector3' } },
      mode: { value: { kind: 'choice', values: ['orbit', 'walk'] } },
    },
  },
  light: {
    children: 'none',
    attributes: {
      id: { value: { kind: 'id' } },
      type: { value: { kind: 'choice', values: ['ambient', 'directional', 'point', 'spot'] }, required: true },
      color: { value: { kind: 'color' } },
      intensity: { value: { kind: 'number', min: 0 } },
      position: { value: { kind: 'vector3' } },
      'look-at': { value: { kind: 'vector3' } },
      range: { value: { kind: 'number', min: 0 } },
      angle: { value: { kind: 'number', min: 0, max: 90 } },
    },
  },
  label: {
    children: 'text',
    attributes: {
      id: { value: { kind: 'id' } },
      position: { value: { kind: 'vector3' } },
      size: { value: { kind: 'number', positive: true } },
      color: { value: { kind: 'color' } },
    },
  },
  a: {
    children: ['model', 'group', 'label'],
    attributes: {
      href: { value: { kind: 'url', for: 'link' }, required: true },
    },
  },
  animate: {
    children: 'none',
    attributes: {
      target: { value: { kind: 'idref' }, required: true },
      attribute: { value: { kind: 'choice', values: ['position', 'rotation', 'scale'] }, required: true },
      from: { value: { kind: 'vector3' } },
      to: { value: { kind: 'vector3' }, required: true },
      duration: { value: { kind: 'duration' }, required: true },
      repeat: { value: { kind: 'repeat' } },
    },
  },
};

/** Light attributes that only some light types use. */
export const LIGHT_ONLY: Readonly<Record<string, readonly string[]>> = {
  position: ['directional', 'point', 'spot'],
  'look-at': ['directional', 'spot'],
  range: ['point', 'spot'],
  angle: ['spot'],
};

export const ROOT = 'holoml';
export const VERSION = '0.1';
