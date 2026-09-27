// Blockworld: a very small block game in HoloML 0.2 (draft). The page
// (index.holoml) holds the sky, the lights, the sounds, the chest, and the
// text on the screen; this script makes the island from a seed and plays
// the game through the scene API, `holoml` (SPEC.md section 10).
//
// Walk, jump, and look around as HoloML's walk mode lets you. Click a
// block to break it, right-click to place one (or E and Q for the block
// under the crosshair), and keys 1 to 5 choose what to place. Five gems
// are hidden in the stone: bring them to the chest.
//
// The address can say ?seed=12 for another island, and ?hour=21 to start
// in the evening.

const params = new URLSearchParams(location.search);
const SEED = Number.parseInt(params.get('seed') ?? '7', 10) || 7;
const HOUR = params.has('hour') ? Math.min(24, Math.max(0, Number(params.get('hour')) || 0)) : null;
const HALF = 12; // the island is 24 blocks across
const SEA = 2; // water fills up to this height
const REACH = 6; // metres from the eyes
const DAY = 240; // seconds in a day
const GEMS = 5;

const BLOCKS = {
  grass: { name: 'Grass', solid: true },
  dirt: { name: 'Dirt', solid: true },
  stone: { name: 'Stone', solid: true },
  sand: { name: 'Sand', solid: true },
  planks: { name: 'Planks', solid: true },
  trunk: { name: 'Wood', solid: true },
  leaves: { name: 'Leaves', solid: true, clear: true },
  water: { name: 'Water', solid: false, clear: true },
  gem: { name: 'Gem', solid: true },
  torch: { name: 'Torch', solid: false, clear: true },
};
const HAND = ['grass', 'dirt', 'stone', 'planks', 'torch'];

// ---- A seeded world ---------------------------------------------------------

function random(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = random(SEED);

// Smooth noise: random heights on a coarse grid, blended between.
const GRID = 6;
const lattice = Array.from({ length: GRID * GRID }, () => rand());
const smooth = (t) => t * t * (3 - 2 * t);
function noise(x, z) {
  const fx = ((x + HALF) / (2 * HALF)) * (GRID - 1);
  const fz = ((z + HALF) / (2 * HALF)) * (GRID - 1);
  const ix = Math.max(0, Math.min(GRID - 2, Math.floor(fx)));
  const iz = Math.max(0, Math.min(GRID - 2, Math.floor(fz)));
  const tx = smooth(fx - ix);
  const tz = smooth(fz - iz);
  const v = (i, j) => lattice[j * GRID + i];
  const a = v(ix, iz) + (v(ix + 1, iz) - v(ix, iz)) * tx;
  const b = v(ix, iz + 1) + (v(ix + 1, iz + 1) - v(ix, iz + 1)) * tx;
  return a + (b - a) * tz;
}

const key = (x, y, z) => `${x},${y},${z}`;
const unkey = (k) => k.split(',').map(Number);
/** What is where: "x,y,z" (the block's lowest corner) to its kind. */
const world = new Map();
const tops = new Map();

function heightAt(x, z) {
  const d = Math.hypot(x + 0.5, z + 0.5) / HALF;
  const h = Math.floor(1 + (1 - d * d) * 4.5 + noise(x, z) * 3.2);
  return d > 1 ? Math.min(h, 1) : Math.max(1, Math.min(9, h));
}

for (let x = -HALF; x < HALF; x++) {
  for (let z = -HALF; z < HALF; z++) {
    const h = heightAt(x, z);
    tops.set(`${x},${z}`, h);
    for (let y = 0; y < h; y++) {
      const shore = h <= SEA;
      world.set(key(x, y, z), y === h - 1 ? (shore ? 'sand' : 'grass') : y >= h - 3 ? (shore ? 'sand' : 'dirt') : 'stone');
    }
    for (let y = h; y < SEA; y++) world.set(key(x, y, z), 'water');
  }
}

// The chest, near where the walker lands.
const CHEST = [1, tops.get('1,-2'), -2];

// Trees on the grass, away from the middle and from each other.
const trees = [];
for (let tries = 0; tries < 200 && trees.length < 7; tries++) {
  const x = Math.floor(rand() * 2 * HALF) - HALF;
  const z = Math.floor(rand() * 2 * HALF) - HALF;
  const h = tops.get(`${x},${z}`);
  if (h < 4 || world.get(key(x, h - 1, z)) !== 'grass') continue;
  if (Math.hypot(x, z) < 4 || trees.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < 5)) continue;
  trees.push([x, z]);
  const tall = 3 + Math.floor(rand() * 2);
  for (let y = h; y < h + tall; y++) world.set(key(x, y, z), 'trunk');
  for (let dy = tall - 1; dy <= tall + 1; dy++) {
    const r = dy === tall + 1 ? 1 : 2;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) + Math.abs(dz) > r + 1) continue;
        const k = key(x + dx, h + dy, z + dz);
        if (!world.has(k)) world.set(k, 'leaves');
      }
    }
  }
}

// Five gems, in the stone somewhere in the middle of the island.
const gems = [];
for (let tries = 0; tries < 500 && gems.length < GEMS; tries++) {
  const x = Math.floor(rand() * 16) - 8;
  const z = Math.floor(rand() * 16) - 8;
  const h = tops.get(`${x},${z}`);
  const y = Math.floor(rand() * Math.max(1, h - 3));
  const k = key(x, y, z);
  if (world.get(k) !== 'stone' || gems.includes(k)) continue;
  world.set(k, 'gem');
  gems.push(k);
}

// ---- Showing it: only blocks that can be seen ------------------------------

/** "x,y,z" to the block's thing, while it is shown; and back. */
const shown = new Map();
const keyOf = new WeakMap();
const clear = (k) => {
  const kind = world.get(k);
  return !kind || BLOCKS[kind]?.clear === true;
};
const NEIGHBOURS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];
/** A block that shows a face: something clear (or nothing) is next to it. */
function exposed(k) {
  const [x, y, z] = unkey(k);
  return NEIGHBOURS.some(([dx, dy, dz]) => y + dy >= 0 && clear(key(x + dx, y + dy, z + dz)));
}

function markup(k) {
  const kind = world.get(k);
  const [x, y, z] = unkey(k);
  return `<model src="models/${kind}.gltf" position="${x + 0.5} ${y + 0.5} ${z + 0.5}"${BLOCKS[kind].solid ? ' solid' : ''} />`;
}

function show(keys) {
  const todo = keys.filter((k) => world.has(k) && !shown.has(k) && world.get(k) !== 'chest');
  for (let i = 0; i < todo.length; i += 600) {
    for (const thing of holoml.add(todo.slice(i, i + 600).map(markup).join('\n'))) {
      const [px, py, pz] = thing.position;
      const k = key(Math.floor(px), Math.floor(py), Math.floor(pz));
      shown.set(k, thing);
      keyOf.set(thing, k);
    }
  }
}

show([...world.keys()].filter(exposed));

const chest = holoml.find('chest');
chest.position = [CHEST[0] + 0.5, CHEST[1] + 0.5, CHEST[2] + 0.5];
world.set(key(...CHEST), 'chest');
keyOf.set(chest, key(...CHEST));

// ---- The screen ------------------------------------------------------------

const hud = {
  hand: holoml.find('hand'),
  score: holoml.find('score'),
  clock: holoml.find('clock'),
  message: holoml.find('message'),
};
let hand = 0;
let carried = 0;
let stored = 0;
let won = false;
let quietAt = 0;

function showHand() {
  hud.hand.text = `Placing: ${BLOCKS[HAND[hand]].name}\n${HAND.map((h, i) => `${i + 1} ${BLOCKS[h].name}`).join(' · ')}`;
}
function showScore() {
  hud.score.text = `Gems carried: ${carried}\nIn the chest: ${stored} of ${GEMS}`;
}
function say(words, seconds = 4) {
  hud.message.text = words;
  quietAt = won ? Infinity : performance.now() + seconds * 1000;
}

const sound = (id) => holoml.find(id);

// ---- Breaking and placing ----------------------------------------------------

const breaking = [];

/** The block a click or the crosshair hit, if it is within reach. */
function target(hit) {
  if (!hit?.thing || !hit.point) return null;
  const k = keyOf.get(hit.thing);
  if (!k) return null;
  const eye = holoml.viewer.position;
  if (Math.hypot(hit.point[0] - eye[0], hit.point[1] - eye[1], hit.point[2] - eye[2]) > REACH) return null;
  return { k, normal: hit.normal };
}

function breakAt(hit) {
  const t = target(hit);
  if (!t) return;
  const kind = world.get(t.k);
  if (kind === 'chest') return deposit();
  if (!kind || kind === 'water') return;
  world.delete(t.k);
  const thing = shown.get(t.k);
  shown.delete(t.k);
  if (thing) breaking.push({ thing, start: performance.now() });
  if (kind === 'torch') freeTorch(t.k);
  if (kind === 'gem') {
    carried += 1;
    sound('gem').play();
    say(`You found a gem! Bring it to the chest.`);
    showScore();
  } else sound('break').play();
  // What was hidden behind it can be seen now; water flows in beside the sea.
  const [x, y, z] = unkey(t.k);
  if (y < SEA && NEIGHBOURS.some(([dx, dy, dz]) => dy <= 0 && world.get(key(x + dx, y + dy, z + dz)) === 'water')) world.set(t.k, 'water');
  show([t.k, ...NEIGHBOURS.map(([dx, dy, dz]) => key(x + dx, y + dy, z + dz))]);
}

function placeAt(hit) {
  const t = target(hit);
  if (!t || !t.normal) return;
  if (world.get(t.k) === 'chest') return deposit();
  const [x, y, z] = unkey(t.k);
  const [nx, ny, nz] = [x + Math.round(t.normal[0]), y + Math.round(t.normal[1]), z + Math.round(t.normal[2])];
  const k = key(nx, ny, nz);
  if (ny < 0 || ny > 16 || Math.abs(nx + 0.5) > HALF + 6 || Math.abs(nz + 0.5) > HALF + 6) return;
  const there = world.get(k);
  if (there && there !== 'water') return;
  // Not inside the walker.
  const eye = holoml.viewer.position;
  const feet = eye[1] - 1.6;
  if (nx < eye[0] + 0.3 && nx + 1 > eye[0] - 0.3 && nz < eye[2] + 0.3 && nz + 1 > eye[2] - 0.3 && ny < feet + 1.8 && ny + 1 > feet) return;
  if (there === 'water') {
    shown.get(k)?.remove();
    shown.delete(k);
  }
  const kind = HAND[hand];
  world.set(k, kind);
  show([k]);
  if (kind === 'torch') lightTorch(k);
  sound('place').play();
}

function deposit() {
  if (won) return;
  if (carried === 0) return say(stored === 0 ? 'The chest is empty. Find the gems in the stone.' : `The chest holds ${stored} of ${GEMS} gems.`);
  stored += carried;
  carried = 0;
  showScore();
  if (stored >= GEMS) {
    won = true;
    say('You won! All five gems are in the chest.');
    sound('won').play();
  } else {
    sound('deposit').play();
    say(`${stored} of ${GEMS} gems in the chest.`);
  }
}

// ---- Torches: eight lights, moved to where torches are placed ---------------

const lights = Array.from({ length: 8 }, (_, i) => ({ light: holoml.find(`torch-${i + 1}`), at: null }));
let nextLight = 0;
function lightTorch(k) {
  const [x, y, z] = unkey(k);
  const slot = lights.find((l) => l.at === null) ?? lights[nextLight++ % lights.length];
  slot.at = k;
  slot.light.position = [x + 0.5, y + 0.8, z + 0.5];
  slot.light.intensity = 0.9;
}
function freeTorch(k) {
  for (const l of lights) {
    if (l.at !== k) continue;
    l.at = null;
    l.light.intensity = 0;
    l.light.position = [0, -50, 0];
  }
}

// ---- Input ---------------------------------------------------------------------

holoml.on('click', (e) => {
  if (e.button === 'right') placeAt(e);
  else if (e.button === 'left') breakAt(e);
});
holoml.on('key', (e) => {
  if (!e.down || e.repeat) return;
  const n = Number(e.key);
  if (n >= 1 && n <= HAND.length) {
    hand = n - 1;
    showHand();
  } else if (e.key === 'e' || e.key === 'E') breakAt(holoml.aim());
  else if (e.key === 'q' || e.key === 'Q') placeAt(holoml.aim());
});

// ---- Time: a day of four minutes; the sun, the sky, and the sounds follow -------

const sun = holoml.find('sun');
const daylight = holoml.find('daylight');
const birds = sound('birds');
const crickets = sound('crickets');
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, t) => `#${hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
const between = (lo, hi, v) => Math.min(1, Math.max(0, (v - lo) / (hi - lo)));

let shownMinute = -1;
function daytime(hour) {
  const angle = ((hour - 6) / 24) * Math.PI * 2;
  const height = Math.sin(angle);
  const day = smooth(between(-0.15, 0.3, height));
  const low = 1 - between(0, 0.35, Math.abs(height)); // near the horizon: dawn and dusk
  sun.position = [Math.cos(angle) * 60, Math.max(-0.25, height) * 60, 20];
  sun.intensity = 0.85 * day;
  sun.color = mix('#ff9a5c', '#fff4d6', between(0, 0.45, height));
  daylight.intensity = 0.1 + 0.38 * day;
  holoml.background = mix(mix('#0b1030', '#87ceeb', day), '#f0915a', low * day * 0.7);
  birds.volume = 0.45 * day;
  crickets.volume = 0.35 * (1 - day);
  const minutes = Math.floor(hour * 60);
  if (minutes !== shownMinute) {
    shownMinute = minutes;
    const d = Math.floor(minutes / 1440) + 1;
    const hh = String(Math.floor(minutes / 60) % 24).padStart(2, '0');
    const mm = String(minutes % 60).padStart(2, '0');
    hud.clock.text = `Day ${d}, ${hh}:${mm}${holoml.reducedMotion ? ' (the clock stands still)' : ''}`;
  }
}

// With reduced motion the day stands still, at noon unless the address says otherwise.
const startHour = HOUR ?? (holoml.reducedMotion ? 12 : 9);
let lastStep = null;
let stepNext = 1;
holoml.on('frame', (e) => {
  const hour = holoml.reducedMotion ? startHour : startHour + (e.time / 1000 / DAY) * 24;
  daytime(hour);
  // Blocks being broken shrink away.
  for (let i = breaking.length - 1; i >= 0; i--) {
    const b = breaking[i];
    const t = (performance.now() - b.start) / 160;
    if (t >= 1) {
      b.thing.remove();
      breaking.splice(i, 1);
    } else b.thing.scale = [1 - t * 0.8, 1 - t * 0.8, 1 - t * 0.8];
  }
  // Footsteps on the ground.
  const eye = holoml.viewer.position;
  if (lastStep && Math.abs(eye[1] - lastStep[1]) < 0.05 && Math.hypot(eye[0] - lastStep[0], eye[2] - lastStep[2]) > 1.7) {
    sound(`step-${stepNext}`).play();
    stepNext = 3 - stepNext;
    lastStep = eye;
  } else if (!lastStep || Math.abs(eye[1] - lastStep[1]) >= 0.05) lastStep = eye;
  if (performance.now() > quietAt && hud.message.text !== '') hud.message.text = '';
});

showHand();
showScore();
daytime(startHour);
say('Welcome to Blockworld. Five gems are hidden in the stone.', 6);

// For the curious (and the browser's tests): where things are, read-only.
window.blockworld = Object.freeze({
  seed: SEED,
  get gems() {
    return gems.filter((k) => world.get(k) === 'gem').map((k) => unkey(k).map((v) => v + 0.5));
  },
  get chest() {
    return CHEST.map((v) => v + 0.5);
  },
  get blocks() {
    return shown.size;
  },
  get carried() {
    return carried;
  },
  get stored() {
    return stored;
  },
  get won() {
    return won;
  },
  get hand() {
    return HAND[hand];
  },
  get torches() {
    return lights.filter((l) => l.at !== null).map((l) => l.light.position);
  },
  /** What block is at a place (the block's lowest corner), or null. */
  blockAt(x, y, z) {
    return world.get(key(Math.floor(x), Math.floor(y), Math.floor(z))) ?? null;
  },
  /** How high the island is at a column: the top of its highest block. */
  top(x, z) {
    return tops.get(`${Math.floor(x)},${Math.floor(z)}`) ?? null;
  },
});
