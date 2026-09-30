import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { cacheProblem, keeper, makingFolder, putInPlace, readSums, sha256, writeSums } from './cache.mjs';

const scratch: string[] = [];
const folder = () => {
  const dir = mkdtempSync(join(tmpdir(), 'holoml-cache-'));
  scratch.push(dir);
  return dir;
};
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

const EXAMPLES = fileURLToPath(new URL('../', import.meta.url));

describe('E5: downloads are checked against a recorded checksum (review 134)', () => {
  const bytes = Buffer.from('a sofa');
  const other = Buffer.from('another sofa');
  /** A keeper whose fetch gives `answer` and notes what was asked. */
  const kept = (sums: Record<string, string>, answer: Buffer, record = false) => {
    const cache = folder();
    const asked: string[] = [];
    const save = keeper({ cache, sums, record, fetch: async (url: string) => (asked.push(url), answer), log: () => undefined }) as (url: string, file: string) => Promise<void>;
    return { cache, asked, save };
  };

  it('fetches a missing file, and saves it when it is the file recorded', async () => {
    const { cache, asked, save } = kept({ 'models/sofa/sofa.gltf': sha256(bytes) }, bytes);
    await save('https://example.test/sofa.gltf', join(cache, 'models', 'sofa', 'sofa.gltf'));
    expect(asked).toEqual(['https://example.test/sofa.gltf']);
    expect(readFileSync(join(cache, 'models', 'sofa', 'sofa.gltf'))).toEqual(bytes);
    // There already, and the right one: nothing is fetched.
    await save('https://example.test/sofa.gltf', join(cache, 'models', 'sofa', 'sofa.gltf'));
    expect(asked).toHaveLength(1);
  });

  it('stops, and saves nothing, when the source gives another file', async () => {
    const { cache, save } = kept({ 'sofa.gltf': sha256(bytes) }, other);
    await expect(save('https://example.test/sofa.gltf', join(cache, 'sofa.gltf'))).rejects.toThrow(/not the file expected for sofa\.gltf \(its checksum is [0-9a-f]{64}; [0-9a-f]{64} is recorded\)\. Its source has changed it; nothing was saved/);
    expect(existsSync(join(cache, 'sofa.gltf'))).toBe(false);
  });

  it('fetches again a file that is there but is not the one recorded', async () => {
    const { cache, asked, save } = kept({ 'sofa.gltf': sha256(bytes) }, bytes);
    writeFileSync(join(cache, 'sofa.gltf'), other);
    await save('https://example.test/sofa.gltf', join(cache, 'sofa.gltf'));
    expect(asked).toHaveLength(1);
    expect(readFileSync(join(cache, 'sofa.gltf'))).toEqual(bytes);
  });

  it('stops at a file with no recorded checksum, before fetching it, unless it is recording', async () => {
    const sums: Record<string, string> = {};
    const { cache, asked, save } = kept(sums, bytes);
    await expect(save('https://example.test/new.gltf', join(cache, 'new.gltf'))).rejects.toThrow(/new\.gltf: no checksum is recorded for it\..*--record.*nothing was fetched/);
    expect(asked).toEqual([]);
    expect(existsSync(join(cache, 'new.gltf'))).toBe(false);

    const recording = kept(sums, bytes, true);
    await recording.save('https://example.test/new.gltf', join(recording.cache, 'textures', 'new.gltf'));
    expect(sums).toEqual({ 'textures/new.gltf': sha256(bytes) });
    // A file already there is recorded as it is, without fetching.
    writeFileSync(join(recording.cache, 'old.jpg'), other);
    await recording.save('https://example.test/old.jpg', join(recording.cache, 'old.jpg'));
    expect(recording.asked).toHaveLength(1);
    expect(sums['old.jpg']).toBe(sha256(other));
  });

  it('keeps the checksums in the order of their paths', () => {
    const file = join(folder(), 'checksums.json');
    expect(readSums(file)).toEqual({});
    writeSums(file, { 'b/2.jpg': 'bb', 'a/1.jpg': 'aa' });
    expect(readFileSync(file, 'utf8')).toBe('{\n  "a/1.jpg": "aa",\n  "b/2.jpg": "bb"\n}\n');
    expect(readSums(file)).toEqual({ 'a/1.jpg': 'aa', 'b/2.jpg': 'bb' });
  });

  it('Harbour Loft and the sofa studio have a checksum for every file they download, and use them', () => {
    for (const [site, files] of [['harbour-loft', 100], ['sofa-studio', 30]] as const) {
      const sums = readSums(join(EXAMPLES, site, 'tools', 'checksums.json')) as Record<string, string>;
      expect(Object.keys(sums).length, site).toBeGreaterThan(files);
      for (const [name, sum] of Object.entries(sums)) {
        expect(name, site).toMatch(/^(?:models|textures|light)\/[\w./-]+$/);
        expect(sum, name).toMatch(/^[0-9a-f]{64}$/);
      }
      const tool = readFileSync(join(EXAMPLES, site, 'tools', 'download.mjs'), 'utf8');
      expect(tool, site).toMatch(/keeper\(\{ cache, sums, record \}\)/);
      // Every request has a time limit: none is made with a bare fetch.
      expect(tool, site).not.toMatch(/\bfetch\(/);
      // Where the cache is on this computer, it is the files recorded.
      const cache = join(EXAMPLES, site, 'tools', 'cache');
      for (const [name, sum] of Object.entries(sums)) if (existsSync(join(cache, name))) expect(sha256(readFileSync(join(cache, name))), `${site}: ${name}`).toBe(sum);
    }
  });
});

describe('E5: a tool that makes a folder afresh leaves the old one alone until the new one is whole', () => {
  it('says what the cache lacks, and which tool to run', () => {
    const cache = folder();
    mkdirSync(join(cache, 'models'));
    expect(cacheProblem(cache, ['models'], 'download.mjs')).toBeNull();
    expect(cacheProblem(cache, ['credits.json', 'models', 'textures'], 'examples/x/tools/download.mjs')).toBe(`${cache} has no credits.json, textures: run examples/x/tools/download.mjs first. Nothing was changed.`);
    expect(cacheProblem(join(cache, 'gone'), ['shoe'], 'download.mjs')).toMatch(/has no shoe: run download\.mjs first/);
  });

  it('makes in a folder of its own, and puts it in place at the end', () => {
    const site = folder();
    const cache = join(site, 'tools', 'cache');
    const models = join(site, 'models');
    mkdirSync(models);
    writeFileSync(join(models, 'old.glb'), 'the committed model');
    writeFileSync(join(models, 'gone.glb'), 'a model no longer made');

    const making = makingFolder(cache, 'models');
    expect(making).toBe(join(cache, 'making', 'models'));
    writeFileSync(join(making, 'old.glb'), 'made again');
    // Until the end, the site's folder is as it was: a run that stops here has lost nothing.
    expect(readFileSync(join(models, 'old.glb'), 'utf8')).toBe('the committed model');
    expect(readdirSync(models).sort()).toEqual(['gone.glb', 'old.glb']);

    putInPlace(making, models);
    expect(readdirSync(models)).toEqual(['old.glb']);
    expect(readFileSync(join(models, 'old.glb'), 'utf8')).toBe('made again');
    expect(existsSync(making)).toBe(false);
    // Asked for again, the making folder is empty, whatever a run that failed left in it.
    writeFileSync(join(makingFolder(cache, 'models'), 'half.glb'), 'half');
    expect(readdirSync(makingFolder(cache, 'models'))).toEqual([]);
  });

  it('the tools that empty a folder of the site check their cache first, and make in the cache', () => {
    for (const site of ['harbour-loft', 'sneaker-store']) {
      const tool = readFileSync(join(EXAMPLES, site, 'tools', 'prepare.mjs'), 'utf8');
      const run = tool.slice(tool.indexOf('app.whenReady()'));
      expect(run.indexOf('cacheProblem('), site).toBeGreaterThan(0);
      expect(run.indexOf('cacheProblem('), site).toBeLessThan(run.indexOf('makingFolder('));
      expect(run.indexOf('makingFolder('), site).toBeLessThan(run.indexOf('putInPlace('));
      // Nothing of the site is removed by the tool itself.
      expect(tool, site).not.toMatch(/\brmSync\(/);
    }
  });
});
