# Fill a tank or a pool with water

This guide fills part of a scene with water (0.2): a tank to look into,
a pool, or a stretch of sea that the viewer walks under in a tunnel.
What is seen through the water fades into its colour with distance, and
light from its waves can play over what is in it. The
[ocean tunnel](../../examples/aquarium/index.holoml) fills its tank with
one `water` element.

## Add the water

The water is a box, and a scene has at most one, directly in `scene`:

```holoml-each
<water position="0 -0.3 -3" size="24 6.8 34" color="#1d5f7c" clarity="16" caustics />
<water position="0 0 -4" size="6 1.2 3" color="#3a9fc0" clarity="25" />
```

- `position`: the middle of the water's floor; `0 0 0` by default.
- `size`: its width (x), height (y), and depth (z), in metres. It has no
  default. Its top is the surface.
- `color`: the colour that things seen through it fade into;
  `#1f6f8b` by default.
- `clarity`: how far one can see through it, in metres; 15 by default.
- `caustics`: the moving net of light that the waves on the surface
  cast on what is under them (see "Light from the waves").

The first is the aquarium's: a tank 24 m wide and 34 m long, whose
water's floor is at y = -0.3 and its surface at 6.5 m. The second is a
pool 6 m by 3 m and 1.2 m deep, standing on the floor.

## Choose the colour and the clarity

What is seen through the water fades into `color` evenly with how far
the view travels through the water: a thing `clarity` metres into it has
faded fully, and one half as far has half faded.

- From inside the water, the whole way to the thing counts.
- From outside, only the part of the way inside the box counts, as when
  looking into a tank through its glass.
- The background and the sky do not fade, and neither do labels and
  panels: their text stays as it is, to be read. The aquarium's board,
  a panel in the tunnel, stays as clear as it would be out of the water.

The aquarium's clarity of 16 m, in a tank 34 m long, leaves the fish
near the glass close to their own colours, and fades the far end of the
tank into blue.

The box is water throughout, the air in it too. The aquarium's tunnel
runs along the tank's floor, inside the box, so seen from the tunnel
even the near glass and the walkway take a little of the blue; a clear
water keeps that small.

## Change the water from a script

In a 0.3 page, water with an `id` is a thing a script changes, for
example murkier as the tank is fed:

```js
const tank = holoml.find('tank');
tank.clarity = 8; // metres; more than 0
tank.color = '#2a6f6b';
```

## Keep the walker where they belong

The water is not solid and has no weight. The walker is stopped by the
page's own solid models, such as a tank's glass, not by the water, and
sounds and gravity are as they are anywhere else.

A solid model stops the walker at its bounding box (the smallest box,
lined up with x, y, and z, that holds it). A flat pane of glass along a
wall fills its box, but a curved tunnel does not: its box takes in the
walkway too, and marked solid it would stop the walker at its mouth. So
the aquarium leaves its tunnel unmarked, and keeps the walker off the
glass with thin solid ledges along its sides and a rail across its end:

```holoml-scene
<viewpoint position="0 1.6 5" look-at="0 2.8 -3" mode="walk" />
<model src="models/tank.glb" />
<model src="models/tunnel.glb" />
<model src="models/ledge.glb" position="-1.95 0 1" solid />
<model src="models/ledge.glb" position="1.95 0 1" solid />
<model src="models/rail.glb" position="0 0 -11.6" solid />
```

[Walking](walking.md) has more on walls and gravity.

## Light from the waves

With `caustics`, a net of light plays over what is in the water: most
on what faces up to the surface (floors, rocks, the backs of fish), and
fainter the deeper it is. It moves, and when the viewer has asked for
reduced motion (their system's setting for less movement on screen), it
holds still.

Nothing else depends on it. A renderer may leave it out when it has to,
and should then say so where the page's author can see it: HyperSpace 3D,
drawing in software on a computer without a graphics card, may leave
the water's moving light out, and says so in its console.

## Keep still what a script moves

Reduced motion holds the water's light still, but not what the page's
scripts move. `holoml.reducedMotion` is `true` when the viewer asked for
it; a script then keeps still what would only move for effect. The
aquarium's fish and bubbles hold still, and food for them is put down at
once:

```js
// From the aquarium's aquarium.js (shortened): nothing swims with reduced motion.
let stop = null;
function start() {
  if (stop || holoml.reducedMotion) return;
  stop = holoml.on('frame', (e) => {
    if (holoml.reducedMotion) {
      stop();
      stop = null;
      return;
    }
    swim(Math.min(0.1, e.dt / 1000), e.time / 1000);
  });
}
start();
// Reduced motion can be turned on and off while the page is open.
setInterval(() => {
  if (!holoml.reducedMotion) start();
}, 1000);
```

## Try it

- Walk from outside the water into it, if the page lets you, and watch
  near and far things fade.
- Look at the labels and panels in and behind the water: they stay
  clear.
- Turn on your system's setting for less motion: the light on the floor
  holds still.

## See also

- The specification: [`water`](../../SPEC.md#water),
  [walls and gravity](../../SPEC.md#walls-and-gravity),
  [shadows](../../SPEC.md#shadows),
  [the `holoml` object](../../SPEC.md#the-holoml-object), and
  [accessibility](../../SPEC.md#14-accessibility-considerations).
- [Walk around, with walls and gravity](walking.md)
- [Light a scene](lights-and-looks.md)
- [Add sound, and sound from a place](sound.md)
- [Prepare glTF models for a page](preparing-models.md)
- The ocean tunnel's [page](../../examples/aquarium/index.holoml),
  [script](../../examples/aquarium/aquarium.js), and
  [notes](../../examples/aquarium/README.md).
