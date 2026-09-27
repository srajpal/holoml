# HoloML 0.1, and 0.2 (draft)

HoloML is a small markup language for 3D web pages. A HoloML page
describes a scene: 3D models, where the viewer starts, lights, text
labels, links, and simple animation. It is written like HTML, by hand if
you like, and read by a HoloML-aware browser, which shows the scene as a
space you can orbit or walk around.

Status: version 0.1, the first version (2026-09-26), is final. Version
0.2 is a draft (from 2026-09-27): it adds scripts, sound, text on the
screen, walls and gravity for walking, and the animation of lights and
the background. It grows with the example sites of the HyperSpace 3D
browser (milestones 17 to 21 of its roadmap) and is finished when they
are. What 0.2 adds is marked "(0.2)"; a page uses it by saying
`version="0.2"` (section 9). The first renderer is the HyperSpace 3D
browser (milestone 14 of its roadmap). This text is licensed under CC BY
4.0 (LICENSE-SPEC); the code in this repository is under Apache 2.0.

In this document, "must" and "must not" are requirements; "should" is a
strong recommendation. A reader is any program that reads HoloML (a
browser, a checker, an editor); a renderer is a reader that shows it.

## 1. A first page

```
<holoml version="0.1">
  <head>
    <title>Showroom</title>
  </head>
  <scene background="#0b0f1e">
    <viewpoint position="0 1.6 6" look-at="0 0.8 0" mode="orbit" />
    <light type="ambient" intensity="0.4" />
    <light type="directional" position="4 8 5" intensity="1.2" />
    <a href="coupe.holoml">
      <model id="coupe" src="models/coupe.glb" rotation="0 30 0">
        <material name="Paint" color="#c0182a" metalness="0.8" roughness="0.3" />
      </model>
    </a>
    <label position="0 2.1 0">The coupe: click to walk around it</label>
    <animate target="#coupe" attribute="rotation" to="0 390 0" duration="20s" repeat="indefinite" />
  </scene>
</holoml>
```

The viewer starts 6 metres in front of a car and can orbit around it.
The car turns slowly, its paint is red, a label floats above it, and
clicking it opens another page.

## 2. Files

- File extension: `.holoml`.
- Encoding: UTF-8. A byte order mark at the start is allowed and
  ignored.
- Media type, when served over the web: `model/vnd.holoml`. (It is in
  the same family as X3D's `model/x3d+xml`, and is not registered yet.)
- 3D models are glTF 2.0 files (`.gltf` or `.glb`), the Khronos Group's
  open format.
- (0.2) Scripts are JavaScript modules (`.js` or `.mjs`), and sounds are
  Ogg (`.ogg`), MP3 (`.mp3`), or WAV (`.wav`) files.

## 3. Syntax

HoloML looks like HTML but is strict: a reader stops at the first
mistake and reports it with its line and column, instead of guessing
what was meant.

- A document has exactly one root element. Comments and whitespace may
  come before and after it; nothing else may.
- An element is written `<name attributes>content</name>`, or
  `<name attributes />` when it has no content. Every element must be
  closed; an end tag must match the element it closes.
- Names of elements and attributes use lower-case letters, digits, and
  `-`, and start with a letter. `<Scene>` is an error, not `<scene>`.
- Attribute values are in double or single quotes: `size="0.2"` or
  `size='0.2'`. A value must not contain `<`; write `&lt;`.
- A flag attribute is written alone, with no value: `autoplay`.
- An attribute must not be given twice on one element, and attributes
  are separated from the name and from each other by whitespace.
- Text is anything between tags. Text that is only whitespace is
  ignored. In `title` and `label`, runs of whitespace show as one space,
  and whitespace at the start and end is dropped, as in HTML. (0.2) In
  `hud`, each line of text is a line on the screen: within a line, runs
  of whitespace show as one space; empty lines are not shown.
- Character references: `&amp;` (&), `&lt;` (<), `&gt;` (>), `&quot;`
  ("), `&apos;` ('), and numbers such as `&#233;` or `&#xE9;` (é). An `&`
  that does not start one of these is an error; write `&amp;`.
- Comments are written `<!-- ... -->` and must not contain `--`. They
  may appear between elements, not inside a tag.
- Not part of HoloML: `<!doctype>`, `<?...?>`, and CDATA sections. The
  null character is not allowed anywhere, comments included.
- Elements may be nested at most 256 deep, the root included. A reader
  must stop a deeper document with `too-deep`, rather than fail in some
  other way.
- Lines may end with `\n`, `\r\n`, or `\r`. Columns count UTF-16 code
  units, as most editors do.

### Syntax errors

A reader must stop at the first syntax error and report its code and
place. The codes:

| Code | Meaning |
|---|---|
| `no-root` | The document has no root element |
| `text-outside-root` | Text before or after the root element |
| `second-root` | A second root element |
| `unexpected-end` | A tag is not finished before the end of the text |
| `invalid-name` | A name was expected (for example `< scene>`) |
| `uppercase-name` | A name uses upper-case letters |
| `unquoted-value` | An attribute value without quotes |
| `unclosed-value` | An attribute value whose closing quote is missing |
| `duplicate-attribute` | An attribute given twice on one element |
| `missing-space` | Two attributes with no space between them |
| `stray-slash` | A `/` in a tag that is not followed by `>` |
| `unclosed-element` | An element still open at the end of the text |
| `mismatched-end-tag` | An end tag that does not match the open element |
| `stray-end-tag` | An end tag with no element open |
| `bad-character-reference` | An `&` that is not a known character reference |
| `unclosed-comment` | A comment with no `-->` |
| `bad-comment` | A comment that contains `--` |
| `unsupported-markup` | `<!...>` or `<?...?>` other than a comment |
| `less-than-in-value` | A `<` inside an attribute value |
| `null-character` | The null character |
| `too-deep` | An element nested more than 256 deep |

## 4. Space, units, and values

- Distances are in metres, angles in degrees, and times in seconds or
  milliseconds.
- Space is right-handed with y up, as in glTF: x to the right, y up, and
  z toward the viewer's starting side. The floor is y = 0.
- Every element with a place (`group`, `model`, `label`, and a light's
  position) is placed in its parent's space: position, then rotation,
  then scale, as in glTF.
- A rotation `"x y z"` is three angles about the x, y, and z axes,
  combined in that order, as CSS's `rotateX() rotateY() rotateZ()` and
  Three.js's default order. Turning a model to face another way is
  usually just the middle number: `rotation="0 90 0"`.

Kinds of value used below:

| Kind | Written as | Examples |
|---|---|---|
| number | a decimal number, optionally with an exponent | `0.4`, `-2`, `.5`, `1e3` |
| vector | three numbers separated by whitespace | `"0 1.6 6"` |
| scale | one number (the same on every axis) or three | `"1.2"`, `"1 2 1"` |
| colour | `#` and 3 or 6 hexadecimal digits | `"#fff"`, `"#c0182a"` |
| time | a positive number followed by `s` or `ms` | `"20s"`, `"500ms"` |
| id | a letter, then letters, digits, `-`, or `_` | `"coupe"` |
| id reference | `#` and an id in the same document | `"#coupe"` |
| address | a relative address, or an `http:` or `https:` address, with no spaces | `"models/coupe.glb"`, `"game.js"` |
| flag | the attribute's name alone | `autoplay` |

Numbers must be finite: one too large to represent (such as `1e999`)
is a `bad-value`, and so is a count of repeats too large to count
exactly. Spaces around a number, a vector, a colour, a time, or an
address are ignored; an id, an id reference, a choice (such as a light's
`type`), and the version are written exactly, and spaces around them
are a `bad-value`.

Relative addresses are resolved against the page's own address, as in
HTML. Other schemes (`javascript:`, `data:`, `file:`, and so on) are not
allowed.

## 5. Elements

### `holoml`

The root element. It holds an optional `head`, then one `scene`.

```
<holoml version="0.1">
  <scene />
</holoml>
```

| Attribute | Value | Meaning |
|---|---|---|
| `version` | `"0.1"` or `"0.2"` (required) | The HoloML version the page is written for (section 9) |

### `head`

Information about the page. Holds at most one `title`, any number of
`meta`, and (0.2) any number of `script`. It has no attributes.

```
<head>
  <title>A showroom</title>
  <meta name="description" content="Three cars you can walk around." />
</head>
```

### `title`

The page's title, shown in the browser's tab and history. Holds text
only.

```
<title>A showroom</title>
```

### `meta`

A named piece of information about the page, as in HTML. Holds nothing.

| Attribute | Value | Meaning |
|---|---|---|
| `name` | text (required) | What it is, for example `description` or `author` |
| `content` | text (required) | Its value |

```
<meta name="author" content="The HoloML Authors" />
```

### `script`

(0.2) A JavaScript module that makes the page react: to clicks and keys,
to time passing, to the viewer walking about (section 10). Only in
`head`; holds nothing, as the script is always a file of its own. A
renderer runs the page's scripts in document order after it has built
the scene, and only from the page's own site.

| Attribute | Value | Meaning |
|---|---|---|
| `src` | address (required) | The script: a `.js` or `.mjs` file from the page's own site |

```
<head>
  <title>Blockworld</title>
  <script src="game.js" />
</head>
```

### `scene`

Everything that is shown. Holds `group`, `model`, `light`, `label`, `a`,
`animate`, and (0.2) `sound` and `hud`, in any order and number, and at
most one `viewpoint`.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | (0.2) A name, so that `animate` or a script can change the background |
| `background` | colour | the renderer's | The colour behind everything |

```
<scene background="#0b0f1e">
  <model src="models/coupe.glb" />
</scene>
```

### `group`

Places several things together, so they move, turn, and scale as one.
Holds the same elements as `scene`, except `viewpoint` and `hud`.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name, so that `animate` can refer to it |
| `position` | vector | `"0 0 0"` | Where it is, in its parent's space |
| `rotation` | vector | `"0 0 0"` | How it is turned |
| `scale` | scale | `"1"` | How much bigger or smaller |
| `solid` | flag | off | (0.2) The walker cannot pass through any model in it (see "Walls and gravity") |

```
<group id="stand" position="0 0.5 0" rotation="0 45 0">
  <model src="models/stand.glb" />
  <label position="0 2 0">The stand</label>
</group>
```

### `model`

A 3D model from a glTF 2.0 file. Holds any number of `material`.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `src` | address (required) | | The `.gltf` or `.glb` file |
| `id` | id | none | A name, for `animate` |
| `position` | vector | `"0 0 0"` | Where it is |
| `rotation` | vector | `"0 0 0"` | How it is turned |
| `scale` | scale | `"1"` | How much bigger or smaller |
| `animation` | text | none | The name of one of the model's own glTF animations |
| `autoplay` | flag | off | Play that animation, repeating, from when the scene is shown |
| `solid` | flag | off | (0.2) The walker cannot pass through it (see "Walls and gravity") |

With `animation` and no `autoplay`, the model is shown in the first
frame of that animation (a pose). A renderer that cannot load the file
shows the rest of the scene, and should mark where the model would be.

```
<model src="models/robot.glb" animation="Wave" autoplay />
```

### `material`

Changes one material inside its parent model, named as in the glTF file
(for example the car's `Paint`). Only the attributes given change. Holds
nothing.

| Attribute | Value | Meaning |
|---|---|---|
| `name` | text (required) | The material's name in the glTF file |
| `color` | colour | Its base colour |
| `metalness` | number from 0 to 1 | 0 is not metal, 1 is metal |
| `roughness` | number from 0 to 1 | 0 is mirror-smooth, 1 is fully rough |
| `opacity` | number from 0 to 1 | 0 is invisible, 1 is solid |

A name that matches no material in the model changes nothing.

```
<model src="models/coupe.glb">
  <material name="Paint" color="#c0182a" metalness="0.8" roughness="0.3" />
  <material name="Glass" opacity="0.25" />
</model>
```

### `viewpoint`

Where the viewer starts, and how they move. At most one, directly in
`scene`. Holds nothing.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `position` | vector | `"0 1.6 5"` | Where the viewer's eyes start |
| `look-at` | vector | `"0 1 0"` | The point they look at |
| `mode` | `orbit` or `walk` | `orbit` | How they move |
| `gravity` | flag | off | (0.2) Walk only: the walker falls, and stands on solid things or on the floor |
| `jump` | flag | off | (0.2) Walk with gravity: the Space key jumps, about 1.2 m up |
| `crosshair` | flag | off | (0.2) A small cross in the middle of the view, for aiming with the keyboard (section 10, `holoml.aim()`) |

- `orbit`: the viewer circles the `look-at` point: drag to go around it,
  scroll or pinch to come closer or move away.
- `walk`: the viewer walks on the floor at the height of `position`:
  the arrow keys or W, A, S, D to move, drag to look around.

Renderers should also offer keyboard and touch equivalents.

```
<viewpoint position="0 1.6 6" look-at="0 0.8 0" mode="orbit" />
<viewpoint position="0 12 4" look-at="0 10 0" mode="walk" gravity jump crosshair />
```

### Walls and gravity

(0.2) The walker is a body 0.6 m wide and 1.8 m tall, with its eyes
1.6 m above its feet; `position` is where the eyes start. It cannot move
into a model marked `solid`, or a model in a group marked `solid`: each
such model stops it at its bounding box (the smallest box, lined up with
x, y, and z, that holds it). A walker that starts inside a solid model
can walk out of it.

Without `gravity`, the eyes stay at the starting height, as in 0.1, and
solid models still stop the walker. With `gravity`, the walker falls
(9.8 m/s²) until it stands on a solid model or on the floor (y = 0), and
climbs onto things only by jumping (with `jump`).

```
<viewpoint position="0 1.6 8" mode="walk" gravity jump />
<group solid>
  <model src="models/wall.glb" position="0 0 -4" />
  <model src="models/crate.glb" position="2 0 0" />
</group>
```

### `light`

A light. Holds nothing. If a scene has no light, a renderer should light
it softly so that models are still visible.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `type` | `ambient`, `directional`, `point`, or `spot` (required) | | The kind of light |
| `id` | id | none | A name |
| `color` | colour | `"#ffffff"` | Its colour |
| `intensity` | number, 0 or more | `1` | How bright |
| `position` | vector | see below | Where it is (not for `ambient`) |
| `look-at` | vector | `"0 0 0"` | Where it points (`directional` and `spot` only) |
| `range` | number, 0 or more | `0` | How far it reaches, in metres; 0 is no limit (`point` and `spot` only) |
| `angle` | number from 0 to 90 | `30` | The angle from the centre of the beam to its edge, in degrees (`spot` only) |

- `ambient` light lights everything evenly, from everywhere.
- `directional` light comes from far away in one direction, like the
  sun: from `position` (default `"0 10 10"`) toward `look-at`.
- `point` light shines in every direction from `position` (default
  `"0 3 0"`), like a bulb.
- `spot` light shines a cone from `position` (default `"0 3 0"`) toward
  `look-at`.

```
<light type="ambient" intensity="0.4" />
<light type="spot" position="0 5 0" look-at="0 0 0" angle="30" range="10" />
```

### `label`

Text in the scene. It always faces the viewer. Holds text only.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name, for `animate` |
| `position` | vector | `"0 0 0"` | Where its centre is |
| `size` | number, more than 0 | `0.2` | The height of a line of text, in metres |
| `color` | colour | the renderer's | The colour of the text |

```
<label position="0 2.1 0" size="0.15">From $32,000</label>
```

### `a`

A link, as in HTML. Everything inside it (models, groups, labels) opens
the address when clicked or tapped, or when the viewer moves to it with
the keyboard and presses Enter. Holds `model`, `group`, and `label`. A
link must not be inside another link.

| Attribute | Value | Meaning |
|---|---|---|
| `href` | address (required) | Another HoloML page, or any web page |

A renderer should show which things are links, for example by the
pointer and a highlight.

```
<a href="coupe.holoml">
  <model src="models/coupe.glb" />
</a>
```

### `animate`

Changes the position, rotation, or scale of an element over time,
starting when the scene is shown; (0.2) also a light's brightness and
colour, and the scene's background. Holds nothing. It may stand in
`scene` or in `group`.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `target` | id reference (required) | | The element to change |
| `attribute` | `position`, `rotation`, or `scale`; (0.2) `intensity`, `color`, or `background` (required) | | What to change |
| `from` | as `to` | the target's own value | Where to start |
| `to` | a vector for `position`, `rotation`, and `scale`; a number, 0 or more, for `intensity`; a colour for `color` and `background` (required) | | Where to end |
| `duration` | time (required) | | How long one run takes |
| `repeat` | a whole number, 1 or more, or `indefinite` | `1` | How many runs |

- The change is even over the duration; a colour changes its red,
  green, and blue evenly. Each repeat starts again at `from`; after the
  last one, the value stays at `to`.
- `position` can be animated on a `model`, `group`, or `label`, and
  (0.2) on a light that has a position; `rotation` and `scale` on a
  `model` or `group`; (0.2) `intensity` and `color` on a `light`, and
  `background` on the `scene` (give it an `id`).
- A turntable is a rotation from `0 0 0` to `0 360 0`, repeated
  indefinitely: the end and the start look the same, so it turns
  without a jump.
- If two `animate` elements change the same attribute of the same
  element, the later one in the document wins.

```
<animate target="#coupe" attribute="rotation" from="0 0 0" to="0 360 0" duration="20s" repeat="indefinite" />
<animate target="#sun" attribute="intensity" from="1.2" to="0.1" duration="60s" />
<animate target="#world" attribute="background" to="#0b1030" duration="60s" />
```

### `sound`

(0.2) A sound from a file, played by a script (section 10) or with
`autoplay`. It may stand in `scene` or in `group`; holds nothing.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name, for scripts |
| `src` | address (required) | | The sound: an `.ogg`, `.mp3`, or `.wav` file |
| `loop` | flag | off | Start again at the end, until stopped |
| `autoplay` | flag | off | Play as soon as sounds may play (below) |
| `volume` | number from 0 to 1 | `1` | How loud |

A renderer must not play any sound before the viewer's first click,
tap, or key on the page: web pages may not start sounds on their own,
and neither may HoloML pages. `autoplay` sounds start then. In 0.2 a
sound's place in the scene does not change how it sounds.

```
<sound id="birds" src="sounds/birds.ogg" loop autoplay volume="0.4" />
<sound id="pop" src="sounds/pop.wav" />
```

### `hud`

(0.2) Text fixed to a corner of the screen, in front of the scene: a
score, a hint, what the viewer carries. Holds text: each line of it is
a line on the screen. The text may be empty, for a script to fill in.
Only directly in `scene`. A renderer should let screen readers read it
and show it in any text-only view of the page.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name, for scripts |
| `corner` | `top-left`, `top-right`, `bottom-left`, or `bottom-right` | `top-left` | Where on the screen |
| `size` | number, more than 0 | `18` | The height of its text, in CSS pixels |
| `color` | colour | the renderer's | The colour of the text |

```
<hud id="score" corner="top-right">Gems: 0 of 5</hud>
<hud corner="bottom-left">
  Click a block to break it
  Right-click to place one
</hud>
```

## 6. Checking

A document that follows the syntax may still break the rules above. A
checker reports each problem with its place, and a renderer should show
the rest of the scene as well as it can. A page is checked against the
version it declares: an element or attribute from a later version is
reported as unknown (`unknown-element`, `unknown-attribute`), and a
value from a later version (such as an `animate` of `intensity` in a 0.1
page) as a `bad-value`. The problem codes:

| Code | Meaning |
|---|---|
| `wrong-root` | The root element is not `holoml` |
| `unsupported-version` | The `version` is not one the reader knows |
| `unknown-element` | An element that is not in the page's HoloML version |
| `child-not-allowed` | An element where it may not stand |
| `text-not-allowed` | Text outside `title`, `label`, and `hud` |
| `empty-text` | A `title` or `label` with no text |
| `too-many` | A second `head`, `scene`, `title`, or `viewpoint` |
| `missing-child` | `holoml` without a `scene` |
| `wrong-order` | `head` after `scene` |
| `unknown-attribute` | An attribute the element does not have |
| `missing-attribute` | A required attribute is missing |
| `bad-value` | A value of the wrong kind, or out of range |
| `attribute-not-for-type` | A light attribute its type does not use |
| `duplicate-id` | Two elements with the same id |
| `unknown-target` | An `animate` target no element has |
| `bad-target` | An attribute that cannot be animated on that element |
| `nested-link` | A link inside another link |
| `unsafe-link` | An address with a scheme other than http or https |

## 7. Safety

HoloML 0.1 has no scripts. Pages can only load glTF models and link to
other pages, over http or https or by relative address. A renderer
should load models only from the page's own site or from sites it
permits, apply the same privacy protection as for other pages, and never
let a page read anything from the viewer's computer.

(0.2) Scripts and sounds come from the page's own site only; a page
cannot hold a script's code in the markup. A renderer runs a page's
scripts as a web browser runs a web page's: in the page's own sandbox,
with nothing more than a web page may do, and so that a script that
never stops cannot stop the renderer itself (the viewer can still leave
or close the page). No sound plays before the viewer's first click,
tap, or key on the page. Elements a script adds, and sound files, count
toward the renderer's limits like the page's own.

A renderer may set limits on what one page can use, so that a heavy or
hostile page cannot exhaust the viewer's memory or freeze the renderer:
for example the size of the page's text, the number of elements, the
number and size of model files, the size of pictures inside models, and
the number of triangles. When a page goes past a limit, the renderer
should show as much of the scene as it can, leave out what crossed the
limit, and tell the viewer what was left out and why. Such limits are
the renderer's choice, not part of the language: a valid page stays
valid whatever a renderer's limits are.

For example, HyperSol HyperSpace 3D allows per page 2 MB of text,
10,000 elements, 64 model files (a file used by many models is loaded
once), 32 MB for one model or sound file and 128 MB for all of them,
pictures up to 4096 by 4096 pixels, 2 million triangles in all, and 30
seconds for a file to load.

## 8. Conformance

The repository's `conformance/` folder holds sample documents that pin
down this specification. Any reader can use them:

- `valid/`: documents that are correct. Each `.expected.json` gives the
  tree a reader must produce (every element with its name, its
  attributes with their values, its text, and the line and column where
  each starts), and an empty list of problems.
- `syntax-errors/`: documents that break the syntax. Each
  `.expected.json` gives the error code, line, and column.
- `problems/`: documents with correct syntax that break the rules. Each
  `.expected.json` gives every problem's code, line, and column, in
  document order.

Every element and attribute in this specification appears in at least
one valid sample. Samples for what 0.2 adds say `version="0.2"`; every
0.1 sample gives the same result as before.

## 9. Versions

The `version` attribute names the HoloML version a page is written for.
A reader must refuse a version it does not know, rather than guess:
a reader that knows only 0.1 refuses a 0.2 page with
`unsupported-version`.

- 0.1 (2026-09-26): models, groups, lights, labels, links, materials,
  animation of position, rotation, and scale, orbit and walk.
- 0.2 (draft, from 2026-09-27): scripts and the scene API (section 10),
  `sound`, `hud`, walls and gravity (`solid`, `gravity`, `jump`), a
  crosshair, and the animation of a light's position, brightness, and
  colour, and of the background. Everything in 0.1 means the same in a
  0.2 page. Still to come in 0.2, as the example sites need them:
  changing a material in place without a new page, shadows, text of
  more than one line in the scene, movement along paths, sounds that
  come from a place, and a sky.

Ideas for later versions: physics, named colours, styles shared between
elements, and spaces shared by several people.

## 10. Scripts and the scene API

(0.2) A page's scripts (`script` in `head`) are JavaScript modules from
the page's own site. They may import other modules from that site. A
renderer runs them after it has built the scene from the page, in
document order, and gives them one object, `holoml`, to read and change
the scene. Everything else is ordinary web JavaScript: timers, and
`fetch` from the page's own site; nothing that a renderer would not
allow a web page.

```
// sign.js
const sign = holoml.find('sign');
holoml.on('click', (e) => {
  if (e.thing?.id === 'lamp') {
    const lamp = holoml.find('lamp-light');
    lamp.intensity = lamp.intensity > 0 ? 0 : 1.5;
    sign.text = lamp.intensity > 0 ? 'The lamp is on' : 'The lamp is off';
  }
});
```

### The `holoml` object

| Member | What it is |
|---|---|
| `holoml.version` | The version the page declares, such as `"0.2"` |
| `holoml.ready` | A promise, kept when every model and sound has loaded or been left out |
| `holoml.find(id)` | The element with this id, as a thing (below), or `null` |
| `holoml.add(markup, parent)` | Adds elements written in HoloML (what a `scene` or `group` may hold: `group`, `model`, `light`, `label`, `sound`) to the scene, or into the group thing `parent`. Returns the new things. The markup is checked like the page's: an element with a problem is left out, and the console says why |
| `holoml.remove(thing)` | Removes an element and everything in it |
| `holoml.on(type, listener)` | Calls `listener` with each event of that type (below). Returns a function that stops it |
| `holoml.aim()` | What is in the middle of the view, under the crosshair: `{ thing, point, normal }` as for a click, or `null` |
| `holoml.viewer` | The viewer: `position` (can be set, to move them), `direction` (a vector of length 1), and `lookAt(point)` |
| `holoml.background` | The scene's background colour; can be set |
| `holoml.reducedMotion` | `true` when the viewer asked for reduced motion; keep still what would only move for effect |

Vectors are arrays of three numbers, `[x, y, z]`: metres for positions
and degrees for rotations, in the parent's space, as in the markup.

### Things

`holoml.find` and `holoml.add` give things: handles on elements. A
member a thing's kind does not have is `undefined`, and setting it does
nothing. After a thing is removed, setting its members does nothing.

| Member | Kinds | What it is |
|---|---|---|
| `id` | all | Its id, or `null` |
| `kind` | all | `"model"`, `"group"`, `"light"`, `"label"`, `"sound"`, or `"hud"` |
| `parent` | all | The group thing it is in, or `null` |
| `position` | model, group, label, light | Where it is; can be set |
| `rotation`, `scale` | model, group | How it is turned, and how big; can be set |
| `visible` | model, group, label | Whether it is shown; can be set |
| `solid` | model, group | Whether the walker is stopped by it; can be set |
| `text` | label, hud | Its words (for a `hud`, lines separated by `"\n"`); can be set |
| `color` | light, label, hud | Its colour, as `"#rrggbb"`; can be set |
| `intensity` | light | How bright; can be set |
| `material(name, change)` | model | Changes one of the model's materials; `change` may have `color`, `metalness`, `roughness`, and `opacity`, as `material` has |
| `play()`, `stop()`, `playing` | sound | Plays from the start; stops; whether it plays. Before sounds may play (section 5, `sound`), `play()` does nothing |
| `volume` | sound | How loud, from 0 to 1; can be set, also while it plays |
| `remove()` | all | As `holoml.remove(thing)` |

### Events

| Type | When | What the event holds |
|---|---|---|
| `click` | The viewer clicks or taps a point of the scene (not a drag), with any button | `thing` (the innermost element with a place that was hit, or `null`), `point` and `normal` (where it was hit, and which way the face hit is facing, or `null`), and `button` (`"left"`, `"right"`, or `"middle"`). A right-click goes to the page instead of opening the renderer's menu while a script listens for clicks. A click on a link still follows it |
| `key` | A key goes down or up while the page has the keyboard | `key` (the key, as a web page's `KeyboardEvent.key`: `"e"`, `"1"`, `" "`) and `down` (`true` or `false`). The renderer's own keys (walking, turning) still work |
| `frame` | Before each frame is drawn | `time` (milliseconds since the scene was shown) and `dt` (milliseconds since the last frame). While a script listens for frames, the renderer keeps drawing |

The keyboard can do whatever the mouse does: with a crosshair, a script
uses `holoml.aim()` to act on what is in the middle of the view when a
key is pressed.

### Limits

Things a script adds count toward the renderer's limits (section 7):
when one is reached, `holoml.add` leaves out what crossed it, returns
the things it did add, and the console says why. Elements a script
adds are not part of the page's text, so a renderer's outline of the
scene lists only those with an `id`.

