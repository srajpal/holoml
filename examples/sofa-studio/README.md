# Sofa studio

A small shop page in HoloML 0.2: one sofa in a sunlit room.
Choose its fabric and its wood in place, watch the price follow, switch
the room to evening light, and go on to an ordinary web page to "add it
to the cart" (there is no shop behind it).

- Orbit around the room: drag, or the arrow keys; the wheel or + and -
  come closer.
- The Fabric and Wood choices (bottom left) change the sofa at once;
  Tab reaches them, and the arrow keys move between their options. The
  Light choice (top left) switches between day and evening.
- "Add to cart" (above the sofa) opens `cart.html`, which lists the
  choices; "About this studio" says what the page is made of.

Published at https://srajpal.github.io/holoml/sofa-studio/ (open
`index.holoml` there in a browser that shows HoloML 0.2, such as
[HyperSpace 3D](https://github.com/srajpal/hypersol-hyperspace-3d)).

## What it shows of HoloML 0.2

- `choice` and `option`: the Fabric and Wood choices name the sofa's
  materials (`target="#sofa" material="Fabric"`), and each option gives
  the material's pictures (`map`, `normal-map`, `roughness-map`) and how
  they tile (`repeat`). No script is needed to change the sofa.
- Light from the surroundings: the scene's `environment` is a photo
  studio's HDR panorama; the window's sun and the table lamp's spot
  cast soft `shadows` from everything in the room.
- Choices and scripts together: `studio.js` hears each `change`, shows
  the price in a `hud`, keeps the choices for the cart page in the
  tab's session storage, and, for the Light choice (a choice without a
  target), dims the fill and the sun and lights the lamp. Coming back
  from the cart, it sets the choices again (`thing.value`).

## What it is made of

See `models/CREDITS.md`: the sofa, the furniture, the fabrics, the
rug's and the floor's textures, and the light are Poly Haven's (CC0).
The sofa's name and prices are made up. The page loads about 12 MB
(every fabric's pictures load with it, so a choice shows at once) and
draws about 100,000 triangles.

## Making it again

From the repository root:

```
node examples/sofa-studio/tools/download.mjs
electron examples/sofa-studio/tools/prepare.mjs
```

`download.mjs` saves the models, textures, and light from Poly Haven's
API into `tools/cache/` (not kept in the repository), and checks each
file against the SHA-256 recorded for it in `tools/checksums.json`: a
file that Poly Haven has changed stops the tool (`--record` takes a new
or changed file, for you to look at and commit). `prepare.mjs`
(run with Electron, for its picture decoder) splits the sofa's single
material into Fabric and Wood by the colour of its own picture under
each triangle, recolours the frame's picture as oak and ebony and the
rug grey, re-encodes the pictures for the web, and makes the room, the
rug, and `models/CREDITS.md`.
