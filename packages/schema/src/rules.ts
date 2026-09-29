/**
 * The elements and attributes of HoloML (SPEC.md, "Elements"), as data:
 * which children each element may hold, and each attribute's kind of
 * value. The checker reads this table, and a unit test makes sure every
 * entry has a conformance sample.
 *
 * The table is the newest version's. What a later version added says so
 * in `since`; a page that declares an earlier version may not use it
 * (SPEC.md, "Versions"). Version 0.2 is a draft that grows with the
 * browser's example sites (HyperSpace 3D milestones 17 to 21).
 */

export type ValueKind =
  | { kind: 'text' }
  | { kind: 'number'; min?: number; max?: number; positive?: boolean }
  | { kind: 'vector3' }
  /** One number (the same on every axis) or three. */
  | { kind: 'scale' }
  | { kind: 'color' }
  | { kind: 'duration' }
  | { kind: 'url'; for: 'model' | 'link' | 'script' | 'sound' | 'picture' | 'environment' }
  /** One number more than 0 (the same both ways) or two: how many times a picture tiles. */
  | { kind: 'tiling' }
  /** Four numbers, "x0 z0 x1 z1", with x1 above x0 and z1 above z0: a rectangle of the ground. */
  | { kind: 'area' }
  | { kind: 'id' }
  /** "#" and the id of an element in the same document. */
  | { kind: 'idref' }
  /** One of a list; a value added later names its version in `since`. */
  | { kind: 'choice'; values: readonly string[]; since?: Readonly<Record<string, Version>> }
  /** Written alone (`autoplay`); a value is an error. */
  | { kind: 'flag' }
  | { kind: 'version' }
  | { kind: 'repeat' }
  /** An animation's from and to: a vector, a number, or a colour, by what is animated. */
  | { kind: 'animation-value' };

export interface AttributeRule {
  value: ValueKind;
  required?: boolean;
  /** The version that added it; absent for 0.1. */
  since?: Version;
}

export interface ElementRule {
  /** Elements allowed directly inside; "text" allows text and nothing else. */
  children: readonly string[] | 'text' | 'none';
  attributes: Readonly<Record<string, AttributeRule>>;
  /** Children that may appear at most once. */
  once?: readonly string[];
  /** Of those, children a later version allows several times, and that version. */
  manyFrom?: Readonly<Record<string, Version>>;
  /** Children that must appear. */
  needs?: readonly string[];
  /** For "text" elements: the text may be empty (a script fills it in). */
  emptyText?: boolean;
  /** The version that added it; absent for 0.1. */
  since?: Version;
}

/** The versions this checker knows, oldest first. */
export const VERSIONS = ['0.1', '0.2'] as const;
export type Version = (typeof VERSIONS)[number];
/** The newest version: the one the table describes in full. */
export const VERSION: Version = '0.2';

const place = {
  id: { value: { kind: 'id' } },
  position: { value: { kind: 'vector3' } },
  rotation: { value: { kind: 'vector3' } },
  scale: { value: { kind: 'scale' } },
} as const satisfies Record<string, AttributeRule>;

/** A material's look: what `material` and `option` may set. The pictures and tiling are 0.2. */
const LOOK = {
  color: { value: { kind: 'color' } },
  metalness: { value: { kind: 'number', min: 0, max: 1 } },
  roughness: { value: { kind: 'number', min: 0, max: 1 } },
  opacity: { value: { kind: 'number', min: 0, max: 1 } },
  map: { value: { kind: 'url', for: 'picture' }, since: '0.2' },
  'normal-map': { value: { kind: 'url', for: 'picture' }, since: '0.2' },
  'roughness-map': { value: { kind: 'url', for: 'picture' }, since: '0.2' },
  repeat: { value: { kind: 'tiling' }, since: '0.2' },
} as const satisfies Record<string, AttributeRule>;

/** What may stand in a scene or a group; `panel` is 0.2. */
const SCENE_CONTENT = ['group', 'model', 'light', 'label', 'a', 'animate', 'sound', 'panel'] as const;

/** A screen corner, for what is fixed to the screen. */
const CORNER = { value: { kind: 'choice', values: ['top-left', 'top-right', 'bottom-left', 'bottom-right'] } } as const satisfies AttributeRule;

export const ELEMENTS: Readonly<Record<string, ElementRule>> = {
  holoml: {
    children: ['head', 'scene'],
    once: ['head', 'scene'],
    needs: ['scene'],
    attributes: { version: { value: { kind: 'version' }, required: true } },
  },
  head: {
    children: ['title', 'meta', 'script'],
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
  script: {
    since: '0.2',
    children: 'none',
    attributes: { src: { value: { kind: 'url', for: 'script' }, required: true } },
  },
  scene: {
    children: [...SCENE_CONTENT, 'viewpoint', 'hud', 'slider', 'choice', 'plan'],
    // 0.2: several viewpoints, the places a page's address can name (checked in index.ts: each with an id).
    once: ['viewpoint', 'plan'],
    manyFrom: { viewpoint: '0.2' },
    attributes: {
      id: { value: { kind: 'id' }, since: '0.2' },
      background: { value: { kind: 'color' } },
      environment: { value: { kind: 'url', for: 'environment' }, since: '0.2' },
      sky: { value: { kind: 'url', for: 'environment' }, since: '0.2' },
    },
  },
  group: {
    children: SCENE_CONTENT,
    attributes: {
      ...place,
      solid: { value: { kind: 'flag' }, since: '0.2' },
      shadows: { value: { kind: 'flag' }, since: '0.2' },
      // 0.2: loading by area (checked in index.ts: near needs load="near").
      load: { value: { kind: 'choice', values: ['page', 'near'] }, since: '0.2' },
      near: { value: { kind: 'number', positive: true }, since: '0.2' },
    },
  },
  model: {
    children: ['material'],
    attributes: {
      ...place,
      src: { value: { kind: 'url', for: 'model' }, required: true },
      animation: { value: { kind: 'text' } },
      autoplay: { value: { kind: 'flag' } },
      solid: { value: { kind: 'flag' }, since: '0.2' },
      shadows: { value: { kind: 'flag' }, since: '0.2' },
      // 0.2: a lighter model shown in its place until it has loaded, and once it is let go.
      'stand-in': { value: { kind: 'url', for: 'model' }, since: '0.2' },
    },
  },
  material: {
    children: 'none',
    attributes: {
      name: { value: { kind: 'text' }, required: true },
      ...LOOK,
    },
  },
  viewpoint: {
    children: 'none',
    attributes: {
      id: { value: { kind: 'id' }, since: '0.2' },
      label: { value: { kind: 'text' }, since: '0.2' },
      position: { value: { kind: 'vector3' } },
      'look-at': { value: { kind: 'vector3' } },
      mode: { value: { kind: 'choice', values: ['orbit', 'walk'] } },
      gravity: { value: { kind: 'flag' }, since: '0.2' },
      jump: { value: { kind: 'flag' }, since: '0.2' },
      crosshair: { value: { kind: 'flag' }, since: '0.2' },
      speed: { value: { kind: 'number', min: 0.5, max: 10 }, since: '0.2' },
      'turn-speed': { value: { kind: 'number', min: 10, max: 720 }, since: '0.2' },
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
      shadows: { value: { kind: 'flag' }, since: '0.2' },
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
    children: ['model', 'group', 'label', 'panel'],
    attributes: {
      href: { value: { kind: 'url', for: 'link' }, required: true },
    },
  },
  animate: {
    children: 'none',
    attributes: {
      target: { value: { kind: 'idref' }, required: true },
      attribute: {
        value: {
          kind: 'choice',
          values: ['position', 'rotation', 'scale', 'intensity', 'color', 'background'],
          since: { intensity: '0.2', color: '0.2', background: '0.2' },
        },
        required: true,
      },
      from: { value: { kind: 'animation-value' } },
      to: { value: { kind: 'animation-value' }, required: true },
      duration: { value: { kind: 'duration' }, required: true },
      repeat: { value: { kind: 'repeat' } },
      // 0.2: click actions (checked in index.ts: trigger, toggle, and label need begin="click").
      begin: { value: { kind: 'choice', values: ['load', 'click'] }, since: '0.2' },
      trigger: { value: { kind: 'idref' }, since: '0.2' },
      toggle: { value: { kind: 'flag' }, since: '0.2' },
      label: { value: { kind: 'text' }, since: '0.2' },
    },
  },
  sound: {
    since: '0.2',
    children: 'none',
    attributes: {
      id: { value: { kind: 'id' } },
      src: { value: { kind: 'url', for: 'sound' }, required: true },
      loop: { value: { kind: 'flag' } },
      autoplay: { value: { kind: 'flag' } },
      volume: { value: { kind: 'number', min: 0, max: 1 } },
      // Plays when its trigger is clicked (checked in index.ts: begin="click" needs a trigger).
      begin: { value: { kind: 'choice', values: ['load', 'click'] } },
      trigger: { value: { kind: 'idref' } },
      label: { value: { kind: 'text' } },
    },
  },
  hud: {
    since: '0.2',
    children: 'text',
    emptyText: true,
    attributes: {
      id: { value: { kind: 'id' } },
      corner: CORNER,
      size: { value: { kind: 'number', positive: true } },
      color: { value: { kind: 'color' } },
    },
  },
  /** A number to choose on the screen; its text is its label (checked in index.ts: min < max, value between). */
  slider: {
    since: '0.2',
    children: 'text',
    attributes: {
      id: { value: { kind: 'id' } },
      corner: CORNER,
      min: { value: { kind: 'number' } },
      max: { value: { kind: 'number' } },
      step: { value: { kind: 'number', positive: true } },
      value: { value: { kind: 'number' } },
    },
  },
  /**
   * A choice in place (issue #9): options on the screen that change a
   * model's material, or, without a target, a choice for scripts
   * (checked in index.ts: target and material together, a model target,
   * option values unique, value one of them).
   */
  choice: {
    since: '0.2',
    children: ['option'],
    needs: ['option'],
    attributes: {
      id: { value: { kind: 'id' } },
      corner: CORNER,
      label: { value: { kind: 'text' } },
      target: { value: { kind: 'idref' } },
      material: { value: { kind: 'text' } },
      value: { value: { kind: 'text' } },
    },
  },
  /** One option of a choice: its label, its value, and the material's new look. */
  option: {
    since: '0.2',
    children: 'text',
    attributes: {
      value: { value: { kind: 'text' } },
      ...LOOK,
    },
  },
  /**
   * Text of more than one line (issue #11): a flat board placed and turned
   * like a model, its lines wrapped to a width; blank lines part paragraphs.
   */
  panel: {
    since: '0.2',
    children: 'text',
    attributes: {
      id: { value: { kind: 'id' } },
      position: { value: { kind: 'vector3' } },
      rotation: { value: { kind: 'vector3' } },
      width: { value: { kind: 'number', positive: true } },
      size: { value: { kind: 'number', positive: true } },
      color: { value: { kind: 'color' } },
      background: { value: { kind: 'color' } },
    },
  },
  /** A floor plan in a corner of the screen, with the viewer's place on it. */
  plan: {
    since: '0.2',
    children: 'none',
    attributes: {
      id: { value: { kind: 'id' } },
      corner: CORNER,
      src: { value: { kind: 'url', for: 'picture' }, required: true },
      area: { value: { kind: 'area' }, required: true },
      width: { value: { kind: 'number', positive: true } },
      label: { value: { kind: 'text' } },
    },
  },
};

/** What a click action's trigger may be: something the viewer can click. */
export const CLICKABLE: readonly string[] = ['model', 'group', 'label', 'panel'];

/** Light attributes that only some light types use. */
export const LIGHT_ONLY: Readonly<Record<string, readonly string[]>> = {
  position: ['directional', 'point', 'spot'],
  'look-at': ['directional', 'spot'],
  range: ['point', 'spot'],
  angle: ['spot'],
  shadows: ['directional', 'point', 'spot'],
};

/** Which elements each animated attribute applies to, and since which version. */
export const ANIMATABLE: Readonly<Record<string, readonly { element: string; since?: Version }[]>> = {
  position: [{ element: 'model' }, { element: 'group' }, { element: 'label' }, { element: 'light', since: '0.2' }],
  rotation: [{ element: 'model' }, { element: 'group' }],
  scale: [{ element: 'model' }, { element: 'group' }],
  intensity: [{ element: 'light', since: '0.2' }],
  color: [{ element: 'light', since: '0.2' }],
  background: [{ element: 'scene', since: '0.2' }],
};

/** The kind of value each animated attribute takes in `from` and `to`. */
export const ANIMATION_VALUES: Readonly<Record<string, ValueKind>> = {
  position: { kind: 'vector3' },
  rotation: { kind: 'vector3' },
  scale: { kind: 'vector3' },
  intensity: { kind: 'number', min: 0 },
  color: { kind: 'color' },
  background: { kind: 'color' },
};

export const ROOT = 'holoml';

/** Is `version` at least `since`? (Both are versions this checker knows.) */
export function atLeast(version: Version, since: Version | undefined): boolean {
  return since === undefined || VERSIONS.indexOf(version) >= VERSIONS.indexOf(since);
}
