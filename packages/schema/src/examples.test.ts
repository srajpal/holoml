import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from '@holoml/parser';
import { check } from './index.ts';

interface GltfJson {
  materials?: { name: string }[];
  buffers?: { uri?: string }[];
  images?: { uri?: string }[];
  meshes?: { primitives: { indices?: number; attributes: Record<string, number> }[] }[];
  accessors: { count: number }[];
}

const EXAMPLES = fileURLToPath(new URL('../../../examples/', import.meta.url));

function holomlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? holomlFiles(join(dir, e.name)) : e.name.endsWith('.holoml') ? [join(dir, e.name)] : [],
  );
}

describe('examples', () => {
  const files = holomlFiles(EXAMPLES);

  it('has example pages', () => {
    expect(files.length).toBeGreaterThanOrEqual(2);
  });

  for (const file of files) {
    it(`${file.slice(EXAMPLES.length).replace(/\\/g, '/')} is valid HoloML`, () => {
      expect(check(parse(readFileSync(file, 'utf8')))).toEqual([]);
    });
  }

  /** A glTF or GLB file's JSON part. */
  const gltfJson = (file: string) => {
    const b = readFileSync(file);
    if (b.toString('ascii', 0, 4) !== 'glTF') return JSON.parse(b.toString('utf8')) as GltfJson;
    return JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8')) as GltfJson;
  };

  it('the showroom links to pages that exist, and each model has the materials its page changes', () => {
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const [, href] of text.matchAll(/href="([^":]+\.holoml)"/g)) {
        expect(files.some((f) => f.replace(/\\/g, '/').endsWith(`/${href}`)), href).toBe(true);
      }
      for (const [, src, body] of text.matchAll(/<model src="([^"]+)"[^>]*?(?:\/>|>([\s\S]*?)<\/model>)/g)) {
        const names = (gltfJson(join(dirname(file), src!)).materials ?? []).map((m) => m.name);
        for (const [, name] of (body ?? '').matchAll(/<material name="([^"]+)"/g)) expect(names, `${src} in ${file}`).toContain(name);
      }
    }
  });

  it("every link of every page leads somewhere: a file of its site, with the place or the choice its address names, or a file of this repository", () => {
    const seen = { pages: 0, others: 0, places: 0, choices: 0, repository: 0 };
    for (const file of files) {
      const name = file.slice(EXAMPLES.length).replace(/\\/g, '/');
      for (const [, href] of readFileSync(file, 'utf8').matchAll(/href="([^"]+)"/g)) {
        // A file of this repository, on GitHub.
        const own = /^https:\/\/github\.com\/srajpal\/holoml\/(?:blob|tree)\/main\/([^#?]+)/.exec(href!);
        if (own) {
          expect(existsSync(join(EXAMPLES, '..', own[1]!)), `${href} in ${name}`).toBe(true);
          seen.repository++;
          continue;
        }
        // Another site.
        if (/^[a-z][a-z0-9+.-]*:/i.test(href!)) continue;
        // A file of its own site: a HoloML page, or another kind of page (a cart, a booking, a checkout).
        const [rest, place] = href!.split('#');
        const [path, query] = rest!.split('?');
        const target = join(dirname(file), path!);
        expect(existsSync(target), `${href} in ${name}`).toBe(true);
        if (path!.endsWith('.holoml')) seen.pages++;
        else seen.others++;
        const page = readFileSync(target, 'utf8');
        // "#name": a place of that page (a viewpoint with that id).
        if (place !== undefined) {
          expect(page, `${href} in ${name}`).toMatch(new RegExp(`<viewpoint id="${place}"[\\s>]`));
          seen.places++;
        }
        // "?colour=beach": a choice of that page, and one of its options.
        for (const [id, value] of new URLSearchParams(query ?? '')) {
          const choice = new RegExp(`<choice id="${id}"[^>]*>([\\s\\S]*?)</choice>`).exec(page)?.[1];
          expect(choice, `${href} in ${name}: the choice ${id}`).toBeDefined();
          expect(choice, `${href} in ${name}`).toContain(`<option value="${value}"`);
          seen.choices++;
        }
      }
    }
    // The kinds of link the examples have today, so that none goes unchecked unnoticed.
    expect(seen.pages).toBeGreaterThan(40);
    expect(seen.others).toBe(4);
    expect(seen.places).toBe(1);
    expect(seen.choices).toBe(10);
    expect(seen.repository).toBeGreaterThanOrEqual(11);
  });

  it('the showroom stays small: under 10 MB and 200,000 triangles for the hall', () => {
    const hall = readFileSync(join(EXAMPLES, 'showroom/index.holoml'), 'utf8');
    const srcs = [...hall.matchAll(/<model src="([^"]+)"/g)].map((m) => m[1]!);
    let bytes = 0;
    let triangles = 0;
    for (const src of srcs) {
      const path = join(EXAMPLES, 'showroom', src);
      bytes += statSync(path).size;
      const g = gltfJson(path);
      for (const image of g.images ?? []) if (image.uri && !image.uri.startsWith('data:')) bytes += statSync(join(dirname(path), image.uri)).size;
      for (const mesh of g.meshes ?? []) for (const p of mesh.primitives) triangles += g.accessors[p.indices ?? p.attributes['POSITION']!]!.count / 3;
    }
    expect(srcs.length).toBeGreaterThan(5);
    expect(bytes).toBeLessThan(10 * 1024 * 1024);
    expect(triangles).toBeLessThan(200_000);
  });

  it('Blockworld names only files that exist, and stays small', () => {
    const dir = join(EXAMPLES, 'blockworld');
    const page = readFileSync(join(dir, 'index.holoml'), 'utf8');
    const game = readFileSync(join(dir, 'game.js'), 'utf8');
    const named = [
      ...[...page.matchAll(/src="([^"]+)"/g)].map((m) => m[1]!),
      // The blocks the script adds: models/<kind>.gltf for each kind it knows.
      ...[...game.matchAll(/^ {2}(\w+): \{ name:/gm)].map((m) => `models/${m[1]}.gltf`),
    ];
    expect(named).toContain('game.js');
    expect(named).toContain('models/grass.gltf');
    let bytes = 0;
    for (const src of named) {
      bytes += statSync(join(dir, src)).size;
    }
    expect(bytes).toBeLessThan(2 * 1024 * 1024);
  });

  it('Blockworld credits its textures and sounds', () => {
    const credits = readFileSync(join(EXAMPLES, 'blockworld/models/CREDITS.md'), 'utf8');
    for (const pack of ['Voxel Pack', 'Impact Sounds', 'Interface Sounds', 'Music Jingles']) expect(credits).toContain(pack);
    expect(credits).toMatch(/CC0/);
    expect(credits).toMatch(/birds\.wav and crickets\.wav: made for this game/);
  });

  it('the sofa studio names only files that exist, and stays within 15 MB and 200,000 triangles', () => {
    const dir = join(EXAMPLES, 'sofa-studio');
    const page = readFileSync(join(dir, 'index.holoml'), 'utf8');
    // Models, the script, the options' pictures, and the panorama; each file counted once.
    const named = new Set([...page.matchAll(/(?:src|map|normal-map|roughness-map|environment)="([^"]+)"/g)].map((m) => m[1]!));
    expect(named).toContain('studio.js');
    expect(named).toContain('models/sofa.gltf');
    expect(named).toContain('light/studio.hdr');
    const files = new Set<string>();
    let triangles = 0;
    for (const src of named) {
      const path = join(dir, src);
      files.add(path);
      if (!src.endsWith('.gltf')) continue;
      const g = gltfJson(path);
      for (const b of g.buffers ?? []) if (b.uri && !b.uri.startsWith('data:')) files.add(join(dirname(path), b.uri));
      for (const image of g.images ?? []) if (image.uri && !image.uri.startsWith('data:')) files.add(join(dirname(path), image.uri));
      for (const mesh of g.meshes ?? []) for (const p of mesh.primitives) triangles += g.accessors[p.indices ?? p.attributes['POSITION']!]!.count / 3;
    }
    let bytes = 0;
    for (const path of files) bytes += statSync(path).size;
    expect(bytes).toBeLessThan(15 * 1024 * 1024);
    expect(triangles).toBeLessThan(200_000);
  });

  it("the sofa studio's choices change materials the sofa has", () => {
    const page = readFileSync(join(EXAMPLES, 'sofa-studio/index.holoml'), 'utf8');
    const materials = (gltfJson(join(EXAMPLES, 'sofa-studio/models/sofa.gltf')).materials ?? []).map((m) => m.name);
    const targets = [...page.matchAll(/<choice [^>]*target="#sofa" material="([^"]+)"/g)].map((m) => m[1]!);
    expect(targets).toEqual(['Fabric', 'Wood']);
    for (const name of targets) expect(materials).toContain(name);
  });

  it('the sofa studio credits Poly Haven, and its about page says where things come from', () => {
    const credits = readFileSync(join(EXAMPLES, 'sofa-studio/models/CREDITS.md'), 'utf8');
    expect(credits).toMatch(/Poly Haven/);
    expect(credits).toMatch(/CC0/);
    for (const asset of ['Sofa 01', 'Rough Linen', 'Velour Velvet', 'Wool Boucle', 'Brown Leather', 'Brown Photostudio 02']) expect(credits).toContain(asset);
    expect(readFileSync(join(EXAMPLES, 'sofa-studio/about.holoml'), 'utf8')).toMatch(/Poly Haven \(polyhaven\.com, CC0\)/);
  });

  it("Harbour Loft's pages name only files that exist, and the flat stays within 25 MB and 400,000 triangles", () => {
    const dir = join(EXAMPLES, 'harbour-loft');
    for (const name of ['index.holoml', 'terrace.holoml', 'about.holoml']) {
      const page = readFileSync(join(dir, name), 'utf8');
      // Models (one .glb each, their pictures inside), the script, the sounds, the sky, its light, and the plan.
      const named = [...page.matchAll(/(?:src|sky|environment)="([^"]+)"/g)].map((m) => m[1]!);
      let bytes = 0;
      let triangles = 0;
      for (const src of new Set(named)) bytes += statSync(join(dir, src)).size;
      // Triangles as drawn: a model used many times (the walls, the chairs) counts each time.
      for (const src of named.filter((s) => s.endsWith('.glb'))) {
        const g = gltfJson(join(dir, src));
        for (const mesh of g.meshes ?? []) for (const p of mesh.primitives) triangles += g.accessors[p.indices ?? p.attributes['POSITION']!]!.count / 3;
      }
      if (name !== 'index.holoml') continue;
      for (const file of ['loft.js', 'light/sky.jpg', 'light/harbour.hdr', 'plans/loft.png', 'sounds/door.wav', 'sounds/switch.wav', 'models/wall.glb']) expect(named).toContain(file);
      expect(bytes).toBeLessThan(25 * 1024 * 1024);
      expect(triangles).toBeLessThan(400_000);
    }
  });

  it('Harbour Loft credits Poly Haven, and its about page says where things come from', () => {
    const credits = readFileSync(join(EXAMPLES, 'harbour-loft/models/CREDITS.md'), 'utf8');
    expect(credits).toMatch(/Poly Haven/);
    expect(credits).toMatch(/CC0/);
    for (const asset of ['Sofa 02', 'Herringbone Parquet', 'Brick Wall 001', "Simon's Town Harbour"]) expect(credits).toContain(asset);
    expect(readFileSync(join(EXAMPLES, 'harbour-loft/about.holoml'), 'utf8')).toMatch(/Poly Haven \(polyhaven\.com, CC0\)/);
  });

  /** A .glb file's triangles (each mesh once, as the store's models have one each). */
  const trianglesOf = (file: string) => {
    const g = gltfJson(file);
    let n = 0;
    for (const mesh of g.meshes ?? []) for (const p of mesh.primitives) n += g.accessors[p.indices ?? p.attributes['POSITION']!]!.count / 3;
    return n;
  };

  it("the sneaker store's pages name only files that exist, and the store stays within the page limits with every shelf in", () => {
    const dir = join(EXAMPLES, 'sneaker-store');
    for (const name of ['index.holoml', 'shoe.holoml', 'about.holoml']) {
      const page = readFileSync(join(dir, name), 'utf8');
      for (const [, src] of page.matchAll(/(?:src|stand-in|map)="([^"]+)"/g)) expect(statSync(join(dir, src!)).size, `${src} in ${name}`).toBeGreaterThan(0);
    }
    const store = readFileSync(join(dir, 'index.holoml'), 'utf8');
    const models = [...store.matchAll(/<model [^>]*src="([^"]+)"/g)].map((m) => m[1]!);
    const standIns = [...store.matchAll(/stand-in="([^"]+)"/g)].map((m) => m[1]!);
    // Drawn as the viewer could at most have it: every shoe in, and every stand-in (a stand-in counts while the page shows it).
    const triangles = [...models, ...standIns].reduce((sum, src) => sum + trianglesOf(join(dir, src)), 0);
    expect(triangles).toBeLessThan(2_000_000);
    // Each file once: the page's own, every colourway's model and stand-in, and the script and its module.
    let bytes = 0;
    for (const src of new Set([...models, ...standIns, 'store.js', 'colourways.js'])) bytes += statSync(join(dir, src)).size;
    expect(bytes).toBeLessThan(12 * 1024 * 1024);
  });

  it("the sneaker store's shelves load by area: ten groups, and every shoe in them with a lighter stand-in", () => {
    const dir = join(EXAMPLES, 'sneaker-store');
    const store = readFileSync(join(dir, 'index.holoml'), 'utf8');
    const groups = [...store.matchAll(/<group load="near" near="([\d.]+)"[^>]*>([\s\S]*?)<\/group>/g)];
    expect(groups).toHaveLength(10);
    for (const [, near, body] of groups) {
      expect(Number(near)).toBeGreaterThan(0);
      const shoes = [...body!.matchAll(/<model [^>]*src="([^"]+)" stand-in="([^"]+)"/g)];
      expect(shoes).toHaveLength(6);
      for (const [, src, standIn] of shoes) expect(trianglesOf(join(dir, standIn!))).toBeLessThan(trianglesOf(join(dir, src!)) / 5);
    }
  });

  it("the sneaker store's colour choice changes the shoe's material, and offers every colourway", () => {
    const dir = join(EXAMPLES, 'sneaker-store');
    const page = readFileSync(join(dir, 'shoe.holoml'), 'utf8');
    expect(page).toMatch(/<choice id="colour" [^>]*target="#shoe" material="Shoe"/);
    expect((gltfJson(join(dir, 'models/shoe.glb')).materials ?? []).map((m) => m.name)).toContain('Shoe');
    const options = [...page.matchAll(/<option value="(\w+)"/g)].map((m) => m[1]!);
    for (const id of ['midnight', 'beach', 'street', 'forest', 'sunset', 'lemon', 'violet', 'sky', 'cloud', 'ember']) {
      expect(options).toContain(id);
      expect(statSync(join(dir, `models/shoe-${id}.glb`)).size).toBeGreaterThan(0);
    }
  });

  it('the sneaker store credits the shoe (Shopify, CC BY 4.0), on its about page and in its credits', () => {
    const dir = join(EXAMPLES, 'sneaker-store');
    const credits = readFileSync(join(dir, 'models/CREDITS.md'), 'utf8');
    for (const words of ['Materials Variants Shoe', '© 2021 Shopify, Inc.', 'CC BY 4.0', 'Khronos glTF', 'painted out']) expect(credits).toContain(words);
    for (const page of ['about.holoml', 'index.html']) expect(readFileSync(join(dir, page), 'utf8')).toMatch(/Materials Variants Shoe" © 2021 Shopify, Inc\., from the Khronos glTF Sample Assets/);
  });

  it("the aquarium's pages name only files that exist, and the tank stays within 20 MB and the page limits with its bubbles and food", () => {
    const dir = join(EXAMPLES, 'aquarium');
    for (const name of ['index.holoml', 'about.holoml']) {
      const page = readFileSync(join(dir, name), 'utf8');
      for (const [, src] of page.matchAll(/src="([^"]+)"/g)) expect(statSync(join(dir, src!)).size, `${src} in ${name}`).toBeGreaterThan(0);
    }
    const page = readFileSync(join(dir, 'index.holoml'), 'utf8');
    const models = [...page.matchAll(/<model [^>]*src="([^"]+)"/g)].map((m) => m[1]!);
    // The script adds 18 bubbles for each air stone and 24 flakes of food.
    const script = readFileSync(join(dir, 'aquarium.js'), 'utf8');
    expect(script).toContain('models/bubble.glb');
    expect(script).toContain('models/flake.glb');
    const stones = [...page.matchAll(/<model src="models\/airstone\.glb"/g)].length;
    const triangles = models.reduce((sum, src) => sum + trianglesOf(join(dir, src)), 0) + stones * 18 * trianglesOf(join(dir, 'models/bubble.glb')) + 24 * trianglesOf(join(dir, 'models/flake.glb'));
    expect(triangles).toBeLessThan(2_000_000);
    let bytes = 0;
    for (const src of new Set([...models, ...[...page.matchAll(/<sound [^>]*src="([^"]+)"/g)].map((m) => m[1]!), 'models/bubble.glb', 'models/flake.glb', 'aquarium.js', 'ocean.js'])) bytes += statSync(join(dir, src)).size;
    expect(bytes).toBeLessThan(20 * 1024 * 1024);
  });

  it("the aquarium's fish: every kind has its model with a swim, and the page puts in as many as ocean.js says", async () => {
    const dir = join(EXAMPLES, 'aquarium');
    const { KINDS } = (await import(new URL('../../../examples/aquarium/ocean.js', import.meta.url).href)) as { KINDS: { kind: string; count: number }[] };
    const page = readFileSync(join(dir, 'index.holoml'), 'utf8');
    expect(KINDS.length).toBeGreaterThanOrEqual(5);
    for (const k of KINDS) {
      const g = gltfJson(join(dir, `models/${k.kind}.glb`)) as { animations?: { name: string }[] };
      expect((g.animations ?? []).map((a) => a.name), k.kind).toContain('Swim');
      for (let i = 1; i <= k.count; i++) expect(page).toMatch(new RegExp(`<model id="${k.kind}-${i}" src="models/${k.kind}\\.glb"[^>]* animation="Swim" autoplay`));
      // Its kind's first fish is a button in the outline, for the keyboard.
      expect(page).toContain(`trigger="#${k.kind}-1"`);
    }
  });

  it('the aquarium credits every fish (CC BY 4.0 or CC0) and Poly Haven, on its about page and in its credits', () => {
    const dir = join(EXAMPLES, 'aquarium');
    const credits = readFileSync(join(dir, 'models/CREDITS.md'), 'utf8');
    const about = readFileSync(join(dir, 'about.holoml'), 'utf8');
    for (const who of ['Babylon.js', 'Bindestrek', 'BlueMesh', 'Amy Scott-Murray', 'GoldenZtuff', 'zixisun02', 'Dsanchez13', 'Microsoft']) {
      expect(credits).toContain(who);
      expect(about).toContain(who);
    }
    for (const words of ['CC BY 4.0', 'CC0', 'Objaverse', 'Poly Haven', 'Boulder 01', 'Dead Tree Trunk 02', 'Lambis Shell', 'Aerial Beach 01']) expect(credits).toContain(words);
    expect(about).toMatch(/Poly Haven \(CC0\)/);
    // No licence that is not CC BY 4.0 or CC0 (the file has Windows line ends where Git converts them, as on
    // GitHub's Windows machines).
    for (const line of credits.split(/\r?\n/).filter((l) => /^- [a-z-]+\.glb, /.test(l))) expect(line).toMatch(/CC BY 4\.0\.$|CC0 1\.0\.$/);
    // The turtle credited CC BY 4.0 while its file said non-commercial (review 134, E1) is gone from every
    // place it was named, and CC BY 4.0's address is given wherever the fish are credited.
    const places = { credits, about, readme: readFileSync(join(dir, 'README.md'), 'utf8'), notice: readFileSync(join(EXAMPLES, '../NOTICE'), 'utf8') };
    for (const [place, text] of Object.entries(places)) {
      expect(text, place).not.toMatch(/DigitalLife3D|flatback/i);
      expect(text, place).toContain('https://creativecommons.org/licenses/by/4.0/');
    }
    expect(places.notice).toContain('the hawksbill sea turtle by Bindestrek');
    expect(credits).toContain('- turtle.glb, Hawksbill sea turtle: "Hawksbill Turtle" by Bindestrek, https://sketchfab.com/3d-models/bd6c9327fd52469782f055a182659bd2, CC BY 4.0.');
    // Where the licence of the two files without a stamp of their own is stated.
    expect(credits).toMatch(/Babylon\.js\s+asset library \(github\.com\/BabylonJS\/Assets, at commit [0-9a-f]{7}\)/);
  });

  it("the aquarium's water, bubbling from its air stones, and Feed button", () => {
    const page = readFileSync(join(EXAMPLES, 'aquarium/index.holoml'), 'utf8');
    expect(page).toMatch(/<water [^>]*size="24 6\.8 34"[^>]* caustics \/>/);
    const stones = [...page.matchAll(/<model src="models\/airstone\.glb"[^>]* position="([^"]+)"/g)].map((m) => m[1]!.split(' ').map(Number));
    const bubblers = [...page.matchAll(/<sound id="bubbler-\d" src="sounds\/bubbles\.wav" position="([^"]+)" range="(\d+)"/g)];
    expect(stones.length).toBeGreaterThan(0);
    expect(bubblers).toHaveLength(stones.length);
    bubblers.forEach(([, at], i) => expect(at!.split(' ').map(Number)[0]).toBe(stones[i]![0]));
    expect(page).toMatch(/<sound id="plop" src="sounds\/plop\.wav" begin="click" trigger="#feed"/);
  });

  it('the showroom credits its models, and the about page says where they come from', () => {
    const credits = readFileSync(join(EXAMPLES, 'showroom/models/CREDITS.md'), 'utf8');
    expect(credits).toMatch(/Kenney/);
    expect(credits).toMatch(/CC0/);
    expect(readFileSync(join(EXAMPLES, 'showroom/about.holoml'), 'utf8')).toMatch(/Kenney's Car Kit \(kenney\.nl, CC0\)/);
  });
});
