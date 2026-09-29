// Harbour Loft's plan: the flat's walls, their openings, its rooms, and
// the furniture that stays put, in metres. +z is the harbour side (the
// tall windows), -z the entrance, y is up. prepare.mjs makes the walls,
// the windows, and the furniture's markup in index.holoml, the floors,
// and the floor plan's picture from these; the doors, lamps, and
// switches (the click actions) are written in index.holoml by hand.

/** The ceiling's height. */
export const H = 3.0;

/** Inside the outer walls. */
export const INSIDE = { x0: -6, x1: 6, z0: -3.75, z1: 3.75 };
/** Outside the outer walls: the floor plan's area. */
export const OUTSIDE = { x0: -6.2, x1: 6.2, z0: -3.95, z1: 3.95 };

/**
 * Each wall: which way it runs (along x or z), where it is across (the
 * other axis, as a range: its thickness), where it runs from and to, and
 * its openings (from and to along it, and from y0 up to y1). `kind`
 * names what fills an opening: a window, a door, or nothing.
 */
export const WALLS = [
  {
    name: 'harbour',
    along: 'x',
    across: [3.75, 3.95],
    from: -6.2,
    to: 6.2,
    openings: [
      { from: -5.4, to: -3.8, y0: 0.3, y1: 2.7, kind: 'tall-window' },
      { from: -2.8, to: -1.2, y0: 0.3, y1: 2.7, kind: 'tall-window' },
      { from: -0.2, to: 1.4, y0: 0.3, y1: 2.7, kind: 'tall-window' },
      { from: 3.2, to: 4.8, y0: 0.3, y1: 2.7, kind: 'tall-window' },
    ],
  },
  {
    name: 'entrance',
    along: 'x',
    across: [-3.95, -3.75],
    from: -6.2,
    to: 6.2,
    openings: [{ from: -0.5, to: 0.5, y0: 0, y1: 2.1, kind: 'entrance' }],
  },
  {
    name: 'study-outer',
    along: 'z',
    across: [-6.2, -6.0],
    from: -3.75,
    to: -1.25,
    openings: [{ from: -3.15, to: -1.85, y0: 0.9, y1: 2.5, kind: 'window' }],
  },
  {
    name: 'east',
    along: 'z',
    across: [6.0, 6.2],
    from: -3.75,
    to: 3.75,
    openings: [
      { from: -2.6, to: -1.8, y0: 1.5, y1: 2.5, kind: 'small-window' },
      { from: 0.3, to: 1.6, y0: 0.9, y1: 2.5, kind: 'window' },
    ],
  },
  // Between the hall and the study on one side and the kitchen and living room on the other: open to the hall.
  {
    name: 'hall-living',
    along: 'x',
    across: [-1.31, -1.19],
    from: -6.0,
    to: 1.94,
    openings: [{ from: -0.9, to: 0.9, y0: 0, y1: 2.4, kind: 'opening' }],
  },
  {
    name: 'hall-study',
    along: 'z',
    across: [-2.06, -1.94],
    from: -3.75,
    to: -1.31,
    openings: [{ from: -3.05, to: -2.05, y0: 0, y1: 2.1, kind: 'door' }],
  },
  {
    name: 'middle',
    along: 'z',
    across: [1.94, 2.06],
    from: -3.75,
    to: 3.75,
    openings: [
      { from: -3.35, to: -2.35, y0: 0, y1: 2.1, kind: 'door' },
      { from: -0.45, to: 0.55, y0: 0, y1: 2.1, kind: 'door' },
    ],
  },
  {
    name: 'bedroom-bathroom',
    along: 'x',
    across: [-0.81, -0.69],
    from: 2.06,
    to: 6.0,
    openings: [],
  },
];

/**
 * The living room's outer wall is the old brick wall, with the door to the
 * stairs up to the roof terrace: a model of its own (its door is a link,
 * not a way through), made by prepare.mjs.
 */
export const BRICK_WALL = { across: [-6.2, -6.0], from: -1.25, to: 3.75, door: { from: 0.4, to: 1.4, y1: 2.1 } };

/** The rooms, for the floors and the plan: rectangles inside the walls, a floor, and a name and size. */
export const ROOMS = [
  { name: 'Living room and kitchen', short: 'Living and kitchen', area: 40, x0: -6.0, x1: 1.94, z0: -1.19, z1: 3.75, floor: 'parquet' },
  { name: 'Hall', short: 'Hall', area: 10, x0: -1.94, x1: 1.94, z0: -3.75, z1: -1.31, floor: 'parquet' },
  { name: 'Study', short: 'Study', area: 10, x0: -6.0, x1: -2.06, z0: -3.75, z1: -1.31, floor: 'parquet' },
  { name: 'Bedroom', short: 'Bedroom', area: 18, x0: 2.06, x1: 6.0, z0: -0.69, z1: 3.75, floor: 'parquet' },
  { name: 'Bathroom', short: 'Bath', area: 12, x0: 2.06, x1: 6.0, z0: -3.75, z1: -0.81, floor: 'tiles' },
];

/**
 * The doors that open (click actions in index.holoml, where each hinge
 * group stands at `hinge`): the way the leaf points from its hinge, in
 * degrees about y, when shut and when open. The plan draws their swings.
 */
export const DOORS = [
  { name: 'Study door', hinge: [-2, -3.05], shut: -90, open: -180 },
  { name: 'Bathroom door', hinge: [2, -3.35], shut: -90, open: 0 },
  { name: 'Bedroom door', hinge: [2, 0.55], shut: 90, open: 0 },
];
/** A door's leaf: its width, height, and thickness (models/door.glb, its hinge edge at x = 0). */
export const LEAF = { width: 0.98, height: 2.09, depth: 0.04 };

/**
 * The furniture and fittings that stay put: its model (models/<src>.glb),
 * where it stands, how it is turned (degrees about y; unturned, its front
 * faces +z), its scale, whether it stops the walker, and how the plan
 * draws it (a box, a circle, or not at all). prepare.mjs writes them into
 * index.holoml and onto the floor plan. The lamps and doors are in
 * index.holoml, with their click actions.
 */
export const FURNITURE = [
  // The living room: a sofa facing the windows, a rug and a round table, a lounge chair, and a sideboard under a picture.
  { src: 'sofa', at: [-1.0, 0, 0.9], solid: true },
  { src: 'pillows', at: [-1.0, 0.42, 0.72], plan: false },
  { src: 'rug', at: [-1.0, 0, 2.05] },
  { src: 'coffee-table', at: [-1.0, 0, 2.15], solid: true, plan: 'round' },
  { src: 'lounge-chair', at: [0.62, 0, 2.2], turn: -90, solid: true },
  { src: 'tall-table', at: [0.55, 0, 3.22], solid: true, plan: 'round' },
  { src: 'sideboard', at: [1.68, 0, 1.83], turn: -90, solid: true },
  { src: 'picture', at: [1.935, 1.55, 1.83], turn: -90, plan: false },
  { src: 'plant', at: [1.65, 0, 3.42], scale: 2.8, solid: true, plan: 'round' },
  { src: 'plant', at: [1.7, 0.68, 2.72], plan: false },
  // The kitchen along the hall's wall, an island for three, and a dining table by the window.
  { src: 'kitchen', at: [-6.0, 0, -1.19], solid: true },
  { src: 'island', at: [-3.95, 0, 0.8], solid: true },
  { src: 'stool', at: [-4.55, 0, 1.47], scale: 0.8, solid: true, plan: 'round' },
  { src: 'stool', at: [-3.95, 0, 1.47], scale: 0.8, solid: true, plan: 'round' },
  { src: 'stool', at: [-3.35, 0, 1.47], scale: 0.8, solid: true, plan: 'round' },
  { src: 'dining-table', at: [-4.3, 0, 2.85], scale: [0.85, 0.75, 0.85], solid: true, plan: 'round' },
  { src: 'dining-chair', at: [-4.3, 0, 2.1], solid: true },
  { src: 'dining-chair', at: [-5.05, 0, 2.85], turn: 90, solid: true },
  { src: 'dining-chair', at: [-3.55, 0, 2.85], turn: -90, solid: true },
  { src: 'plant', at: [-5.68, 0, 3.42], scale: 2.8, solid: true, plan: 'round' },
  // The study: a desk under the window, a chair, and shelves of books.
  { src: 'desk', at: [-5.53, 0, -2.53], turn: 90, solid: true },
  { src: 'desk-chair', at: [-4.72, 0, -2.5], turn: -90, solid: true },
  { src: 'shelves', at: [-3.4, 0, -3.5], solid: true },
  { src: 'books', at: [-3.4, 0.125, -3.52], plan: false },
  { src: 'books-2', at: [-3.4, 0.625, -3.52], plan: false },
  { src: 'books', at: [-3.35, 1.135, -3.52], plan: false },
  { src: 'books-2', at: [-3.45, 1.645, -3.52], plan: false },
  { src: 'plant', at: [-5.78, 0.79, -1.75], plan: false },
  // The bedroom: the bed against the bathroom's wall, a table and lamp each side (the lamps are in index.holoml), and a wardrobe.
  { src: 'bed', at: [4.1, 0, -0.69], solid: true },
  { src: 'bedside-table', at: [2.8, 0, -0.44], solid: true },
  { src: 'bedside-table', at: [5.4, 0, -0.44], solid: true },
  { src: 'wardrobe', at: [6.0, 0, 2.85], turn: -90, solid: true },
  { src: 'plant', at: [2.45, 0, 3.42], scale: 2.8, solid: true, plan: 'round' },
  // The bathroom: a bath and a walk-in shower along the outer wall, a basin under a mirror, and white tiles.
  { src: 'bath', at: [5.6, 0, -2.9], solid: true },
  { src: 'shower', at: [5.5, 0, -1.31] },
  { src: 'vanity', at: [3.4, 0, -0.81], turn: 180, solid: true },
  { src: 'toilet', at: [2.06, 0, -1.6], turn: 90, solid: true },
  { src: 'bath-tiles', at: [0, 0, 0], plan: false },
  // The hall.
  { src: 'plant', at: [-1.62, 0, -3.42], scale: 2.8, solid: true, plan: 'round' },
];

/** Glass that is not in a window: the shower's screen (its centre, width and height, and turn). */
export const SCREENS = [{ at: [5.65, 1.02, -1.81], width: 0.7, height: 1.96, turn: 0 }];

/** The roof terrace (terrace.holoml): the deck, and the stair house in its corner (min and max corners, x and z). */
export const TERRACE = {
  deck: { x0: -4.5, x1: 4.5, z0: -3.2, z1: 3.2 },
  house: { x0: -4.4, x1: -1.9, z0: -3.1, z1: -1.0, height: 2.5 },
};

/** Each wall as boxes (min and max corners), around its openings. */
export function wallBoxes(w) {
  const boxes = [];
  const box = (a0, a1, y0, y1) => {
    if (a1 - a0 < 1e-6 || y1 - y0 < 1e-6) return;
    boxes.push(
      w.along === 'x'
        ? { min: [a0, y0, w.across[0]], max: [a1, y1, w.across[1]] }
        : { min: [w.across[0], y0, a0], max: [w.across[1], y1, a1] },
    );
  };
  const open = [...w.openings].sort((a, b) => a.from - b.from);
  let at = w.from;
  for (const o of open) {
    box(at, o.from, 0, H);
    box(o.from, o.to, 0, o.y0);
    box(o.from, o.to, o.y1, H);
    at = o.to;
  }
  box(at, w.to, 0, H);
  return boxes;
}
