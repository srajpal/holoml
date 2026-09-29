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
| tiling | (0.2) one number more than 0 (the same both ways) or two | `"3"`, `"3 2"` |
| area | (0.2) four numbers, x0 z0 x1 z1, with x1 more than x0 and z1 more than z0: a rectangle of the ground, in metres | `"-6 -4 6 4"` |

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
`animate`, and (0.2) `sound`, `panel`, `hud`, `slider`, and `choice`, in
any order and number, at most one `viewpoint` ((0.2) several, as places;
see `viewpoint`), and (0.2) at most one `plan`.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | (0.2) A name, so that `animate` or a script can change the background |
| `background` | colour | the renderer's | The colour behind everything |
| `environment` | address | none | (0.2) A panorama of the surroundings (an HDR, PNG, or JPEG picture, from the page's own site) that lights the scene: shiny and soft materials alike take their light and reflections from it. Without it, the renderer's own soft light. Its brightness follows the ambient lights (see `light`) |
| `sky` | address | none | (0.2) A panorama (an HDR, PNG, or JPEG picture, from the page's own site) drawn behind everything, in place of the background colour: the view out of the windows, or the sky over a field. Its brightness follows the ambient lights, as the surroundings' light does. It may be the same file as `environment` |

```
<scene background="#0b0f1e">
  <model src="models/coupe.glb" />
</scene>
<scene background="#f4efe6" environment="light/studio.hdr">
  <model src="models/sofa.glb" />
</scene>
<scene sky="light/harbour.jpg" environment="light/harbour.hdr">
  <model src="models/loft.glb" />
</scene>
```

### `group`

Places several things together, so they move, turn, and scale as one.
Holds the same elements as `scene`, except `viewpoint`, `hud`, `slider`,
`choice`, and `plan`.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name, so that `animate` can refer to it |
| `position` | vector | `"0 0 0"` | Where it is, in its parent's space |
| `rotation` | vector | `"0 0 0"` | How it is turned |
| `scale` | scale | `"1"` | How much bigger or smaller |
| `solid` | flag | off | (0.2) The walker cannot pass through any model in it (see "Walls and gravity") |
| `shadows` | flag | off | (0.2) Every model in it casts and receives shadows (see "Shadows") |
| `load` | `page` or `near` | `page` | (0.2) When its models load: with the page, or only while the viewer is near (see "Loading by area") |
| `near` | number, more than 0 | `10` | (0.2) With `load="near"`: how near, in metres, the viewer comes for its models to load |

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
| `shadows` | flag | off | (0.2) It casts and receives shadows (see "Shadows") |
| `stand-in` | address | none | (0.2) A lighter model shown in its place until it has loaded, and again once it is let go (see "Loading by area") |

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
| `map` | address | (0.2) A colour picture (PNG, JPEG, or WebP), such as a fabric's weave |
| `normal-map` | address | (0.2) A picture of fine bumps (a tangent-space normal map, as glTF's) |
| `roughness-map` | address | (0.2) A picture of how rough each point is (its green channel, as glTF's) |
| `repeat` | tiling | (0.2) How many times the pictures tile across the model's own texture coordinates, such as `"3 2"`; default `"1"` |

A name that matches no material in the model changes nothing. (0.2)
Pictures come from the page's own site, like models, and count toward
the renderer's limits; `color` multiplies the colour picture. A picture
given here takes the place of the model's own.

```
<model src="models/coupe.glb">
  <material name="Paint" color="#c0182a" metalness="0.8" roughness="0.3" />
  <material name="Glass" opacity="0.25" />
</model>
<model src="models/sofa.glb">
  <material name="Fabric" map="textures/linen.jpg" normal-map="textures/linen-normal.jpg" repeat="4 3" />
</model>
```

### `viewpoint`

Where the viewer starts, and how they move. Directly in `scene`; holds
nothing. In 0.1 a scene has at most one.

(0.2) A scene may have several: places the viewer can go. Each then
has an `id`, and the page's address can name one after `#`
(`loft.holoml#kitchen`): the viewer starts there, and at the first
viewpoint when the address names none, or one the page does not have.
The viewpoint the viewer starts at says how they move (`mode`,
`gravity`, `jump`, `crosshair`, and the speeds); the others are places,
with a position and a direction to look. A renderer lets the viewer go
to each place, for example from a list that the keyboard and screen
readers reach, named by `label`, and goes to the place that a link to
`#name` on the same page names.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | (0.2) Its name, for the page's address (`#kitchen`) |
| `label` | text | its id | (0.2) Its name in a list of places, such as "Kitchen" |
| `position` | vector | `"0 1.6 5"` | Where the viewer's eyes start |
| `look-at` | vector | `"0 1 0"` | The point they look at |
| `mode` | `orbit` or `walk` | `orbit` | How they move |
| `gravity` | flag | off | (0.2) Walk only: the walker falls, and stands on solid things or on the floor |
| `jump` | flag | off | (0.2) Walk with gravity: the Space key jumps, about 1.2 m up |
| `crosshair` | flag | off | (0.2) A small cross in the middle of the view, for aiming with the keyboard (section 10, `holoml.aim()`) |
| `speed` | number, 0.5 to 10 | `2.2` | (0.2) Walk only: how fast the viewer walks, in metres a second. A renderer's key for running (HyperSpace 3D: Shift) goes faster than this |
| `turn-speed` | number, 10 to 720 | `90` | (0.2) Walk only: how fast the viewer turns, and looks up and down, from the keyboard, in degrees a second |

- `orbit`: the viewer circles the `look-at` point: drag to go around it,
  scroll or pinch to come closer or move away.
- `walk`: the viewer walks on the floor at the height of `position`:
  the arrow keys or W, A, S, D to move, drag to look around. A script
  can change the speeds while the page is open (`holoml.viewer.speed`
  and `turnSpeed`, section 10).

Renderers should also offer keyboard and touch equivalents, including
turning and looking up and down from the keyboard, so that a page with
a `crosshair` can be used without a mouse.

```
<viewpoint position="0 1.6 6" look-at="0 0.8 0" mode="orbit" />
<viewpoint position="0 12 4" look-at="0 10 0" mode="walk" gravity jump crosshair />
<viewpoint position="0 1.6 8" mode="walk" speed="4.3" turn-speed="120" />
<viewpoint id="hall" label="Hall" position="0 1.6 4" look-at="0 1.5 0" mode="walk" gravity />
<viewpoint id="kitchen" label="Kitchen" position="3 1.6 1" look-at="3 1.5 -2" />
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
| `shadows` | flag | off | (0.2) It casts shadows (`directional`, `point`, and `spot` only; see "Shadows") |

- `ambient` light lights everything evenly, from everywhere.
- `directional` light comes from far away in one direction, like the
  sun: from `position` (default `"0 10 10"`) toward `look-at`.
- `point` light shines in every direction from `position` (default
  `"0 3 0"`), like a bulb.
- `spot` light shines a cone from `position` (default `"0 3 0"`) toward
  `look-at`.
- (0.2) The light from the surroundings (the scene's `environment`, or
  the renderer's own soft light without it) dims with the page's
  ambient lights: when their intensities add up to less than 0.6, it is
  that much dimmer (at 0.3, half as bright), so a page makes evening or
  night by dimming its ambient lights. Without ambient lights it is at
  full.

```
<light type="ambient" intensity="0.4" />
<light type="spot" position="0 5 0" look-at="0 0 0" angle="30" range="10" />
```

### Shadows

(0.2) A light marked `shadows` casts shadows from the models marked
`shadows` (on the model, or on a group around it) onto the models
marked `shadows`: a marked model both casts and receives them. A
renderer chooses how soft and how detailed shadows are, and may leave
them out when it must (for example on a machine that draws in software,
or at its limits), saying so where the page's author can see it (such
as the console). Nothing else depends on them: a page means the same
without its shadows.

```
<light type="directional" position="3 6 4" look-at="0 0 0" shadows />
<group shadows>
  <model src="models/floor.glb" />
  <model src="models/sofa.glb" />
</group>
```

### Loading by area

(0.2) A large scene can load its models where the viewer goes. A
`group` with `load="near"` loads its models, and their pictures, only
while the viewer's eyes are within `near` metres (10 by default) of the
group's place (its position in the scene), and lets them go when the
viewer is farther than half as much again (15 metres by default), so
that walking along the edge does not load them and let them go again
and again. A group within reach of where the viewer starts loads with
the page, and the page is ready (section 10, `holoml.ready`) once those
have loaded; one farther away loads when the viewer comes near. A model
in several such groups loads while the viewer is near every one of
them.

A group's models count toward a renderer's limits (section 7) only
while they are loaded: a renderer releases them when it lets them go,
and may wait to load a group that would pass a limit until others are
let go. A script can tell whether a group's models are in (`loaded`)
and hear them come and go (the `load` event, section 10).

A model's `stand-in` is a lighter model from the page's own site, such
as a copy with fewer triangles and smaller pictures: it is shown in the
model's place, turned and sized as the model, until the model has
loaded, and again once the model is let go. It loads with its page and
counts toward the limits like any model. While it stands in, it is
solid and casts shadows if the model is, and a click on it is a click
on the model; the model's own `material` changes apply to the model
only.

```
<group load="near" near="6" position="-4 0 0">
  <model src="models/shoe.glb" stand-in="models/shoe-far.glb" position="0 1 0" />
</group>
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

### `panel`

(0.2) Text of more than one line on a flat board in the scene: an
information panel on a wall, a menu on a table. It is placed and turned
like a model, and does not turn to face the viewer. Holds text: its
lines wrap to `width`, and a blank line starts a new paragraph. It may
stand in `scene`, `group`, or `a`. A renderer should let Find in page,
screen readers, and any text-only view of the page read its words.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name, for `animate` and scripts |
| `position` | vector | `"0 0 0"` | Where its centre is |
| `rotation` | vector | `"0 0 0"` | How it is turned; unturned, its face looks along z, toward a viewer at a larger z |
| `width` | number, more than 0 | `1` | How wide it is, in metres; its lines wrap to this |
| `size` | number, more than 0 | `0.06` | The height of a line of text, in metres |
| `color` | colour | the renderer's | The colour of the text; by default one that reads well on the board, or on the scene's background without one |
| `background` | colour | none | The colour of the board behind the text; without it, the text alone |

A panel is as tall as its text needs.

```
<panel position="3 1.5 -2.9" width="1.2" size="0.06" background="#f5f2eb">
  Kitchen, 14 m²

  Oak worktops, a gas hob, and a window onto the harbour.
</panel>
```

### `a`

A link, as in HTML. Everything inside it (models, groups, labels) opens
the address when clicked or tapped, or when the viewer moves to it with
the keyboard and presses Enter. Holds `model`, `group`, `label`, and
(0.2) `panel`. A link must not be inside another link.

(0.2) A link's address can name a place on the page it opens
(`terrace.holoml#door`; see `viewpoint`). Following a link to another
HoloML page of the same site, a renderer should move the viewer as
between rooms: a short fade out and in instead of a cut (a cut when
the viewer asked for reduced motion).

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
| `begin` | `load` or `click` | `load` | (0.2) When it runs: when the scene is shown, or each time its trigger is clicked (see "Click actions") |
| `trigger` | id reference | its target | (0.2) With `begin="click"`: the element whose click runs it, a `model`, `group`, `label`, or `panel` |
| `toggle` | flag | off | (0.2) With `begin="click"`: each click runs it forward, and the next back, so that a door opens and closes |
| `label` | text | the trigger's id | (0.2) With `begin="click"`: its name for the keyboard and screen readers, such as "Bedroom door" |

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

### Click actions

(0.2) An `animate` or a `sound` with `begin="click"` is a click action:
it runs each time the viewer clicks its trigger (its `trigger`, or an
`animate`'s own target). With `toggle`, an animation runs forward on
one click and back on the next, from wherever it is; without it, each
click runs it again from `from`. A trigger may start several actions
at once, such as a door's swing and its creak. A click on something a
trigger holds (a model in a group) is a click on the trigger; where one
trigger holds another, the innermost runs. A renderer shows that a
trigger can be clicked (the pointer, a highlight), makes each trigger's
actions a control that the keyboard and screen readers reach (named by
its actions' `label`), and, when the viewer asked for reduced motion,
shows an action's end at once. Scripts still hear the click (section
10).

```
<group id="door-hinge" position="1 0 0">
  <model id="bedroom-door" src="models/door.glb" position="0.45 0 0" solid />
</group>
<animate target="#door-hinge" attribute="rotation" to="0 90 0" duration="0.8s" begin="click" trigger="#bedroom-door" toggle label="Bedroom door" />
<sound src="sounds/door.ogg" begin="click" trigger="#bedroom-door" />
<light id="hall-lamp" type="point" position="0 2.4 0" intensity="0" />
<model id="hall-switch" src="models/switch.glb" position="-1 1.2 0" />
<animate target="#hall-lamp" attribute="intensity" from="0" to="1.2" duration="0.2s" begin="click" trigger="#hall-switch" toggle label="Hall light" />
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
| `begin` | `load` or `click` | `load` | With `click`, it plays each time its trigger is clicked (see "Click actions"); such a sound has no `autoplay` |
| `trigger` | id reference | none | With `begin="click"`, and needed then: the element whose click plays it |
| `label` | text | the trigger's id | With `begin="click"`: its name for the keyboard and screen readers |

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

### `slider`

(0.2) A number the viewer chooses, with a slider fixed to a corner of
the screen, in front of the scene: how fast to walk, how loud, how much.
Holds text: its label, which may not be empty. Only directly in `scene`.
A slider does nothing on its own: a page's script reads it (section 10,
the `change` event). A renderer lets the mouse, touch, and the keyboard
move it (the arrow keys, Home, End, Page Up, and Page Down, while it
has the keyboard), lets screen readers read and move it, shows it in
any text-only view of the page, and stacks it with the corner's `hud`
text, in page order.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name, for scripts |
| `corner` | `top-left`, `top-right`, `bottom-left`, or `bottom-right` | `top-left` | Where on the screen |
| `min` | number | `0` | The smallest value |
| `max` | number, more than `min` | `1` | The largest value |
| `step` | number, more than 0 | a hundredth of the range | The steps between values |
| `value` | number, from `min` to `max` | `min` | The value at the start |

```
<slider id="pace" corner="top-left" min="0.5" max="2" step="0.25" value="1">Speed</slider>
```

### `choice`

(0.2) A choice in place: options on the screen, fixed to a corner like
`hud` and `slider`, that change one of a model's materials, or, without
`target` and `material`, a choice for the page's scripts. Holds one or
more `option`. Only directly in `scene`. Picking an option changes the
material at once, as a `material` element would, without a new page or
a script; a material name the model does not have changes nothing (a
renderer may say so, as for `material`). At the start, the option `value` names (by default the first)
is chosen and applied. A renderer lets the mouse, touch, the keyboard
(as a group of radio buttons), and screen readers pick an option, shows
the choice in any text-only view of the page, and tells the page's
scripts (the `change` event, section 10).

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name, for scripts |
| `corner` | `top-left`, `top-right`, `bottom-left`, or `bottom-right` | `top-left` | Where on the screen |
| `label` | text | none | Its name on the screen, such as "Fabric" |
| `target` | id reference | none | The `model` whose material it changes (with `material`) |
| `material` | text | none | The name of that material in the model's glTF file (with `target`) |
| `value` | text | the first option's | The value of the option chosen at the start |

```
<choice id="fabric" corner="bottom-left" label="Fabric" target="#sofa" material="Fabric" value="linen">
  <option value="linen" map="textures/linen.jpg" repeat="4 3">Linen</option>
  <option value="velvet" color="#3b5d7a" roughness="0.6">Velvet</option>
</choice>
```

### `option`

(0.2) One option of a `choice`. Holds text: its label, which may not be
empty. Only directly in `choice`. Its other attributes are the
material's look when it is chosen, as in `material`: each option starts
from the material's own look and changes only what it gives.

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

```
<option value="leather" map="textures/leather.jpg" roughness-map="textures/leather-rough.jpg" repeat="2">Brown leather</option>
```

### `plan`

(0.2) A floor plan fixed to a corner of the screen, like `hud`, with a
marker for where the viewer is and which way they face. At most one,
directly in `scene`; holds nothing. `area` says which rectangle of the
ground the picture shows, seen from above: its left edge is at x0, its
right edge at x1, its top edge at z0, and its bottom edge at z1. The
marker is left out while the viewer is outside the area. A renderer
gives the picture its `label` for screen readers.

| Attribute | Value | Default | Meaning |
|---|---|---|---|
| `id` | id | none | A name, for scripts |
| `corner` | `top-left`, `top-right`, `bottom-left`, or `bottom-right` | `top-right` | Where on the screen |
| `src` | address (required) | | The picture: a PNG, JPEG, or WebP file from the page's own site |
| `area` | area (required) | | The rectangle of the ground the picture shows |
| `width` | number, more than 0 | `200` | How wide it is on the screen, in CSS pixels; its height follows the picture |
| `label` | text | `"Floor plan"` | Its name for screen readers |

```
<plan src="plans/loft.png" area="-6 -4 6 4" corner="top-right" width="220" label="Floor plan of the loft" />
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
| `text-not-allowed` | Text in an element that holds none (text belongs in `title`, `label`, and (0.2) `hud`, `slider`, `option`, and `panel`) |
| `empty-text` | An element that holds text, with none (a `hud` may be empty) |
| `too-many` | A second `head`, `scene`, `title`, (0.1) `viewpoint`, or (0.2) `plan` |
| `missing-child` | `holoml` without a `scene` |
| `wrong-order` | `head` after `scene` |
| `unknown-attribute` | An attribute the element does not have |
| `missing-attribute` | A required attribute is missing, or (0.2) one that another needs: a choice's `target` and `material` go together, a click action's `trigger`, `toggle`, and `label` need `begin="click"`, an animation that begins on a click needs a `trigger` when its target cannot be clicked, and a sound always does, each of several viewpoints needs an `id`, and a group's `near` needs `load="near"` |
| `bad-value` | A value of the wrong kind, or out of range |
| `attribute-not-for-type` | A light attribute its type does not use |
| `duplicate-id` | Two elements with the same id |
| `unknown-target` | An id reference (an `animate` target, (0.2) a trigger, a choice's target) that no element has |
| `bad-target` | An attribute that cannot be animated on that element, or (0.2) a trigger that cannot be clicked, or a choice's target that is not a model |
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
toward the renderer's limits like the page's own; so do a material's
pictures, the surroundings (`environment`), the `sky`, and a `plan`'s
picture, which also come from the page's own site only.

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
  `sound`, `hud`, `slider`, `choice`, walls and gravity (`solid`,
  `gravity`, `jump`), a crosshair, walking and turning speeds (`speed`,
  `turn-speed`), shadows, textured materials (`map`, `normal-map`,
  `roughness-map`, `repeat`), light from the surroundings
  (`environment`), the animation of a light's position, brightness,
  and colour, and of the background, text of more than one line
  (`panel`), click actions (`begin`, `trigger`, `toggle`), places
  (several viewpoints, and `#name` in an address), a `sky`, a floor
  plan (`plan`), and loading by area (`load`, `near`, and stand-ins).
  Everything in 0.1 means the same in a 0.2 page. Still to come in 0.2,
  as the example sites need them: movement along paths, and sounds that
  come from a place.

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
| `holoml.viewer` | The viewer: `position` (can be set, to move them), `direction` (a vector of length 1), `lookAt(point)`, and, for walking, `speed` (metres a second, 0.5 to 10) and `turnSpeed` (degrees a second, 10 to 720), which start as the `viewpoint` says and can be set; a value outside its range is an error |
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
| `kind` | all | `"model"`, `"group"`, `"light"`, `"label"`, `"panel"`, `"sound"`, `"hud"`, `"slider"`, or `"choice"` |
| `parent` | all | The group thing it is in, or `null` |
| `position` | model, group, label, panel, light | Where it is; can be set |
| `rotation` | model, group, panel | How it is turned; can be set |
| `scale` | model, group | How big; can be set |
| `visible` | model, group, label, panel | Whether it is shown; can be set |
| `solid` | model, group | Whether the walker is stopped by it; can be set |
| `loaded` | model, group | (Read only) Whether its file has loaded (a model); whether every model in it that is near enough to load has loaded or been left out (a group). A group that loads by area, or is in one, is not loaded while it is let go |
| `text` | label, panel, hud, slider, choice | Its words (for a `hud`, lines separated by `"\n"`; for a `panel`, paragraphs separated by `"\n\n"`; for a `slider` or a `choice`, its label); can be set |
| `color` | light, label, hud | Its colour, as `"#rrggbb"`; can be set |
| `intensity` | light | How bright; can be set |
| `material(name, change)` | model | Changes one of the model's materials; `change` may have `color`, `metalness`, `roughness`, and `opacity`, as `material` has |
| `play()`, `stop()`, `playing` | sound | Plays from the start; stops; whether it plays. Before sounds may play (section 5, `sound`), `play()` does nothing |
| `volume` | sound | How loud, from 0 to 1; can be set, also while it plays |
| `value` | slider | The number chosen; can be set (from `min` to `max`, kept to its steps), which moves the slider without a `change` event |
| `value` | choice | The chosen option's value; can be set to another option's value, which picks it (and changes the material) without a `change` event; any other value is an error |
| `options` | choice | Its options' values, in order |
| `min`, `max`, `step` | slider | Its range and steps, as the page says |
| `remove()` | all | As `holoml.remove(thing)` |

### Events

| Type | When | What the event holds |
|---|---|---|
| `click` | The viewer clicks or taps a point of the scene (not a drag), with any button | `thing` (the innermost element with a place that was hit, or `null`), `point` and `normal` (where it was hit, and which way the face hit is facing, or `null`), and `button` (`"left"`, `"right"`, or `"middle"`). A right-click goes to the page instead of opening the renderer's menu while a script listens for clicks. A click on a link still follows it, and a click on a trigger still runs its click actions |
| `key` | A key goes down or up while the page has the keyboard | `key` (the key, as a web page's `KeyboardEvent.key`: `"e"`, `"1"`, `" "`) and `down` (`true` or `false`). The renderer's own keys (walking, turning) still work |
| `frame` | Before each frame is drawn | `time` (milliseconds since the scene was shown) and `dt` (milliseconds since the last frame). While a script listens for frames, the renderer keeps drawing |
| `change` | The viewer moves a slider, or picks an option of a choice | `thing` (the slider or the choice) and `value` (a slider's number, or the chosen option's value) |
| `load` | A group that loads by area (`load="near"`) has loaded its models (its `loaded` became `true`), or let them go | `thing` (the group) and `loaded` (`true` when its models are in, `false` when they were let go). A model a script adds to a group already in does not make it tell again |

The keyboard can do whatever the mouse does: with a crosshair, a script
uses `holoml.aim()` to act on what is in the middle of the view when a
key is pressed.

A slider and the viewer's speeds, together:

```
// pace.js: the slider "pace" (from 0.5 to 2) sets how fast the viewer walks and turns.
const WALK = 4.3; // metres a second at 1
const TURN = 120; // degrees a second at 1
const pace = holoml.find('pace');
holoml.on('change', (e) => {
  if (e.thing !== pace) return;
  holoml.viewer.speed = WALK * e.value;
  holoml.viewer.turnSpeed = TURN * e.value;
  pace.text = `Speed ${e.value}×`;
});
```

### Limits

Things a script adds count toward the renderer's limits (section 7):
when one is reached, `holoml.add` leaves out what crossed it, returns
the things it did add, and the console says why. Elements a script
adds are not part of the page's text, so a renderer's outline of the
scene lists only those with an `id`.

