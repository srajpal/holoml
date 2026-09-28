// Harbour Loft's plan: the flat's walls, their openings, and its rooms, in
// metres. +z is the harbour side (the tall windows), -z the entrance,
// y is up. prepare.mjs makes the walls' markup, the floors, and the floor
// plan's picture from these; the furniture is placed in index.holoml.

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
