# Harbour Loft: the design, while it is being built

A working note for milestone 19 (browser repository, TODO.md; prompts 113
and 114), written at a hand-off (prompt 116). It records what was decided
and measured, so the next session can write `prepare.mjs` and the pages
without working it out again. When the site is done, its README takes
what readers need, and this note goes.

## Where it stands (2026-09-28)

- Done: HoloML 0.2's third part (SPEC.md, checker, conformance samples;
  commits e298e6f and 1a6d579 on this branch, `harbour-loft`), and the
  browser's viewer for it (browser branch `m19-harbour-loft`, checks V2
  to V7 passing).
- Here: `download.mjs` (run once; its cache, 54 MB, is in `tools/cache/`,
  ignored by git) and `layout.mjs` (the walls, openings, and rooms).
- Next: `prepare.mjs`, then the pages (`index.holoml`, `terrace.holoml`,
  `about.holoml`, `booking.html`, `index.html`, `README.md`, `loft.js`),
  then the browser's checks V8 to V10 and its examples card.

## Assets (all Poly Haven, CC0; `download.mjs`)

Measured from the cached glTF files (node transforms applied), in
metres, width (x) × height (y) × depth (z); each model's origin is at
its base, centred, unless noted.

| Model | Size | Use, and notes |
|---|---|---|
| sofa_02 | 1.81 × 0.71 × 0.82 | Living room, black leather; front probably +z (check) |
| mid_century_lounge_chair | 1.01 × 1.17 × 1.19 | Living room, by the sofa |
| coffee_table_round_01 | 1.30 × 0.49 × 1.30 | Living room, on the rug |
| modern_wooden_cabinet | 2.44 × 0.68 × 0.52 | Living room sideboard, against the middle wall |
| hanging_picture_frame_02 | 0.75 × 0.50 × 0.03 | Above the sideboard; its back at z = 0, it hangs from y 0.22 |
| side_table_tall_01 | 0.38 × 0.76 × 0.38 | Living room, with a pipe lamp on it |
| industrial_pipe_lamp | 0.18 × 0.36 × 0.26 | Living room and the two bedside lamps (clickable) |
| throw_pillows_01 | 1.02 × 0.45 × 0.63 | On the sofa (and the bed) |
| potted_plant_04 | 0.17 × 0.27 × 0.19 | Small aloe: scale about 2.8 on the floor, 1 on desks |
| round_wooden_table_01 | 1.40 × 1.00 × 1.40 | Dining; bar height, so scale "0.85 0.75 0.85" |
| painted_wooden_chair_01 | 0.43 × 0.96 × 0.54 | Four, around the dining table |
| metal_stool_01 | 0.35 × 0.88 × 0.35 | Three at the island; scale 0.8 (counter height) |
| modern_ceiling_lamp_01 | 0.43 × (0.22 to 1.17) × 0.43 | Pendants: hall, two over the island, bathroom; top at the ceiling, so y = 3.0 − 1.173 = 1.827 |
| metal_office_desk | 2.00 × 0.79 × 0.95 | Study, along the outer wall; rotation "0 90 0" (long side along z, front +x) |
| modern_arm_chair_01 | 0.82 × 1.02 × 0.99 | Study desk chair, rotation "0 -90 0" |
| desk_lamp_arm_01 | 0.20 × (−0.09 to 0.81) × 0.61 | Study (clickable); a clamp lamp, set at the desk's height, 0.79 |
| steel_frame_shelves_01 | 10.97 × 21.4 × 5.02 | Made ten times too large: scale 0.1 (1.1 × 2.14 × 0.5). Study |
| side_table_01 | 0.55 × 0.55 × 0.45 | Bedside tables |
| outdoor_table_chair_set_01 | 0.78 × 0.86 × 1.83 | Terrace |
| planter_box_02 | 1.25 × 0.45 × 0.47 | Terrace |

Left out for size (the page stays near 30 MB): potted_plant_01 (6 MB),
industrial_wall_lamp (3.6 MB), classic_laptop; decorative_book_set_01
has no glTF (books are made by `prepare.mjs` instead). No Poly Haven bed
suits a modern loft (GothicBed_01, old_bed_frame, vintage_day_bed), so
the bed is made from Poly Haven fabrics, as the kitchen and bathroom are
(Q6 a).

Textures (1k; the size one picture covers, from Poly Haven's info, sets
how often it tiles):

| Texture | One picture | Use |
|---|---|---|
| herringbone_parquet | 3.4 m | Every floor but the bathroom's |
| interior_tiles | 1.9 m | Bathroom floor |
| long_white_tiles | 1.27 m | Bathroom walls to 1.2 m, the shower to 2.3 m |
| marble_01 | 1.5 m | Kitchen worktop, splashback, island top |
| oak_veneer_01 | 1.83 m | Kitchen and island fronts, the vanity |
| white_oak_veneer | 0.5 m | Bed frame |
| brick_wall_001 | 3.0 m | The living room's outer wall (the old brick wall) |
| poly_wool_herringbone | 0.27 m | Living room rug; the bed's headboard |
| waffle_pique_cotton | 0.28 m | Duvet: yellow, so tint it off-white (dark 196,190,178; light 247,244,237), as the sofa studio tints its rug |
| brown_planks_09 | 1.0 m | Terrace decking |

The harbour: simons_town_harbour (Greg Zaal, Rico Cilliers). Its 1k HDR
lights the scene (`light/harbour.hdr`); Poly Haven's own tonemapped
picture of it (6 MB, cached), scaled to 4096 × 2048 as a JPEG, is the
sky (`light/sky.jpg`). No turning is needed: three.js shows a panorama's
u = 0.75 along +z, which is the marina, and the panorama's sun (u about
0.64, v about 0.7) shines from about (0.52, 0.59, 0.62): the sun light
goes at `position="10.4 11.8 12.4" look-at="0 0 0"`, and falls through
the harbour windows. Warm white, #fff1dc, with shadows.

## The flat (`layout.mjs`)

+z is the harbour: the tall windows. The entrance is at −z. Inside the
outer walls x runs from −6 to 6 and z from −3.75 to 3.75; ceiling 3.0 m;
outer walls 0.2 m thick, inner walls 0.12 m. About 90 m²: living room
and kitchen (40), hall (10), study (10), bedroom (18), bathroom (12).

- Walls: every piece is `models/wall.gltf`, a unit cube (plain paint,
  #eeeae3), placed and scaled, one `<model ... solid />` each inside a
  `<group shadows>`: one model's box covers a whole model, so a wall
  with a door must be separate pieces for the walker to pass. Repeated,
  they are drawn as instances. `prepare.mjs` writes these lines into
  `index.holoml` between two comments (`wallBoxes` gives them).
- The brick wall (x −6, from z −1.25 to 3.75) is one model of its own,
  brick inside; its door to the terrace stairs (z 0.4 to 1.4) is a link,
  not a passage, so one box is right.
- Openings: harbour windows 1.6 × 2.4 (sill 0.3); study and bedroom side
  windows 1.3 × 1.6 (sill 0.9); a small frosted bathroom window; the
  entrance door (static); a 1.8 m opening from the hall to the living
  room; three inner doors 1.0 m wide (the walker is 0.6 m wide).
- Floors: one parquet quad under everything, and the bathroom's tiles 2
  mm above it; the ceiling one quad facing down (it casts the sun's
  shadow). Floors and rugs must not be solid: the walker's box reaches
  down to y = 0.
- Glass (windows, the shower screen, the terrace door and balustrade) in
  models of its own outside the shadows group: glass in a shadow map
  blocks the sun.

## Doors, lamps, and switches (click actions)

Doors (`models/door.gltf`: a 0.96 × 2.04 × 0.04 leaf, its hinge edge at
x = 0, lever handles both sides) in a hinge group, `solid`, with a door
sound (`sounds/door.wav`), toggles, 0.8 s:

| Door | Hinge group at | Rotation, closed → open |
|---|---|---|
| Study (label "Study door") | −2, 0, −3.05 | "0 −90 0" → "0 −180 0" (into the study) |
| Bathroom ("Bathroom door") | 2, 0, −3.35 | "0 −90 0" → "0 0 0" (into the bathroom) |
| Bedroom ("Bedroom door") | 2, 0, 0.55 | "0 90 0" → "0 0 0" (into the bedroom, clear of the bedside table) |

Lights (point lights, intensity 0 until switched; about 1.2 when on;
warm #ffd9a6), each toggled over 0.2 s with `sounds/switch.wav`:

- Hall pendant: light at (0, 1.9, −2.5), range 5; wall switch on the
  entrance wall at (−0.8, 1.1, −3.745), facing +z ("Hall light").
- Kitchen: two pendants at (−4.6, 1.827, 0.45) and (−3.6, 1.827, 0.45),
  one light at (−4.1, 1.95, 0.45), range 5; switch on the hall-living
  wall's living side at (−1.0, 1.1, −1.185) ("Kitchen lights").
- Bathroom pendant at (4.0, 1.827, −2.3), light range 4.5; switch in the
  hall on the middle wall at (1.935, 1.1, −3.55), facing −x ("Bathroom
  light").
- Living room: the pipe lamp itself is the trigger ("Living room lamp").
- Bedside lamps, left and right, each its own light ("Bedside lamp,
  left" and "right").
- Study: the desk lamp is the trigger ("Desk lamp").

`models/switch.gltf`: a white plate 0.086 × 0.086 × 0.01 with a rocker,
facing +z.

## Furniture positions (to check by eye once drawn)

- Kitchen run (`kitchen.gltf`, made): along the hall-living wall's
  living side, from x −6.0 to −2.3, 0.62 deep (z −1.19 to −0.57): a
  fridge column (0.6), five base bays of 0.6 with oak fronts and steel
  bar handles, a marble worktop (0.88 to 0.92) and splashback, a sink
  and tap in bay 2, a black glass hob in bay 4 with a steel hood above,
  upper units elsewhere; dark plinth and carcass.
- Island (`island.gltf`, made) at (−4.1, 0, 0.45): 2.0 × 0.92 × 0.9,
  marble top overhanging 0.28 on the +z side; three stools at z 1.35.
- Dining: table at (−4.3, 0, 2.7); chairs at (−4.3, 1.95), (−4.3,
  3.45), (−5.05, 2.7), (−3.55, 2.7), each facing the table.
- Living: sofa at (−0.6, 0, 0.9) facing +z; coffee table and rug (2.4 ×
  1.7) at (−0.6, 0, 2.15); lounge chair at about (1.0, 0, 2.5) turned
  toward the sofa; sideboard against the middle wall (x 1.94) centred
  at z 1.83, facing −x, the picture above it; tall side table and lamp
  at (1.55, 0, 3.3); plants near the windows.
- Study: desk centred at (−5.53, 0, −2.53); chair at (−4.75, 0, −2.5);
  desk lamp at about (−5.85, 0.79, −3.25); shelves against the entrance
  wall at (−3.4, 0, −3.5), facing +z, with made books.
- Bedroom: bed (`bed.gltf`, made: white oak platform, mattress, tinted
  duvet, pillows, grey wool headboard; the headboard's back at local
  z = 0) at (4.1, 0, −0.69), reaching z 1.41; bedside tables at (2.8,
  0, −0.44) and (5.4, 0, −0.44) with the lamps on them at y 0.548;
  wardrobe (`wardrobe.gltf`, made, 1.7 × 2.4 × 0.6, three white doors)
  against the outer wall at z 2.0 to 3.7, rotation "0 −90 0".
- Bathroom (all made, each its own model so each is its own solid box):
  bath 0.8 × 1.7 against the outer wall at x 5.2 to 6.0, z −3.75 to
  −2.05; walk-in shower 1.0 × 1.0 in the corner at x 5.0 to 6.0, z −1.81
  to −0.81, glass along z −1.81; vanity with basin, tap, and mirror at
  (3.4, 0, −0.81) facing −z; wall-hung toilet at (2.06, 0, −1.6) facing
  +x; white tiles to 1.2 m (`bath-tiles.gltf`).

## Places (viewpoints, all `mode="walk"`, eyes at 1.6)

Every viewpoint says `mode="walk"`: the one the viewer starts at says how
they move, and the terrace link arrives at `#terrace-door`.

| id | label | position | look-at |
|---|---|---|---|
| hall (first: the start) | Hall | 0 1.6 −2.9 | 0 1.45 3.75 |
| living | Living room | −0.6 1.6 −0.35 | −0.8 1.3 3.75 |
| kitchen | Kitchen | −2.9 1.6 1.9 | −4.6 1.05 −0.9 |
| bedroom | Bedroom | 2.75 1.6 0.9 | 5.0 1.0 2.8 |
| study | Study | −2.7 1.6 −2.5 | −5.6 1.2 −2.5 |
| bathroom | Bathroom | 2.75 1.6 −2.1 | 5.6 1.0 −2.6 |
| terrace-door | By the terrace door | −5.25 1.6 0.9 | 1.0 1.4 1.2 |

## Panels (the estate agent's words; board #f7f4ee, text #1f2328, size about 0.045)

- Hall, on the middle wall's hall side at z −1.83, facing −x: "Harbour
  Loft, 90 m²" / "The top floor of an old sail loft on the quay: an
  open living room and kitchen, a bedroom, a study, a bathroom, and a
  roof terrace of its own." / "Offers over $685,000. An example: the
  flat and its price are made up."
- Living room, on the hall-living wall's living side at x −1.6: "Living
  room and kitchen, 40 m²" / "Three tall windows over the marina, oak
  herringbone floors, the old brick wall, and a kitchen with marble
  worktops and an island for three." / "The door in the brick wall
  leads up to the roof terrace."
- Bedroom, on the middle wall's bedroom side at z 2.4: "Bedroom, 18 m²"
  / "Two windows, one over the water, a wall of wardrobes, and room for
  a king-size bed."
- Study, on the hall-living wall's study side at x −4.0: "Study, 10 m²"
  / "A window over the desk, and shelves for books. It would make a
  small second bedroom."
- Bathroom, on the entrance wall at x 3.6, above the tiles: "Bathroom,
  12 m²" / "A bath, a walk-in shower, and a basin with storage, in white
  tiles."
- Links (panels in `a`): "Book a viewing" on the hall-study wall's hall
  side (to `booking.html`); "About this tour" on the entrance wall at x
  1.25 (to `about.holoml`); "Up to the roof terrace" beside the terrace
  door (to `terrace.holoml`, which fades).

On the screen: the `plan` in the top right (width 300, `plans/loft.png`,
area "−6.2 −3.95 6.2 3.95", 1240 × 790 pixels, 100 a metre: floors,
walls, windows, door swings, the main furniture, and large room names,
drawn by `prepare.mjs` in a hidden window's canvas); a Light choice
(Day, Evening) in the top left for `loft.js` (evening: the fill from 0.6
to about 0.07 and the sun off, so the sky and the harbour's light dim
too; the lamps are the viewer's to switch on); a line of help in the
bottom left.

Note: the sky's brightness follows the ambient lights, full at 0.6 and
above, so by day the fill is 0.6 (see how it looks, and change the
ambient only with the sky in mind).

## The other pages

- `terrace.holoml`: a deck of weathered planks, x −5 to 5, z −3.5 to
  3.5, top at y = 0; glass balustrades in four runs (each its own solid
  model: one model around the whole deck would hold the walker inside
  its box); a stair house (x −4.9 to −2.3, z −3.4 to −1.3) whose door is
  the link back (`index.holoml#terrace-door`); the outdoor table set,
  planters, two made sun loungers; a panel "Roof terrace, 30 m²" /
  "Private, with the whole harbour around it: the marina, the hills,
  and the evening sun."; places `door` (the arrival, −3.6 1.6 −0.5,
  looking at the marina) and `rail`.
- `about.holoml`: panels with what the tour shows of HoloML 0.2 and the
  credits (every asset and its authors, from `tools/cache/credits.json`),
  and links to the spec, the source, HyperSpace 3D, and back.
- `booking.html`: like the sofa studio's `cart.html`; a form (name,
  email, a day, a message) whose button only says "This is an example:
  nothing was sent, and there is no agent behind it." Nothing is stored
  or sent.
- `index.html`: for browsers without HoloML, like the sofa studio's.
- Sounds, made by `prepare.mjs` as WAV files: `door.wav` (0.7 s, a soft
  swing and a latch), `switch.wav` (a short click).

## Still to do, in order

1. `prepare.mjs`: the textures (re-encoded, the duvet tinted), the Poly
   Haven models (copied, pictures re-encoded, as the sofa studio's
   `others()`), the made models above, the walls' markup, the sky and
   light, the plan's picture, the sounds, `models/CREDITS.md`.
2. The pages and `loft.js`; look at every room in the browser and fix
   positions (the facing of each model is still to check).
3. In the browser repository: `pnpm holoml:sync harbour-loft --examples
   harbour-loft` with `harbour-loft` added to `copies.mjs`'s names; the
   examples card and picture; checks V8 to V10 in `tests/e2e/m19.e2e.ts`
   (ready within 5 s with a graphics card; every model loaded, no
   problems; walls stop the walker; every door and lamp; the terrace and
   back; the booking page; the keyboard, screen readers, the text view,
   reduced motion; idle, no frames).
4. The full run on Windows, `pnpm test:linux`, the automatic builds; the
   documents (both READMEs, ARCHITECTURE, CHANGELOG, privacy,
   THIRD-PARTY, AGENTS' testing list, HANDOFF); screenshots; then the
   pull requests, holoml's first (published by GitHub Pages on merge),
   V11 by hand, and the owner's acceptance.
