# Build a big site that loads as the viewer walks

This guide splits a large scene into areas that load only while the
viewer is near them (0.2), with lighter stand-ins in their place until
then. A long hall, a street, or a museum then opens quickly, and stays
within what a renderer allows one page. The
[sneaker store](../../examples/sneaker-store/index.holoml) is built this
way: ten bays of shoes along a hall 26 m long.

## Put each area in a group that loads when near

```holoml-scene
<viewpoint position="0 1.6 -1.6" look-at="0 1.4 -12" mode="walk" />
<group id="midnight-bay" load="near" near="7.5" position="-5 0 -4" rotation="0 90 0">
  <model src="models/shoe-midnight.glb" position="-0.95 0.98 0.25" rotation="0 -20 0" />
  <model src="models/shoe-midnight.glb" position="0 0.98 0.25" rotation="0 200 0" />
</group>
<group id="beach-bay" load="near" near="7.5" position="-5 0 -8.5" rotation="0 90 0">
  <model src="models/shoe-beach.glb" position="-0.95 0.98 0.25" rotation="0 -20 0" />
  <model src="models/shoe-beach.glb" position="0 0.98 0.25" rotation="0 200 0" />
</group>
```

- `load="near"`: the group's models, and their pictures, load only
  while the viewer's eyes are within `near` metres of the group's place,
  its position in the scene.
- `near`: how near, in metres; 10 by default. It needs `load="near"`.
- The models are let go when the viewer is farther than half as much
  again: 15 m by default, and 11.25 m for `near="7.5"`. Between the two
  nothing changes, so walking along the edge does not load them and let
  them go again and again.

Put the group's position where its area is, and its models around it:
the sneaker store's groups stand at their bays, 4.5 m apart along each
wall, and hold the bays' shoes.

What loads when:

- A group within reach of where the viewer starts loads with the page,
  and the page is ready (a script's `holoml.ready`) once those groups
  have loaded. The store's two bays by the entrance, less than 6 m from
  the viewer's eyes there, load with the page.
- A group farther away loads when the viewer comes near: the store's
  other eight bays load as the viewer walks down the hall.
- A model in several such groups, one inside another, loads while the
  viewer is near every one of them.

## Show a stand-in until the model is in

A stand-in is a lighter copy of a model, shown in its place while the
model itself is not loaded. Give it with the model's `stand-in`:

```holoml-scene
<group load="near" near="7.5" position="-5 0 -4" rotation="0 90 0" shadows>
  <a href="shoe.holoml?colour=midnight">
    <model id="shoe-midnight-1" src="models/shoe-midnight.glb" stand-in="models/shoe-midnight-far.glb" position="-0.95 0.98 0.25" rotation="0 -20 0" />
    <model id="shoe-midnight-2" src="models/shoe-midnight.glb" stand-in="models/shoe-midnight-far.glb" position="0 0.98 0.25" rotation="0 200 0" />
  </a>
</group>
```

- The stand-in is shown in the model's place, turned and sized as the
  model, until the model has loaded, and again once it is let go.
- It comes from the page's own site, loads with the page, and counts
  toward the renderer's limits like any model, so keep it light: the
  store's have about a ninth of the shoe's triangles and a tiny picture.
- While it stands in, it is solid and casts shadows if the model is,
  and a click on it is a click on the model, so the shoes' links work
  before the shoes have loaded.
- The model's own `material` changes apply to the model only: make the
  stand-in look as the model will. The store has a stand-in for each of
  its ten colourways.

[Prepare glTF models for a page](preparing-models.md#give-a-detailed-model-a-lighter-stand-in)
shows how to make one.

## Stay within the renderer's limits

A renderer may limit what one page uses: the model files, their size,
and the triangles, for example. HyperSpace 3D allows a page 64 model
files, 128 MB for all its model and sound files, and 2 million
triangles in all. A group's models count toward such limits only while
they are loaded: a renderer should release them when it lets them go,
and may wait to load a group that would pass a limit until others are
let go. Stand-ins, and models outside such groups, always count.

The sneaker store loads about 2.4 MB in 24 files at first, and each
bay's shoes about 0.7 MB more as the viewer comes near.

## Know in a script when an area is in

A group's `loaded` is `true` while every model in it that is near
enough to load has loaded or been left out, and `false` while it is let
go. The `load` event tells a script each time a group that loads by area
comes in (`e.loaded` is `true`) or is let go (`false`). Here the lamp
over a bay is lit only while its shoes are in:

```holoml-scene
<group id="forest-bay" load="near" near="7.5" position="-5 0 -17.5" rotation="0 90 0">
  <model src="models/shoe-forest.glb" position="0 0.98 0.25" />
</group>
<light id="forest-lamp" type="spot" position="-3.5 3.5 -17.5" look-at="-5 1.2 -17.5" intensity="0" />
```

```js
const lamp = holoml.find('forest-lamp');
const light = (on) => (lamp.intensity = on ? 1.2 : 0);
light(holoml.find('forest-bay').loaded);
holoml.on('load', (e) => {
  if (e.thing.id === 'forest-bay') light(e.loaded);
});
```

Read `loaded` when the script starts, too: a group near where the
viewer starts may be in before the script listens. A model that a
script adds to a group that is already in does not make it tell again.

## Try it

Walk down the hall from the entrance: each bay's shoes take the place of
their stand-ins as you come within 7.5 m, and the stand-ins come back
behind you once you are 11.25 m away.

## Show a lighter model far away

A model with `far` and `far-from` (0.3) is drawn from the lighter
file while the viewer is that far or farther, and from its own when
nearer. A shark across the tank needs a tenth of the triangles of one
over your head:

```holoml-scene
<model id="shark-1" src="fish/shark.glb" far="fish/shark-far.glb" far-from="12"
       label="Blacktip reef shark" position="-10.9 4.2 11.9" animation="Swim" autoplay />
```

- Only the file the view needs loads at first; the other loads when the
  viewer comes near the line, and the model swaps once it is in.
- The swap waits a little past the line each way, so standing at the
  line does not make the model flicker.
- The far model plays the model's animation if it has one of the same
  name, takes its `material` changes, and is solid, casts shadows, and
  takes clicks as the model does.
- With loading by area, the stand-in shows until the group comes near;
  then the far model or the model itself, by the distance.

Make the far file with [Prepare glTF models](preparing-models.md#make-a-lighter-version-for-far-away).

## See also

- The specification: [loading by area](../../SPEC.md#loading-by-area),
  [`group`](../../SPEC.md#group), [`model`](../../SPEC.md#model),
  [limits](../../SPEC.md#limits), and the scene API's
  [things](../../SPEC.md#things) and [events](../../SPEC.md#events).
- [Prepare glTF models for a page](preparing-models.md)
- [Give a page places to go to, and a floor plan](places-and-plans.md)
- [Walk around, with walls and gravity](walking.md)
- [HyperSpace 3D's limits](../reference/limits.md)
- The sneaker store's [page](../../examples/sneaker-store/index.holoml)
  and [notes](../../examples/sneaker-store/README.md).
