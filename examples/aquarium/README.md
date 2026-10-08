# Ocean tunnel

An aquarium to walk through, in HoloML 0.3: a glass tunnel along the
floor of a tank 24 m wide, 34 m long, and 6.5 m deep. Great white
sharks, a hawksbill sea turtle, tuna, barramundi, and schools of bream,
mackerel, snapper, clownfish, and copperband butterflyfish swim over
and around you, among rocks, plants that sway, and bubbles rising from
air stones, with light from the surface playing over the sand. Feed the
fish, and click one to read about it.

- Walk: the arrow keys or W, A, S, D; drag to look around. The ledges
  along the tunnel and the rail at its end keep you off the glass.
- Places: the page's list of places ("Go to: In the tunnel", and so on);
  an address ending in `#feeding` starts at the feeding place.
- Feed: the Feed button halfway along the tunnel, or F. Food falls from
  the surface, and the nearest fish swim up to it and eat it; the corner
  of the screen says when they have eaten.
- The fish: click one, or choose its kind in the page's list (each kind
  has an "About" button there, for the keyboard and screen readers), and
  the board in the tunnel tells about it.
- With reduced motion the fish, the bubbles, and the light hold still,
  and feeding puts the food down and says that the fish have eaten.

Published at https://srajpal.github.io/holoml/aquarium/ (open
`index.holoml` there in a browser that shows HoloML 0.3, such as
[HyperSpace 3D](https://github.com/srajpal/hypersol-hyperspace-3d)).

## What it shows of HoloML

- A lighter fish far away (HoloML 0.3): each fish has `far`, a version
  with about a fifth of its triangles (the mackerel, 29 per cent) and
  smaller pictures, drawn from `far-from` (10 m) on, so the tank draws
  much less of what is too far to see well. A fish keeps its swim either way.
- Names (HoloML 0.3): each fish has a `label`, its kind, which screen
  readers say and the page's list of things shows.

- Water: one `water` element fills the tank. What is seen through it
  fades into its colour with how far the view goes through the water
  (`clarity`, 16 m here), and with `caustics` the moving net of light
  from the waves plays over the sand, the rocks, and the fish.
- Sounds from a place: each air stone's bubbling is a `sound` with a
  `position` and a `range`, louder as you walk near and from its side;
  the water's rush comes from everywhere.
- The scene API: the page's script (aquarium.js) moves 30 fish every
  frame, turns each to where it swims, and sets its `animationSpeed`, so
  that its tail beats faster when it hurries to food; it adds bubbles and
  food with `holoml.add`, hears clicks and keys, and writes the board
  (`text` of a `panel`) and the corner of the screen (`hud`).
- Click actions: the Feed button and each kind's first fish play a sound
  when clicked, and are buttons in the outline for the keyboard.
- Shadows of the fish and the rocks on the sand, places to go to, and
  models that play their own animations (the plants' sway, the fish's
  swim).

## Files

- `index.holoml`: the tank, the tunnel, and the gallery; `about.holoml`:
  about the aquarium and its credits; `index.html`: for browsers that do
  not show HoloML.
- `aquarium.js`: the page's script; `ocean.js`: the layout (the tank,
  the tunnel, the rocks, the plants) and the fish (how many, how fast,
  how deep, and what the board says), which the script and the tools
  share, and `keepClear`, which keeps a fish in the water and clear of
  the tunnel and the rocks.
- `models/`: the fish, the tank's parts, and `CREDITS.md`; `sounds/`:
  the water, the bubbles, the food's plop, and the fish buttons' blip.
- `tools/`: `download.mjs` fetches the fish and Poly Haven's rock, log,
  shell, and sand (checked against their checksums) into `tools/cache/`
  (not committed); `prepare.mjs` makes everything else from them and
  from `ocean.js`, with `fish.mjs` (the fish's sources and credits),
  `licence.mjs` (both tools stop when a file's own licence stamp is not
  the licence its credit gives, or is not CC BY 4.0 or CC0), `fit.mjs`
  and `rig.mjs` (fitting a fish for the tank, and giving a swim to a
  fish or a turtle that has none), `shapes.mjs`, and `glb.mjs`;
  `far.mjs` makes each fish's lighter version, with glTF Transform (a
  development package of this repository):

  ```
  node examples/aquarium/tools/download.mjs
  electron examples/aquarium/tools/prepare.mjs
  node examples/aquarium/tools/far.mjs
  ```

  `prepare.mjs` rewrites the parts of `index.holoml` between its
  "prepare.mjs" comments: the rocks, the plants, the air stones, and the
  fish.

## Credits

The fish are under the Creative Commons Attribution 4.0 International
licence (CC BY 4.0, https://creativecommons.org/licenses/by/4.0/),
except the barramundi (CC0): see `models/CREDITS.md` for each author
and source, and for what was changed in each. None is under a
"non-commercial", "no derivatives", or "share alike" licence. The boulders, the log, the shell, and the sand are
from Poly Haven (CC0). Everything else is made by `tools/prepare.mjs`,
under the repository's licence.
