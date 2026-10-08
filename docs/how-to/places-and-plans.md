# Give a page places to go to, and a floor plan

This guide gives a page several places (0.2): named viewpoints that the
viewer can go to from a list, from the page's address, and from links on
the same page or another. It then adds a floor plan in a corner of the
screen, with a marker for where the viewer is.
[Harbour Loft](../../examples/harbour-loft/index.holoml) uses all of
these.

## Add places

Write a `viewpoint` for each place, directly in `scene`, each with an
`id` and a `label`:

```holoml-scene
<viewpoint id="hall" label="Hall" position="0 1.6 -2.9" look-at="0 1.45 3.75" mode="walk" />
<viewpoint id="living" label="Living room" position="-0.3 1.6 -0.75" look-at="-1.4 0.9 3.75" mode="walk" />
<viewpoint id="kitchen" label="Kitchen" position="-2.6 1.6 1.95" look-at="-4.6 1.05 -0.9" mode="walk" />
```

- `id`: the place's name in addresses (`#kitchen`). When a scene has
  several viewpoints, each needs one.
- `label`: its name in the list of places, such as "Living room"; by
  default its id.
- `position` and `look-at`: where the viewer's eyes are when they
  arrive, and the point they look at.

The viewer starts at the first viewpoint. A renderer lets them go to
every place, for example from a list that the keyboard and screen
readers reach, each place named by its label: in HyperSpace 3D, the
page's list of places ("Go to: Kitchen", and so on), which Tab reaches.
Harbour Loft has seven places, its rooms and the door to its roof
terrace; the sneaker store has one at the entrance, one at each of its
ten bays, and one at the counter.

## Say how the viewer moves, at every place

The viewpoint the viewer starts at says how they move: `mode`,
`gravity`, `jump`, `crosshair`, `speed`, and `turn-speed`. The others
are places only, a position and a direction to look. As an address can
start the viewer at any place (below), give each viewpoint the same way
of moving: Harbour Loft gives every one `mode="walk"`.

## Start at a place

An address that ends in `#` and a place's id starts the viewer there:
`index.holoml#kitchen` opens in the kitchen. An address that names no
place, or one the page does not have, starts at the first viewpoint.

## Link to a place

A link's `href` can name a place: `#kitchen` on the same page, or
`terrace.holoml#door` on another.

```holoml-scene
<a href="#kitchen">
  <panel position="0 1.5 -1.2" width="0.5" size="0.06" color="#ffffff" background="#1d6fa5">To the kitchen</panel>
</a>
<a href="index.holoml#terrace-door">
  <model id="flat-door" src="models/door.glb" position="-4.1 0 -0.98" />
  <panel position="-2.55 1.6 -0.985" width="0.9" size="0.05" color="#f7f4ee" background="#2f3d36">Back down to the flat</panel>
</a>
```

The first goes to the kitchen on this page. The second is Harbour
Loft's way back from its roof terrace: it opens the flat at the place by
the terrace door, where the viewer left it, not in the hall.

## Go to a place from a script

In a 0.3 page, a script sends the viewer to a place, as a link to
`#name` does, and hears where the viewer arrives:

```js
// tour.js: a button panel "next" takes the viewer round the places in turn.
const PLACES = ['hall', 'kitchen', 'terrace'];
holoml.on('click', (e) => {
  if (e.thing?.id !== 'next') return;
  const at = PLACES.indexOf(holoml.viewer.place);
  holoml.viewer.goTo(PLACES[(at + 1) % PLACES.length]);
});
holoml.on('place', (e) => {
  holoml.find('where').text = `You are at: ${e.place}`;
});
```

`holoml.viewer.place` is the id of the place the viewer last arrived
at (walking does not change it); `goTo` with an id that is not a
place's is an error. The floor plan is a thing scripts find by its id:
`holoml.find('plan').visible = false` hides it.

## Move between pages with a fade

Following a link to another HoloML page of the same site (the same
scheme, host, and port), a renderer should move the viewer as between
rooms: a short fade out and in instead of a cut, as HyperSpace 3D does,
and a cut when the viewer has asked for reduced motion (their system's
setting for less movement). Nothing needs writing for it; keep the pages
of a tour on one site, as Harbour Loft keeps the flat and its roof
terrace. A link to a web page, or to another site, opens as any link
does.

Each page starts afresh, with its own scripts. To carry a choice from
page to page, a script can keep it in the tab's session storage (a web
page's store that lasts while the tab is open), as Harbour Loft's
[`loft.js`](../../examples/harbour-loft/loft.js) keeps its Light choice.

## Add a floor plan

```holoml-scene
<plan src="plans/loft.png" area="-6.2 -3.95 6.2 3.95" corner="top-right" width="300" label="Floor plan of Harbour Loft" />
```

- `src`: the picture, the ground seen from above: a PNG, JPEG, or WebP
  file from the page's own site.
- `area`: the rectangle of the ground that the picture shows, as
  `x0 z0 x1 z1` in metres. The picture's left edge is at x0 and its
  right edge at x1; its top edge is at z0 and its bottom edge at z1, so
  the top of the picture is the side of smaller z.
- `corner`: where it is on the screen, by default `top-right`.
- `width`: how wide it is on the screen, in CSS pixels (the unit of web
  pages), by default 200; its height follows the picture.
- `label`: its name for screen readers, by default "Floor plan".

The renderer draws a marker on the plan for where the viewer is and
which way they face, and leaves the marker out while the viewer is
outside the area. A scene has at most one plan, directly in `scene`.

Draw the picture to scale over exactly its area, so that the marker
lands where the viewer is: Harbour Loft's is 1240 by 790 pixels for an
area 12.4 by 7.9 metres, 100 pixels a metre, drawn by the site's
`tools/prepare.mjs` from the flat's layout.

## Try it

- Go to each place from the list of places, with the mouse and with
  the keyboard.
- Open the page with `#` and a place's id at the end of its address.
- Follow each link to a place, and to the other pages and back.
- Walk through every room and watch the marker; leave the area, and see
  it go.

## See also

- The specification: [`viewpoint`](../../SPEC.md#viewpoint),
  [`a`](../../SPEC.md#a), [`plan`](../../SPEC.md#plan),
  [leaving a page](../../SPEC.md#leaving-a-page), and
  [accessibility](../../SPEC.md#14-accessibility-considerations).
- [Walk around, with walls and gravity](walking.md)
- [Make doors that open and lamps that switch on](doors-and-lamps.md)
- [Put text in the scene and on the screen](text.md)
- [Publish a site](publishing.md)
- Harbour Loft's [flat](../../examples/harbour-loft/index.holoml),
  [roof terrace](../../examples/harbour-loft/terrace.holoml), and
  [notes](../../examples/harbour-loft/README.md).
