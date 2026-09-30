# Put text in the scene and on the screen

This guide shows words in three ways: a `label`, a line of text in the
scene that always faces the viewer; a `panel`, a board of paragraphs
placed and turned like a model; and a `hud`, text fixed to a corner of
the screen, which a script can change. Panels and huds are new in
HoloML 0.2, so a page with them says `version="0.2"`.

## Choose where the words go

- A `label` names or captions something in the scene: a car's name
  above it, or a link to the next page. It turns to face the viewer
  wherever they stand.
- A `panel` holds more: paragraphs on a board that stays where it is
  placed, like a notice on a wall. Harbour Loft has one in each room.
- A `hud` stays on the screen whatever the viewer looks at: a score, a
  price, or how to walk. (HUD is short for head-up display: text over
  the view.)

All three are text, not pictures of it, so screen readers, Find in
page, and a renderer's text-only view read them. In HyperSpace 3D, the
text view is Ctrl+Shift+V.

## Put a label in the scene

```holoml-scene
<label position="0 4 0" size="0.6">Pippet</label>
<label position="0 3.45 0" size="0.24" color="#b8c4e0">A small hatchback that parks anywhere</label>
<a href="index.holoml">
  <label position="3.6 0.75 1" size="0.26" color="#7fd8ff">Back to the hall</label>
</a>
```

- `position`: where its centre is.
- `size`: the height of a line of text, in metres (0.2 by default). A
  label read from far off needs more: the showroom's hall writes its
  title 1 m high, 28 m from where the viewer starts.
- `color`: the colour of the text; without it, the renderer chooses.

In a label, runs of spaces and line breaks show as one space, so a
label is one line. For more, stack labels, as the showroom's car pages
do, or use a panel. In a link (`a`), a label opens the link when it is
clicked, or when the viewer reaches it with the keyboard and presses
Enter. An `animate` can move a label, and a script can change its words
and its colour (`text` and `color`).

## Put a panel on a wall

A `panel` is text on a flat board. Its lines wrap to its `width`, and a
blank line starts a new paragraph. It is placed and turned like a
model, and does not turn to face the viewer. One of Harbour Loft's:

```holoml-scene
<panel position="2.075 1.55 2.4" rotation="0 90 0" width="0.7" size="0.045" color="#1f2328" background="#f7f4ee">
  Bedroom, 18 m²

  Two windows, one over the water, a wall of wardrobes, and room for a king-size bed.
</panel>
```

- `width`: how wide it is, in metres (1 by default). It is as tall as
  its text needs.
- `size`: the height of a line of text, in metres (0.06 by default).
- `color`: the text's colour; by default, one that reads well on the
  board.
- `background`: the board's colour; without it, the text stands alone.
- `rotation`: unturned, a panel faces along z, toward a viewer at a
  larger z. Turn it with the middle number to face into its room:
  `0 90 0` faces +x, `0 180 0` faces -z, and `0 -90 0` faces -x.

Place a panel just in front of its wall, so that the wall does not hide
it: the one above hangs on the bedroom's side of a wall at x = 2,
facing +x into the room.

A panel may stand in a group, or in a link, where it is a button:
Harbour Loft's "Book a viewing" is a panel in an `a`. It can also be a
click action's trigger, as the ocean tunnel's Feed button is (see
[Add sound, and sound from a place](sound.md)).

## Fix text to the screen

A `hud` holds text fixed to a corner of the screen, in front of the
scene. Each line of its text is a line on the screen: within a line,
runs of spaces show as one, and empty lines are not shown. It stands
directly in the scene. Blockworld's, shortened:

```holoml-scene
<hud id="score" corner="top-right">
  Gems carried: 0
  In the chest: 0 of 5
</hud>
<hud corner="bottom-left" size="14">
  Walk: W, A, S, D · Space jumps · Shift runs
  Break a block: click it, or E · Place one: right-click, or Q
</hud>
<hud id="message" corner="bottom-right" size="20"></hud>
```

- `corner`: `top-left` (the default), `top-right`, `bottom-left`, or
  `bottom-right`.
- `size`: the height of its text in CSS pixels, the unit of sizes on a
  web page (18 by default).
- `color`: the text's colour; without it, the renderer chooses.

A `hud` may be empty, for a script to fill in, as Blockworld's message
corner is. Several may share a corner: Blockworld's top-right corner
holds its score and its clock, one `hud` each.

## Change the words from a script

A script changes the words of a label, a panel, or a hud through its
`text`, and the colour of a label or a hud through its `color`. In a
hud's text, `"\n"` separates lines; in a panel's, `"\n\n"` separates
paragraphs.

```js
// A score in one corner, and a message that clears itself after a few seconds, as Blockworld has.
const score = holoml.find('score');
const message = holoml.find('message');

function showScore(carried, stored) {
  score.text = `Gems carried: ${carried}\nIn the chest: ${stored} of 5`;
}

function say(words, seconds = 4) {
  message.text = words;
  setTimeout(() => {
    if (message.text === words) message.text = '';
  }, seconds * 1000);
}

showScore(0, 0);
say('Welcome. Five gems are hidden in the stone.');
```

The ocean tunnel writes a fish's name, and a paragraph about it, on its
board, a panel, with `"\n\n"` between them. When the scene grows dark,
make the text lighter: the sofa studio's evening turns its price, a
hud, and its link labels to lighter colours.

## See also

- The specification: [`label`](../../SPEC.md#label),
  [`panel`](../../SPEC.md#panel), [`hud`](../../SPEC.md#hud),
  [`a`](../../SPEC.md#a), [syntax](../../SPEC.md#5-syntax) (how text and
  its spaces are read), the scene API's [things](../../SPEC.md#things),
  and [accessibility](../../SPEC.md#14-accessibility-considerations).
- [Offer sliders and choices](sliders-and-choices.md): more in the
  corners of the screen.
- [Give a page places to go to, and a floor plan](places-and-plans.md)
- [Add sound, and sound from a place](sound.md)
- Harbour Loft's [page](../../examples/harbour-loft/index.holoml)
  (panels), Blockworld's [page](../../examples/blockworld/index.holoml)
  and [script](../../examples/blockworld/game.js) (huds), and the
  showroom's [Pippet page](../../examples/showroom/pippet.holoml)
  (labels).
