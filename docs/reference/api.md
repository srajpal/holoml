# The scene API

A 0.2 page's scripts reach the scene through one object, `holoml`. This
page lists what it offers at a glance, each member with its declaration
in Web IDL, the notation web standards use to describe APIs. [Section
10](../../SPEC.md#10-scripts-and-the-scene-api) of the specification
says exactly what each member does, and [appendix
A.3](../../SPEC.md#a3-the-scene-api-in-web-idl) and
[holoml.webidl](../../spec/holoml.webidl) give the whole API in Web IDL.
Vectors are arrays of three numbers, `[x, y, z]`: metres for positions
and degrees for rotations.

This page is made by `pnpm reference:update`; do not edit it by hand.

## `holoml`

| Member | Web IDL | What it is |
|---|---|---|
| `holoml.version` | `readonly attribute DOMString version` | The version the page declares, such as `"0.2"` |
| `holoml.ready` | `readonly attribute Promise<undefined> ready` | A promise, kept when every model and sound has loaded or been left out |
| `holoml.find(id)` | `Thing? find(DOMString id)` | The element with this id, as a thing (below), or `null` |
| `holoml.add(markup, parent)` | `sequence<Thing> add(DOMString markup, optional GroupThing? parent = null)` | Adds elements written in HoloML (what a `scene` or `group` may hold: `group`, `model`, `light`, `label`, `sound`) to the scene, or into the group thing `parent`. Returns the new things. The markup is checked like the page's: an element with a problem is left out, and the console says why |
| `holoml.remove(thing)` | `undefined remove(Thing thing)` | Removes an element and everything in it |
| `holoml.on(type, listener)` | `HoloMLStop on(DOMString type, HoloMLListener listener)` | Calls `listener` with each event of that type (below). Returns a function that stops it |
| `holoml.aim()` | `HoloMLHit? aim()` | What is in the middle of the view, under the crosshair: `{ thing, point, normal }` as for a click, or `null` |
| `holoml.viewer` | `readonly attribute HoloMLViewer viewer` | The viewer (below) |
| `holoml.background` | `attribute DOMString background` | The scene's background colour; can be set |
| `holoml.reducedMotion` | `readonly attribute boolean reducedMotion` | `true` when the viewer asked for reduced motion; keep still what would only move for effect |

## `holoml.viewer`

| Member | Web IDL | What it is |
|---|---|---|
| `position` | `attribute FrozenArray<double> position` | Where the viewer's eyes are; can be set, to move them |
| `direction` | `readonly attribute FrozenArray<double> direction` | Which way they look: a vector of length 1 |
| `lookAt(point)` | `undefined lookAt(sequence<double> point)` | Turns them to look at a point |
| `speed` | `attribute double speed` | For walking: how fast, in metres a second, from 0.5 to 10; starts as the `viewpoint` says, and can be set. A value outside the range is an error |
| `turnSpeed` | `attribute double turnSpeed` | For walking: how fast they turn, in degrees a second, from 10 to 720; starts as the `viewpoint` says, and can be set. A value outside the range is an error |

## Things

`holoml.find(id)` and `holoml.add(markup, parent)` give things: handles
on elements. Every thing has `id`, `kind`, `parent`, and `remove()`;
each kind has more. A member a thing's kind does not have is
`undefined`.

| Kind | Interface | Its own members |
|---|---|---|
| `model` | `ModelThing` | `position`, `rotation`, `scale`, `visible`, `solid`, `animationSpeed`, `loaded`, `material()` |
| `group` | `GroupThing` | `position`, `rotation`, `scale`, `visible`, `solid`, `loaded` |
| `light` | `LightThing` | `position`, `color`, `intensity` |
| `label` | `LabelThing` | `position`, `visible`, `text`, `color` |
| `panel` | `PanelThing` | `position`, `rotation`, `visible`, `text` |
| `sound` | `SoundThing` | `position`, `play()`, `stop()`, `playing`, `volume` |
| `hud` | `HudThing` | `text`, `color` |
| `slider` | `SliderThing` | `text`, `value`, `min`, `max`, `step` |
| `choice` | `ChoiceThing` | `text`, `value`, `options` |

| Member | Kinds | Web IDL | What it is |
|---|---|---|---|
| `id` | all | `readonly attribute DOMString? id` | Its id, or `null` |
| `kind` | all | `readonly attribute DOMString kind` | `"model"`, `"group"`, `"light"`, `"label"`, `"panel"`, `"sound"`, `"hud"`, `"slider"`, or `"choice"` |
| `parent` | all | `readonly attribute GroupThing? parent` | The group thing it is in, or `null` |
| `position` | model, group, label, panel, light, sound | `attribute FrozenArray<double> position`<br>`attribute FrozenArray<double>? position` | Where it is; can be set. For a sound, where it comes from, or `null` for one that has no place; setting a place gives it one (with its `range`, 20 metres unless the page says) |
| `rotation` | model, group, panel | `attribute FrozenArray<double> rotation` | How it is turned; can be set |
| `scale` | model, group | `attribute FrozenArray<double> scale` | How big; can be set |
| `visible` | model, group, label, panel | `attribute boolean visible` | Whether it is shown; can be set |
| `solid` | model, group | `attribute boolean solid` | Whether the walker is stopped by it; can be set |
| `animationSpeed` | model | `attribute double animationSpeed` | How fast its own animation plays: `1` as it was made, `2` twice as fast, `0.5` half as fast, `0` held still; from 0 to 4; can be set. A value outside that range is an error. A model that plays no animation keeps the value for when it does |
| `loaded` | model, group | `readonly attribute boolean loaded` | (Read only) Whether its file has loaded (a model); whether every model in it that is near enough to load has loaded or been left out (a group). A group that loads by area, or is in one, is not loaded while it is let go |
| `text` | label, panel, hud, slider, choice | `attribute DOMString text` | Its words (for a `hud`, lines separated by `"\n"`; for a `panel`, paragraphs separated by `"\n\n"`; for a `slider` or a `choice`, its label); can be set |
| `color` | light, label, hud | `attribute DOMString color` | Its colour, as `"#rrggbb"`; can be set |
| `intensity` | light | `attribute double intensity` | How bright; can be set |
| `material(name, change)` | model | `undefined material(DOMString name, HoloMLMaterialChange change)` | Changes one of the model's materials; `change` may have `color`, `metalness`, `roughness`, and `opacity`, as `material` has |
| `play()`, `stop()`, `playing` | sound | `undefined play()`<br>`undefined stop()`<br>`readonly attribute boolean playing` | Plays from the start; stops; whether it plays. Before sounds may play (section 7, `sound`), `play()` does nothing |
| `volume` | sound | `attribute double volume` | How loud, from 0 to 1; can be set, also while it plays |
| `value` | slider | `attribute double value` | The number chosen; can be set (from `min` to `max`, kept to its steps), which moves the slider without a `change` event |
| `value` | choice | `attribute DOMString value` | The chosen option's value; can be set to another option's value, which picks it (and changes the material) without a `change` event; any other value is an error |
| `options` | choice | `readonly attribute FrozenArray<DOMString> options` | Its options' values, in order |
| `min`, `max`, `step` | slider | `readonly attribute double min`<br>`readonly attribute double max`<br>`readonly attribute double step` | Its range and steps, as the page says |
| `remove()` | all | `undefined remove()` | As `holoml.remove(thing)` |

## Events

`holoml.on(type, listener)` calls the listener with each event of that
type, and returns a function that stops it. Every event has its `type`,
and the members its type lists.

| Type | When | Members | What they hold |
|---|---|---|---|
| `click` | The viewer clicks or taps a point of the scene (not a drag), with any button | `thing`, `point`, `normal`, `button` | `thing` is the innermost element with a place that was hit, or `null`; `point` and `normal` say where it was hit, and which way the face hit is facing, or are `null`; `button` is `"left"`, `"right"`, or `"middle"`. A right-click goes to the page instead of opening the renderer's menu while a script listens for clicks. A click on a link still follows it, and a click on a trigger still runs its click actions |
| `key` | A key goes down or up while the page has the keyboard | `key`, `down`, `repeat` | `key` is the key, as a web page's `KeyboardEvent.key` (`"e"`, `"1"`, `" "`); `down` is `true` or `false`; `repeat` is `true` when the key is held down and repeating, as a web page's `KeyboardEvent.repeat` (clarified). The renderer's own keys (walking, turning) still work |
| `frame` | Before each frame is drawn | `time`, `dt` | `time` is the milliseconds since the scene was shown, and `dt` the milliseconds since the last frame. While a script listens for frames, the renderer must keep drawing, except while the page cannot be seen (for example, while its tab is behind another): then it may stop drawing, and frames with it, until the page is seen again |
| `change` | The viewer moves a slider, or picks an option of a choice | `thing`, `value` | `thing` is the slider or the choice, and `value` a slider's number or the chosen option's value |
| `load` | A group that loads by area (`load="near"`) has loaded its models (its `loaded` became `true`), or let them go | `thing`, `loaded` | `thing` is the group, and `loaded` is `true` when its models are in and `false` when they were let go. A model a script adds to a group already in does not make it tell again |

The members, as the Web IDL's `HoloMLEvent` declares them:

| Member | Web IDL |
|---|---|
| `type` | `required DOMString type` |
| `thing` | `Thing? thing` |
| `point` | `sequence<double>? point` |
| `normal` | `sequence<double>? normal` |
| `button` | `DOMString button` |
| `key` | `DOMString key` |
| `down` | `boolean down` |
| `repeat` | `boolean repeat` |
| `time` | `double time` |
| `dt` | `double dt` |
| `value` | `(double or DOMString) value` |
| `loaded` | `boolean loaded` |
