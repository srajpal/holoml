// The aquarium's layout and its fish: used by the page's script
// (aquarium.js, to keep the fish in the water and clear of the tunnel,
// the rocks, and each other) and by tools/prepare.mjs (which writes the
// tank's models and the scene's parts in index.holoml from it).

/** The water: the tank's inside, its surface at the top (metres). */
export const TANK = { min: [-12, 0, -20], max: [12, 6.5, 14] };

/** The tunnel: a half-cylinder of glass along z on the tank's floor, from its mouth in the front wall to its end. */
export const TUNNEL = { radius: 2.4, from: 14, to: -12 };

/** The gallery the visitor comes in by, in front of the tank (out of the water). */
export const GALLERY = { min: [-5, 0, 14], max: [5, 3.4, 20] };

/** Where food falls when the fish are fed: from the surface beside the tunnel's middle, in view of the button. */
export const FEEDER = [3.6, 6.3, 0];

/** Rocks (Poly Haven's boulder): where, how large, and how turned (degrees about the up axis). */
export const ROCKS = [
  { at: [-4.6, 0, 7], scale: 1.1, turn: 30 },
  { at: [5.8, 0, 3.5], scale: 1.6, turn: 150 },
  { at: [-6.4, 0, -5.5], scale: 2.1, turn: 80 },
  { at: [4.6, 0, -8.5], scale: 1.3, turn: 210 },
  { at: [0.5, 0, -14.2], scale: 2.6, turn: 10 },
  { at: [-3.5, 0, -1.2], scale: 0.7, turn: 300 },
  { at: [7.2, 0, 10.5], scale: 1.8, turn: 45 },
  { at: [-7.4, 0, 11.5], scale: 1.4, turn: 120 },
];

/** Each rock, as a ball about as big as it is (worked out once: every fish asks about every rock each frame). */
export const BALLS = ROCKS.map((r) => ({ at: [r.at[0], r.at[1] + 0.75 * r.scale, r.at[2]], radius: 0.95 * r.scale }));

/** How far a point is outside the tunnel's glass, less a fish's clearance (the tunnel runs along z on the floor). */
export function tunnelGap(p, clearance) {
  if (p[2] > TUNNEL.from + 1 || p[2] < TUNNEL.to - 1.5) return Infinity;
  return Math.hypot(p[0], Math.max(0, p[1])) - TUNNEL.radius - clearance;
}

/** How far a point is outside a rock's ball, less a fish's clearance. */
export function rockGap(p, b, clearance) {
  return Math.hypot(p[0] - b.at[0], p[1] - b.at[1], p[2] - b.at[2]) - b.radius - clearance;
}

/** How near a fish's middle comes to the glass, the sand, and the surface (metres). */
export const WALL = 0.2;

/** Whether a point is in the water, WALL from its sides, and `clearance` clear of the tunnel and every rock. */
export function clear(p, clearance) {
  for (let a = 0; a < 3; a++) if (p[a] < TANK.min[a] + WALL || p[a] > TANK.max[a] - WALL) return false;
  return tunnelGap(p, clearance) >= 0 && BALLS.every((b) => rockGap(p, b, clearance) >= 0);
}

/**
 * Where a fish that swam from `from` to `to` ends up: `to` pushed back
 * into the water, out of the tunnel, and out of the rocks. One push can
 * undo another (a rock's ball reaches below the sand, so a push out of it
 * may go down through the floor), so they repeat until all hold, a few
 * times at most; if they still do not, the fish stays at `from` (where
 * the last frame left it, clear) for this frame, and its steering turns it
 * away. Returns a new point.
 */
export function keepClear(from, to, clearance) {
  const p = [...to];
  for (let pass = 0; pass < 4; pass++) {
    for (let a = 0; a < 3; a++) p[a] = Math.min(TANK.max[a] - WALL, Math.max(TANK.min[a] + WALL, p[a]));
    const gap = tunnelGap(p, clearance);
    if (gap < 0) {
      // Out from the tunnel's middle line, sideways and up.
      const y = Math.max(0.05, p[1]);
      const l = Math.hypot(p[0], y) || 1;
      p[0] -= (p[0] / l) * gap;
      p[1] -= (y / l) * gap;
    }
    for (const b of BALLS) {
      const g = rockGap(p, b, clearance);
      if (g >= 0) continue;
      const d = [p[0] - b.at[0], p[1] - b.at[1], p[2] - b.at[2]];
      const l = Math.hypot(d[0], d[1], d[2]) || 1;
      for (let a = 0; a < 3; a++) p[a] -= (d[a] / l) * g;
    }
    if (clear(p, clearance)) return p;
  }
  return [...from];
}

/** Rockwork along the foot of the walls: large boulders, half sunk in the sand (the fish keep clear of the walls anyway). */
export const ROCKWORK = [
  { at: [-11.3, -0.6, -15], scale: 3.2, turn: 15 },
  { at: [-11.6, -0.8, -5], scale: 3.6, turn: 140 },
  { at: [-11.4, -0.6, 5], scale: 3.0, turn: 260 },
  { at: [11.4, -0.7, -13], scale: 3.4, turn: 95 },
  { at: [11.6, -0.8, -2.5], scale: 3.8, turn: 330 },
  { at: [11.3, -0.6, 7.5], scale: 3.1, turn: 200 },
  { at: [-6, -0.8, -19.6], scale: 3.3, turn: 60 },
  { at: [6.5, -0.7, -19.4], scale: 3.0, turn: 170 },
];

/** A sunken log (Poly Haven's dead tree trunk). */
export const LOGS = [{ at: [4.4, 0.25, 8.5], scale: 0.7, turn: 65 }];

/** Shells on the sand by the glass (Poly Haven's lambis shell). */
export const SHELLS = [
  { at: [-3.1, 0.03, 9.2], scale: 1.4, turn: 20 },
  { at: [3.3, 0.03, -3.6], scale: 1.2, turn: 200 },
  { at: [-3.4, 0.03, -8.4], scale: 1.5, turn: 110 },
];

/** Plants that sway: seagrass along the tunnel, kelp by the walls. */
export const PLANTS = [
  ...[-9.5, -6, -2.5, 1, 4.5, 8, 11.5].flatMap((z, i) => [
    { kind: i % 2 ? 'seagrass-b' : 'seagrass-a', at: [-3.1 - (i % 3) * 0.3, 0, z], turn: i * 40 },
    { kind: i % 2 ? 'seagrass-a' : 'seagrass-b', at: [3.0 + (i % 2) * 0.4, 0, z + 1.2], turn: i * 70 },
  ]),
  ...[
    [-10.8, -17.5], [-10.4, -10], [-10.9, -1], [-10.5, 8.5], [-9.6, 12.8],
    [10.8, -17], [10.5, -8], [10.9, 1.5], [10.4, 10.5], [9.8, 12.9],
    [-3.5, -19.2], [3.2, -19.1], [-7.5, -14.5], [7.8, -15.5],
  ].map(([x, z], i) => ({ kind: 'kelp', at: [x, 0, z], turn: i * 53 })),
];

/** Air stones: bubbles rise from them, and they are heard from where they are. */
export const AIRSTONES = [
  [-4.2, 0.05, 3.5],
  [4.9, 0.05, -5.8],
  [-2.9, 0.05, -10.5],
];

/**
 * The fish: how many of each kind, how fast they cruise and hurry
 * (metres a second), the depths they keep to, whether they school, how
 * near they come to the glass, what the board in the tunnel says of them,
 * and how the page's list names them ("About the tuna"). Their models are
 * models/<kind>.glb, each with its "Swim".
 */
export const KINDS = [
  {
    kind: 'shark',
    about: 'the great white shark',
    name: 'Great white shark',
    count: 2,
    speed: [0.9, 1.6],
    depth: [3.3, 5.5],
    school: false,
    clearance: 1.4,
    text: 'The largest fish that hunts. It grows to more than 6 metres and lives in cool and warm coastal seas all round the world. It cannot pump water over its gills, so it must keep swimming to breathe.',
  },
  {
    kind: 'turtle',
    about: 'the hawksbill sea turtle',
    name: 'Hawksbill sea turtle',
    count: 1,
    speed: [0.35, 0.7],
    depth: [2.8, 5.8],
    school: false,
    clearance: 0.8,
    text: 'Lives on coral reefs in warm seas all round the world. Named for its narrow, pointed beak, which picks sponges, its main food, out of cracks in the reef. Long hunted for its patterned shell, it is now critically endangered.',
  },
  {
    kind: 'tuna',
    about: 'the tuna',
    name: 'Tuna',
    count: 2,
    speed: [1.2, 2.2],
    depth: [2.8, 5.8],
    school: true,
    clearance: 0.9,
    text: 'Built for speed: a stiff, pointed body, a quick tail, and fins that fold into grooves. Some kinds cross whole oceans, and keep their bodies warmer than the water around them.',
  },
  {
    kind: 'barramundi',
    about: 'the barramundi',
    name: 'Barramundi',
    count: 2,
    speed: [0.4, 1.0],
    depth: [0.6, 2.8],
    school: false,
    clearance: 0.6,
    text: 'Also called the Asian sea bass: a large fish of the coasts and rivers from northern Australia to Southeast Asia and India. Most begin life as males and become females a few years later. Its name comes from an Aboriginal language.',
  },
  {
    kind: 'bream',
    about: 'the gilt-head bream',
    name: 'Gilt-head bream',
    count: 6,
    speed: [0.5, 1.2],
    depth: [1.0, 3.6],
    school: true,
    clearance: 0.45,
    text: 'A bream of the Mediterranean and the eastern Atlantic, named for the golden band between its eyes. Its strong teeth crack open mussels and other shellfish.',
  },
  {
    kind: 'mackerel',
    about: 'the Atlantic mackerel',
    name: 'Atlantic mackerel',
    count: 8,
    speed: [0.8, 1.6],
    depth: [3.6, 6.0],
    school: true,
    clearance: 0.4,
    text: 'Fast swimmers of the North Atlantic that travel in large schools. The wavy dark stripes on their backs hide them from above, and their pale bellies from below.',
  },
  {
    kind: 'snapper',
    about: 'the grey snapper',
    name: 'Grey snapper',
    count: 4,
    speed: [0.4, 1.0],
    depth: [0.5, 2.6],
    school: true,
    clearance: 0.45,
    text: 'A snapper of the western Atlantic, from New England to Brazil. The young shelter among mangrove roots and seagrass, and the grown fish gather by reefs and wrecks.',
  },
  {
    kind: 'clownfish',
    about: 'the clownfish',
    name: 'Clownfish',
    count: 3,
    speed: [0.15, 0.4],
    depth: [0.4, 1.6],
    school: true,
    clearance: 0.25,
    text: 'Lives among the stinging arms of sea anemones, safe inside a coat of slime, on reefs of the Indian and Pacific Oceans. Every clownfish hatches male; the largest of a group becomes a female.',
  },
  {
    kind: 'butterflyfish',
    about: 'the copperband butterflyfish',
    name: 'Copperband butterflyfish',
    count: 2,
    speed: [0.2, 0.5],
    depth: [0.5, 2.2],
    school: false,
    clearance: 0.3,
    text: 'Picks small animals out of cracks in the reef with its long, thin snout. The dark spot near its tail looks like an eye, which may make a hunter strike at the wrong end.',
  },
];
