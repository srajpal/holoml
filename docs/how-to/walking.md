# Walk around, with walls and gravity

This guide lets the viewer walk through a scene, as through a room,
instead of orbiting it: where they start and which way they look, walls
and furniture that stop them, gravity and jumping, a crosshair for
aiming, and how fast they walk and turn. Everything after the first
section needs a page that says `version="0.2"`.

## Start the viewer walking

Give the scene's `viewpoint` the mode `walk`:

```holoml-scene
<viewpoint position="0 1.6 -1.6" look-at="0 1.4 -12" mode="walk" />
```

- `position` is where the viewer's eyes start. Without gravity (below),
  they stay at that height as the viewer walks; 1.6 m is a standing
  person's view.
- `look-at` is the point they look at when the page opens.

In HyperSpace 3D, the viewer walks with W, A, S, D or the up and down
arrows, turns with the left and right arrows, and looks up and down with
Page Up and Page Down; Shift runs, and dragging looks around. Say so on
the screen, for example in a `hud` (see
[Put text in the scene and on the screen](text.md)). A page with
several viewpoints has places to go to (see
[Give a page places to go to, and a floor plan](places-and-plans.md));
the one the viewer starts at says how they move.

## Stop the walker at walls

Mark what should stop the walker `solid`: a model, or a group, which
marks every model in it. The sneaker store's hall, shortened:

```holoml-scene
<viewpoint position="0 1.6 -1.6" look-at="0 1.4 -12" mode="walk" />
<model src="models/floor.glb" />
<group solid>
  <model src="models/wall.glb" position="-5.1 0 -13" scale="0.2 4.2 26.4" />
  <model src="models/wall.glb" position="5.1 0 -13" scale="0.2 4.2 26.4" />
  <model src="models/wall.glb" position="0 0 -26.1" scale="10.4 4.2 0.2" />
  <model src="models/wall.glb" position="0 0 0.1" scale="10.4 4.2 0.2" />
  <model src="models/bench.glb" position="0 0 -13" />
</group>
```

The walker is a body 0.6 m wide and 1.8 m tall, with its eyes 1.6 m
above its feet. A solid model stops it at the model's bounding box: the
smallest box, lined up with x, y, and z, that holds the model. That
decides how to build a place to walk in:

- Make each wall a model of its own. A single model of a whole room has
  one box around all of it, and a walker who starts inside a solid
  model can walk out of it. The sneaker store's walls, above, are one
  box model stretched to each wall; Harbour Loft's are the same, with a
  piece for each stretch of wall between its doors and windows.
- Build what surrounds the walker in parts: Harbour Loft's roof terrace
  has a solid railing on each side of its deck, not one railing model
  around it all.
- Make doorways wider than the walker (0.6 m) and higher (1.8 m).
- Leave out of `solid` what the walker walks over or cannot reach:
  Harbour Loft marks its walls and furniture, but not its floor, its
  rug, or the books on its shelves.

Harbour Loft's doors are solid models in groups at their hinges: shut,
they stop the walker, and a click swings them open (see
[Make doors that open and lamps that switch on](doors-and-lamps.md)).
A script can also change whether a model or a group is solid (a
thing's `solid`).

## Add gravity and jumping

With `gravity` on the viewpoint, the walker falls (9.8 m/s²) until it
stands on a solid model or on the floor, y = 0. With `jump` as well,
the Space key jumps, about 1.2 m up. Blockworld starts the viewer above
its island, to fall onto it:

```holoml-scene
<viewpoint position="0.5 16 3.5" look-at="0.5 15 -8" mode="walk" gravity jump />
```

With gravity, the walker climbs onto things only by jumping, so a stair
of solid steps is climbed one jump at a time, and without `jump` not at
all. To take the viewer to another floor, link to another page: Harbour
Loft's door marked "Up to the roof terrace" is a link to the terrace, a
page of its own.

Without `gravity`, the eyes keep their height, and solid models still
stop the walker. On a flat floor that is all a page needs: Harbour Loft
and the sneaker store have no gravity. Blockworld, where the ground is
made of blocks to climb and dig through, has it.

## Aim with a crosshair

`crosshair` on the viewpoint puts a small cross in the middle of the
view. A script asks what is under it with `holoml.aim()`, which gives
`{ thing, point, normal }` as a click does, or `null`, so the keyboard
can do what the mouse does: Blockworld breaks the block under the
crosshair with E, and places one with Q.

```js
// E removes what is under the crosshair.
holoml.on('key', (e) => {
  if (!e.down || e.key.toLowerCase() !== 'e') return;
  const hit = holoml.aim();
  if (hit?.thing) hit.thing.remove();
});
```

With the arrow keys to turn, and Page Up and Page Down to look up and
down, the viewer aims without a mouse.

## Set how fast the viewer walks and turns

- `speed` is how fast the viewer walks, in metres a second, from 0.5 to
  10 (2.2 by default). HyperSpace 3D's running key, Shift, goes faster
  than this.
- `turn-speed` is how fast they turn, and look up and down, from the
  keyboard, in degrees a second, from 10 to 720 (90 by default).

Blockworld's viewer, with its crosshair, walks at 4.3 metres a second
and turns at 120 degrees a second:

```holoml-scene
<viewpoint position="0.5 16 3.5" look-at="0.5 15 -8" mode="walk" gravity jump crosshair speed="4.3" turn-speed="120" />
```

## Change the speeds from a script

A script reads and sets the speeds through `holoml.viewer.speed` and
`holoml.viewer.turnSpeed`, which start as the viewpoint says. A value
outside the ranges above is an error. Blockworld lets the viewer choose
a pace with a slider, from half its own to twice:

```holoml
<holoml version="0.2">
  <head>
    <script src="pace.js" />
  </head>
  <scene>
    <viewpoint position="0 1.6 8" mode="walk" speed="4.3" turn-speed="120" />
    <slider id="pace" corner="top-left" min="0.5" max="2" step="0.25" value="1">Speed 1×</slider>
  </scene>
</holoml>
```

```js
// pace.js: the slider "pace" (from 0.5 to 2) sets how fast the viewer walks and turns.
const WALK = 4.3; // metres a second at 1×, the viewpoint's speed
const TURN = 120; // degrees a second at 1×, its turn-speed
const pace = holoml.find('pace');
holoml.on('change', (e) => {
  if (e.thing !== pace) return;
  holoml.viewer.speed = WALK * e.value;
  holoml.viewer.turnSpeed = TURN * e.value;
  pace.text = `Speed ${e.value}×`;
});
```

At the slider's ends the speeds stay inside their ranges: 2.15 to 8.6
metres a second, and 60 to 240 degrees a second. A script can also move
the viewer, by setting `holoml.viewer.position`, and turn them, with
`holoml.viewer.lookAt(point)`.

## See also

- The specification: [`viewpoint`](../../SPEC.md#viewpoint),
  [walls and gravity](../../SPEC.md#walls-and-gravity), and the scene
  API's [viewer](../../SPEC.md#the-viewer) and
  [events](../../SPEC.md#events).
- [Offer sliders and choices](sliders-and-choices.md), and
  [Make doors that open and lamps that switch on](doors-and-lamps.md).
- Blockworld's [page](../../examples/blockworld/index.holoml) and
  [script](../../examples/blockworld/game.js), and Harbour Loft's
  [page](../../examples/harbour-loft/index.holoml).
