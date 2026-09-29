// The aquarium's script (HoloML 0.2 scene API, SPEC.md section 10).
//
// It swims the fish: each kind at its own depth and pace, schools
// together, all inside the water and clear of the tunnel, the rocks, and
// each other, their tails beating faster when they hurry. It lets bubbles
// rise from the air stones. When the fish are fed (the Feed button, or F)
// it drops food from the surface, and the nearest fish swim to it and eat
// it. A click on a fish, or its button in the outline, tells about it on
// the board in the tunnel. With reduced motion everything holds still,
// and feeding puts the food down and says that the fish have eaten.
import { AIRSTONES, FEEDER, KINDS, ROCKS, TANK, TUNNEL } from './ocean.js';

const board = holoml.find('board');
const status = holoml.find('status');
const DEG = 180 / Math.PI;
const random = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const length = (v) => Math.hypot(v[0], v[1], v[2]);
const scale = (v, k) => [v[0] * k, v[1] * k, v[2] * k];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const unit = (v) => {
  const l = length(v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

// ---- The fish ---------------------------------------------------------------------

/** Fish that come for the food (sharks and the turtle do not). */
const EATERS = new Set(['tuna', 'barramundi', 'bream', 'mackerel', 'snapper', 'clownfish', 'butterflyfish']);
/** How far each kind turns in a second at most, in radians: big fish turn wide. */
const TURN = { shark: 0.45, turtle: 0.5, tuna: 0.9, barramundi: 1.2, bream: 1.8, mackerel: 2.0, snapper: 1.6, clownfish: 2.4, butterflyfish: 2.0 };
/** Each kind's length, for where its mouth is (metres; as tools/fish.mjs makes them). */
const LENGTH = { shark: 3.2, turtle: 1.1, tuna: 1.5, barramundi: 0.9, bream: 0.35, mackerel: 0.35, snapper: 0.45, clownfish: 0.11, butterflyfish: 0.18 };

const fish = [];
for (const k of KINDS) {
  for (let i = 1; i <= k.count; i++) {
    const thing = holoml.find(`${k.kind}-${i}`);
    if (!thing) continue;
    const yaw = thing.rotation[1] / DEG;
    const cruise = random(k.speed[0], (k.speed[0] + k.speed[1]) / 2);
    fish.push({
      thing,
      kind: k,
      p: [...thing.position],
      v: [Math.sin(yaw) * cruise, 0, Math.cos(yaw) * cruise],
      cruise,
      target: null,
      until: 0,
      eating: null,
    });
  }
}

/** A place a fish of this kind might swim to next: in the water, at its depth, clear of the tunnel and the rocks. */
function somewhere(k) {
  const margin = k.clearance + 0.8;
  for (let tries = 0; tries < 40; tries++) {
    const p = [random(TANK.min[0] + margin, TANK.max[0] - margin), random(k.depth[0], k.depth[1]), random(TANK.min[2] + margin, TANK.max[2] - margin - 1)];
    if (tunnelGap(p, k.clearance) < 0.6) continue;
    if (ROCKS.some((r) => rockGap(p, r, k.clearance) < 0.4)) continue;
    return p;
  }
  return [TANK.min[0] + margin, (k.depth[0] + k.depth[1]) / 2, 0];
}

/** How far a point is outside the tunnel's glass, less a fish's clearance (the tunnel runs along z on the floor). */
function tunnelGap(p, clearance) {
  if (p[2] > TUNNEL.from + 1 || p[2] < TUNNEL.to - 1.5) return Infinity;
  return Math.hypot(p[0], Math.max(0, p[1])) - TUNNEL.radius - clearance;
}

/** A rock, as a ball about as big as it is. */
function rockBall(r) {
  return { at: [r.at[0], r.at[1] + 0.75 * r.scale, r.at[2]], radius: 0.95 * r.scale };
}

function rockGap(p, r, clearance) {
  const b = rockBall(r);
  return length(sub(p, b.at)) - b.radius - clearance;
}

/** Where a fish wants to go now, as a direction and a speed, from its target, its neighbours, the food, and what it must keep clear of. */
function steer(f, now) {
  const k = f.kind;
  let speed = f.cruise;
  let want = [0, 0, 0];
  // Food: the nearest flake within reach, for fish that eat it.
  f.eating = null;
  if (EATERS.has(k.kind)) {
    let best = null;
    let near = 7;
    for (const flake of food) {
      if (!flake.falling) continue;
      const d = length(sub(flake.p, f.p));
      if (d < near) [best, near] = [flake, d];
    }
    if (best) {
      f.eating = best;
      want = add(want, scale(unit(sub(best.p, f.p)), 3));
      speed = k.speed[1];
    }
  }
  if (!f.eating) {
    if (!f.target || now > f.until || length(sub(f.target, f.p)) < 1.2) {
      f.target = somewhere(k);
      f.until = now + random(8, 20);
    }
    want = add(want, unit(sub(f.target, f.p)));
  }
  // Schools: toward their fellows, and the same way they go.
  if (k.school) {
    let [centre, heading, n] = [[0, 0, 0], [0, 0, 0], 0];
    for (const o of fish) {
      if (o === f || o.kind !== k || length(sub(o.p, f.p)) > 4) continue;
      centre = add(centre, o.p);
      heading = add(heading, unit(o.v));
      n++;
    }
    if (n) {
      want = add(want, scale(unit(sub(scale(centre, 1 / n), f.p)), 0.6));
      want = add(want, scale(unit(heading), 0.8));
    }
  }
  // Room: away from any fish too near.
  for (const o of fish) {
    if (o === f) continue;
    const d = sub(f.p, o.p);
    const room = (k.clearance + o.kind.clearance) * 1.3;
    const l = length(d);
    if (l < room && l > 1e-6) want = add(want, scale(unit(d), (2 * (room - l)) / room));
  }
  // Clear of the tunnel: out from its middle line, harder the nearer.
  const gap = tunnelGap(f.p, k.clearance);
  if (gap < 1.5) want = add(want, scale(unit([f.p[0], Math.max(0.2, f.p[1]), 0]), (1.5 - gap) * 2.5));
  // Clear of the rocks.
  for (const r of ROCKS) {
    const g = rockGap(f.p, r, k.clearance);
    if (g < 0.8) want = add(want, scale(unit(sub(f.p, rockBall(r).at)), (0.8 - g) * 2.5));
  }
  // Inside the water: away from the walls, the sand, and the surface; and within its kind's depth,
  // unless it is after food, which it follows down to the sand.
  const margin = k.clearance + 0.6;
  for (let a = 0; a < 3; a++) {
    const floor = f.eating ? TANK.min[1] + k.clearance * 0.5 + 0.1 : Math.max(TANK.min[1] + margin, k.depth[0]);
    const low = a === 1 ? floor : TANK.min[a] + margin;
    const high = a === 1 ? (f.eating ? TANK.max[1] - margin : Math.min(TANK.max[1] - margin, k.depth[1])) : TANK.max[a] - margin;
    if (f.p[a] < low) want[a] += (low - f.p[a]) * 2;
    if (f.p[a] > high) want[a] -= (f.p[a] - high) * 2;
  }
  return { direction: unit(want), speed };
}

/** Turns a heading (yaw about the up axis) and a tilt (pitch, nose up) into the rotation HoloML takes (degrees, x then y then z). */
function rotation(yaw, pitch) {
  const [cy, sy, cp, sp] = [Math.cos(yaw), Math.sin(yaw), Math.cos(pitch), Math.sin(-pitch)];
  return [Math.atan2(sp, cy * cp) * DEG, Math.asin(clamp(sy * cp, -1, 1)) * DEG, Math.atan2(-sy * sp, cy) * DEG];
}

function swim(dt, now) {
  for (const f of fish) {
    const { direction, speed } = steer(f, now);
    // Turn toward where it wants to go, no faster than its kind can.
    const heading = unit(f.v);
    const angle = Math.acos(clamp(heading[0] * direction[0] + heading[1] * direction[1] + heading[2] * direction[2], -1, 1));
    const most = TURN[f.kind.kind] * dt;
    const t = angle > most ? most / angle : 1;
    let next = unit(add(scale(heading, 1 - t), scale(direction, t)));
    // Fish swim level: a gentle climb or dive at most.
    next = unit([next[0], clamp(next[1], -0.35, 0.35), next[2]]);
    const was = length(f.v);
    const pace = was + clamp(speed - was, -0.6 * dt, 0.9 * dt);
    f.v = scale(next, pace);
    f.p = add(f.p, scale(f.v, dt));
    // Never through the glass, the walls, or a rock, whatever the steering did.
    for (let a = 0; a < 3; a++) f.p[a] = clamp(f.p[a], TANK.min[a] + 0.2, TANK.max[a] - 0.2);
    const gap = tunnelGap(f.p, f.kind.clearance * 0.5);
    if (gap < 0) {
      const out = unit([f.p[0], Math.max(0.05, f.p[1]), 0]);
      f.p = add(f.p, scale(out, -gap));
    }
    for (const r of ROCKS) {
      const g = rockGap(f.p, r, f.kind.clearance * 0.5);
      if (g < 0) f.p = add(f.p, scale(unit(sub(f.p, rockBall(r).at)), -g));
    }
    f.thing.position = f.p;
    f.thing.rotation = rotation(Math.atan2(f.v[0], f.v[2]), Math.asin(clamp(f.v[1] / (length(f.v) || 1), -1, 1)));
    // The tail beats faster when it hurries.
    f.thing.animationSpeed = clamp(length(f.v) / f.cruise, 0.5, 2.5);
    // A fish that reaches a flake eats it.
    if (f.eating?.falling) {
      const mouth = add(f.p, scale(unit(f.v), LENGTH[f.kind.kind] / 2));
      if (length(sub(mouth, f.eating.p)) < 0.18 + LENGTH[f.kind.kind] * 0.1) eat(f.eating);
    }
  }
}

// ---- Bubbles -----------------------------------------------------------------------

const PER_STONE = 18;
const bubbles = [];
for (const stone of AIRSTONES) {
  for (let i = 0; i < PER_STONE; i++) {
    const [thing] = holoml.add(`<model src="models/bubble.glb" position="${stone.join(' ')}" />`);
    if (!thing) continue;
    const size = random(0.6, 1.8);
    thing.scale = [size, size, size];
    // Spread up the column at first, so the stream is already rising.
    bubbles.push({ thing, stone, y: stone[1] + random(0, TANK.max[1] - stone[1]), speed: random(0.28, 0.42) / Math.sqrt(size), phase: random(0, 6.28), drift: random(0.02, 0.06) });
  }
}

function rise(dt, now) {
  for (const b of bubbles) {
    b.y += b.speed * dt;
    if (b.y > TANK.max[1] - 0.05) b.y = b.stone[1] + random(0, 0.1);
    const wobble = Math.sin(now * 4 + b.phase) * b.drift;
    b.thing.position = [b.stone[0] + wobble, b.y, b.stone[2] + Math.cos(now * 3.3 + b.phase) * b.drift];
  }
}

function placeBubbles() {
  for (const b of bubbles) b.thing.position = [b.stone[0], b.y, b.stone[2]];
}

// ---- Feeding ------------------------------------------------------------------------

const FLAKES = 24;
const food = [];
for (let i = 0; i < FLAKES; i++) {
  const [thing] = holoml.add(`<model src="models/flake.glb" position="${FEEDER.join(' ')}" />`);
  if (!thing) continue;
  thing.visible = false;
  food.push({ thing, p: [...FEEDER], v: [0, 0, 0], falling: false, landed: 0, eaten: false });
}

let fed = false;
function feed() {
  if (food.some((f) => f.falling)) return;
  for (const f of food) {
    f.p = [FEEDER[0] + random(-0.5, 0.5), FEEDER[1] + random(-0.1, 0.1), FEEDER[2] + random(-0.5, 0.5)];
    f.v = [random(-0.03, 0.03), -random(0.08, 0.14), random(-0.03, 0.03)];
    f.landed = 0;
    f.eaten = false;
    f.thing.position = f.p;
    f.thing.rotation = [random(-20, 20), random(0, 360), random(-20, 20)];
    f.thing.visible = true;
  }
  fed = true;
  if (holoml.reducedMotion) {
    // Held still: the food on the sand at once, and gone a moment later.
    for (const f of food) f.thing.position = [f.p[0], 0.1, f.p[2]];
    status.text = 'Food is down.';
    setTimeout(() => {
      for (const f of food) f.thing.visible = false;
      status.text = 'The fish have eaten.';
    }, 1500);
    return;
  }
  for (const f of food) f.falling = true;
  status.text = 'Food is falling: the fish are coming.';
}

function eat(flake, byFish = true) {
  flake.falling = false;
  flake.eaten = byFish;
  flake.thing.visible = false;
}

function sink(dt) {
  if (!fed) return;
  for (const f of food) {
    if (!f.falling) continue;
    f.p = add(f.p, scale(f.v, dt));
    f.v = [f.v[0] * 0.99, f.v[1], f.v[2] * 0.99];
    // On the sand it lies a while, and then is gone.
    if (f.p[1] < 0.1) {
      f.p[1] = 0.1;
      f.v = [0, 0, 0];
      f.landed += dt;
      if (f.landed > 20) eat(f, false);
    }
    f.thing.position = f.p;
  }
  if (!food.some((f) => f.falling)) {
    fed = false;
    const left = food.filter((f) => !f.eaten).length;
    status.text = left ? `The fish have eaten; ${left} ${left === 1 ? 'flake' : 'flakes'} sank into the sand.` : 'The fish have eaten.';
  }
}

holoml.on('key', (e) => {
  if (e.down && !e.repeat && e.key.toLowerCase() === 'f') feed();
});

// ---- The board ------------------------------------------------------------------------

/**
 * The fish a click means: the one clicked, or, for a click on the tunnel's
 * glass (or anything else between the viewer and the fish), the fish
 * nearest the line from the viewer through that point, beyond it.
 */
function clicked(e) {
  const id = e.thing?.id ?? '';
  const own = fish.find((f) => f.thing.id === id);
  if (own) return own;
  if (!e.point) return null;
  const eye = holoml.viewer.position;
  const ray = unit(sub(e.point, eye));
  const reach = length(sub(e.point, eye));
  let best = null;
  let nearest = Infinity;
  for (const f of fish) {
    const to = sub(f.p, eye);
    const along = to[0] * ray[0] + to[1] * ray[1] + to[2] * ray[2];
    if (along < reach - 0.5) continue;
    const off = length(sub(to, scale(ray, along)));
    if (off < Math.max(0.35, LENGTH[f.kind.kind] * 0.5) && off < nearest) [best, nearest] = [f, off];
  }
  return best;
}

// A click on a fish (with the mouse, through the glass too), or on the button of its kind in the outline (the keyboard and screen readers).
holoml.on('click', (e) => {
  if (e.thing?.id === 'feed') {
    feed();
    return;
  }
  const f = clicked(e);
  if (f) board.text = `${f.kind.name}\n\n${f.kind.text}`;
});

// ---- Frames ------------------------------------------------------------------------------

// Each frame moves everything on; with reduced motion nothing moves, and the scene draws only when something changes.
let stop = null;
function start() {
  if (stop || holoml.reducedMotion) return;
  stop = holoml.on('frame', (e) => {
    if (holoml.reducedMotion) {
      stop();
      stop = null;
      return;
    }
    const dt = Math.min(0.1, e.dt / 1000);
    const now = e.time / 1000;
    swim(dt, now);
    rise(dt, now);
    sink(dt);
  });
}
if (holoml.reducedMotion) placeBubbles();
start();
// Reduced motion can be turned on and off while the page is open.
setInterval(() => {
  if (!holoml.reducedMotion) start();
}, 1000);
