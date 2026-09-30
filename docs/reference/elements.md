# Elements and attributes

Every element of HoloML 0.2 at a glance: what it is, what it may hold,
where it may be, and its attributes. Which elements and attributes there
are, and where each may be, come from the checker's own table; the words
come from the [specification](../../SPEC.md#7-elements), which says
exactly what each one means. An element may hold any number of each
element it lists, unless it says otherwise. The kinds of value (number,
vector, colour, address, and so on) are defined in [section
6](../../SPEC.md#6-space-units-and-values) of the specification. "(0.2)"
marks what a 0.1 page may not use.

This page is made by `pnpm reference:update`; do not edit it by hand.

| Element | What it is |
|---|---|
| [`holoml`](#holoml) | The root element. |
| [`head`](#head) | Information about the page. |
| [`title`](#title) | The page's title, shown in the browser's tab and history. |
| [`meta`](#meta) | A named piece of information about the page, as in HTML. |
| [`script`](#script) | (0.2) A JavaScript module that makes the page react: to clicks and keys, to time passing, to the viewer walking about ([section 10](../../SPEC.md#10-scripts-and-the-scene-api)). |
| [`scene`](#scene) | Everything that is shown. |
| [`group`](#group) | Places several things together, so they move, turn, and scale as one. |
| [`model`](#model) | A 3D model from a glTF 2.0 file. |
| [`material`](#material) | Changes one material inside its parent model, named as in the glTF file (for example the car's `Paint`). |
| [`viewpoint`](#viewpoint) | Where the viewer starts, and how they move. |
| [`light`](#light) | A light. |
| [`water`](#water) | (0.2) A box of water, such as a tank, a pool, or a stretch of sea. |
| [`label`](#label) | Text in the scene. |
| [`panel`](#panel) | (0.2) Text of more than one line on a flat board in the scene: an information panel on a wall, a menu on a table. |
| [`a`](#a) | A link, as in HTML. |
| [`animate`](#animate) | Changes the position, rotation, or scale of an element over time, starting when the scene is shown; (0.2) also a light's brightness and colour, and the scene's background. |
| [`sound`](#sound) | (0.2) A sound from a file, played by a script (section 10) or with `autoplay`. |
| [`hud`](#hud) | (0.2) Text fixed to a corner of the screen, in front of the scene: a score, a hint, what the viewer carries. |
| [`slider`](#slider) | (0.2) A number the viewer chooses, with a slider fixed to a corner of the screen, in front of the scene: how fast to walk, how loud, how much. |
| [`choice`](#choice) | (0.2) A choice in place: options on the screen, fixed to a corner like `hud` and `slider`, that change one of a model's materials, or, without `target` and `material`, a choice for the page's scripts. |
| [`option`](#option) | (0.2) One option of a `choice`. |
| [`plan`](#plan) | (0.2) A floor plan fixed to a corner of the screen, like `hud`, with a marker for where the viewer is and which way they face. |

## `holoml`

The root element. [In the specification](../../SPEC.md#holoml).

- Holds: [`head`](#head) (at most one), [`scene`](#scene) (exactly one).
- May be in: nothing; it is the root.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `version` | `"0.1"` or `"0.2"` (required) |  | The HoloML version the page is written for ([section 11](../../SPEC.md#11-versions)) |

## `head`

Information about the page. [In the specification](../../SPEC.md#head).

- Holds: [`title`](#title) (at most one), [`meta`](#meta), [`script`](#script) (0.2).
- May be in: [`holoml`](#holoml).
- Attributes: none.

## `title`

The page's title, shown in the browser's tab and history. [In the specification](../../SPEC.md#title).

- Holds: text.
- May be in: [`head`](#head).
- Attributes: none.

## `meta`

A named piece of information about the page, as in HTML. [In the specification](../../SPEC.md#meta).

- Holds: nothing.
- May be in: [`head`](#head).

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `name` | text (required) |  | What it is, for example `description` or `author` |
| `content` | text (required) |  | Its value |

## `script`

(0.2) A JavaScript module that makes the page react: to clicks and keys, to time passing, to the viewer walking about ([section 10](../../SPEC.md#10-scripts-and-the-scene-api)). [In the specification](../../SPEC.md#script).

- Holds: nothing.
- May be in: [`head`](#head).

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `src` | address (required) |  | The script: a `.js` or `.mjs` file from the page's own site |

## `scene`

Everything that is shown. [In the specification](../../SPEC.md#scene).

- Holds: [`group`](#group), [`model`](#model), [`light`](#light), [`label`](#label), [`a`](#a), [`animate`](#animate), [`sound`](#sound) (0.2), [`panel`](#panel) (0.2), [`viewpoint`](#viewpoint) (at most one; (0.2) several), [`hud`](#hud) (0.2), [`slider`](#slider) (0.2), [`choice`](#choice) (0.2), [`plan`](#plan) (0.2; at most one), [`water`](#water) (0.2; at most one).
- May be in: [`holoml`](#holoml).

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` (0.2) | id | none | A name, so that `animate` or a script can change the background |
| `background` | colour | the renderer's | The colour behind everything |
| `environment` (0.2) | address | none | A panorama of the surroundings (an HDR, PNG, or JPEG picture, from the page's own site) that lights the scene: shiny and soft materials alike take their light and reflections from it. Without it, the renderer's own soft light. Its brightness follows the ambient lights (see `light`) |
| `sky` (0.2) | address | none | A panorama (an HDR, PNG, or JPEG picture, from the page's own site) drawn behind everything, in place of the background colour: the view out of the windows, or the sky over a field. Its brightness follows the ambient lights, as the surroundings' light does. It may be the same file as `environment` |

## `group`

Places several things together, so they move, turn, and scale as one. [In the specification](../../SPEC.md#group).

- Holds: [`group`](#group), [`model`](#model), [`light`](#light), [`label`](#label), [`a`](#a), [`animate`](#animate), [`sound`](#sound) (0.2), [`panel`](#panel) (0.2).
- May be in: [`scene`](#scene), [`group`](#group), [`a`](#a).

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name, so that `animate` can refer to it |
| `position` | vector | `"0 0 0"` | Where it is, in its parent's space |
| `rotation` | vector | `"0 0 0"` | How it is turned |
| `scale` | scale | `"1"` | How much bigger or smaller |
| `solid` (0.2) | flag | off | The walker cannot pass through any model in it (see "Walls and gravity") |
| `shadows` (0.2) | flag | off | Every model in it casts and receives shadows (see "Shadows") |
| `load` (0.2) | `page` or `near` | `page` | When its models load: with the page, or only while the viewer is near (see "Loading by area") |
| `near` (0.2) | number, more than 0 | `10` | With `load="near"`: how near, in metres, the viewer comes for its models to load |

## `model`

A 3D model from a glTF 2.0 file. [In the specification](../../SPEC.md#model).

- Holds: [`material`](#material).
- May be in: [`scene`](#scene), [`group`](#group), [`a`](#a).

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `src` | address (required) |  | The `.gltf` or `.glb` file |
| `id` | id | none | A name, for `animate` |
| `position` | vector | `"0 0 0"` | Where it is |
| `rotation` | vector | `"0 0 0"` | How it is turned |
| `scale` | scale | `"1"` | How much bigger or smaller |
| `animation` | text | none | The name of one of the model's own glTF animations |
| `autoplay` | flag | off | Play that animation, repeating, from when the scene is shown |
| `solid` (0.2) | flag | off | The walker cannot pass through it (see "Walls and gravity") |
| `shadows` (0.2) | flag | off | It casts and receives shadows (see "Shadows") |
| `stand-in` (0.2) | address | none | A lighter model shown in its place until it has loaded, and again once it is let go (see "Loading by area") |

## `material`

Changes one material inside its parent model, named as in the glTF file (for example the car's `Paint`). [In the specification](../../SPEC.md#material).

- Holds: nothing.
- May be in: [`model`](#model).

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `name` | text (required) |  | The material's name in the glTF file |
| `color` | colour |  | Its base colour |
| `metalness` | number from 0 to 1 |  | 0 is not metal, 1 is metal |
| `roughness` | number from 0 to 1 |  | 0 is mirror-smooth, 1 is fully rough |
| `opacity` | number from 0 to 1 |  | 0 is invisible, 1 is solid |
| `map` (0.2) | address |  | A colour picture (PNG, JPEG, or WebP), such as a fabric's weave |
| `normal-map` (0.2) | address |  | A picture of fine bumps (a tangent-space normal map, as glTF's) |
| `roughness-map` (0.2) | address |  | A picture of how rough each point is (its green channel, as glTF's) |
| `repeat` (0.2) | tiling |  | How many times the pictures tile across the model's own texture coordinates, such as `"3 2"`; default `"1"` |

## `viewpoint`

Where the viewer starts, and how they move. [In the specification](../../SPEC.md#viewpoint).

- Holds: nothing.
- May be in: [`scene`](#scene).

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` (0.2) | id | none | Its name, for the page's address (`#kitchen`) |
| `label` (0.2) | text | its id | Its name in a list of places, such as "Kitchen" |
| `position` | vector | `"0 1.6 5"` | Where the viewer's eyes start |
| `look-at` | vector | `"0 1 0"` | The point they look at |
| `mode` | `orbit` or `walk` | `orbit` | How they move |
| `gravity` (0.2) | flag | off | Walk only: the walker falls, and stands on solid things or on the floor |
| `jump` (0.2) | flag | off | Walk with gravity: the Space key jumps, about 1.2 m up |
| `crosshair` (0.2) | flag | off | A small cross in the middle of the view, for aiming with the keyboard (section 10, `holoml.aim()`) |
| `speed` (0.2) | number, 0.5 to 10 | `2.2` | Walk only: how fast the viewer walks, in metres a second. A renderer's key for running (HyperSpace 3D: Shift) goes faster than this |
| `turn-speed` (0.2) | number, 10 to 720 | `90` | Walk only: how fast the viewer turns, and looks up and down, from the keyboard, in degrees a second |

## `light`

A light. [In the specification](../../SPEC.md#light).

- Holds: nothing.
- May be in: [`scene`](#scene), [`group`](#group).

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `type` | `ambient`, `directional`, `point`, or `spot` (required) |  | The kind of light |
| `id` | id | none | A name |
| `color` | colour | `"#ffffff"` | Its colour |
| `intensity` | number, 0 or more | `1` | How bright |
| `position` | vector | see below | Where it is (not for `ambient`) |
| `look-at` | vector | `"0 0 0"` | Where it points (`directional` and `spot` only) |
| `range` | number, 0 or more | `0` | How far it reaches, in metres; 0 is no limit (`point` and `spot` only) |
| `angle` | number from 0 to 90 | `30` | The angle from the centre of the beam to its edge, in degrees (`spot` only) |
| `shadows` (0.2) | flag | off | It casts shadows (`directional`, `point`, and `spot` only; see "Shadows") |

## `water`

(0.2) A box of water, such as a tank, a pool, or a stretch of sea. [In the specification](../../SPEC.md#water).

- Holds: nothing.
- May be in: [`scene`](#scene).

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `position` | vector | `"0 0 0"` | The middle of the water's floor |
| `size` | three numbers more than 0 (required) |  | Its width (x), height (y), and depth (z), in metres; its top is the surface |
| `color` | colour | `"#1f6f8b"` | The colour that things seen through the water fade into |
| `clarity` | number, more than 0 | `15` | How far one can see through it, in metres |
| `caustics` | flag | off | The moving net of light that the waves on the surface cast on everything below it |

## `label`

Text in the scene. [In the specification](../../SPEC.md#label).

- Holds: text.
- May be in: [`scene`](#scene), [`group`](#group), [`a`](#a).

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name, for `animate` |
| `position` | vector | `"0 0 0"` | Where its centre is |
| `size` | number, more than 0 | `0.2` | The height of a line of text, in metres |
| `color` | colour | the renderer's | The colour of the text |

## `panel`

(0.2) Text of more than one line on a flat board in the scene: an information panel on a wall, a menu on a table. [In the specification](../../SPEC.md#panel).

- Holds: text.
- May be in: [`scene`](#scene), [`group`](#group), [`a`](#a).

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name, for `animate` and scripts |
| `position` | vector | `"0 0 0"` | Where its centre is |
| `rotation` | vector | `"0 0 0"` | How it is turned; unturned, its face looks along z, toward a viewer at a larger z |
| `width` | number, more than 0 | `1` | How wide it is, in metres; its lines wrap to this |
| `size` | number, more than 0 | `0.06` | The height of a line of text, in metres |
| `color` | colour | the renderer's | The colour of the text; by default one that reads well on the board, or on the scene's background without one |
| `background` | colour | none | The colour of the board behind the text; without it, the text alone |

## `a`

A link, as in HTML. [In the specification](../../SPEC.md#a).

- Holds: [`model`](#model), [`group`](#group), [`label`](#label), [`panel`](#panel) (0.2).
- May be in: [`scene`](#scene), [`group`](#group).

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `href` | address (required) |  | Another HoloML page, or any web page |

## `animate`

Changes the position, rotation, or scale of an element over time, starting when the scene is shown; (0.2) also a light's brightness and colour, and the scene's background. [In the specification](../../SPEC.md#animate).

- Holds: nothing.
- May be in: [`scene`](#scene), [`group`](#group).

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `target` | id reference (required) |  | The element to change |
| `attribute` | `position`, `rotation`, or `scale`; (0.2) `intensity`, `color`, or `background` (required) |  | What to change |
| `from` | as `to` | the target's own value | Where to start |
| `to` | a vector for `position`, `rotation`, and `scale`; a number, 0 or more, for `intensity`; a colour for `color` and `background` (required) |  | Where to end |
| `duration` | time (required) |  | How long one run takes |
| `repeat` | a whole number, 1 or more, or `indefinite` | `1` | How many runs |
| `begin` (0.2) | `load` or `click` | `load` | When it runs: when the scene is shown, or each time its trigger is clicked (see "Click actions") |
| `trigger` (0.2) | id reference | its target | With `begin="click"`: the element whose click runs it, a `model`, `group`, `label`, or `panel` |
| `toggle` (0.2) | flag | off | With `begin="click"`: each click runs it forward, and the next back, so that a door opens and closes |
| `label` (0.2) | text | the trigger's id | With `begin="click"`: its name for the keyboard and screen readers, such as "Bedroom door" |

## `sound`

(0.2) A sound from a file, played by a script (section 10) or with `autoplay`. [In the specification](../../SPEC.md#sound).

- Holds: nothing.
- May be in: [`scene`](#scene), [`group`](#group).

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name, for scripts |
| `src` | address (required) |  | The sound: an `.ogg`, `.mp3`, or `.wav` file |
| `loop` | flag | off | Start again at the end, until stopped |
| `autoplay` | flag | off | Play as soon as sounds may play (below) |
| `volume` | number from 0 to 1 | `1` | How loud |
| `position` | vector | none | Where it comes from: with it, the sound comes from that place (below) |
| `range` | number, more than 0 | `20` | With `position`, and needing it: how far the sound reaches, in metres |
| `begin` | `load` or `click` | `load` | With `click`, it plays each time its trigger is clicked (see "Click actions"); such a sound has no `autoplay` |
| `trigger` | id reference | none | With `begin="click"`, and needed then: the element whose click plays it |
| `label` | text | the trigger's id | With `begin="click"`: its name for the keyboard and screen readers |

## `hud`

(0.2) Text fixed to a corner of the screen, in front of the scene: a score, a hint, what the viewer carries. [In the specification](../../SPEC.md#hud).

- Holds: text, which may be empty.
- May be in: [`scene`](#scene).

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name, for scripts |
| `corner` | `top-left`, `top-right`, `bottom-left`, or `bottom-right` | `top-left` | Where on the screen |
| `size` | number, more than 0 | `18` | The height of its text, in CSS pixels |
| `color` | colour | the renderer's | The colour of the text |

## `slider`

(0.2) A number the viewer chooses, with a slider fixed to a corner of the screen, in front of the scene: how fast to walk, how loud, how much. [In the specification](../../SPEC.md#slider).

- Holds: text.
- May be in: [`scene`](#scene).

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name, for scripts |
| `corner` | `top-left`, `top-right`, `bottom-left`, or `bottom-right` | `top-left` | Where on the screen |
| `min` | number | `0` | The smallest value |
| `max` | number, more than `min` | `1` | The largest value |
| `step` | number, more than 0 | a hundredth of the range | The steps between values |
| `value` | number, from `min` to `max` | `min` | The value at the start |

## `choice`

(0.2) A choice in place: options on the screen, fixed to a corner like `hud` and `slider`, that change one of a model's materials, or, without `target` and `material`, a choice for the page's scripts. [In the specification](../../SPEC.md#choice).

- Holds: [`option`](#option) (at least one).
- May be in: [`scene`](#scene).

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name, for scripts |
| `corner` | `top-left`, `top-right`, `bottom-left`, or `bottom-right` | `top-left` | Where on the screen |
| `label` | text | none | Its name on the screen, such as "Fabric" |
| `target` | id reference | none | The `model` whose material it changes (with `material`) |
| `material` | text | none | The name of that material in the model's glTF file (with `target`) |
| `value` | text | the first option's | The value of the option chosen at the start |

## `option`

(0.2) One option of a `choice`. [In the specification](../../SPEC.md#option).

- Holds: text.
- May be in: [`choice`](#choice).

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `value` | text | its label | Its value, for the choice's `value` and for scripts; unique in its choice |
| `color` | colour | the material's | Its base colour |
| `metalness` | number from 0 to 1 | the material's | 0 is not metal, 1 is metal |
| `roughness` | number from 0 to 1 | the material's | 0 is mirror-smooth, 1 is fully rough |
| `opacity` | number from 0 to 1 | the material's | 0 is invisible, 1 is solid |
| `map` | address | the material's | A colour picture |
| `normal-map` | address | the material's | A picture of fine bumps |
| `roughness-map` | address | the material's | A picture of how rough each point is |
| `repeat` | tiling | `"1"` | How many times the pictures tile |

## `plan`

(0.2) A floor plan fixed to a corner of the screen, like `hud`, with a marker for where the viewer is and which way they face. [In the specification](../../SPEC.md#plan).

- Holds: nothing.
- May be in: [`scene`](#scene).

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name, for scripts |
| `corner` | `top-left`, `top-right`, `bottom-left`, or `bottom-right` | `top-right` | Where on the screen |
| `src` | address (required) |  | The picture: a PNG, JPEG, or WebP file from the page's own site |
| `area` | area (required) |  | The rectangle of the ground the picture shows |
| `width` | number, more than 0 | `200` | How wide it is on the screen, in CSS pixels; its height follows the picture |
| `label` | text | `"Floor plan"` | Its name for screen readers |
