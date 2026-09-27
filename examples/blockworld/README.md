# Blockworld

A very small block game in HoloML 0.2 (draft): an island of blocks made
by the page's script from a seed. Break blocks, place them, and find the
five gems hidden in the stone before bringing them to the chest. A day
lasts four minutes; at night, torches give light.

- Walk with W, A, S, D (or the up and down arrows); Space jumps; Shift
  runs; drag to look around. In HyperSpace 3D the left and right arrows
  turn, and Page Up and Page Down look up and down, so the game can be
  played from the keyboard alone.
- Click a block to break it, right-click to place one; from the
  keyboard, E breaks and Q places the block under the crosshair. Keys 1
  to 5 choose what to place.
- The address can say `?seed=12` for another island, and `?hour=21` to
  start in the evening. With reduced motion, the clock stands still.

Published at https://srajpal.github.io/holoml/blockworld/ (open
`index.holoml` there in a browser that shows HoloML 0.2, such as
[HyperSpace 3D](https://github.com/srajpal/hypersol-hyperspace-3d)).

## What it shows of HoloML 0.2

- `index.holoml` holds the sky, the sun, eight torch lights, the chest,
  the sounds, and the text on the screen (`hud`); `game.js` does the
  rest through the scene API (`holoml`, SPEC.md section 10): it adds the
  island's blocks with `holoml.add`, breaks them with `remove`, hears
  clicks and keys, and moves the sun, the light, and the sky every frame.
- Walls and gravity: blocks are `solid`, and the viewpoint has
  `gravity`, `jump`, and a `crosshair`.
- Sounds start after the first click or key, as HoloML requires.
- Only blocks that can be seen are added (about 1,200 at the start), and
  blocks behind a broken one appear as it goes.

For the curious (and the browser's tests), `window.blockworld` tells
where the gems and the chest are, and what is where; it cannot change
anything.

## What it is made of

See `models/CREDITS.md`. The block textures and the sound effects are
Kenney's (CC0); the birds and crickets were made for this game.

## Making it again

From the repository root, with Kenney's packs downloaded and unpacked:

```
node examples/blockworld/tools/make-blocks.mjs "<voxel pack>/PNG/Tiles"
node examples/blockworld/tools/copy-sounds.mjs "<folder with impact-sounds, interface-sounds, music-jingles>"
node examples/blockworld/tools/make-ambience.mjs
```
