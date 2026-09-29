# Sneaker store

A sneaker store to walk through, in HoloML 0.2: one shoe, the
Everyday Runner, in ten colourways on the walls of a bright hall. Each
bay's shoes load as you come near; until then a lighter copy of each
stands in. Open a shoe to see it close up on a turntable: go around it,
turn it over to see the sole, choose its colour (it changes in place)
and its size, and add it to your cart. The checkout page lists the cart
and places nothing (the store, its shoe's name, and its prices are made
up).

- Walk: the arrow keys or W, A, S, D; drag to look around. The walls,
  the bays, the bench, and the counter stop you.
- Places: the page's list of places ("Go to: Midnight", and so on) moves
  you from bay to bay; an address ending in `#forest` starts there.
- Shoes: click a shoe, or its bay's name, to open its page (with a
  fade); on the shoe's page, "Turn it over" and "Add to cart" are also
  buttons that Tab reaches and Enter or Space presses, and the colour
  and size are choices in the corner of the screen.
- The cart (top left) counts what you added; "Checkout" (on the
  counter, and on each shoe's page) opens `checkout.html`.

Published at https://srajpal.github.io/holoml/sneaker-store/ (open
`index.holoml` there in a browser that shows HoloML 0.2, such as
[HyperSpace 3D](https://github.com/srajpal/hypersol-hyperspace-3d)).

## What it shows of HoloML 0.2

- Loading by area: each bay's six shoes are in a `group` with
  `load="near"` and `near="7.5"`. The group loads its models only while
  the viewer is within 7.5 m of it, and lets them go (their memory, and
  their share of the page's limits) beyond half as much again. The two
  bays by the entrance load with the page; the other eight come as you
  walk.
- Stand-ins: every shoe has a `stand-in`, the same shoe with about a
  ninth of its triangles and a tiny picture, which shows in its place
  until the shoe has loaded and again once it is let go.
- A `choice` that changes a model's material in place (the colours, each
  a picture of its own), and one only the script reads (the sizes).
- Click actions without a script: "Turn it over" is an `animate` with
  `begin="click"` and `toggle` that turns the shoe over about its middle;
  "Add to cart" is a `sound` on its trigger, and the script hears the
  click (from the mouse or the keyboard) and adds the shoe to the cart.
- Places, links through a fade, panels, `solid` walls and bays, and
  `shadows`: the shoes' fall on the floors of their cubbies.
- Scripts: `store.js` and `shoe.js` keep the cart in the tab's session
  storage, with `colourways.js`, a module both import; `checkout.html`
  reads it too.

## What it is made of

The shoe is "Materials Variants Shoe" © 2021 Shopify, Inc., from the
Khronos glTF Sample Assets, under CC BY 4.0: see `models/CREDITS.md`.
Its own three colours are the store's Midnight, Beach, and Street; the
other seven are made from its picture. The mark on its heel tab and the
lettering on its midsole are painted out (its licence leaves out logos
and trademarks). The hall, the bays, the bench, the counter, the plants,
the turntable, and the chime are made by `tools/prepare.mjs`. The store
loads about 2.4 MB in 24 files at first, and each bay's shoes about
0.7 MB more as you come near.

## Making it again

From the repository root:

```
node examples/sneaker-store/tools/download.mjs
electron examples/sneaker-store/tools/prepare.mjs
```

`download.mjs` saves the shoe (its glTF, buffer, pictures, and licence)
from the Khronos glTF Sample Assets, at a fixed commit, into
`tools/cache/` (not kept in the repository). `prepare.mjs` (run with
Electron, for its picture decoder and encoder) makes the colourways and
their pictures, the shoe's models and stand-ins, the room's models, the
chime, and `models/CREDITS.md`, and writes the places, the shelves, the
bays, and the colour options into `index.holoml` and `shoe.holoml`
between their `prepare.mjs` comments. `colourways.js` holds the
colourways, their colours, and their prices.
