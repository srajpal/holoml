// The example sites' scripts, run against a stand-in for the scene API
// (fake-scene.ts): what review 134 found in them (E4), each check failing
// without its fix. How they look and play in a real renderer is checked
// by HyperSpace 3D's own end-to-end checks.
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeScene, type FakeScene, type FakeThing } from './fake-scene.ts';

const EXAMPLES = fileURLToPath(new URL('../', import.meta.url));
/** Room for the two checks that run a minute or two of the aquarium, on a busy machine. */
const SLOW = 60_000;
const left = (thing: FakeThing | null, more: Record<string, unknown> = {}) => ({ thing, point: null, normal: null, button: 'left', ...more });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('E4: the aquarium (aquarium.js)', () => {
  const open = async (options = {}): Promise<FakeScene> => {
    const scene = fakeScene(`${EXAMPLES}aquarium/index.holoml`, options);
    await scene.run(`${EXAMPLES}aquarium/aquarium.js`);
    return scene;
  };
  const flakes = (scene: FakeScene) => scene.things.filter((t) => t.src === 'models/flake.glb');
  const status = (scene: FakeScene) => scene.find('status').text;

  it('feeds: the food falls, and the corner says when it is eaten or gone', async () => {
    const scene = await open();
    scene.frames(30);
    scene.emit('click', left(scene.find('feed')));
    expect(status(scene)).toBe('Food is falling: the fish are coming.');
    expect(flakes(scene)).toHaveLength(24);
    expect(flakes(scene).every((f) => f.visible)).toBe(true);
    // Flakes fall at about a tenth of a metre a second from 6.3 m, and lie 20 seconds on the sand:
    // two minutes, in steps of a tenth of a second (the longest step the script takes).
    scene.frames(1200, 100);
    expect(status(scene)).toMatch(/^The fish have eaten/);
    expect(flakes(scene).every((f) => !f.visible)).toBe(true);
  }, SLOW);

  it('ends a feed when reduced motion is turned on while food falls, and Feed works again', async () => {
    const scene = await open();
    scene.frames(30);
    scene.emit('click', left(scene.find('feed')));
    scene.frames(30);
    scene.holoml.reducedMotion = true;
    scene.frames(1);
    expect(status(scene)).toBe('The fish have eaten.');
    expect(flakes(scene).every((f) => !f.visible)).toBe(true);
    // Feed again, held still: the food is down at once, and gone a moment later.
    scene.emit('click', left(scene.find('feed')));
    expect(status(scene)).toBe('Food is down.');
    expect(flakes(scene).every((f) => f.visible && (f.position as number[])[1] === 0.1)).toBe(true);
    vi.advanceTimersByTime(1500);
    expect(status(scene)).toBe('The fish have eaten.');
    expect(flakes(scene).every((f) => !f.visible)).toBe(true);
  });

  it('ends the feed even when a page held still sends no more frames', async () => {
    const scene = await open();
    scene.frames(30);
    scene.emit('key', { key: 'f', down: true, repeat: false });
    expect(status(scene)).toBe('Food is falling: the fish are coming.');
    scene.holoml.reducedMotion = true;
    vi.advanceTimersByTime(1000);
    expect(status(scene)).toBe('The fish have eaten.');
    scene.emit('key', { key: 'f', down: true, repeat: false });
    expect(status(scene)).toBe('Food is down.');
  });

  it('after a feed with reduced motion, turning it off does not say that the food sank into the sand', async () => {
    const scene = await open({ reducedMotion: true });
    scene.emit('click', left(scene.find('feed')));
    expect(status(scene)).toBe('Food is down.');
    vi.advanceTimersByTime(1500);
    expect(status(scene)).toBe('The fish have eaten.');
    scene.holoml.reducedMotion = false;
    vi.advanceTimersByTime(1000);
    scene.frames(10);
    expect(status(scene)).toBe('The fish have eaten.');
    // And a feed now falls as usual.
    scene.emit('click', left(scene.find('feed')));
    expect(status(scene)).toBe('Food is falling: the fish are coming.');
  });

  it('hears the first button only: a right-click neither feeds nor asks about a fish', async () => {
    const scene = await open();
    const board = scene.find('board').text;
    scene.emit('click', { ...left(scene.find('feed')), button: 'right' });
    expect(flakes(scene).every((f) => !f.visible)).toBe(true);
    scene.emit('click', { ...left(scene.find('turtle-1')), button: 'right' });
    scene.emit('click', { ...left(scene.find('turtle-1')), button: 'middle' });
    expect(scene.find('board').text).toBe(board);
    scene.emit('click', left(scene.find('turtle-1')));
    expect(scene.find('board').text).toMatch(/^Hawksbill sea turtle\n\nLives on coral reefs/);
  });

  /** The same numbers every run from a seed (mulberry32), in place of Math.random. */
  const seeded = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Random paths, and one that is the same every run: with seed 25 a snapper after the food was pushed out of a
  // rock and down through the sand (0.184 m from it), before the pushes were repeated until all held (holoml #30).
  it.each([['random paths'], ['seed 25', 25]] as [string, number?][])('keeps every fish in the water, clear of the tunnel and the rocks, through a minute and a feed (%s)', async (_, seed) => {
    if (seed !== undefined) vi.spyOn(Math, 'random').mockImplementation(seeded(seed));
    const { TANK, TUNNEL, ROCKS, KINDS } = (await import(new URL('../aquarium/ocean.js', import.meta.url).href)) as {
      TANK: { min: number[]; max: number[] };
      TUNNEL: { radius: number; from: number; to: number };
      ROCKS: { at: number[]; scale: number }[];
      KINDS: { kind: string; count: number }[];
    };
    const scene = await open();
    const fish = KINDS.flatMap((k) => Array.from({ length: k.count }, (_, i) => scene.find(`${k.kind}-${i + 1}`)));
    expect(fish).toHaveLength(30);
    const start = fish.map((f) => [...(f.position as number[])]);
    for (let second = 0; second < 60; second++) {
      if (second === 10) scene.emit('click', left(scene.find('feed')));
      scene.frames(30, 1000 / 30);
      for (const f of fish) {
        const [x, y, z] = f.position as [number, number, number];
        for (const [a, v] of [x, y, z].entries()) {
          expect(v, `${f.id} at ${second} s`).toBeGreaterThanOrEqual(TANK.min[a]! + 0.2);
          expect(v, `${f.id} at ${second} s`).toBeLessThanOrEqual(TANK.max[a]! - 0.2);
        }
        if (z <= TUNNEL.from + 1 && z >= TUNNEL.to - 1.5) expect(Math.hypot(x, Math.max(0, y)), `${f.id} and the tunnel at ${second} s`).toBeGreaterThanOrEqual(TUNNEL.radius);
        for (const r of ROCKS) expect(Math.hypot(x - r.at[0]!, y - (r.at[1]! + 0.75 * r.scale), z - r.at[2]!), `${f.id} and a rock at ${second} s`).toBeGreaterThanOrEqual(0.95 * r.scale);
        expect(f.animationSpeed as number).toBeGreaterThanOrEqual(0.5);
        expect(f.animationSpeed as number).toBeLessThanOrEqual(2.5);
      }
    }
    // They swam: each is somewhere else.
    fish.forEach((f, i) => expect(Math.hypot(...(f.position as number[]).map((v, a) => v - start[i]![a]!)), String(f.id)).toBeGreaterThan(0.5));
  }, SLOW);

  it('puts a fish anywhere back in the water and clear of everything, or leaves it where it was (keepClear, holoml #30)', async () => {
    type Point = [number, number, number];
    const ocean = (await import(new URL('../aquarium/ocean.js', import.meta.url).href)) as {
      BALLS: { at: Point; radius: number }[];
      clear: (p: Point, clearance: number) => boolean;
      keepClear: (from: Point, to: Point, clearance: number) => Point;
    };
    const from: Point = [0, 4.5, 0];
    for (const clearance of [0.125, 0.7]) {
      expect(ocean.clear(from, clearance)).toBe(true);
      // Where the pushes fight: under each rock at the sand (its ball reaches below it), and on each side of it.
      const hard: Point[] = ocean.BALLS.flatMap(({ at }) => [[at[0], 0.1, at[2]], [at[0] + 0.3, 0.2, at[2]], [at[0], 0.2, at[2] - 0.3]] as Point[]);
      // And every point of a grid over the tank and a little beyond, a quarter of a metre up and half a metre across.
      for (let x = -13; x <= 13; x += 0.5) for (let y = -0.5; y <= 7; y += 0.25) for (let z = -21; z <= 15; z += 0.5) hard.push([x, y, z]);
      for (const to of hard) {
        const p = ocean.keepClear(from, to, clearance);
        expect(ocean.clear(p, clearance), `${to.join(' ')} with ${clearance} clear: ${p.join(' ')}`).toBe(true);
      }
    }
    // A fish already clear goes where it swam, untouched.
    expect(ocean.keepClear(from, [0.5, 4.4, 0.1], 0.7)).toEqual([0.5, 4.4, 0.1]);
  }, SLOW);
});

describe('E4: Blockworld (game.js)', () => {
  interface Blockworld {
    torches: number[][];
    blockAt(x: number, y: number, z: number): string | null;
    top(x: number, z: number): number;
  }
  const open = async (): Promise<{ scene: FakeScene; game: Blockworld }> => {
    const scene = fakeScene(`${EXAMPLES}blockworld/index.holoml`);
    await scene.run(`${EXAMPLES}blockworld/game.js`);
    return { scene, game: scene.window.blockworld as Blockworld };
  };
  const at = (scene: FakeScene, x: number, y: number, z: number) =>
    scene.things.find((t) => t.kind === 'model' && (t.position as number[]).every((v, a) => v === [x, y, z][a]! + 0.5)) ?? null;
  /** Stands beside a column and clicks on top of its highest block with the right button: places what is in hand there. */
  const placeOn = (scene: FakeScene, game: Blockworld, x: number, z: number): [number, number, number] => {
    const top = game.top(x, z);
    (scene.holoml.viewer as FakeThing).position = [x + 0.5, top + 3.2, z + 2.5];
    scene.emit('click', { thing: at(scene, x, top - 1, z), point: [x + 0.5, top, z + 0.5], normal: [0, 1, 0], button: 'right' });
    return [x, top, z];
  };
  const breakAt = (scene: FakeScene, [x, y, z]: [number, number, number]) => {
    (scene.holoml.viewer as FakeThing).position = [x + 0.5, y + 3.2, z + 2.5];
    scene.emit('click', { thing: at(scene, x, y, z), point: [x + 0.5, y + 0.5, z + 0.5], normal: [0, 1, 0], button: 'left' });
  };
  /** Ten columns of open ground (no tree on them), apart from each other and from the chest. */
  const spots = (game: Blockworld): [number, number][] => {
    const out: [number, number][] = [];
    for (const z of [-7, -4, 4, 7]) {
      for (let x = -7; x <= 7 && out.length < 10; x += 3) {
        const top = game.top(x, z);
        if (game.blockAt(x, top - 1, z) === 'grass' && game.blockAt(x, top, z) === null) out.push([x, z]);
      }
    }
    expect(out).toHaveLength(10);
    return out;
  };
  const lightOver = ([x, y, z]: [number, number, number]) => [x + 0.5, y + 0.8, z + 0.5];

  it('a ninth torch takes the light that has burned longest, and that torch is lit again when a light is free', async () => {
    const { scene, game } = await open();
    scene.emit('key', { key: '5', down: true, repeat: false });
    const SPOTS = spots(game);
    const torches = SPOTS.slice(0, 9).map(([x, z]) => placeOn(scene, game, x, z));
    for (const t of torches) expect(game.blockAt(...t), t.join()).toBe('torch');
    // Eight lights: the ninth torch has the first torch's.
    expect(game.torches).toHaveLength(8);
    expect(game.torches).toContainEqual(lightOver(torches[8]!));
    expect(game.torches).not.toContainEqual(lightOver(torches[0]!));
    // The ninth broken: its light goes back to the first torch, which waited.
    breakAt(scene, torches[8]!);
    expect(game.blockAt(...torches[8]!)).toBeNull();
    expect(game.torches).toHaveLength(8);
    expect(game.torches).toContainEqual(lightOver(torches[0]!));
    // A torch that was waiting and is broken takes no light with it; one with a light frees it.
    const tenth = placeOn(scene, game, ...SPOTS[9]!);
    expect(game.torches).toContainEqual(lightOver(tenth));
    expect(game.torches).not.toContainEqual(lightOver(torches[1]!));
    breakAt(scene, torches[1]!);
    expect(game.torches).toHaveLength(8);
    breakAt(scene, tenth);
    expect(game.torches).toHaveLength(7);
    for (const light of game.torches) expect(torches.slice(0, 8).map(lightOver)).toContainEqual(light);
  });

  it('a block the page has no room for is not placed: nothing is there that cannot be seen or built on', async () => {
    const { scene, game } = await open();
    scene.emit('key', { key: '3', down: true, repeat: false });
    const [x, z] = spots(game)[0]!;
    const top = game.top(x, z);
    const placed = scene.find('place').played;
    scene.limit = scene.things.length;
    placeOn(scene, game, x, z);
    expect(game.blockAt(x, top, z)).toBeNull();
    expect(at(scene, x, top, z)).toBeNull();
    expect(scene.find('place').played).toBe(placed);
    expect(scene.find('message').text).toBe('There is no room for more blocks.');
    // With room again, the same place takes a block.
    scene.limit = Infinity;
    placeOn(scene, game, x, z);
    expect(game.blockAt(x, top, z)).toBe('stone');
    expect(at(scene, x, top, z)).not.toBeNull();
    expect(scene.find('place').played).toBe((placed as number) + 1);
  });
});

describe('E4: the sneaker store (shoe.js)', () => {
  it('adds to the cart on a click of the first button only', async () => {
    const scene = fakeScene(`${EXAMPLES}sneaker-store/shoe.holoml`, { search: '?colour=beach' });
    await scene.run(`${EXAMPLES}sneaker-store/shoe.js`);
    expect(scene.find('colour').value).toBe('beach');
    expect(scene.find('cart').text).toBe('Cart: empty');
    scene.emit('click', { ...left(scene.find('add')), button: 'right' });
    scene.emit('click', { ...left(scene.find('add')), button: 'middle' });
    expect(scene.find('cart').text).toBe('Cart: empty');
    scene.emit('click', left(scene.find('add')));
    expect(scene.find('cart').text).toBe('Cart: 1 pair · $120');
    // Another thing clicked adds nothing.
    scene.emit('click', left(scene.find('turn-over')));
    expect(scene.find('cart').text).toBe('Cart: 1 pair · $120');
  });
});
