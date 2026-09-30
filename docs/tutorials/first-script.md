# Your first script

In this lesson you give a HoloML page a script: a lamp on a table that a
click switches on and off, with the sound of its switch, and words in
the corner of the screen that say whether it is on. You start from a
small page with no script, then write the script a step at a time. Do
[Your first HoloML page](first-page.md) first if you have not.

## Make the folder

You need HyperSpace 3D and a text editor, as in the first lesson, and
three files from HoloML's [Harbour Loft](../../examples/harbour-loft/README.md)
example: the models `pipe-lamp.glb` and `tall-table.glb`, from its
`models` folder, and the sound `switch.wav`, from its `sounds` folder.
Make a folder named `lamp`, and copy them into it like this:

```text
lamp/
  models/
    pipe-lamp.glb
    tall-table.glb
  sounds/
    switch.wav
```

## Step 1: the page

In the `lamp` folder, make a file named `index.holoml`:

```holoml
<holoml version="0.2">
  <head>
    <title>A lamp</title>
  </head>
  <scene background="#141821">
    <viewpoint position="0 1.3 1.6" look-at="0 0.9 0" />
    <light type="ambient" intensity="0.2" />
    <light id="lamp-light" type="point" position="0 1.15 0.17" range="4" intensity="0" color="#ffd9a6" />
    <model src="models/tall-table.glb" />
    <model id="lamp" src="models/pipe-lamp.glb" position="0 0.76 0" />
    <hud id="status">The lamp is off</hud>
    <hud corner="bottom-left">Click the lamp to switch it on and off</hud>
  </scene>
</holoml>
```

The `background` is the colour behind everything. A `point` light
shines in every direction from its `position`, like a bulb: this one is
just in front of the lamp's bulb, reaches 4 metres (`range`), and is a
warm white (`color`). Its `intensity` is 0, so it starts off. A `hud`
is text fixed to a corner of the screen, in front of the scene: the top
left, unless its `corner` says otherwise. The `id` attributes name the
lamp, its light, and the first `hud`, so that the script can find them.

Open the page (Ctrl+O). You see a small table with the lamp on it,
dimly lit, and "The lamp is off" at the top left. The viewpoint has no
`mode`, so you orbit: drag to go round the table. Clicking the lamp
does nothing yet. That is the script's job.

## Step 2: a script that switches the lamp

Add a `script` to the `head`, after the title:

```holoml-head
<title>A lamp</title>
<script src="lamp.js" />
```

A script is a JavaScript module: a file of JavaScript of its own, which
the page names. It comes from the page's own site; for a page opened
from the computer, that is its folder and the folders inside it. Make
`lamp.js` next to `index.holoml`:

```js
// lamp.js: a click on the lamp switches it on and off.
const light = holoml.find('lamp-light');

function toggle() {
  light.intensity = light.intensity === 0 ? 1 : 0;
}

holoml.on('click', (e) => {
  if (e.thing?.id === 'lamp') toggle();
});
```

HyperSpace 3D runs the script once it has built the scene, and gives it
one object, `holoml`, to read and change the scene with. `holoml.find`
gives a thing, a handle on the element with that id: here the light,
whose `intensity` the script can read and set. `holoml.on('click', …)`
calls a function each time you click the scene. `e.thing` is what you
clicked, or `null` where you clicked nothing, so the script asks for
`e.thing?.id`.

Open the page again and click the lamp: the light comes on, and the
table top under it brightens. Click it again, and the light goes off.
The words at the top left still say that the lamp is off.

## Step 3: words that follow the lamp

In `lamp.js`, add a line after the first that finds the `hud`, and
change `toggle` so that it sets the words as well:

```js
const status = holoml.find('status');

function toggle() {
  const on = light.intensity === 0;
  light.intensity = on ? 1 : 0;
  status.text = on ? 'The lamp is on' : 'The lamp is off';
}
```

`on` says whether this click switches the lamp on, and the screen shows
a `hud` thing's new `text` at once. Open the page again and click the
lamp: the top left says "The lamp is on", and "The lamp is off" when
you switch it off. Press Ctrl+Shift+V for the text view, a text-only
view of the page: the words are there too, for screen readers and for
anyone who cannot see the scene. Press it again to go back.

## Step 4: a sound

Add a `sound` to the scene, after the lamp:

```holoml-scene
<sound id="click-sound" src="sounds/switch.wav" />
```

It has no `autoplay`, so it does not play by itself: the script plays
it. Find it as you found the others, and play it at the end of
`toggle`. The script now reads:

```js
// lamp.js: a click on the lamp switches it on and off, with a sound.
const light = holoml.find('lamp-light');
const status = holoml.find('status');
const sound = holoml.find('click-sound');

function toggle() {
  const on = light.intensity === 0;
  light.intensity = on ? 1 : 0;
  status.text = on ? 'The lamp is on' : 'The lamp is off';
  sound.play();
}

holoml.on('click', (e) => {
  if (e.thing?.id === 'lamp') toggle();
});
```

Open the page again and click the lamp: you hear the switch each time
it goes on or off. No sound plays before your first click, tap, or key
on the page; your click on the lamp is one, so the switch sounds from
the first click.

## Step 5: the keyboard

A page should work without a mouse as well. Add this at the end of
`lamp.js`, so that the L key switches the lamp as a click does:

```js
holoml.on('key', (e) => {
  if (e.down && !e.repeat && (e.key === 'l' || e.key === 'L')) toggle();
});
```

A `key` event comes each time a key goes down or up while the page has
the keyboard. `e.down` is true as it goes down, and `e.repeat` while a
held key repeats, so one press switches the lamp once. Then change the
words of the `hud` at the bottom left, so that the page says so:

```holoml-scene
<hud corner="bottom-left">Click the lamp, or press L, to switch it on and off</hud>
```

Open the page again, click an empty part of the scene so that the page
has the keyboard, and press L: the lamp switches, with its sound and
its words.

## What next

- The scene API: [section 10](../../SPEC.md#10-scripts-and-the-scene-api)
  of the specification, and [its reference page](../reference/api.md).
- How-to guides: [doors and lamps](../how-to/doors-and-lamps.md) that
  work with a click and no script, and that the keyboard and screen
  readers reach as buttons; [sound](../how-to/sound.md);
  [text](../how-to/text.md); and [sliders and choices](../how-to/sliders-and-choices.md).
- Larger scripts: Harbour Loft's [loft.js](../../examples/harbour-loft/loft.js)
  turns the flat from day to evening, and Blockworld's
  [game.js](../../examples/blockworld/game.js) builds an island of
  blocks and plays a game with clicks, keys, and frames.
