// A stand-in for the scene API (SPEC.md section 10), for testing the
// example sites' scripts without a browser: it reads a page, makes a
// thing for each element with an id (its attributes as members, as the
// API gives them), and runs the page's script against them. It draws
// nothing and checks nothing; it keeps what a script did, and lets a
// test send the script frames, clicks, and keys.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parse, type ElementNode } from '../../packages/parser/src/index.ts';

export interface FakeThing {
  id: string | null;
  kind: string;
  [member: string]: unknown;
}

type Listener = (event: Record<string, unknown>) => void;

const NUMBERS = /^-?\d+(?:\.\d+)?(?: -?\d+(?:\.\d+)?)*$/;

/** An attribute's value as the API gives it: a number, a list of numbers, true for a flag, or the text. */
function member(name: string, value: string | null): unknown {
  if (value === null) return true;
  if (name === 'position' || name === 'rotation' || name === 'scale') return value.split(' ').map(Number);
  return NUMBERS.test(value) && !value.includes(' ') ? Number(value) : value;
}

export interface FakeScene {
  holoml: Record<string, unknown>;
  /** Every thing, those the script added too. */
  things: FakeThing[];
  find(id: string): FakeThing;
  /** Sends the script an event: 'frame', 'click', 'key', or 'change'. */
  emit(type: string, event: Record<string, unknown>): void;
  /** Sends frames: `count` of them, `ms` apart. */
  frames(count: number, ms?: number): void;
  /** Runs a script of the page (its path), as the page would. */
  run(script: string): Promise<void>;
  /** What stands in for the page's window: `location`, `sessionStorage`, and what the script puts there. */
  window: Record<string, unknown>;
  /**
   * How many elements the scene takes in all: what `holoml.add` would put
   * past it is left out, as at a renderer's limit. It can be changed at
   * any time.
   */
  limit: number;
}

let runs = 0;

/**
 * The scene of the page at `file`. `search` is the address's query
 * ("?colour=beach").
 */
export function fakeScene(file: string, { search = '', reducedMotion = false } = {}): FakeScene {
  const things: FakeThing[] = [];
  const listeners = new Map<string, Set<Listener>>();
  let time = 0;

  const make = (el: ElementNode): FakeThing => {
    const thing: FakeThing = { id: null, kind: el.name, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], visible: true, played: 0 };
    for (const a of el.attributes) thing[a.name === 'turn-speed' ? 'turnSpeed' : a.name] = member(a.name, a.value);
    if (typeof thing.scale === 'number') thing.scale = [thing.scale, thing.scale, thing.scale];
    const text = el.children.flatMap((c) => (c.type === 'text' ? [c.value] : [])).join('').trim();
    if (['hud', 'panel', 'label', 'slider'].includes(el.name)) thing.text = text;
    // A choice's value is one of its options' values: text, whatever it looks like.
    if (el.name === 'choice') thing.value = String(el.attributes.find((a) => a.name === 'value')?.value ?? '');
    if (el.name === 'choice') thing.options = el.children.flatMap((c) => (c.type === 'element' && c.name === 'option' ? [String(c.attributes.find((a) => a.name === 'value')?.value)] : []));
    thing.play = () => void (thing.played = (thing.played as number) + 1);
    thing.stop = () => undefined;
    thing.remove = () => void things.splice(things.indexOf(thing), 1);
    things.push(thing);
    return thing;
  };
  const walk = (el: ElementNode, each: (el: ElementNode) => void): void => {
    each(el);
    for (const c of el.children) if (c.type === 'element') walk(c, each);
  };
  const page = parse(readFileSync(file, 'utf8'));
  walk(page.root, (el) => {
    if (el.attributes.some((a) => a.name === 'id')) make(el);
  });

  const viewer = things.find((t) => t.kind === 'viewpoint') ?? { id: null, kind: 'viewpoint', position: [0, 1.6, 0] };
  const holoml: Record<string, unknown> = {
    reducedMotion,
    background: '#000000',
    viewer,
    find: (id: string) => things.find((t) => t.id === id) ?? null,
    add(markup: string): FakeThing[] {
      const added: FakeThing[] = [];
      for (const el of parse(`<holoml version="0.2"><scene>${markup}</scene></holoml>`).root.children) {
        if (el.type !== 'element') continue;
        for (const child of el.children) if (child.type === 'element' && things.length < scene.limit) added.push(make(child));
      }
      return added;
    },
    on(type: string, listener: Listener): () => void {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
      return () => void listeners.get(type)!.delete(listener);
    },
    aim: () => null,
  };

  const storage = new Map<string, string>();
  const window: Record<string, unknown> = {
    location: { search },
    sessionStorage: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v) },
    addEventListener: () => undefined,
  };

  const emit = (type: string, event: Record<string, unknown>): void => {
    for (const listener of [...(listeners.get(type) ?? [])]) listener(event);
  };
  const scene: FakeScene = {
    holoml,
    things,
    window,
    limit: Infinity,
    find(id) {
      const thing = things.find((t) => t.id === id);
      if (!thing) throw new Error(`the page has no #${id}`);
      return thing;
    },
    emit,
    frames(count, ms = 1000 / 60) {
      for (let i = 0; i < count; i++) {
        time += ms;
        emit('frame', { time, dt: ms });
      }
    },
    async run(script) {
      const g = globalThis as Record<string, unknown>;
      Object.assign(g, { holoml, window, location: window.location, sessionStorage: window.sessionStorage });
      // A new address each time, so that the script runs again for each test.
      await import(/* @vite-ignore */ `${pathToFileURL(script).href}?run=${++runs}`);
    },
  };
  return scene;
}
