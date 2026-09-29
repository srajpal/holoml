# Harbour Loft

A flat to tour, for an estate agent, in HoloML 0.2 (draft): the top floor
of an old sail loft on a harbour. Walk through its rooms, open the doors,
switch the lamps on, read about each room on a panel, see where you are
on the floor plan, look out at the marina, go up to the roof terrace, and
book a viewing (the flat, its price, and the agent are made up).

- Walk: the arrow keys or W, A, S, D; drag to look around. The walls and
  the furniture stop you.
- Places: the page's list of places ("Go to: Kitchen", and so on) moves
  you from room to room; an address ending in `#kitchen` starts there.
- Doors and lamps: click a door to open it and again to shut it; click a
  switch, or a lamp, to light it. Each is also a button that Tab reaches
  and Enter or Space presses.
- The Light choice (top left) turns the day to evening; the floor plan
  (top right) shows where you are and which way you face.
- Links: "Book a viewing" (in the hall) opens `booking.html`, a form that
  sends nothing; "About this tour" says what the site is made of; the
  door in the living room's old brick wall goes up to the roof terrace,
  with a fade, and the stair house's door there comes back down.

Published at https://srajpal.github.io/holoml/harbour-loft/ (open
`index.holoml` there in a browser that shows HoloML 0.2, such as
[HyperSpace 3D](https://github.com/srajpal/hypersol-hyperspace-3d)).

## What it shows of HoloML 0.2

- `panel`: the estate agent's words on a board in each room, wrapped to
  the board's width, with paragraphs; Find in page, screen readers, and
  the text view read them. Panels in a link are the page's buttons.
- Click actions, without a script: each door is a `group` around its
  hinge, and an `animate` with `begin="click"`, `toggle`, and a `label`
  swings it open and shut, with a `sound` on the same trigger. A switch
  (or a lamp) runs several actions at once: its light's `intensity`, and
  the `scale` of its bulb's glow.
- Places: seven `viewpoint` elements with an `id` and a `label`; the
  first is where the viewer starts, and says how they move (`walk`).
  The terrace's way back is a link to `index.holoml#terrace-door`.
- Arriving: a link to another HoloML page of the same site (the roof
  terrace) fades out and in.
- `sky`: the harbour's panorama, drawn through the windows; the same
  place's HDR panorama is the `environment` that lights the rooms, and
  both dim with the ambient light in the evening.
- `plan`: the floor plan, a picture of the flat from above with a
  marker for the viewer.
- From earlier in 0.2: `solid` walls and furniture, `shadows` from the
  sun through the windows, a `choice` for the light, and a script
  (`loft.js`) that turns the day to evening and keeps the choice for the
  tour's other pages.

## What it is made of

See `models/CREDITS.md`: the furniture, the textures, and the harbour
(Simon's Town harbour, as a panorama) are Poly Haven's (CC0). The
walls, the windows, the doors, the kitchen, the bathroom, the bed, the
wardrobe, the terrace, the floor plan, and the sounds are made by
`tools/prepare.mjs`. The flat's page loads about 19 MB in 56 files and
draws about 250,000 triangles; each model is one `.glb` file with its
pictures inside, so the page makes few requests (as `.gltf` files with
their pictures beside them, the flat took 200).

## Making it again

From the repository root:

```
node examples/harbour-loft/tools/download.mjs
electron examples/harbour-loft/tools/prepare.mjs
```

`download.mjs` saves the models, textures, and the harbour's panorama
from Poly Haven's API into `tools/cache/` (not kept in the repository).
`tools/layout.mjs` is the flat's plan: its walls and their openings, its
rooms, the doors' hinges, and where each piece of furniture stands.
`prepare.mjs` (run with Electron, for its picture decoder and a canvas)
makes every model, re-encodes the pictures for the web, makes the sky,
the light, the floor plan, the sounds, and `models/CREDITS.md`, and
writes the walls, windows, and furniture into `index.holoml` between its
two `prepare.mjs` comments. The doors, lamps, panels, places, and links
are written in the page by hand.
