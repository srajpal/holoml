# Offer sliders and choices

This guide puts controls on the screen (0.2): a slider, for a number the
viewer chooses, and a choice, a set of options. A choice can change one
of a model's materials in place, with no script; a slider, and a choice
without a model, tell the page's scripts what the viewer picked. The
[sofa studio](../../examples/sofa-studio/index.holoml) and Blockworld's
speed slider ([`game.js`](../../examples/blockworld/game.js)) are
working examples.

They are HoloML 0.2, so the page says `<holoml version="0.2">`. They
stand directly in `scene`, fixed to a corner of the screen in front of
the scene, as `hud` text is: `corner` is `top-left` (the default),
`top-right`, `bottom-left`, or `bottom-right`. The viewer uses them
with the mouse, touch, the keyboard, or a screen reader. In HyperSpace
3D, Tab reaches each one, and the arrow keys move a slider, or go from
option to option.

## Add a slider

```holoml-scene
<slider id="pace" corner="top-left" min="0.5" max="2" step="0.25" value="1">Speed 1×</slider>
```

- The text is the slider's label, and it cannot be empty.
- `min` and `max`: its range, by default 0 to 1; `max` is more than
  `min`.
- `step`: the steps between values, by default a hundredth of the range.
- `value`: where it starts, from `min` to `max`; by default at `min`.

This is Blockworld's Speed slider: from half to twice the game's pace,
in quarters.

## Hear the slider in a script

A slider does nothing by itself. When the viewer moves it, the page's
scripts (files named in `head`, as `<script src="game.js" />`) hear a
`change` event: its `thing` is the slider, and its `value` the number.
Every slider and choice sends `change`, so a script checks which one it
came from. Blockworld's script sets how fast the viewer walks and
turns:

```js
// From Blockworld's game.js: the slider "pace" sets how fast the viewer walks and turns.
const WALK = 4.3; // metres a second at 1×
const TURN = 120; // degrees a second at 1×
const pace = holoml.find('pace');
holoml.on('change', (e) => {
  if (e.thing !== pace) return;
  holoml.viewer.speed = WALK * e.value;
  holoml.viewer.turnSpeed = TURN * e.value;
  pace.text = `Speed ${e.value}×`;
});
```

`pace.text` is the slider's label, which here follows the value.
`pace.value` reads the number at any time; setting it (from `min` to
`max`) moves the slider, kept to its steps, and sends no `change`
event. [Walking](walking.md) has the speeds and their ranges.

## Change a material with a choice

A choice with `target` and `material` changes one material of one
model, as a `material` element would, as soon as an option is picked:

```holoml-scene
<model id="sofa" src="models/sofa.gltf" position="0 0 -0.42" />
<choice id="fabric" corner="bottom-left" label="Fabric" target="#sofa" material="Fabric" value="stone">
  <option value="stone">Stone weave</option>
  <option value="linen" map="textures/linen-color.jpg" normal-map="textures/linen-normal.jpg" roughness-map="textures/linen-rough.jpg" repeat="3">Blue linen</option>
  <option value="leather" map="textures/leather-color.jpg" normal-map="textures/leather-normal.jpg" roughness-map="textures/leather-rough.jpg" repeat="2">Brown leather</option>
</choice>
```

- `target` names the model by its id, and `material` the material by
  its name in the model's glTF file; the two go together. `label` is
  the choice's name on the screen.
- Each `option` holds its label, and gives the material's look when it
  is chosen: `color`, `metalness`, `roughness`, `opacity`, the pictures
  `map`, `normal-map`, and `roughness-map`, and how they tile, `repeat`.
  It starts from the material's own look and changes only what it
  gives, so Stone weave, which gives nothing, leaves the fabric as the
  model has it.
- An option's `value` is its name for scripts, by default its label;
  no two options of a choice share one. The choice's `value` names the
  option chosen at the start (by default the first), applied at once.

A choice changes a single material, so the part that changes needs a
material of its own: the sofa studio's tools split the sofa's one
material into Fabric and Wood
([preparing models](preparing-models.md#name-the-materials-a-page-will-change)),
and a second choice, Wood, changes the frame. A name the model does not
have changes nothing. The pictures come from the page's own site and
count toward the renderer's limits: every fabric's pictures load with
the sofa studio's page, so that a choice shows at once.

## Offer a choice to scripts

Without `target` and `material`, a choice changes nothing by itself,
and the page's scripts hear what was picked. Harbour Loft's Light
choice turns the flat from day to evening with its lights `fill` and
`sun`:

```holoml-scene
<choice id="time" corner="top-left" label="Light" value="day">
  <option value="day">Day</option>
  <option value="evening">Evening</option>
</choice>
```

```js
// From Harbour Loft's loft.js (shortened): day or evening, from the Light choice.
const time = holoml.find('time');
const fill = holoml.find('fill');
const sun = holoml.find('sun');
const LIGHTS = {
  day: { fill: fill.intensity, sun: sun.intensity, background: holoml.background },
  evening: { fill: 0.07, sun: 0, background: '#141821' },
};
holoml.on('change', (e) => {
  if (e.thing !== time) return;
  const l = LIGHTS[e.value];
  fill.intensity = l.fill;
  sun.intensity = l.sun;
  holoml.background = l.background;
});
```

For a choice, `e.value` is the chosen option's value. Options without a
`value` use their label: the sneaker store's sizes are
`<option>41</option>` and so on, with `value="42"` on the choice. A
choice with a target sends `change` as well: the sofa studio's script
hears the Fabric and Wood choices and shows the price.

A script can pick an option too. A choice's `options` lists its
options' values, in order; setting its `value` to one of them picks it,
and changes the material, without a `change` event, and any other value
is an error. The sneaker store's shoe page
([`shoe.js`](../../examples/sneaker-store/shoe.js)) opens on the colour
its address asks for, such as `shoe.holoml?colour=forest`.

## Try it

Use each control with the mouse, then with Tab and the arrow keys alone
(a choice works as a group of radio buttons), and with a screen reader.
HyperSpace 3D's text view (Ctrl+Shift+V) shows the sliders and choices
too.

## See also

- The specification: [`slider`](../../SPEC.md#slider),
  [`choice`](../../SPEC.md#choice), [`option`](../../SPEC.md#option),
  [`material`](../../SPEC.md#material), and the scene API's
  [things](../../SPEC.md#things) and [events](../../SPEC.md#events).
- [Show a model and change its materials](models-and-materials.md)
- [Walk around, with walls and gravity](walking.md)
- [Put text in the scene and on the screen](text.md)
- The sofa studio's [page](../../examples/sofa-studio/index.holoml) and
  [script](../../examples/sofa-studio/studio.js), and the sneaker
  store's [shoe page](../../examples/sneaker-store/shoe.holoml).
